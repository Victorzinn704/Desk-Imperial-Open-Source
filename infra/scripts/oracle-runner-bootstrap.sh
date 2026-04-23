#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
COMPOSE_FILE="${REPO_ROOT}/infra/oracle/runner/compose.yaml"
ENV_FILE="${REPO_ROOT}/infra/oracle/runner/.env"
PGBACKREST_TEMPLATE="${REPO_ROOT}/infra/oracle/db/config/pgbackrest.conf.template"
PGBACKREST_RUNTIME_DIR="${REPO_ROOT}/infra/oracle/runner/.runtime"
PGBACKREST_RUNTIME_FILE="${PGBACKREST_RUNTIME_DIR}/pgbackrest.conf"
PGBACKREST_RENDERER="${REPO_ROOT}/infra/scripts/render-pgbackrest-config.py"
RUNNER_SCRIPT_DIR="${REPO_ROOT}/infra/oracle/runner/scripts"

usage() {
  cat <<'EOF'
Uso: bash infra/scripts/oracle-runner-bootstrap.sh [up|down|logs|ps|restore-check|pgbadger]

Comandos:
  up            Sobe ou recria a utility stack do runner.
  down          Derruba a stack do runner.
  logs          Mostra logs do runner.
  ps            Mostra o estado dos serviços.
  restore-check Executa um restore drill com pgBackRest.
  pgbadger      Gera um relatório pgBadger a partir dos logs recentes da Ampere.
EOF
}

require_env_file() {
  if [[ ! -f "${ENV_FILE}" ]]; then
    echo "Arquivo ausente: ${ENV_FILE}"
    echo "Copie infra/oracle/runner/.env.example para infra/oracle/runner/.env e preencha os valores reais."
    exit 1
  fi
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker não encontrado no host."
    exit 1
  fi

  if ! docker compose version >/dev/null 2>&1; then
    echo "O plugin 'docker compose' não está disponível."
    exit 1
  fi
}

render_pgbackrest_config() {
  mkdir -p "${PGBACKREST_RUNTIME_DIR}"
  python3 "${PGBACKREST_RENDERER}" "${ENV_FILE}" "${PGBACKREST_TEMPLATE}" "${PGBACKREST_RUNTIME_FILE}"
}

compose_cmd() {
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" "$@"
}

main() {
  local action="${1:-up}"

  case "${action}" in
    up|down|logs|ps|restore-check|pgbadger)
      ;;
    *)
      usage
      exit 1
      ;;
  esac

  require_env_file
  require_docker
  render_pgbackrest_config

  case "${action}" in
    up)
      compose_cmd up -d --build
      compose_cmd ps
      ;;
    down)
      compose_cmd down
      ;;
    logs)
      shift || true
      compose_cmd logs -f --tail=200 "$@"
      ;;
    ps)
      compose_cmd ps
      ;;
    restore-check)
      compose_cmd up -d --build
      bash "${RUNNER_SCRIPT_DIR}/restore-check.sh"
      ;;
    pgbadger)
      compose_cmd up -d --build
      bash "${RUNNER_SCRIPT_DIR}/pgbadger-report.sh"
      ;;
  esac
}

main "$@"
