#!/usr/bin/env bash
# Importa um CSV de eixos, indicadores ou valores para o banco do projeto (que roda no Docker).
#
# Uso:   bash docs/dados/importar.sh <eixos|indicadores|valores> <arquivo.csv> [--teste]
# Ex.:   bash docs/dados/importar.sh valores docs/dados/csv/valores-educacao.csv --teste
#
# --teste  roda tudo e mostra o resultado, mas DESFAZ no final (nada é gravado).
#          Use sempre primeiro; se o resultado estiver certo, rode de novo sem --teste.
#
# Pré-requisitos: banco no ar (docker compose up -d db), migrations aplicadas e .env na raiz.

set -euo pipefail

uso() {
  sed -n '2,11p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
  exit 1
}

tipo="${1:-}"
arquivo="${2:-}"
modo="${3:-}"

[[ "$tipo" =~ ^(eixos|indicadores|valores)$ ]] || { echo "Erro: tipo deve ser eixos, indicadores ou valores."; echo; uso; }
[[ -n "$arquivo" ]] || { echo "Erro: informe o arquivo CSV."; echo; uso; }
[[ -f "$arquivo" ]] || { echo "Erro: arquivo não encontrado: $arquivo"; exit 1; }
[[ -z "$modo" || "$modo" == "--teste" ]] || { echo "Erro: opção desconhecida: $modo"; echo; uso; }

# Caminho absoluto do CSV (antes de entrar na raiz do repositório)
arquivo_abs="$(realpath "$arquivo")"
raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$raiz"

[[ -f .env ]] || { echo "Erro: .env não encontrado em $raiz (copie o .env.example)."; exit 1; }

# Lê uma variável do .env sem executar o arquivo (remove aspas e CR)
env_var() { grep -E "^$1=" .env | tail -n1 | cut -d= -f2- | tr -d '\r' | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'\$//"; }
DB_USER="$(env_var DB_USER)"
DB_NAME="$(env_var DB_NAME)"
[[ -n "$DB_USER" && -n "$DB_NAME" ]] || { echo "Erro: DB_USER e DB_NAME precisam estar no .env."; exit 1; }

# O arquivo precisa estar em UTF-8 (no Excel: "CSV UTF-8")
if ! iconv -f UTF-8 -t UTF-8 "$arquivo_abs" > /dev/null 2>&1; then
  echo "Erro: o arquivo não está em UTF-8. No Excel use 'Salvar como > CSV UTF-8 (delimitado por vírgulas)'."
  exit 1
fi

# Delimitador: ';' (Excel em português) ou ',' — decidido pela linha de cabeçalho
cabecalho="$(head -n1 "$arquivo_abs")"
n_ponto_virgula="$(printf '%s' "$cabecalho" | tr -cd ';' | wc -c)"
n_virgula="$(printf '%s' "$cabecalho" | tr -cd ',' | wc -c)"
delim=','
(( n_ponto_virgula > n_virgula )) && delim=';'

finish="COMMIT"
[[ "$modo" == "--teste" ]] && finish="ROLLBACK"

echo "Tipo: $tipo | Arquivo: $arquivo | Delimitador: '$delim' | Modo: $([[ $finish == ROLLBACK ]] && echo 'TESTE (nada será gravado)' || echo 'GRAVAÇÃO')"
echo

# Copia o CSV para dentro do container do banco, roda o importador e limpa
docker compose cp "$arquivo_abs" db:/tmp/import.csv > /dev/null
docker compose exec -T -u root db chmod 644 /tmp/import.csv
status=0
docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -q \
  -v ON_ERROR_STOP=1 -v file=/tmp/import.csv -v delim="$delim" -v finish="$finish" \
  -f - < "$raiz/docs/dados/importar-$tipo.sql" || status=$?
docker compose exec -T -u root db rm -f /tmp/import.csv

if (( status != 0 )); then
  echo
  echo "FALHOU: nada foi gravado. Leia a mensagem 'ERROR' acima, corrija o CSV e rode de novo."
  exit "$status"
fi
