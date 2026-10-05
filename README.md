# indicadores-CI
Software que coleta indicadores relevantes de CI (Cidades Inteligentes) de bases governamentais, calcula, e organiza em uma interface gráfica

## Sobre o projeto

O objetivo é minerar bases de dados públicas, calcular os indicadores do município de Campo Mourão e exibi-los.

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

Organização sugerida dos módulos da API:

```
apps/api/src/
├── modules/
│   ├── indicators/      # entidades, cálculo e endpoints de leitura
│   ├── data-sources/    # conectores das bases públicas
│   └── ingestion/       # rotinas que buscam e normalizam os dados
├── database/            # data-source.ts e migrations
└── main.ts
```

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

| Variável| 
(Descrição)
-----------
|`DB_HOST`, `DB_PORT`| 
(Endereço do PostgreSQL. Use `localhost` ao rodar a API fora do Docker.) 
|`DB_USER`, `DB_PASSWORD`, `DB_NAME`| 
(Credenciais e nome do banco.) 
|`API_PORT`| 
(Porta da API (padrão `3001`).) 
|`WEB_URL`| 
(URL do front, usada no CORS da API.) 
|`NEXT_PUBLIC_API_URL`|
(URL da API acessada pelo navegador. É embutida no build do Next.)
|`API_URL_INTERNAL`|
(URL da API acessada pelo servidor do Next dentro do Docker (`http://api:3001`).)

## Desenvolvimento local

Fluxo recomendado para o dia a dia, com hot reload: apps rodando na máquina e apenas o banco no Docker.

```bash
docker compose up -d db    # sobe somente o PostgreSQL
pnpm dev:api               # API em http://localhost:3001
pnpm dev:web               # Web em http://localhost:3000
```

Caso ocorra o erro Permission Denied ao rodar o docker, adicione o usuário ao grupo do docker:
```bash
sudo usermod -aG docker $USER
su -l $USER
```

Rode cada app em um terminal separado.

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

Esses scripts precisam estar definidos em `apps/api/package.json`, apontando para o `src/database/data-source.ts`:

```json
"typeorm": "typeorm-ts-node-commonjs -d src/database/data-source.ts",
"migration:generate": "pnpm typeorm migration:generate",
"migration:run": "pnpm typeorm migration:run",
"migration:revert": "pnpm typeorm migration:revert"
```

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

Para aplicar as migrations com o projeto rodando no Docker, rode-as pela sua máquina com o banco exposto na porta `5432` (`DB_HOST=localhost` no `.env`).

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
- [ ] Modelo de dados dos indicadores
- [ ] Conectores e ingestão das bases governamentais
- [ ] Cálculo dos indicadores
- [ ] Dashboard para visualização dos indicadores
- [ ] Autenticação com SuperTokens
- [ ] Pipeline de CI (lint e build em cada PR)