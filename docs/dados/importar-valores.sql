-- Importa VALORES de indicadores a partir de um CSV. Não rode direto: use docs/dados/importar.sh
-- Colunas do CSV: indicator_code,territory_type,territory_code,period,value
--   territory_type: MUNICIPIO, REGIAO, ESTADO ou PAIS
--   period: "2023" (anual) ou "2023-06" (mensal)
--   value: número com PONTO ou VÍRGULA decimal (12.5 ou 12,5), sem separador de milhar.
--          Deixe VAZIO quando não houver dado (isso grava "sem dado", que é diferente de zero).
-- Regras: uma transação só (erro = nada gravado). Repetir é seguro: o mesmo
-- (indicador, território, período) é ATUALIZADO, não duplicado.

\if :{?finish}
\else
  \set finish COMMIT
\endif

BEGIN;

CREATE TEMP TABLE staging_val (
  indicator_code text, territory_type text, territory_code text, period text, value text
) ON COMMIT DROP;

SELECT format('COPY staging_val FROM %L WITH (FORMAT csv, HEADER true, DELIMITER %L)', :'file', :'delim') AS cmd \gset
:cmd ;

UPDATE staging_val SET
  indicator_code = upper(btrim(indicator_code)), territory_type = upper(btrim(territory_type)),
  territory_code = btrim(territory_code), period = btrim(period),
  value = NULLIF(replace(btrim(value), ',', '.'), '');
DELETE FROM staging_val
WHERE coalesce(indicator_code, '') = '' AND coalesce(territory_code, '') = '' AND coalesce(period, '') = '';

DO $$
DECLARE msg text;
BEGIN
  SELECT string_agg(format('indicador=%L território=%L/%L período=%L', indicator_code, territory_type, territory_code, period), '; ')
  INTO msg FROM staging_val
  WHERE coalesce(indicator_code, '') = '' OR coalesce(territory_code, '') = ''
     OR coalesce(territory_type, '') = '' OR coalesce(period, '') = '';
  IF msg IS NOT NULL THEN
    RAISE EXCEPTION 'indicator_code, territory_type, territory_code e period são obrigatórios. Linhas: %', msg;
  END IF;

  SELECT string_agg(DISTINCT period, ', ') INTO msg FROM staging_val WHERE period !~ '^\d{4}(-\d{2})?$';
  IF msg IS NOT NULL THEN RAISE EXCEPTION 'período em formato inválido: %. Use 2023 ou 2023-06.', msg; END IF;

  SELECT string_agg(DISTINCT value, ', ') INTO msg FROM staging_val
  WHERE value IS NOT NULL AND value !~ '^-?\d+(\.\d+)?$';
  IF msg IS NOT NULL THEN
    RAISE EXCEPTION 'valor que não é número: %. Use 12.5 ou 12,5, sem separador de milhar e sem textos como "n/d".', msg;
  END IF;

  SELECT string_agg(DISTINCT s.indicator_code, ', ') INTO msg
  FROM staging_val s LEFT JOIN indicator i ON i.code = s.indicator_code WHERE i.id IS NULL;
  IF msg IS NOT NULL THEN
    RAISE EXCEPTION 'indicador(es) que não existem no banco: %. Importe o catálogo antes ou corrija o código.', msg;
  END IF;

  SELECT string_agg(DISTINCT s.territory_type || '/' || s.territory_code, ', ') INTO msg
  FROM staging_val s LEFT JOIN territory t ON t.type = s.territory_type AND t.code = s.territory_code
  WHERE t.id IS NULL;
  IF msg IS NOT NULL THEN
    RAISE EXCEPTION 'território(s) que não existem no banco (tipo/código): %. Tipos válidos: MUNICIPIO, REGIAO, ESTADO, PAIS.', msg;
  END IF;

  SELECT string_agg(format('%s / %s / %s / %s', indicator_code, territory_type, territory_code, period), '; ')
  INTO msg FROM (
    SELECT indicator_code, territory_type, territory_code, period FROM staging_val
    GROUP BY 1, 2, 3, 4 HAVING count(*) > 1
  ) d;
  IF msg IS NOT NULL THEN RAISE EXCEPTION 'linhas repetidas no arquivo (mesmo indicador/território/período): %', msg; END IF;
END $$;

WITH up AS (
  INSERT INTO indicator_value (indicator_id, territory_id, period, value)
  SELECT i.id, t.id, s.period, s.value::numeric
  FROM staging_val s
  JOIN indicator i ON i.code = s.indicator_code
  JOIN territory t ON t.type = s.territory_type AND t.code = s.territory_code
  ON CONFLICT (indicator_id, territory_id, period)
  DO UPDATE SET value = EXCLUDED.value, fetched_at = now()
  RETURNING (xmax = 0) AS criado, value
)
SELECT count(*) FILTER (WHERE criado) AS valores_criados,
       count(*) FILTER (WHERE NOT criado) AS valores_atualizados,
       count(*) FILTER (WHERE value IS NULL) AS marcados_sem_dado
FROM up;

SELECT i.code AS indicador, count(*) AS valores, min(v.period) AS de, max(v.period) AS ate
FROM indicator_value v JOIN indicator i ON i.id = v.indicator_id
GROUP BY i.code ORDER BY i.code;

:finish;
\echo
\echo Concluído com :finish (ROLLBACK = modo de teste, nada foi gravado).
