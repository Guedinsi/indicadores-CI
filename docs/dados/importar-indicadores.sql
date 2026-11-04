-- Importa o CATÁLOGO DE INDICADORES a partir de um CSV. Não rode direto: use docs/dados/importar.sh
-- Colunas do CSV:
--   code,name,description,unit,formula,periodicity,axis_slug,source_name,source_url,source_access
-- Regras: uma transação só (erro = nada gravado). Repetir é seguro: indicador com o mesmo
-- code é ATUALIZADO; novo code é CRIADO. O eixo (axis_slug) precisa existir (importe os eixos antes).
-- A fonte (source_name) é criada se ainda não existir; source_access: API, CSV, XLSX, SCRAPING ou MANUAL.

\if :{?finish}
\else
  \set finish COMMIT
\endif

BEGIN;

CREATE TEMP TABLE staging_ind (
  code text, name text, description text, unit text, formula text, periodicity text,
  axis_slug text, source_name text, source_url text, source_access text
) ON COMMIT DROP;

SELECT format('COPY staging_ind FROM %L WITH (FORMAT csv, HEADER true, DELIMITER %L)', :'file', :'delim') AS cmd \gset
:cmd ;

UPDATE staging_ind SET
  code = upper(btrim(code)), name = btrim(name), description = NULLIF(btrim(description), ''),
  unit = NULLIF(btrim(unit), ''), formula = NULLIF(btrim(formula), ''),
  periodicity = NULLIF(upper(btrim(periodicity)), ''), axis_slug = lower(btrim(axis_slug)),
  source_name = NULLIF(btrim(source_name), ''), source_url = NULLIF(btrim(source_url), ''),
  source_access = NULLIF(upper(btrim(source_access)), '');
DELETE FROM staging_ind WHERE coalesce(code, '') = '' AND coalesce(name, '') = '';

DO $$
DECLARE msg text;
BEGIN
  SELECT string_agg(format('code=%L name=%L', code, name), '; ') INTO msg
  FROM staging_ind WHERE coalesce(code, '') = '' OR coalesce(name, '') = '' OR coalesce(axis_slug, '') = '';
  IF msg IS NOT NULL THEN RAISE EXCEPTION 'code, name e axis_slug são obrigatórios. Linhas com problema: %', msg; END IF;

  SELECT string_agg(code, ', ') INTO msg
  FROM (SELECT code FROM staging_ind GROUP BY code HAVING count(*) > 1) d;
  IF msg IS NOT NULL THEN RAISE EXCEPTION 'code repetido no arquivo: %', msg; END IF;

  SELECT string_agg(DISTINCT s.axis_slug, ', ') INTO msg
  FROM staging_ind s LEFT JOIN axis a ON a.slug = s.axis_slug WHERE a.id IS NULL;
  IF msg IS NOT NULL THEN
    RAISE EXCEPTION 'eixo(s) que não existem no banco: %. Importe os eixos antes ou corrija o axis_slug.', msg;
  END IF;

  SELECT string_agg(DISTINCT source_access, ', ') INTO msg
  FROM staging_ind WHERE source_access IS NOT NULL AND source_access NOT IN ('API','CSV','XLSX','SCRAPING','MANUAL');
  IF msg IS NOT NULL THEN
    RAISE EXCEPTION 'source_access inválido: %. Use API, CSV, XLSX, SCRAPING ou MANUAL.', msg;
  END IF;

  SELECT string_agg(DISTINCT periodicity, ', ') INTO msg
  FROM staging_ind WHERE periodicity IS NOT NULL AND periodicity NOT IN ('ANNUAL','MONTHLY','QUARTERLY','DECENNIAL','OTHER');
  IF msg IS NOT NULL THEN
    RAISE EXCEPTION 'periodicity inválida: %. Use ANNUAL, MONTHLY, QUARTERLY, DECENNIAL ou OTHER.', msg;
  END IF;
END $$;

-- Cria as fontes que ainda não existem (a primeira linha de cada fonte define URL e tipo de acesso)
INSERT INTO data_source (name, base_url, access_type)
SELECT DISTINCT ON (source_name) source_name, source_url, coalesce(source_access, 'MANUAL')
FROM staging_ind WHERE source_name IS NOT NULL
ORDER BY source_name
ON CONFLICT (name) DO NOTHING;

WITH up AS (
  INSERT INTO indicator (code, name, description, unit, formula, periodicity, axis_id, data_source_id)
  SELECT s.code, s.name, s.description, s.unit, s.formula, s.periodicity, a.id, d.id
  FROM staging_ind s
  JOIN axis a ON a.slug = s.axis_slug
  LEFT JOIN data_source d ON d.name = s.source_name
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description, unit = EXCLUDED.unit,
    formula = EXCLUDED.formula, periodicity = EXCLUDED.periodicity,
    axis_id = EXCLUDED.axis_id, data_source_id = EXCLUDED.data_source_id, updated_at = now()
  RETURNING (xmax = 0) AS criado
)
SELECT count(*) FILTER (WHERE criado) AS indicadores_criados,
       count(*) FILTER (WHERE NOT criado) AS indicadores_atualizados
FROM up;

SELECT a.slug AS eixo, count(*) AS indicadores
FROM indicator i JOIN axis a ON a.id = i.axis_id GROUP BY a.slug ORDER BY a.slug;

:finish;
\echo
\echo Concluído com :finish (ROLLBACK = modo de teste, nada foi gravado).
