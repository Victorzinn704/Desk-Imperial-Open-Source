#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNNER_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPORTS_DIR="${RUNNER_ROOT}/reports"
RESTORE_DIR="${RUNNER_ROOT}/restore"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
REPORT_PATH="${REPORTS_DIR}/restore-check-${TIMESTAMP}.txt"

mkdir -p "${REPORTS_DIR}" "${RESTORE_DIR}"

docker compose -f "${RUNNER_ROOT}/compose.yaml" --env-file "${RUNNER_ROOT}/.env" exec -T utility bash -lc "
  set -euo pipefail
  PG_BINDIR=\"\$(pg_config --bindir)\"
  rm -rf /restore/pgdata
  mkdir -p /restore/pgdata
  pgbackrest --stanza=\"\${PGBACKREST_STANZA}\" --delta --pg1-path=/restore/pgdata restore
  echo \"restore_check_timestamp=${TIMESTAMP}\" > /reports/restore-check-latest.txt
  \"\${PG_BINDIR}/pg_controldata\" /restore/pgdata >> /reports/restore-check-latest.txt
  cp /reports/restore-check-latest.txt /reports/restore-check-${TIMESTAMP}.txt
  rm -rf /restore/pgdata
"

echo "Restore drill concluído: ${REPORT_PATH}"
