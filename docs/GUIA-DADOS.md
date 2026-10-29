# Guia: como popular o banco de dados de indicadores

Para quem vai levantar os indicadores e carregar os dados no projeto **indicadores-CI**. Você não precisa saber programar para usar este guia: o fluxo é **planilha → CSV → um comando**.

## Índice

1. [Visão geral em 1 minuto](#1-visão-geral-em-1-minuto)
2. [Onde estão os arquivos](#2-onde-estão-os-arquivos)
3. [Preparar o ambiente (uma vez)](#3-preparar-o-ambiente-uma-vez)
4. [Fluxo de trabalho: do zero ao dashboard](#4-fluxo-de-trabalho-do-zero-ao-dashboard)
5. [Formato dos CSVs](#5-formato-dos-csvs)
6. [Regras para dados confiáveis](#6-regras-para-dados-confiáveis)
7. [Conferir e consultar o banco](#7-conferir-e-consultar-o-banco)
8. [Corrigir e apagar dados](#8-corrigir-e-apagar-dados)
9. [Registrar as fontes](#9-registrar-as-fontes)
10. [Versionar no Git e compartilhar com o time](#10-versionar-no-git-e-compartilhar-com-o-time)
11. [Prompts úteis para IAs](#11-prompts-úteis-para-ias)
12. [Problemas comuns](#12-problemas-comuns)
13. [Checklist final e glossário](#13-checklist-final-e-glossário)

---

## 1. Visão geral em 1 minuto

O dashboard **não calcula nem busca nada na hora**: ele só mostra o que está gravado no banco. Seu trabalho é colocar lá, de forma organizada:

```
 EIXOS            INDICADORES              VALORES
 (categorias)  →  (o catálogo: nome,    →  (o número de cada indicador,
  Saúde,           unidade, fórmula,         por território e por período)
  Educação...      fonte)
```

Os valores são sempre comparados em **quatro níveis territoriais**: Campo Mourão (`MUNICIPIO`), COMCAM (`REGIAO`), Paraná (`ESTADO`) e Brasil (`PAIS`).

A ordem importa, porque cada etapa depende da anterior: **eixos → indicadores → valores**.

Cada pessoa do time tem **o seu próprio banco local**. O que vale para todos são os **arquivos CSV versionados no Git**: quem puxa o código roda o importador e fica com os mesmos dados.

---

## 2. Onde estão os arquivos

```
indicadores-CI/
├── .env                              # configurações locais (NUNCA vai para o Git)
├── docker-compose.yml                # sobe o banco PostgreSQL
├── docs/
│   ├── GUIA-DADOS.md                 # este guia
│   └── dados/
│       ├── importar.sh               # ★ o comando que você vai usar
│       ├── importar-eixos.sql        #   (usados pelo importar.sh; não precisa abrir)
│       ├── importar-indicadores.sql
│       ├── importar-valores.sql
│       ├── modelos/                  # ★ CSVs vazios só com o cabeçalho: copie e preencha
│       │   ├── eixos.csv
│       │   ├── indicadores.csv
│       │   └── valores.csv
│       ├── csv/                      # ★ seus CSVs preenchidos (vão para o Git)
│       ├── scripts/                  #   scripts de limpeza/cálculo, se usar (Python etc.)
│       └── fontes.md                 # ★ registro de onde cada dado veio (veja a seção 9)
└── apps/api/src/
    ├── database/
    │   ├── seed-dev.sql              # dados mínimos iniciais (eixos, territórios, 3 indicadores)
    │   └── migrations/               # estrutura das tabelas (quem altera é o time de back-end)
    └── modules/indicators/entities/  # descrição das tabelas em código (só para consulta)
```

As pastas `docs/dados/csv/` e `docs/dados/scripts/` podem não existir ainda: crie com `mkdir -p docs/dados/csv docs/dados/scripts`.

**Você só mexe em** `docs/dados/` (CSVs, scripts e `fontes.md`). Não precisa editar nada em `apps/`.

---

## 3. Preparar o ambiente (uma vez)

```bash
# 1) Pegar o código e instalar
git clone git@github.com:Guedinsi/indicadores-CI.git
cd indicadores-CI
corepack enable
pnpm install
cp .env.example .env            # e troque a senha do banco no .env

# 2) Subir o banco e criar as tabelas
docker compose up -d db
pnpm --filter api migration:run

# 3) Carregar os dados mínimos iniciais (eixos, territórios, 3 indicadores)
set -a; source .env; set +a
docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" < apps/api/src/database/seed-dev.sql

# 4) (opcional) subir a API e o site para ver o resultado
pnpm dev:api        # um terminal
pnpm dev:web        # outro terminal → http://localhost:3000
```

Se o Docker reclamar de permissão (`permission denied`):
```bash
sudo usermod -aG docker $USER
su -l $USER
```

### Ver o banco com uma interface gráfica (opcional)

Se preferir ver tabelas em vez de terminal, use o **DBeaver** (gratuito) ou o pgAdmin com estes dados de conexão (os valores estão no seu `.env`):

| Campo | Valor |
|---|---|
| Host | `localhost` |
| Porta | o `DB_PORT` do `.env` (ex.: `5440`) |
| Banco | `DB_NAME` |
| Usuário / senha | `DB_USER` / `DB_PASSWORD` |

Use a interface **para consultar**. Para gravar dados, prefira o importador, que valida tudo antes e permite repetir sem duplicar.

---

## 4. Fluxo de trabalho: do zero ao dashboard

Todos os comandos são rodados **na raiz do repositório** (`indicadores-CI/`) e com o banco no ar (`docker compose up -d db`).

### Passo 1: Eixos (categorias)

1. Copie o modelo: `cp docs/dados/modelos/eixos.csv docs/dados/csv/eixos.csv`
2. Preencha no Excel/LibreOffice (veja o formato na [seção 5](#5-formato-dos-csvs)).
3. Teste e depois grave:
   ```bash
   bash docs/dados/importar.sh eixos docs/dados/csv/eixos.csv --teste
   bash docs/dados/importar.sh eixos docs/dados/csv/eixos.csv
   ```

> **Atenção, decisão do time:** os eixos do documento do IPPLAN (Gestão Pública, Educação, Segurança, Saúde, Cultura, Agricultura/Pecuária/Meio Ambiente) **não são exatamente** os que vêm no seed inicial (Economia, Desenvolvimento, Educação, Saúde, Cultura, Gestão). Combine com o time quais eixos o dashboard terá. Dá para importar os novos e, depois, mover os indicadores de eixo (reimportando o catálogo com outro `axis_slug`). Um eixo só pode ser apagado se não tiver indicadores (seção 8).

### Passo 2: Catálogo de indicadores

1. `cp docs/dados/modelos/indicadores.csv docs/dados/csv/indicadores.csv` e preencha **um indicador por linha**.
2. Teste e grave:
   ```bash
   bash docs/dados/importar.sh indicadores docs/dados/csv/indicadores.csv --teste
   bash docs/dados/importar.sh indicadores docs/dados/csv/indicadores.csv
   ```
As fontes (`source_name`) são criadas automaticamente. Você pode corrigir o catálogo à vontade: reimportar atualiza os indicadores com o mesmo `code`.

### Passo 3: Valores

1. `cp docs/dados/modelos/valores.csv docs/dados/csv/valores-educacao.csv` (um arquivo por eixo ou por fonte facilita a revisão).
2. Preencha **uma linha por indicador × território × período**.
3. Teste e grave:
   ```bash
   bash docs/dados/importar.sh valores docs/dados/csv/valores-educacao.csv --teste
   bash docs/dados/importar.sh valores docs/dados/csv/valores-educacao.csv
   ```

### Passo 4: Conferir no site

Com a API e o site rodando (`pnpm dev:api` e `pnpm dev:web`), abra `http://localhost:3000` e atualize a página (F5), sem reiniciar nada.

- O indicador aparece no card, no eixo certo, com o valor e o período corretos?
- Ao selecioná-lo, o gráfico de evolução e o comparativo (município × COMCAM × Paraná × Brasil) estão certos?
- Confira **3 valores por indicador** contra a fonte original.

### Como o importador funciona (e por que é seguro)

| Característica | O que significa para você |
|---|---|
| `--teste` | Roda tudo e mostra o resultado, mas **desfaz no final**. Use sempre primeiro. |
| Tudo ou nada | Se qualquer linha tiver erro, **nada** é gravado, e a mensagem diz o que corrigir. |
| Pode repetir | Reimportar o mesmo arquivo **atualiza**, não duplica. Corrigiu um número? Altere o CSV e rode de novo. |
| Aceita Excel brasileiro | Separador `;`, decimal com vírgula, acentos, BOM e formato de linha do Windows. |

---

## 5. Formato dos CSVs

Salve sempre como **CSV UTF-8** (no Excel: *Salvar como → CSV UTF-8*). O separador pode ser `,` ou `;`: o importador descobre sozinho. **Não altere os nomes das colunas do cabeçalho.**

### `eixos.csv`

| Coluna | Obrigatória | Regra |
|---|---|---|
| `slug` | sim | Identificador: minúsculas, sem acento nem espaço, só letras, números e hífen (`educacao`, `agro-ambiente`). **Não mude depois de criado.** |
| `name` | sim | Nome exibido (`Educação`) |
| `abbreviation` | não | Sigla de até 4 letras (`ED`) |
| `description` | não | Frase curta |

```csv
slug,name,abbreviation,description
seguranca,Segurança,SE,Indicadores de segurança pública
```

### `indicadores.csv`

| Coluna | Obrigatória | Regra |
|---|---|---|
| `code` | sim | Código único e **estável**, usado nas URLs. Sugestão: prefixo do eixo + número (`EDU-001`, `SAU-014`). Nunca reutilize um código. |
| `name` | sim | Nome exibido no card |
| `description` | não | O que o indicador mede |
| `unit` | não | Unidade: `%`, `por 1.000 hab.`, `R$`, `índice` |
| `formula` | não | Como é calculado, em texto (`aprovados / matriculados × 100`) |
| `periodicity` | não | `ANNUAL`, `MONTHLY`, `QUARTERLY`, `DECENNIAL` ou `OTHER` |
| `axis_slug` | sim | `slug` de um eixo que **já existe** |
| `source_name` | não | Nome da fonte (`INEP - Censo Escolar`). Mesma grafia em todas as linhas da mesma fonte. |
| `source_url` | não | Endereço da fonte (vale o da primeira linha de cada fonte) |
| `source_access` | não | `API`, `CSV`, `XLSX`, `SCRAPING` ou `MANUAL` (padrão: `MANUAL`) |

```csv
code,name,description,unit,formula,periodicity,axis_slug,source_name,source_url,source_access
EXEMPLO-001,Indicador de exemplo,Descrição de exemplo,%,numerador / denominador * 100,ANNUAL,educacao,Fonte de exemplo,https://exemplo.gov.br,CSV
```

> Isso é só um exemplo. **Não importe linhas de exemplo** no seu banco.

### `valores.csv`

| Coluna | Obrigatória | Regra |
|---|---|---|
| `indicator_code` | sim | `code` de um indicador que já existe |
| `territory_type` | sim | `MUNICIPIO`, `REGIAO`, `ESTADO` ou `PAIS` |
| `territory_code` | sim | Código do território (tabela abaixo) |
| `period` | sim | `2023` (anual) ou `2023-06` (mensal) |
| `value` | não | Número com `.` ou `,` decimal, **sem separador de milhar** (`1234,5`, não `1.234,5`). **Vazio = "sem dado"**. |

Territórios que já existem no banco:

| Território | `territory_type` | `territory_code` |
|---|---|---|
| Campo Mourão | `MUNICIPIO` | `4104303` (confira o código IBGE) |
| COMCAM | `REGIAO` | `COMCAM` |
| Paraná | `ESTADO` | `41` |
| Brasil | `PAIS` | `BR` |

```csv
indicator_code,territory_type,territory_code,period,value
EXEMPLO-001,MUNICIPIO,4104303,2023,91.5
EXEMPLO-001,REGIAO,COMCAM,2023,90.2
EXEMPLO-001,ESTADO,41,2023,89.1
EXEMPLO-001,PAIS,BR,2023,87.7
```

### Precisa de outro território?

Se o time quiser comparar com outros municípios, crie o território (uma vez) antes de importar valores para ele. Entre no console SQL (seção 7) e rode, ajustando os dados:

```sql
INSERT INTO territory (code, name, type, parent_id)
SELECT '4115200', 'Maringá', 'MUNICIPIO', id FROM territory WHERE type = 'REGIAO' AND code = 'COMCAM';
```

Isso muda o que o dashboard mostra (o comparativo hoje lista os territórios que têm valor), então combine com o time antes.

---

## 6. Regras para dados confiáveis

1. **Nunca invente nem estime valores.** Sem dado, deixe `value` vazio. Vazio é "sem dado" e aparece como `--`; zero é um valor real e muda o gráfico.
2. **Dados reais, com fonte.** Cada indicador do catálogo deve ter fonte (`source_name`), e você deve registrar de onde tirou cada número (seção 9).
3. **Mesmo período para comparar.** O comparativo usa o mesmo período para todos os territórios. Se o dado do Paraná é de 2022 e o de Campo Mourão é de 2023, não compare: registre o ano de cada um.
4. **Uma unidade por indicador.** Se a fonte traz "%" em um ano e "proporção (0 a 1)" em outro, converta antes de importar e anote a conversão na fórmula.
5. **Não arredonde antes da hora.** O banco guarda 4 casas decimais. Arredonde só na exibição.
6. **Códigos nunca mudam.** `code` do indicador e `slug` do eixo aparecem em URLs e filtros. Se errou o nome, corrija `name`. Só mude o `code` se for realmente necessário e avise o time.
7. **Confira por amostragem.** Depois de importar, compare pelo menos 3 valores por indicador direto na fonte.
8. **Dados pessoais.** Use apenas dados agregados e públicos (por município). Não importe dados individuais.
9. **Licença.** Anote os termos de uso da fonte em `fontes.md` quando existirem.

### Dicas para a planilha (Excel/LibreOffice)

- Uma linha por observação (formato "longo"), sem células mescladas, sem linhas de total, sem cabeçalhos duplos.
- Formate as colunas de código e de período como **texto** (para o Excel não transformar `2023-06` em data nem apagar zeros à esquerda).
- Antes de exportar, filtre e procure valores como `n/d`, `-`, `...`, `*`: troque por vazio.
- Exporte como **CSV UTF-8**. Se o arquivo vier em outra codificação, o importador avisa.

---

## 7. Conferir e consultar o banco

Abra o console SQL:

```bash
set -a; source .env; set +a
docker compose exec db psql -U "$DB_USER" -d "$DB_NAME"
```

Dentro dele: `\dt` lista as tabelas, `\d indicator` mostra as colunas, `\q` sai. Ou rode uma consulta direto do terminal:

```bash
docker compose exec db psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT slug, name FROM axis ORDER BY name;"
```

### Consultas úteis

```sql
-- Quantos indicadores por eixo
SELECT a.name AS eixo, count(i.id) AS indicadores
FROM axis a LEFT JOIN indicator i ON i.axis_id = a.id
GROUP BY a.name ORDER BY a.name;

-- Indicadores SEM nenhum valor (faltam dados)
SELECT i.code, i.name
FROM indicator i LEFT JOIN indicator_value v ON v.indicator_id = i.id
WHERE v.id IS NULL ORDER BY i.code;

-- Todos os valores, com nomes legíveis
SELECT i.code, t.name AS territorio, v.period, v.value
FROM indicator_value v
JOIN indicator i ON i.id = v.indicator_id
JOIN territory t ON t.id = v.territory_id
ORDER BY i.code, v.period, t.type;

-- Cobertura: para cada indicador, quais territórios e períodos têm dado
SELECT i.code, t.type, count(*) AS periodos, min(v.period) AS de, max(v.period) AS ate
FROM indicator_value v
JOIN indicator i ON i.id = v.indicator_id
JOIN territory t ON t.id = v.territory_id
GROUP BY i.code, t.type ORDER BY i.code, t.type;

-- Indicadores sem fonte cadastrada
SELECT code, name FROM indicator WHERE data_source_id IS NULL;

-- Indicadores com valor para o município mas sem valor para região/estado/país no mesmo período
SELECT i.code, v.period
FROM indicator_value v
JOIN indicator i ON i.id = v.indicator_id
JOIN territory t ON t.id = v.territory_id AND t.type = 'MUNICIPIO'
WHERE (SELECT count(*) FROM indicator_value x
       WHERE x.indicator_id = v.indicator_id AND x.period = v.period) < 4;
```

---

## 8. Corrigir e apagar dados

**Corrigir um valor ou um indicador:** altere o CSV e rode o importador de novo (sem `--teste`). Ele atualiza o que já existe.

**Apagar** (não há "desfazer"; use `BEGIN;` ... `COMMIT;` ou `ROLLBACK;` e confira antes com um `SELECT` equivalente):

```sql
BEGIN;
-- 1) veja o que será apagado
SELECT * FROM indicator_value
WHERE indicator_id = (SELECT id FROM indicator WHERE code = 'EDU-001') AND period = '2019';
-- 2) apague com o MESMO filtro
DELETE FROM indicator_value
WHERE indicator_id = (SELECT id FROM indicator WHERE code = 'EDU-001') AND period = '2019';
-- 3) se estiver certo:
COMMIT;      -- se errou, use ROLLBACK;
```

Outros casos:

```sql
-- Apagar um indicador (apaga também todos os valores dele)
DELETE FROM indicator WHERE code = 'EDU-001';

-- Apagar um eixo (só funciona se ele não tiver indicadores)
DELETE FROM axis WHERE slug = 'economia';
```

**Nunca rode `DELETE` ou `UPDATE` sem `WHERE`:** isso afeta a tabela inteira.

**Recomeçar do zero** (apaga TODO o seu banco local; os CSVs continuam intactos):
```bash
docker compose down -v
docker compose up -d db
pnpm --filter api migration:run
docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" < apps/api/src/database/seed-dev.sql
bash docs/dados/importar.sh eixos docs/dados/csv/eixos.csv
bash docs/dados/importar.sh indicadores docs/dados/csv/indicadores.csv
bash docs/dados/importar.sh valores docs/dados/csv/valores-educacao.csv
```
Como tudo vem de CSV versionado, recriar o banco é rápido e seguro.

**Backup antes de mudanças grandes:**
```bash
docker compose exec -T db pg_dump -U "$DB_USER" "$DB_NAME" > backup.sql
```
Não faça commit do `backup.sql`.

---

## 9. Registrar as fontes

Crie `docs/dados/fontes.md` e mantenha uma linha por indicador (ou por tabela/variável usada). Isso é o que permite ao time e ao professor **auditar** os números, e é a base da validação final.

```markdown
| Código | Indicador | Fonte (órgão e base) | Link / tabela / variável | Acesso em | Período coberto | Territórios | Observações (licença, ajustes, problemas) |
|---|---|---|---|---|---|---|---|
| EDU-001 | Taxa de aprovação | INEP – Censo Escolar | link da tabela, variável X | 2026-10-20 | 2015–2023 | Mun., PR, BR (sem COMCAM) | COMCAM calculada somando os municípios |
```

Anote sempre: **onde** (link e tabela), **quando** acessou (as fontes mudam e são republicadas), **como** chegou ao número (se fez conta, qual) e **limitações** (sem dado para algum território, mudança de metodologia entre anos).

Se algum indicador **não tem dado público** para o município, não force: marque no catálogo com `source_access = MANUAL`, deixe sem valores e registre o motivo. Isso é informação útil para o relatório do projeto.

Quando uma região (COMCAM) não vem pronta, ela pode ser **calculada a partir dos municípios**, mas só se a operação for válida (somas e contagens; médias de taxas exigem ponderar pela população/denominador). Documente o cálculo.

---

## 10. Versionar no Git e compartilhar com o time

`docs/dados/` é onde seu trabalho vive. Antes de tudo, confira o `.gitignore` da raiz: ele pode estar ignorando `*.csv`, o que esconderia seus arquivos. Adicione no final dele:

```gitignore
# CSVs de dados do projeto (devem ir para o Git)
!docs/dados/**/*.csv
```

Fluxo para cada bloco de trabalho (por exemplo, "indicadores de Educação"):

```bash
git pull
git checkout -b data/educacao-indicadores

# ... preencher CSVs, importar, conferir no site ...

git add docs/dados/
git commit -m "data: indicadores e valores do eixo Educação"
git push -u origin data/educacao-indicadores
```

Depois abra um **Pull Request** para a `main` e peça revisão de outra pessoa do time: ela confere o CSV contra a fonte e roda o importador.

**Quando um colega atualizar os dados**, você puxa e reimporta:
```bash
git pull
bash docs/dados/importar.sh indicadores docs/dados/csv/indicadores.csv
bash docs/dados/importar.sh valores docs/dados/csv/valores-educacao.csv
```

**Nunca** faça commit do `.env`, de `backup.sql` ou de planilhas com dados que você não pode compartilhar.

Se alguém precisar **mudar a estrutura** (nova coluna, nova tabela), isso é com o time de back-end (migrations). Peça pelo Jira/GitHub em vez de alterar o banco à mão.

---

## 11. Prompts úteis para IAs

**Regras de ouro para usar IA nesta tarefa**

- **Use IA para formatar, limpar, explicar erros e escrever scripts, nunca para fornecer números.** Modelos de linguagem inventam valores e links com muita confiança. Todo número tem que ser conferido na fonte original.
- Todo link sugerido por uma IA deve ser aberto e verificado. Se não abrir, a fonte não existe.
- **Nunca cole** senhas, o conteúdo do `.env` nem dados que não possam ser compartilhados.
- Peça sempre que a IA diga o que **não** sabe ou o que precisa ser verificado.

### Contexto base (cole no início da conversa)

```
Estou trabalhando em um projeto acadêmico chamado indicadores-CI: um dashboard de
indicadores de Cidades Inteligentes de Campo Mourão (PR). Os dados ficam em um
PostgreSQL com estas tabelas: axis (eixos), indicator (catálogo: code, name,
description, unit, formula, periodicity, axis, fonte), territory (MUNICIPIO, REGIAO,
ESTADO, PAIS) e indicator_value (indicador, território, período, valor; valor vazio
significa "sem dado"). Comparamos Campo Mourão × região COMCAM × Paraná × Brasil.
Eu carrego os dados por CSVs com estas colunas:
- eixos: slug,name,abbreviation,description
- indicadores: code,name,description,unit,formula,periodicity,axis_slug,source_name,source_url,source_access
- valores: indicator_code,territory_type,territory_code,period,value
Nunca invente números. Se não tiver certeza de algo, diga que preciso verificar.
```

### Transformar planilhas em CSV de importação

```
Tenho esta tabela em formato largo (colunas = anos). Transforme para o formato do
meu CSV de valores (uma linha por indicador/território/período, com as colunas
indicator_code,territory_type,territory_code,period,value). O indicador é EDU-001,
o território é MUNICIPIO 4104303. Não altere nenhum número; célula vazia ou "-"
vira value vazio. Tabela:
[cole aqui]
```

```
Escreva um script Python (pandas) que leia o arquivo [nome].xlsx, aba [aba], e gere
o CSV de valores no formato abaixo. Use ponto-e-vírgula como separador, UTF-8, e
não faça nenhuma conta nos números além de [descreva]. Mostre também quantas linhas
foram geradas e quais ficaram vazias.
[colunas do meu arquivo]
```

### Catálogo e fontes

```
Para o indicador "[nome do indicador do IPPLAN]", sugira: (1) uma definição
objetiva, (2) a fórmula de cálculo, (3) a unidade, (4) a periodicidade típica e
(5) órgãos públicos que costumam publicar dados por município. Diga claramente o
que é certeza e o que eu preciso confirmar. Não invente links: descreva onde
procurar (nome do órgão e da base) e eu verifico.
```

```
Esta é a tabela de indicadores do IPPLAN que estou catalogando: [cole]. Preencha o
CSV de indicadores (colunas: code,name,description,unit,formula,periodicity,
axis_slug,source_name,source_url,source_access). Use prefixo de eixo + número em
code (ex.: EDU-001). Deixe source_url vazio quando não souber. Marque numa lista
separada tudo que você inferiu e que eu preciso revisar.
```

### Dados de fontes públicas

```
Explique como baixar os dados de [indicador/tabela] do [IBGE/SIDRA, INEP, DataSUS...]
para o município de Campo Mourão, passo a passo. Se houver API, mostre a consulta
e explique cada parâmetro. Avise o que pode ter mudado desde o seu treinamento, para
eu conferir na documentação oficial.
```

```
Baixei este arquivo [descreva: formato, colunas]. Escreva um script que filtre
apenas Campo Mourão, COMCAM (os municípios: [liste]), Paraná e Brasil, e produza o
CSV de valores. Para a COMCAM, diga se somar os municípios é uma agregação válida
para este indicador ou se preciso ponderar (por exemplo, para taxas).
```

### Conferir e depurar

```
Revise este CSV de valores antes de eu importar. Procure: períodos fora do padrão
(2023 ou 2023-06), códigos de indicador ou território que não aparecem nas listas
abaixo, valores fora de uma faixa plausível para este tipo de indicador, linhas
repetidas, separador de milhar misturado com decimal. Não corrija nada
automaticamente: liste os problemas por linha.
Códigos válidos de indicador: [cole]
Territórios: MUNICIPIO/4104303, REGIAO/COMCAM, ESTADO/41, PAIS/BR
[cole o CSV]
```

```
Recebi este erro ao rodar o importador de dados do meu projeto. Explique em
português simples o que significa, qual é a causa mais provável e como corrigir
o CSV. Erro: [cole a mensagem inteira]
```

```
Compare estes valores do meu CSV com os valores publicados no documento do IPPLAN
que colei abaixo e liste as divergências (indicador, ano, valor meu, valor do
documento). Considere diferenças de arredondamento menores que 0,01 como iguais.
[cole as duas tabelas]
```

### Entender e relatar

```
Explique o seguinte indicador para um relatório de graduação, em até 5 linhas:
o que mede, como é calculado e como interpretar valores maiores ou menores.
Indicador: [nome e fórmula].
```

```
Escreva a seção "Fontes de dados e limitações" do relatório do projeto a partir
desta lista de fontes e observações: [cole o fontes.md]. Não invente nada além do
que está na lista.
```

---

## 12. Problemas comuns

| Mensagem / sintoma | Causa e solução |
|---|---|
| `ECONNREFUSED` / o banco não responde | O banco não está no ar. `docker compose up -d db` e confira com `docker compose ps`. |
| `password authentication failed` | O volume do banco foi criado com outra senha. Se não há dados a guardar: `docker compose down -v` e suba o `db` de novo. |
| `permission denied` ao usar o Docker | `sudo usermod -aG docker $USER` e depois `su -l $USER`. |
| `docker compose cp` / `exec` falha | Rode o comando **na raiz** do repositório e com o banco no ar. |
| `não está em UTF-8` | Reexporte como **CSV UTF-8**. No LibreOffice: *Salvar como → CSV → Conjunto de caracteres: Unicode (UTF-8)*. |
| `eixo(s) que não existem` | Importe os eixos antes, ou corrija o `axis_slug` (minúsculas, sem acento). |
| `indicador(es) que não existem` | Importe o catálogo antes, ou corrija o `indicator_code`. |
| `território(s) que não existem` | Confira tipo e código na tabela da seção 5. Para territórios novos, veja "Precisa de outro território?". |
| `período em formato inválido` | Use `2023` ou `2023-06`. O Excel pode ter convertido para data: formate a coluna como texto. |
| `valor que não é número` | Troque `n/d`, `-`, `*`, `%` por vazio ou número. Remova separador de milhar (`1.234,5` → `1234,5`). |
| `linhas repetidas no arquivo` | Há duas linhas com o mesmo indicador, território e período. Mantenha uma só. |
| `abbreviation tem no máximo 4 caracteres` | Encurte a sigla do eixo. |
| Importou mas **não aparece no site** | Atualize a página (F5). Confira se a API está rodando e se o `value` não está vazio (vazio aparece como `--`). Para o card mostrar valor, o indicador precisa de um valor do **município** (`MUNICIPIO/4104303`). |
| O gráfico de comparação só mostra alguns territórios | Faltam valores dos outros territórios naquele **mesmo período**. |
| Acentos quebrados (`SeguranÃ§a`) | O arquivo não estava em UTF-8 quando foi lido por outro programa. Reexporte como UTF-8. |

Se travar, mande no grupo: o comando que rodou, a **mensagem de erro inteira** e o CSV (ou as primeiras linhas).

---

## 13. Checklist final e glossário

### Checklist antes de abrir o Pull Request

- [ ] Os CSVs estão em `docs/dados/csv/` com os nomes de coluna dos modelos.
- [ ] Rodei cada importação com `--teste` e depois sem ele, sem erros.
- [ ] Conferi no site (`localhost:3000`): eixo, nome, unidade, valor e período.
- [ ] Conferi pelo menos 3 valores por indicador direto na fonte original.
- [ ] Nenhum valor foi inventado ou estimado; o que falta está vazio.
- [ ] `docs/dados/fontes.md` está atualizado (fonte, link, data de acesso, observações).
- [ ] Nenhum `.env`, backup ou arquivo com dado sensível no commit.
- [ ] Os códigos de indicador seguem o padrão e não se repetem.

### Como isso se liga ao planejamento (sprints)

| Issue | O que este guia cobre |
|---|---|
| CI-05 / CI-06 | Catálogo estruturado e mapeamento de fontes (CSV de indicadores + `fontes.md`) |
| CI-08 | Carga do catálogo (importador de eixos e de indicadores) |
| CI-15 | Importador de planilhas para indicadores sem API (importador de valores) |
| CI-22 | Completar a cobertura nos demais eixos |
| CI-23 | Validação dos dados contra o documento do IPPLAN (seção 6 e prompt de comparação) |

### Glossário

| Termo | Significado |
|---|---|
| **Eixo** | Categoria temática dos indicadores (Saúde, Educação...) |
| **Indicador** | Uma medida (ex.: taxa de aprovação). Fica no catálogo, sem valores. |
| **Valor** | O número de um indicador para um território em um período |
| **Território** | Município, região, estado ou país a que o valor se refere |
| **Período** | Ano (`2023`) ou mês (`2023-06`) a que o valor se refere |
| **Fonte** | Órgão e base de onde o dado foi tirado (IBGE, INEP...) |
| **CSV** | Arquivo de texto que representa uma tabela, exportado do Excel |
| **slug** | Nome curto sem acento e sem espaço, usado como identificador de eixo |
| **upsert** | "Criar se não existe, atualizar se existe": é como o importador grava |
| **migration** | Arquivo que muda a **estrutura** das tabelas (feito pelo time de back-end) |
| **COMCAM** | Região de Campo Mourão usada na comparação do IPPLAN |
