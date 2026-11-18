# Registro de fontes dos dados

Uma linha por indicador (ou por tabela/variável usada). Atualize sempre que importar dados novos.
Anote **onde** (link e tabela), **quando** acessou, **como** chegou ao número e as **limitações**.

## Como atualizar tudo

```bash
~/.venvs/indicadores/bin/python docs/dados/scripts/baixar_tudo.py   # todas as fontes (~25 min na 1ª vez)
bash docs/dados/setup-dados.sh                                      # importa eixos, catálogos e valores para o banco
```

Com `python3` puro funciona tudo menos a Base dos Dados, que precisa do pacote `basedosdados`
(instalado no venv `~/.venvs/indicadores`) e da variável `BD_BILLING_PROJECT_ID`.

Cada script grava um `docs/dados/csv/valores-<fonte>.csv` e imprime `OK`/`FALHOU` por indicador. Todos
aceitam `--so CODIGO1,CODIGO2`, só usam a biblioteca padrão do Python (exceto o da Base dos Dados) e
guardam as respostas em `docs/dados/scripts/.cache` para não baixar de novo a cada execução.

| Script | Fonte | Precisa de conta? | Tempo (1ª vez) |
|---|---|---|---|
| `baixar_ibge.py` | IBGE SIDRA (API de agregados) | não | ~1 min |
| `baixar_ibge_cidades.py` | API IBGE Cidades (reúne INEP, SENATRAN, MS, BCB, PNUD) | não | ~1 min |
| `baixar_firjan.py` | Planilhas IFGF e IFDM da FIRJAN | não | segundos |
| `baixar_siconfi.py` | SICONFI / Tesouro Nacional (DCA das prefeituras) | não | ~10 min |
| `baixar_deral.py` | SEAB/DERAL, planilhas anuais do VBP | não | ~1 min |
| `ler_inep.py` | INEP: zips baixados à mão para `docs/dados/brutos/` (links dentro do script) | não | ~1 min por zip de ensino superior |
| `baixar_tse.py` | TSE, perfil do eleitorado (zip de 85 MB) | não | ~3 min |
| `baixar_bcb.py` | Banco Central, crédito rural (SICOR) | não | ~10 min (servidor lento) |
| `baixar_basedosdados.py` | Base dos Dados / BigQuery (RAIS, CAGED, CNES) | **sim**: projeto Google Cloud + `pip install basedosdados` | ~3 min (lê ~45 GB do 1 TB grátis/mês) |

Catálogos: `indicadores-ipplan.csv` (os do documento do IPPLAN) e `indicadores-automaticos.csv`
(os criados junto com os scripts). Os dois são importados pelo `setup-dados.sh`.

## Indicadores com download automático

Territórios: M = Campo Mourão, R = COMCAM (soma dos 25 municípios, só quando todos têm dado), E = Paraná, B = Brasil.
Acesso em 16/11/2026.

