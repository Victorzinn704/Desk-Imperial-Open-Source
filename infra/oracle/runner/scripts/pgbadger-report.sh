#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNNER_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${RUNNER_ROOT}/.env"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Arquivo ausente: ${ENV_FILE}"
  exit 1
fi

# shellcheck source=/dev/null
source "${ENV_FILE}"

: "${AMPERE_SSH_HOST:?AMPERE_SSH_HOST obrigatorio}"
: "${AMPERE_SSH_USER:?AMPERE_SSH_USER obrigatorio}"
: "${AMPERE_SSH_KEY_PATH:?AMPERE_SSH_KEY_PATH obrigatorio}"
: "${AMPERE_DOCKER_CONTAINER:?AMPERE_DOCKER_CONTAINER obrigatorio}"
: "${AMPERE_LOG_GLOB:?AMPERE_LOG_GLOB obrigatorio}"

REPORTS_DIR="${RUNNER_ROOT}/reports"
RAW_DIR="${REPORTS_DIR}/raw"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RAW_LOG_PATH="${RAW_DIR}/postgres-${TIMESTAMP}.jsonlog"
HTML_REPORT_PATH="${REPORTS_DIR}/pgbadger-${TIMESTAMP}.html"
LATEST_REPORT_PATH="${REPORTS_DIR}/pgbadger-latest.html"
AMPERE_LOG_DIR="$(dirname "${AMPERE_LOG_GLOB}")"
AMPERE_LOG_PATTERN="$(basename "${AMPERE_LOG_GLOB}")"

mkdir -p "${REPORTS_DIR}" "${RAW_DIR}"

ssh -i "${AMPERE_SSH_KEY_PATH}" \
  -o StrictHostKeyChecking=accept-new \
  -o UserKnownHostsFile=/dev/null \
  "${AMPERE_SSH_USER}@${AMPERE_SSH_HOST}" \
  "sudo docker exec ${AMPERE_DOCKER_CONTAINER} sh -lc 'find \"${AMPERE_LOG_DIR}\" -maxdepth 1 -type f -name \"${AMPERE_LOG_PATTERN}\" -mtime -2 -print0 | xargs -0 cat'" \
  > "${RAW_LOG_PATH}"

if [[ ! -s "${RAW_LOG_PATH}" ]]; then
  echo "Nenhum log JSON recente foi capturado da Ampere."
  exit 1
fi

docker compose -f "${RUNNER_ROOT}/compose.yaml" --env-file "${ENV_FILE}" exec -T utility bash -lc "
  set -euo pipefail
  pgbadger -f jsonlog -q -o /reports/pgbadger-${TIMESTAMP}.html /reports/raw/$(basename "${RAW_LOG_PATH}")
  cp /reports/pgbadger-${TIMESTAMP}.html /reports/pgbadger-latest.html
"

echo "Relatório pgBadger gerado: ${HTML_REPORT_PATH}"
echo "Relatório atual: ${LATEST_REPORT_PATH}"
