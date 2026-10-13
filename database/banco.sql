-- Banco do indicador "Zonas eleitorais" (Campo Mourão-PR).
-- Fonte: Base dos Dados / TSE, tabela br_tse_eleicoes.detalhes_votacao_municipio_zona
--        (consulta filtrada por id_municipio = '4104303'; CSV: indicador01.csv).
-- Seguro para repetir: apaga e recria só esta tabela, tudo numa transação.

BEGIN;

DROP TABLE IF EXISTS indicador_zonas_eleitorais;

CREATE TABLE indicador_zonas_eleitorais (
  id_municipio      char(7)      NOT NULL,
  municipio         varchar(150) NOT NULL,
  ano               smallint     NOT NULL,
  quantidade_zonas  smallint     NOT NULL,
  zonas             smallint[]   NOT NULL,
  carregado_em      timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT pk_indicador_zonas_eleitorais PRIMARY KEY (id_municipio, ano),
  CONSTRAINT ck_zonas_id_municipio CHECK (id_municipio ~ '^[0-9]{7}$'),
  CONSTRAINT ck_zonas_ano CHECK (ano BETWEEN 1945 AND 2100),
  CONSTRAINT ck_zonas_quantidade CHECK (quantidade_zonas = cardinality(zonas))
);

COMMENT ON TABLE indicador_zonas_eleitorais IS
  'Quantidade e números das zonas eleitorais por município e ano de eleição. Fonte: Base dos Dados (TSE), br_tse_eleicoes.detalhes_votacao_municipio_zona.';
COMMENT ON COLUMN indicador_zonas_eleitorais.id_municipio IS 'Código IBGE de 7 dígitos.';
COMMENT ON COLUMN indicador_zonas_eleitorais.zonas IS 'Números das zonas eleitorais, em ordem crescente.';

INSERT INTO indicador_zonas_eleitorais (id_municipio, municipio, ano, quantidade_zonas, zonas) VALUES
  ('4104303', 'Campo Mourão', 1998, 2, '{31,183}'),
  ('4104303', 'Campo Mourão', 2000, 2, '{31,183}'),
  ('4104303', 'Campo Mourão', 2002, 2, '{31,183}'),
  ('4104303', 'Campo Mourão', 2004, 2, '{31,183}'),
  ('4104303', 'Campo Mourão', 2006, 2, '{31,183}'),
  ('4104303', 'Campo Mourão', 2008, 2, '{31,183}'),
  ('4104303', 'Campo Mourão', 2010, 2, '{31,183}'),
  ('4104303', 'Campo Mourão', 2012, 2, '{31,183}'),
  ('4104303', 'Campo Mourão', 2014, 2, '{31,183}'),
  ('4104303', 'Campo Mourão', 2016, 2, '{31,183}'),
  ('4104303', 'Campo Mourão', 2018, 1, '{31}'),
  ('4104303', 'Campo Mourão', 2020, 1, '{31}'),
  ('4104303', 'Campo Mourão', 2022, 1, '{31}'),
  ('4104303', 'Campo Mourão', 2024, 1, '{31}'),
  ('4104303', 'Campo Mourão', 2026, 1, '{31}');

COMMIT;