| Código | Indicador | Fonte (órgão e base) | Link / tabela / variável | Período coberto | Territórios | Observações |
|---|---|---|---|---|---|---|
| DEM-001 | População estimada | IBGE, Estimativas | SIDRA 6579 | 2015–2026 (sem 2022 e 2023) | M R E B | O IBGE não publicou estimativa nos anos do Censo |
| DEM-002, DEM-003, DEM-004 | População, densidade e área (Censo) | IBGE, Censo 2022 | SIDRA 4714 | 2022 | M R E B | Densidade não é somada na COMCAM |
| GP-033 | PIB a preços correntes | IBGE, PIB dos Municípios | SIDRA 5938, var. 37 | 2015–2023 | M R E B | R$ mil |
| GP-006, GP-018 a GP-021 | VAB total e por setor | IBGE, PIB dos Municípios | SIDRA 5938 | 2015–2021 | M R E B | 2022 e 2023 ainda vêm como "..." no IBGE |
| GP-005 | PIB per capita | IBGE | API Cidades: pesquisa 38 (M), 10060 (E), 10089 (B) | 2015–2023 | M R E B | COMCAM = soma dos PIBs / soma das populações implícitas |
| AGR-002 a AGR-004, AGR-010, AGR-011 | Rebanhos | IBGE, PPM | SIDRA 3939 | 2015–2025 | M R E B | |
| AGR-005 a AGR-007, AGR-012, AGR-013 | Produção de soja, milho, trigo, batata, aveia | IBGE, PAM | SIDRA 5457, quantidade produzida | 2015–2025 | M R E B | |
| GP-015 | IDHM | PNUD/IPEA/FJP | API Cidades: pesquisa 10111 (M) e 37 (E) | 1991, 2000, 2010 | M E | O estado tem série anual 2012–2021; município só nos censos |
| GP-016 | Agências bancárias | Banco Central | API Cidades: pesquisa 29 | 2015–2025 | M E B | Sem COMCAM: 4 municípios pequenos não aparecem na API (provavelmente por não terem agência) |
| EDU-003, EDU-007, EDU-008 | IDEB (rede pública) | INEP | API Cidades: pesquisa 40 | 2015–2025 (bienal) | M E B | Nota não se soma: sem COMCAM |
| EDU-001, EDU-009 a EDU-012 | Matrículas (total e por etapa) | INEP, Censo Escolar | API Cidades: pesquisa 13 | 2015–2025 | M R E B | Todas as redes. EDU-001 = infantil + fundamental + médio |
| EDU-014 a EDU-019 | Docentes e escolas por etapa | INEP, Censo Escolar | API Cidades: pesquisa 13 | 2015–2025 | M R E B | A mesma escola/docente pode aparecer em mais de uma etapa |
| SEG-001, SEG-003, SEG-004 | Frota (total, automóveis, motos) | SENATRAN | API Cidades: pesquisa 22 | 2015–2025 | M R E B | Anual; o número mensal fica no site da SENATRAN |
| SAU-006 | Mortalidade infantil | Ministério da Saúde | API Cidades: pesquisa 39 | 2015–2025 | M R E B | COMCAM = óbitos < 1 ano / nascidos vivos x 1000 |
| SAU-015, SAU-016 | Nascidos vivos e óbitos | IBGE, Registro Civil | API Cidades: pesquisa 20 | 2015–2024 | M R E B | |
| SAU-004, SAU-005 | Natalidade e mortalidade geral | IBGE, Registro Civil + Estimativas | calculado: eventos / população x 1000 | 2015–2024 (sem 2022, 2023) | M R E B | O PDF usa SESA/DATASUS: os números ficam próximos, não idênticos |
| GP-013, GP-034 a GP-037 | IFGF e componentes | FIRJAN | planilha "Evolução por indicador", edição 2025 | 2013–2024 | M | Metodologia nova: não comparável com os valores antigos do PDF |
| GP-014, GP-038 a GP-042 | IFDM, componentes e rankings | FIRJAN | planilha "Série histórica IFDM" | 2013–2023 | M | |
| GP-008, GP-009 | Receitas e despesas municipais | STN, SICONFI | DCA Anexos I-C e I-E | 2015–2025 | M R | Receita líquida de deduções; despesa empenhada. Estado: `--parana` |
| GP-022 a GP-030, GP-012 | Receitas por categoria, impostos, FPM, ICMS | STN, SICONFI | DCA Anexo I-C | 2015–2025 | M R | Contas achadas pelo nome (o código muda com os anos) |
| GP-031, GP-032 | Receita tributária per capita, resultado fiscal | STN, SICONFI | calculado | 2015–2025 | M R | |
| SAU-009, SAU-011 a SAU-014 | Gasto com saúde (total, por habitante, subfunções) | STN, SICONFI | DCA Anexo I-E, função 10 | 2015–2025 | M R | O PDF usa SIOPS: valores próximos, não idênticos |
| AGR-018 | CFEM recebida pelo município (cota-parte) | STN, SICONFI | DCA Anexo I-C | 2015–2025 | M R | Valor contábil que entrou na prefeitura. Bate com a "CFEM distribuída" do PDF em 2019 (39.830,81); a partir de 2022 fica acima |
| EDU-020 a EDU-025 | Aprovação, reprovação e abandono (fundamental e médio) | INEP, Taxas de Rendimento | `tx_rend_municipios_<ano>.zip` em `brutos/` | anos dos zips (2024, 2025) | M | Download manual; taxa não se soma, e o arquivo não traz estado/Brasil |
| EDU-005, EDU-026 a EDU-029 | Cursos presenciais, matrículas e concluintes do ensino superior (presencial e EAD) | INEP, Censo da Educação Superior | `microdados_censo_da_educacao_superior_<ano>.zip` em `brutos/` | anos dos zips (2024) | M R E B | Download manual. Idêntico ao PDF em matrículas (6.177 e 3.969); concluintes presenciais: INEP 774, PDF 674 (o PDF traz 45 na rede federal, o INEP 145) |
| GP-017, GP-043 a GP-052 | Eleitorado (total, sexo, idade) e zonas | TSE | `perfil_eleitorado_ATUAL.zip` | ano corrente | M R E B | Anos eleitorais anteriores: `--anos 2022,2024` |
| AGR-001 | Valor Bruto da Produção agropecuária (VBP) | SEAB/DERAL | planilhas em agricultura.pr.gov.br/vbp | 2020–2025 | M R E | 2019 tem outro layout e 2012–2018 estão em .xls: ficam de fora |
| AGR-008, AGR-014 a AGR-017 | Crédito rural (valor e contratos) | Banco Central, SICOR | API Olinda | 2020 até o último ano completo | M | Só o município: a consulta do estado inteiro dá timeout. O ano corrente fica de fora (incompleto) |

