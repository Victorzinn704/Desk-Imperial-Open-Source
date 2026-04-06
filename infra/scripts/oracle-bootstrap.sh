#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
COMPOSE_FILE="${REPO_ROOT}/infra/oracle/compose.yaml"
ENV_FILE="${REPO_ROOT}/infra/oracle/.env"

usage() {
  cat <<'EOF'
Uso: bash infra/scripts/oracle-bootstrap.sh [up|down|logs|ps]

Comandos:
  up    Sobe ou recria a base Oracle.
  down  Derruba a base Oracle.
  logs  Mostra logs da base Oracle.
  ps    Mostra o estado dos servicos.
EOF
}

require_env_file() {
  if [[ ! -f "${ENV_FILE}" ]]; then
    echo "Arquivo ausente: ${ENV_FILE}"
    echo "Copie infra/oracle/.env.example para infra/oracle/.env e preencha os valores DADO AUSENTE."
    exit 1
  fi
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker nao encontrado no host."
    echo "Instale Docker e o plugin Compose na Oracle VM antes de usar este bootstrap."
    exit 1
  fi

  if ! docker compose version >/dev/null 2>&1; then
    echo "O plugin 'docker compose' nao esta disponivel."
    exit 1
  fi
}

main() {
  local action="${1:-up}"

  case "${action}" in
    up|down|logs|ps)
      ;;
    *)
      usage
      exit 1
      ;;
  esac

  require_env_file
  require_docker

  case "${action}" in
    up)
      docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d --build
      docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps
      ;;
    down)
      docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" down
      ;;
    logs)
      shift || true
      docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" logs -f --tail=200 "$@"
      ;;
    ps)
      docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps
      ;;
  esac
}

main "$@"
