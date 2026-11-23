-- Seed de DESENVOLVIMENTO (idempotente): eixos e territórios, o mínimo para a API e o importador funcionarem.
-- Não insere indicadores nem valores: o catálogo e os dados vêm de docs/dados (scripts baixar_*.py + setup-dados.sh).

-- Eixos (os mesmos de docs/dados/csv/eixos.csv)
INSERT INTO axis (name, slug, abbreviation, description) VALUES
  ('Gestão Pública',                     'gestao-publica', 'GP', 'Indicadores de gestão pública e finanças municipais'),
  ('Educação',                           'educacao',       'ED', 'Indicadores de educação'),
  ('Segurança',                          'seguranca',      'SE', 'Indicadores de segurança pública'),
  ('Saúde',                              'saude',          'SA', 'Indicadores de saúde'),
  ('Cultura',                            'cultura',        'CU', 'Indicadores de cultura'),
  ('Agricultura/Pecuária/Meio Ambiente', 'agro-ambiente',  'AM', 'Indicadores de agricultura, pecuária e meio ambiente')
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
