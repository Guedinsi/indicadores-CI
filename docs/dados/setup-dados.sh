#!/usr/bin/env bash
# Prepara o banco: sobe o db, aplica migrations, seed, e importa os CSVs de docs/dados/csv.
# Ordem: eixos -> indicadores*.csv -> valores*.csv
# Uso (na raiz do repositório): bash docs/dados/setup-dados.sh [--teste]
#   --teste  só valida o CSV de eixos e para: indicadores e valores dependem dos eixos
#            gravados, então só dá para validá-los depois de rodar sem --teste.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
modo="${1:-}"
set -a; source .env; set +a
docker compose up -d db
until docker compose exec -T db pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do sleep 1; done
pnpm --filter api migration:run
docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" < apps/api/src/database/seed-dev.sql

[[ -f docs/dados/csv/eixos.csv ]] && bash docs/dados/importar.sh eixos docs/dados/csv/eixos.csv $modo
if [[ "$modo" == "--teste" ]]; then
  echo "Modo teste: parei após os eixos. Rode sem --teste para importar indicadores e valores."
  exit 0
fi

shopt -s nullglob
for f in docs/dados/csv/indicadores*.csv; do bash docs/dados/importar.sh indicadores "$f"; done
for f in docs/dados/csv/valores*.csv; do bash docs/dados/importar.sh valores "$f"; done
echo "Pronto."
