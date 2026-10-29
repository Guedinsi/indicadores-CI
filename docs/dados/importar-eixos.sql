-- Importa EIXOS (categorias) a partir de um CSV. Não rode direto: use docs/dados/importar.sh
-- Colunas do CSV: slug,name,abbreviation,description
-- Regras: tudo roda em UMA transação (se algo falhar, nada é gravado) e é seguro repetir:
-- eixos que já existem (mesmo slug) são ATUALIZADOS, os novos são CRIADOS.

\if :{?finish}
\else
  \set finish COMMIT
\endif

BEGIN;

CREATE TEMP TABLE staging_eixos (
  slug text, name text, abbreviation text, description text
) ON COMMIT DROP;

SELECT format('COPY staging_eixos FROM %L WITH (FORMAT csv, HEADER true, DELIMITER %L)', :'file', :'delim') AS cmd \gset
:cmd ;

-- Limpa espaços e ignora linhas totalmente vazias
UPDATE staging_eixos SET
  slug = lower(btrim(slug)), name = btrim(name),
  abbreviation = NULLIF(btrim(abbreviation), ''), description = NULLIF(btrim(description), '');
DELETE FROM staging_eixos WHERE coalesce(slug, '') = '' AND coalesce(name, '') = '';

-- Validações (qualquer erro cancela tudo e mostra a linha problemática)
DO $$
DECLARE msg text;
BEGIN
  SELECT string_agg(format('linha com slug=%L name=%L', slug, name), '; ') INTO msg
  FROM staging_eixos WHERE coalesce(slug, '') = '' OR coalesce(name, '') = '';
  IF msg IS NOT NULL THEN RAISE EXCEPTION 'slug e name são obrigatórios: %', msg; END IF;

  SELECT string_agg(slug, ', ') INTO msg FROM staging_eixos WHERE slug !~ '^[a-z0-9-]+$';
  IF msg IS NOT NULL THEN
    RAISE EXCEPTION 'slug só pode ter letras minúsculas sem acento, números e hífen. Corrija: %', msg;
  END IF;

  SELECT string_agg(slug, ', ') INTO msg FROM staging_eixos WHERE length(abbreviation) > 4;
  IF msg IS NOT NULL THEN RAISE EXCEPTION 'abbreviation tem no máximo 4 caracteres. Corrija os eixos: %', msg; END IF;

  SELECT string_agg(slug, ', ') INTO msg
  FROM (SELECT slug FROM staging_eixos GROUP BY slug HAVING count(*) > 1) d;
  IF msg IS NOT NULL THEN RAISE EXCEPTION 'slug repetido no arquivo: %', msg; END IF;
END $$;

WITH up AS (
  INSERT INTO axis (slug, name, abbreviation, description)
  SELECT slug, name, abbreviation, description FROM staging_eixos
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, abbreviation = EXCLUDED.abbreviation,
    description = EXCLUDED.description, updated_at = now()
  RETURNING (xmax = 0) AS criado
)
SELECT count(*) FILTER (WHERE criado) AS eixos_criados,
       count(*) FILTER (WHERE NOT criado) AS eixos_atualizados
FROM up;

SELECT slug, name, abbreviation FROM axis ORDER BY name;

:finish;
\echo
\echo Concluído com :finish (ROLLBACK = modo de teste, nada foi gravado).