Conferência com o documento do IPPLAN (devem bater): receitas 2024 = 742.638.770,45; despesas 2024 = 713.812.990,10;
IPTU 2024 = 45.820.621,09; PIB per capita 2023 = 60.261,36; população 2022 = 99.432; IDEB 2025 = 7,1;
IFGF 2024 = 0,7881; matrículas no fundamental 2025 = 12.123; receita tributária per capita 2016 = 506,13;
VBP 2024 = 770.799.352 (Paraná 188.363.478.719); crédito rural agrícola 2024 = 1.502.410.899,25.

## Indicadores da Base dos Dados (BigQuery)

`baixar_basedosdados.py`, executado e conferido em 16/11/2026. Territórios M R E B em todos.

| Código | Indicador | Tabela | Período | Conferência com o documento do IPPLAN |
|---|---|---|---|---|
| GP-001 | Empregos formais em 31/12 | `br_me_rais.microdados_vinculos` | 2015–2025 | Idêntico: M 2016 = 25.476, 2017 = 24.931; E 3.013.105 e 3.028.192 |
| GP-002, GP-053 a GP-056 | Estabelecimentos (total e por subsetor IBGE) | `br_me_rais.microdados_estabelecimentos` | 2015–2025 | Idêntico: M 2016 = 3.277, 2017 = 3.181; varejo 1.141; construção 2016 = 333. Critério: não é RAIS negativa |
| GP-003, GP-057 a GP-064 | Estabelecimentos nas ACTs (turismo) | idem | 2015–2025 | Idênticos no PR: alojamento, alimentação, terrestre, aéreo, agências, aluguel. Aproximados: aquaviário (27 x 21) e cultura e lazer (925 x 788); o total fica ~0,7% acima |
| EMP-001 a EMP-009 | Admissões, desligamentos e saldo (CAGED) | `br_me_caged.microdados_movimentacao` | 2020–2025 | Idêntico em 2025: E 2.023.090 admissões, saldo 80.587; R 33.859 e 1.116. Para M o documento traz 9.287 admissões e a base 15.077 |
| SAU-002 | Leitos de internação (sem complementares/UTI) | `br_ms_cnes.leito` | 2015–2026 | Idêntico em 2025: M 234, E 27.392 |

Respostas para o que o IPPLAN pediu para conferir (painéis econômicos 2016 e 2017): os números de Campo Mourão e
do Paraná estão corretos; a exceção é "Construção Civil" de 2017, que repete o 333 de 2016 (a RAIS dá 291).

## Valores digitados do PDF x valores automáticos

Decisão de 16/11/2026: **vale o automático, e a região é sempre a COMCAM com os 25 municípios.**
`valores-ipplan.csv` é importado junto com os outros (ordem alfabética) e sobrescreveria parte deles, então
foram retiradas dele as 30 linhas que tinham valor automático diferente (25 divergentes e 5 só arredondadas).
Elas estão guardadas, com o valor automático ao lado, em `docs/dados/csv/removidos-ipplan.csv` (esse arquivo
não é importado). Ficaram em `valores-ipplan.csv` só as linhas idênticas ao automático e as que não têm fonte
automática: PEA 2010, taxa de fecundidade 2010, mortalidade em menores de 5 anos 2017 e as receitas e despesas
de 2024 do Paraná.

Por que os valores do PDF divergiam:

- **"Região" do PDF no agro = COMCAM sem Terra Boa** (24 municípios). A diferença para a soma dos 25 é exatamente
  o valor de Terra Boa em suínos, galináceos, soja, milho e trigo de 2024.
- **PIB per capita da região "2023" (50.047,96)** é, na verdade, o valor de 2021; o de 2023 é 55.952,18.
- **Empregos e estabelecimentos RAIS da região em 2017 (46.471 e 6.676)** não correspondem à soma dos 25 municípios
  (67.284 e 9.859); a outra tabela do próprio PDF traz 66.762 empregos.
