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
| Autenticação (planejado) | SuperTokens |

## Estrutura do repositório

Monorepo com pnpm workspaces:

```
indicadores-CI/
├── apps/
│   ├── api/                 # NestJS (API, cálculo e ingestão de dados)
│   └── web/                 # Next.js (dashboard)
├── packages/
│   └── shared/              # tipos e DTOs compartilhados (opcional)
├── docker/
│   ├── api.Dockerfile
│   └── web.Dockerfile
├── docker-compose.yml
├── .env.example
├── .nvmrc
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

Organização atual da API:

```
apps/api/src/
├── modules/
│   ├── indicators/          # entidades, serviço e endpoints de leitura
│   │   └── entities/        # axis, indicator, indicator-value, territory
│   └── ingestion/           # fontes e execuções de ingestão
│       └── entities/        # data-source, ingestion-run
├── database/
│   ├── data-source.ts       # configuração usada pela CLI do TypeORM
│   ├── migrations/          # histórico do esquema do banco
│   └── seed-dev.sql         # dados iniciais de desenvolvimento
├── app.module.ts
└── main.ts
```

Os conectores das bases públicas e os cálculos entram em `modules/ingestion/` e em um módulo de cálculo, nas próximas etapas.

## Modelo de dados

| Tabela | O que guarda |
|---|---|
| `axis` | Eixos/categorias (Economia, Educação, Saúde...) |
| `indicator` | Catálogo: código, nome, unidade, fórmula, eixo e fonte |
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
| `WEB_URL` | URL do front, usada no CORS da API. |
| `NEXT_PUBLIC_API_URL` | URL da API acessada pelo navegador. É embutida no build do Next. |
| `API_URL_INTERNAL` | URL da API acessada pelo servidor do Next dentro do Docker (`http://api:3001`). |
| `CITY_IBGE_CODE` | (Opcional) Código IBGE do município exibido no dashboard. Padrão `4104303` (Campo Mourão). |

## Desenvolvimento local

Fluxo recomendado para o dia a dia, com hot reload: apps rodando na máquina e apenas o banco no Docker.

```bash
docker compose up -d db    # sobe somente o PostgreSQL
pnpm --filter api migration:run   # cria as tabelas (primeira vez e a cada nova migration)
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

Na primeira vez, depois de aplicar as migrations, carregue o catálogo mínimo (eixos, territórios e os indicadores IFGF, IFDM e IDHM). O script pode ser executado mais de uma vez sem duplicar nada:

```bash
docker compose exec -T db psql -U <DB_USER> -d <DB_NAME> < apps/api/src/database/seed-dev.sql
```

O seed **não cria valores de indicadores**. Enquanto não houver ingestão, o dashboard mostra `--` nos cards. Os valores devem vir das fontes reais.

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

Indicador inexistente retorna `404`. Os filtros `axis`, `period` e `territory` são opcionais.

## Build e execução de produção (sem Docker)

```bash
pnpm build                       # compila api e web
pnpm --filter api start:prod     # node dist/main
pnpm --filter web start          # next start
```

## Executando tudo com Docker

```bash
docker compose up --build        # builda e sobe db, api e web
docker compose up -d --build     # mesmo, em segundo plano
docker compose logs -f api       # acompanha os logs de um serviço
docker compose ps                # status dos containers
docker compose down              # para e remove os containers
docker compose down -v           # idem, mas APAGA os dados do banco (volume)
```

Para aplicar as migrations e o seed com o projeto rodando no Docker, rode-os pela sua máquina com o banco exposto na porta `5432` (`DB_HOST=localhost` no `.env`).

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

## Fluxo de contribuição

1. Crie uma branch a partir da `main` (ex.: `feat/nome-da-tarefa`, `fix/nome-do-bug`).
2. Faça commits pequenos e descritivos.
3. Abra um Pull Request para a `main` e aguarde a revisão.
4. Antes de abrir o PR, confira que `pnpm lint` e `pnpm build` passam.

## Roadmap

- [x] Estrutura inicial do monorepo (Next.js + NestJS + PostgreSQL)
- [ ] Modelo de dados dos indicadores (entidades e migration inicial)
- [ ] API de leitura dos indicadores
- [ ] Dashboard consumindo a API (cards, filtros, evolução e comparativo)
- [ ] Seed do catálogo completo de indicadores (a partir da planilha do IPPLAN)
- [ ] Conectores e ingestão das bases governamentais
- [ ] Cálculo dos indicadores
- [ ] Autenticação com SuperTokens
- [ ] Pipeline de CI (lint e build em cada PR)