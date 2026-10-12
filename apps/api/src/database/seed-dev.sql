-- Seed de DESENVOLVIMENTO (idempotente): catálogo mínimo para testar o dashboard.
-- Não insere nenhum VALOR de indicador: os valores devem vir da ingestão (ou de carga manual com dado real).
-- O catálogo definitivo virá da issue CI-08 (a partir da planilha de indicadores).

-- Eixos (mesmas categorias da página atual)
INSERT INTO axis (name, slug, abbreviation, description) VALUES
  ('Economia',        'economia',        'EC', 'Indicadores econômicos e fiscais'),
  ('Desenvolvimento', 'desenvolvimento', 'DE', 'Indicadores de desenvolvimento humano'),
  ('Educação',        'educacao',        'ED', 'Indicadores educacionais'),
  ('Saúde',           'saude',           'SA', 'Indicadores de saúde'),
  ('Cultura',         'cultura',         'CU', 'Indicadores culturais'),
  ('Gestão',          'gestao',          'GE', 'Indicadores de gestão municipal')
ON CONFLICT (slug) DO NOTHING;

-- Territórios, com hierarquia: Brasil > Paraná > COMCAM > Campo Mourão
-- (confira os códigos oficiais; 4104303 = Campo Mourão-PR, 41 = Paraná)
INSERT INTO territory (code, name, type) VALUES ('BR', 'Brasil', 'PAIS')
ON CONFLICT (type, code) DO NOTHING;

INSERT INTO territory (code, name, type, parent_id)
SELECT '41', 'Paraná', 'ESTADO', id FROM territory WHERE type = 'PAIS' AND code = 'BR'
ON CONFLICT (type, code) DO NOTHING;

INSERT INTO territory (code, name, type, parent_id)
SELECT 'COMCAM', 'COMCAM', 'REGIAO', id FROM territory WHERE type = 'ESTADO' AND code = '41'
ON CONFLICT (type, code) DO NOTHING;

INSERT INTO territory (code, name, type, parent_id)
SELECT '4104303', 'Campo Mourão', 'MUNICIPIO', id FROM territory WHERE type = 'REGIAO' AND code = 'COMCAM'
ON CONFLICT (type, code) DO NOTHING;

-- Indicadores que já aparecem na página
INSERT INTO indicator (code, name, description, unit, periodicity, axis_id)
SELECT 'IFGF', 'IFGF', 'Índice Firjan de Gestão Fiscal', 'índice', 'ANNUAL', id
FROM axis WHERE slug = 'economia'
ON CONFLICT (code) DO NOTHING;

INSERT INTO indicator (code, name, description, unit, periodicity, axis_id)
SELECT 'IFDM', 'IFDM', 'Índice Firjan de Desenvolvimento Municipal', 'índice', 'ANNUAL', id
FROM axis WHERE slug = 'desenvolvimento'
ON CONFLICT (code) DO NOTHING;

INSERT INTO indicator (code, name, description, unit, periodicity, axis_id)
SELECT 'IDHM', 'IDHM', 'Índice de Desenvolvimento Humano Municipal', 'índice', 'DECENNIAL', id
FROM axis WHERE slug = 'desenvolvimento'
ON CONFLICT (code) DO NOTHING;

-- Exemplo de como um valor entra (use SOMENTE dado real da fonte; deixe comentado):
-- INSERT INTO indicator_value (indicator_id, territory_id, period, value)
-- SELECT i.id, t.id, '2019', <VALOR_REAL_DA_FONTE>
-- FROM indicator i, territory t
-- WHERE i.code = 'IFDM' AND t.type = 'MUNICIPIO' AND t.code = '4104303'
-- ON CONFLICT (indicator_id, territory_id, period) DO UPDATE SET value = EXCLUDED.value, fetched_at = now();
