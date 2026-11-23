# indicadores-CI
Software que coleta indicadores relevantes de CI (Cidades Inteligentes) de bases governamentais, calcula, e organiza em uma interface gráfica

## Sobre o projeto

O objetivo é minerar bases de dados públicas, calcular os indicadores do município de Campo Mourão e exibi-los.

Os indicadores são organizados por eixo (categoria) e comparados em quatro níveis territoriais: **Município (Campo Mourão) × Região (COMCAM) × Paraná × Brasil**. Os valores ficam gravados no banco, e o dashboard apenas os consulta pela API.

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Front-end | Next.js (React + TypeScript + Tailwind) |
| Back-end | NestJS (TypeScript) |
| Banco de dados | PostgreSQL via TypeORM |
| Gerenciador de pacotes | pnpm com workspaces |
| Containerização | Docker e Docker Compose |
| Autenticação | SuperTokens (e-mail e senha, sessão por cookie) |

A coleta dos dados nas bases públicas é feita por scripts Python em `docs/dados/scripts/` (veja [Carga de dados](#carga-de-dados)).

## Modelo de dados

| Tabela | O que guarda |
|---|---|
| `axis` | Eixos/categorias (Gestão Pública, Educação, Saúde...) |
| `indicator` | Catálogo: código, nome, unidade, fórmula, eixo, fonte, tipo (`kind`: total ou taxa) e polaridade (`polarity`: maior ou menor é melhor) |
| `territory` | Município, região, estado e país, com hierarquia (`parent_id`) |
| `indicator_value` | Valor de um indicador para um território em um período |
| `data_source` | Fontes públicas de onde os dados vêm |
| `ingestion_run` | Registro de cada execução de ingestão |

Pontos importantes:
- `indicator_value` tem unicidade em (indicador, território, período). Reexecutar uma ingestão atualiza o valor em vez de duplicar.
- `value = null` significa **sem dado** e é diferente de zero. O dashboard mostra `--`.
- O período é um texto ordenável: `"2023"` (anual) ou `"2023-06"` (mensal).

## Pré-requisitos

- Node.js 20 ou superior (a versão usada está em `.nvmrc`: `nvm use`)
- pnpm (via corepack: `corepack enable`)
- Docker e Docker Compose
- Python 3.10 ou superior, para os scripts de coleta de dados (só biblioteca padrão)
- (Opcional) Projeto no Google Cloud, para os dados da Base dos Dados (RAIS, CAGED, leitos)

## Configuração inicial

```bash
git clone git@github.com:Guedinsi/indicadores-CI.git
cd indicadores-CI
corepack enable
pnpm install
cp .env.example .env
```

Edite o `.env` e troque ao menos a senha do banco. **Nunca** faça commit do `.env`: apenas o `.env.example` é versionado.

### Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `DB_HOST`, `DB_PORT` | Endereço do PostgreSQL. Use `localhost` ao rodar a API fora do Docker. |
| `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Credenciais e nome do banco. |
| `API_PORT` | Porta da API (padrão `3001`). |
| `WEB_URL` | URL do front, usada no CORS da API e pelo SuperTokens. |
| `API_PUBLIC_URL` | URL pública da API, usada pelo SuperTokens para os cookies de sessão. |
| `SUPERTOKENS_PORT` | Porta do core do SuperTokens publicada na máquina (padrão `3567`). |
| `SUPERTOKENS_CONNECTION_URI` | Endereço do core. `http://localhost:3567` fora do Docker; no Docker o compose usa `http://supertokens:3567`. |
| `SUPERTOKENS_API_KEY` | Chave do core. Vazia em desenvolvimento; defina em produção. |
| `NEXT_PUBLIC_API_URL` | URL da API acessada pelo navegador. É embutida no build do Next. |
| `NEXT_PUBLIC_WEB_URL` | URL do site, usada pelo SuperTokens no navegador. Também embutida no build. |
| `API_URL_INTERNAL` | URL da API acessada pelo servidor do Next dentro do Docker (`http://api:3001`). |
| `CITY_IBGE_CODE` | (Opcional) Código IBGE do município exibido no dashboard. Padrão `4104303` (Campo Mourão). |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` | Servidor de e-mail da confirmação de conta e da redefinição de senha. Em desenvolvimento, o Mailpit (`localhost:1025`, sem usuário). Em produção, um SMTP real (`SMTP_SECURE=true` na porta 465). |
| `SMTP_FROM_NAME`, `SMTP_FROM_EMAIL` | Remetente dos e-mails. |
| `MAIL_UI_PORT` | Porta da caixa de entrada do Mailpit (padrão `8025`). |
| `PASSWORD_BREACH_CHECK` | `true` recusa senhas que aparecem em vazamentos conhecidos (consulta o Have I Been Pwned). |
| `RATE_LIMIT_AUTH`, `RATE_LIMIT_GERAL` | Limite de requisições por IP: login/cadastro (a cada 15 min) e demais rotas da API (por minuto). |
| `TRUST_PROXY` | Em produção atrás de proxy reverso, para o limite usar o IP real do cliente. Vazio em desenvolvimento. |
| `COOKIE_DOMAIN` | Domínio do cookie de sessão, quando site e API ficam em subdomínios diferentes. Vazio em desenvolvimento. |

`BD_BILLING_PROJECT_ID` (projeto do Google Cloud da Base dos Dados) não vai no `.env`: é lido pelos scripts de coleta a partir do terminal (veja [Carga de dados](#carga-de-dados)).

## Desenvolvimento local

Fluxo recomendado para o dia a dia, com hot reload: apps rodando na máquina e apenas o banco no Docker.

```bash
docker compose up -d db supertokens mailpit   # PostgreSQL, core do SuperTokens e caixa de e-mail de teste
pnpm --filter api migration:run                # cria as tabelas (primeira vez e a cada nova migration)
pnpm dev:api               # API em http://localhost:3001
pnpm dev:web               # Web em http://localhost:3000
```

Caso ocorra o erro Permission Denied ao rodar o docker, adicione o usuário ao grupo do docker:
```bash
sudo usermod -aG docker $USER
su -l $USER
```

Rode cada app em um terminal separado.

### Dados iniciais (seed de desenvolvimento)

Na primeira vez, depois de aplicar as migrations, carregue os eixos e os territórios. O seed não cria indicadores nem valores: o catálogo e os dados reais vêm dos scripts de `docs/dados` (veja `docs/dados/fontes.md`; `bash docs/dados/setup-dados.sh` faz tudo de uma vez). O script pode ser executado mais de uma vez sem duplicar nada:

```bash
set -a; source .env; set +a
docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" < apps/api/src/database/seed-dev.sql
```

O seed **não cria valores de indicadores**. Enquanto não houver dados importados, o dashboard mostra `--` nos cards. Os valores devem vir das fontes reais.

## Carga de dados

Os dados chegam ao banco em duas etapas: scripts Python baixam as bases públicas e gravam CSVs em `docs/dados/csv/`, e o importador valida e grava esses CSVs no PostgreSQL (transação única, repetir é seguro, modo de teste com `--teste`). Os CSVs de valores baixados (`valores-<fonte>.csv`) são gerados pelos scripts. Já o `eixos.csv`, os catálogos (`indicadores-*.csv`) e os valores digitados (`valores-ipplan.csv`, `valores-pdf-manual.csv`) não saem de nenhum script e precisam estar em `docs/dados/csv/` antes do `setup-dados.sh`.

```bash
# 1. baixa todas as fontes automáticas (~25 min na primeira vez; depois usa o cache)
python3 docs/dados/scripts/baixar_tudo.py
python3 docs/dados/scripts/baixar_tudo.py --so ibge,siconfi    # só algumas fontes
python3 docs/dados/scripts/baixar_tudo.py --pular bcb,tse      # pula as mais demoradas

# 2. prepara o banco (migrations e seed) e importa eixos, catálogos e valores
bash docs/dados/setup-dados.sh
```

Cada script também roda sozinho e aceita `--so CODIGO1,CODIGO2` (ex.: `python3 docs/dados/scripts/baixar_siconfi.py --desde 2022`). Para importar um arquivo só, conferindo antes:

```bash
bash docs/dados/importar.sh valores docs/dados/csv/valores-ibge.csv --teste   # valida e desfaz
bash docs/dados/importar.sh valores docs/dados/csv/valores-ibge.csv           # grava
```

**Base dos Dados (RAIS, CAGED, leitos).** Precisa de um projeto no Google Cloud (o BigQuery tem 1 TB grátis por mês) e do pacote `basedosdados`, instalado num ambiente virtual:

```bash
python3 -m venv ~/.venvs/indicadores
~/.venvs/indicadores/bin/pip install basedosdados
export BD_BILLING_PROJECT_ID=id-do-seu-projeto      # coloque no ~/.bashrc para não repetir
~/.venvs/indicadores/bin/python docs/dados/scripts/baixar_tudo.py   # com o Python do venv, inclui a Base dos Dados
```

Na primeira execução o pacote pede para autorizar a conta Google no navegador. Sem `BD_BILLING_PROJECT_ID`, o `baixar_tudo.py` pula essa fonte.

**INEP (rendimento escolar e ensino superior).** O site do INEP não aceita download por script. Baixe os `.zip` pelo navegador (links no início de `docs/dados/scripts/ler_inep.py`) e salve, sem extrair, em `docs/dados/brutos/`. O `baixar_tudo.py` lê o que estiver lá.

**Dados sem fonte online.** Os indicadores que só existem no documento do IPPLAN foram digitados em `docs/dados/csv/indicadores-pdf-manual.csv` e `valores-pdf-manual.csv`. Para corrigir um valor, edite o CSV e rode o `setup-dados.sh` de novo.

As fontes de cada indicador, o período coberto, a conferência com o documento do IPPLAN e o que continua manual estão em [`docs/dados/fontes.md`](docs/dados/fontes.md).

## Autenticação (SuperTokens)

Login e cadastro por e-mail e senha, com sessão por cookie, confirmação de e-mail obrigatória e redefinição de senha. O core do SuperTokens roda em um container e guarda usuários e sessões em um banco `supertokens` no mesmo PostgreSQL. Os e-mails saem pelo SMTP configurado no `.env`; em desenvolvimento, caem no Mailpit (http://localhost:8025) e não chegam a ninguém de verdade.

- **API:** as rotas `/api/auth/*` (login, cadastro, logout, refresh, confirmação de e-mail e redefinição de senha) são tratadas pelo SuperTokens. O `AuthGuard` protege rotas, e `GET /api/me` devolve os dados do usuário logado.
- **Web:** `/auth` mostra login e cadastro, e `/usuario` é a página do usuário (exige login). O botão "Entrar / Minha conta" fica no cabeçalho do dashboard.
- O dashboard e os endpoints de indicadores continuam públicos.

Para testar: suba o banco, o core e o Mailpit (`docker compose up -d db supertokens mailpit`), rode a API e o site, abra http://localhost:3000, clique em **Entrar** e crie uma conta. O link de confirmação aparece em http://localhost:8025. Se o core não subir por falta do banco, crie-o uma vez:

```bash
set -a; source .env; set +a
docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c "CREATE DATABASE supertokens;"
docker compose restart supertokens
```

Em produção: defina `SUPERTOKENS_API_KEY`, use HTTPS e fixe a versão da imagem do core.

## Migrations (TypeORM)

O projeto usa migrations (`synchronize: false`). Não altere o esquema do banco manualmente.

```bash
# gerar uma migration a partir das mudanças nas entidades
pnpm --filter api migration:generate src/database/migrations/NomeDaMigration

# aplicar migrations pendentes
pnpm --filter api migration:run

# desfazer a última migration
pnpm --filter api migration:revert
```

A CLI do TypeORM lê o código **compilado** (`dist/`), por isso os scripts rodam o build antes. Eles precisam estar definidos em `apps/api/package.json`:

```json
"migration:generate": "pnpm build && typeorm migration:generate -d dist/database/data-source.js",
"migration:run": "pnpm build && typeorm migration:run -d dist/database/data-source.js",
"migration:revert": "pnpm build && typeorm migration:revert -d dist/database/data-source.js"
```

Depois de gerar uma migration, revise o arquivo antes de commitar.

## API

Todas as rotas têm o prefixo `/api`.

| Rota | Descrição |
|---|---|
| `GET /api/axes` | Eixos com a contagem de indicadores |
| `GET /api/periods` | Períodos que têm algum valor gravado |
| `GET /api/indicators/latest?axis=&period=` | Indicadores com o valor do município (mais recente ou do período pedido) |
| `GET /api/indicators/:code/values?territory=` | Série temporal de um indicador |
| `GET /api/indicators/:code/comparison?period=` | Município × região × estado × país no mesmo período |
| `GET /api/me` | Dados do usuário logado (ID, e-mail, data de criação). Exige login: sem sessão retorna `401`. |
| `/api/auth/*` | Login, cadastro, logout, refresh de sessão, confirmação de e-mail e redefinição de senha (SuperTokens) |

Indicador inexistente retorna `404`. Os filtros `axis`, `period` e `territory` são opcionais. As rotas de indicadores são públicas.

## Build e execução de produção (sem Docker)

```bash
pnpm build                       # compila api e web
pnpm --filter api start:prod     # node dist/main
pnpm --filter web start          # next start
```

## Executando tudo com Docker

```bash
docker compose up --build        # builda e sobe db, supertokens, mailpit, api e web
docker compose up -d --build     # mesmo, em segundo plano
docker compose logs -f api       # acompanha os logs de um serviço
docker compose ps                # status dos containers
docker compose down              # para e remove os containers
docker compose down -v           # idem, mas APAGA os dados do banco (volume)
```

Para aplicar as migrations, o seed e a carga de dados com o projeto rodando no Docker, rode `bash docs/dados/setup-dados.sh` pela sua máquina, com o banco exposto na porta `5432` (`DB_HOST=localhost` no `.env`).

## Qualidade de código

```bash
pnpm lint                        # lint em todos os apps
pnpm --filter api test           # testes unitários da API
pnpm --filter api test:e2e       # testes e2e da API
```

## Comandos úteis do pnpm

```bash
pnpm --filter api <script>       # executa um script só na API (ex.: start:dev)
pnpm --filter web <script>       # executa um script só no front (ex.: dev)
pnpm --filter api add <pacote>   # instala dependência só na API
pnpm --filter web add <pacote>   # instala dependência só no front
pnpm add -D -w <pacote>          # dependência de desenvolvimento na raiz
```

## Endereços locais

| Serviço    | URL                   |
|------------|-----------------------|
| Web        | http://localhost:3000 |
| API        | http://localhost:3001 |
| PostgreSQL | localhost:5432        |
| SuperTokens (core) | http://localhost:3567 |
| Mailpit (e-mails de teste) | http://localhost:8025 |
| Dashboard (visão geral, evolução e comparativo) | http://localhost:3000 |
| Páginas Indicadores e Comparativos (ainda só com título) | http://localhost:3000/indicadores, http://localhost:3000/comparativos |
| Login e cadastro | http://localhost:3000/auth |
| Página do usuário | http://localhost:3000/usuario |

## Fluxo de contribuição

1. Crie uma branch a partir da `main` (ex.: `feat/nome-da-tarefa`, `fix/nome-do-bug`).
2. Faça commits pequenos e descritivos.
3. Abra um Pull Request para a `main` e aguarde a revisão.
4. Antes de abrir o PR, confira que `pnpm lint` e `pnpm build` passam.

## Roadmap

- [x] Estrutura inicial do monorepo (Next.js + NestJS + PostgreSQL)
- [x] Modelo de dados dos indicadores (entidades e migration inicial)
- [x] API de leitura dos indicadores
- [x] Dashboard consumindo a API (cards, filtros, evolução e comparativo)
- [x] Importadores CSV e guia de carga de dados
- [x] Catálogo de indicadores do IPPLAN (CSV) e registro de fontes
- [x] Autenticação com SuperTokens (login, cadastro e página do usuário)
- [x] Scripts de coleta das bases governamentais e carga dos valores reais (185 de 186 indicadores com dado)
- [x] Comparativo com COMCAM e Paraná e crescimento entre dois anos no dashboard
- [ ] Indicadores pendentes: taxa de homicídios e CFEM arrecadada (servidor da ANM fora do ar)
- [ ] Ingestão agendada (hoje a atualização é manual, pelos scripts)
- [ ] Cálculo dos indicadores
- [x] Confirmação de e-mail, recuperação de senha e tradução do login para pt-BR
- [x] Navegação lateral do dashboard
- [ ] Conteúdo das páginas Indicadores e Comparativos
- [ ] Papéis e permissões
- [ ] Pipeline de CI (lint e build em cada PR)
