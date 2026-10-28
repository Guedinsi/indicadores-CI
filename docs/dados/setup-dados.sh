#!/usr/bin/env bash
# Prepara o banco do zero: sobe o db, aplica migrations, seed, e importa os CSVs de docs/dados/csv.
# Uso (na raiz do repositório): bash docs/dados/setup-dados.sh [--teste]
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
modo="${1:-}"
set -a; source .env; set +a
docker compose up -d db
until docker compose exec -T db pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do sleep 1; done
pnpm --filter api migration:run
docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" < apps/api/src/database/seed-dev.sql
for tipo in eixos indicadores; do
  f="docs/dados/csv/$tipo.csv"; [[ -f "$f" ]] && bash docs/dados/importar.sh "$tipo" "$f" $modo
done
for f in docs/dados/csv/valores*.csv; do
  [[ -f "$f" ]] && bash docs/dados/importar.sh valores "$f" $modo
done
echo "Pronto."