- Natalidade e mortalidade de 2017 diferem em 1–2% porque a fonte é outra (SESA x Registro Civil).
- **ACTs (GP-003) de 2017**: aqui o PDF tem o número oficial (Campo Mourão 208, Paraná 20.250) e o automático
  fica um pouco acima (209 e 20.398), pelo motivo explicado na tabela da Base dos Dados. Ficou o automático
  para a série não ter um degrau em 2017.

Ao digitar novos valores do PDF, não repita períodos que já vêm de um script: o digitado voltaria a sobrescrever.

## O que continua manual (e por quê)

| Código / item do PDF | Motivo | Onde buscar |
|---|---|---|
| GP-007 VAF, GP-010 ICMS por origem, GP-011 ICMS ecológico | SEFA-PR não tem API; os dados saem pelo IPARDES | BDEweb do IPARDES (consulta por formulário) |
| AGR-009 CFEM arrecadada no município | O servidor de dados abertos da ANM não respondeu (nem por script, nem pelo navegador, em 16–17/11/2026) | app.anm.gov.br/dadosabertos/ARRECADACAO (CFEM_Arrecadacao.csv), quando voltar. A cota-parte recebida já vem do SICONFI (AGR-018) |
| CUL-001, CUL-002 bibliotecas e equipamentos culturais | SEEC-PR, só via IPARDES | BDEweb do IPARDES |
| ACTs: lista oficial de subclasses CNAE de "transporte aquaviário" e "cultura e lazer" | Não foi possível deduzir dos números | Metodologia do IPEA (SIMT) ou a consulta original do IPARDES |
| SAU-001 estabelecimentos de saúde | A API de dados abertos do CNES devolveu só 59 estabelecimentos para o município (o documento do IPPLAN cita 683) | TabNet do DATASUS, ou `br_ms_cnes` na Base dos Dados |
| SAU-008 mortalidade materna, SAU-010 óbitos por capítulo CID-10 | Só no TabNet (formulário) ou nos microdados do SIM | TabNet, ou `br_ms_sim.municipio_causa` na Base dos Dados |
| SEG-002 taxa de homicídios | SESP-PR publica em relatórios PDF | seguranca.pr.gov.br |
| EDU-002 escolas (total), EDU-006 docentes do ensino superior por titulação | Escola que oferece várias etapas seria contada mais de uma vez; docentes do superior só existem por sede da instituição (UTFPR e Unespar têm sede fora) | Sinopse do Censo Escolar (INEP); as próprias IES |
| GP-004 PEA / PIA | A PNAD Contínua não tem resultado por município; só o Censo (amostra) | SIDRA, quando sair a amostra do Censo 2022 |
| Conselhos municipais, 13º salário (DIEESE), cursos e alunos por IES | Não existem em base pública estruturada | Prefeitura, DIEESE e as próprias instituições |

## Regras para o dado aparecer certo no painel

- **Fluxo anual só entra com o ano fechado** (crédito rural, CAGED, receitas): um ano pela metade apareceria no
  card "mais recente" e no gráfico como se fosse uma queda. Estoques (eleitores, leitos, frota) podem ter o ano corrente.
- **Card e comparativo usam o mesmo período**: o mais recente em que Campo Mourão tem valor.
- **Vazio é "sem dado", nunca zero**: os scripts deixam a célula vazia quando a fonte não informa (ou quando falta
  um município na soma da COMCAM).
- O seed (`apps/api/src/database/seed-dev.sql`) cria só eixos e territórios. Indicadores e valores vêm sempre daqui.
- **Todo indicador novo precisa de `kind` no catálogo** (colunas `kind` e `polarity` dos `indicadores-*.csv`):
  - `kind = TOTAL` para contagens e montantes que se somam (população, receita, empregos). O comparativo mostra
    quanto Campo Mourão representa da região, do estado e do país, sem barras (a do Brasil esconderia as outras).
  - `kind = RATE` para taxas, índices, médias, valores por habitante e posições. O comparativo mostra barras.
  - `polarity = LOWER_BETTER` (mortalidade, reprovação, abandono, posição em ranking) ou `HIGHER_BETTER`
    (índices, notas, aprovação); vazio quando não há leitura óbvia. O painel escreve "menor é melhor".
- A visão geral só mostra cards depois de escolhida uma categoria (12 por vez, primeiro os que têm dado).

