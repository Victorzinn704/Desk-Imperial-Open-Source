#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"
COMPOSE_FILE="${REPO_ROOT}/infra/oracle/db/compose.yaml"
ENV_FILE="${REPO_ROOT}/infra/oracle/db/.env"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Arquivo ausente: ${ENV_FILE}"
  exit 1
fi

set -a
source "${ENV_FILE}"
set +a

docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T postgres \
  psql -U "${MIGRATION_DB_USER:?MIGRATION_DB_USER obrigatorio}" -d "${POSTGRES_APP_DB:-deskimperial}" -f /etc/desk-sql/refresh-bi.sql
