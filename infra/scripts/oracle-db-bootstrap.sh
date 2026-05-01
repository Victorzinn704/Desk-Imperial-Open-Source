#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
COMPOSE_FILE="${REPO_ROOT}/infra/oracle/db/compose.yaml"
ENV_FILE="${REPO_ROOT}/infra/oracle/db/.env"
PGBACKREST_TEMPLATE="${REPO_ROOT}/infra/oracle/db/config/pgbackrest.conf.template"
PG_HBA_TEMPLATE="${REPO_ROOT}/infra/oracle/db/config/pg_hba.conf.template"
PGBACKREST_RUNTIME_DIR="${REPO_ROOT}/infra/oracle/db/.runtime"
PGBACKREST_RUNTIME_FILE="${PGBACKREST_RUNTIME_DIR}/pgbackrest.conf"
PG_HBA_RUNTIME_FILE="${PGBACKREST_RUNTIME_DIR}/pg_hba.conf"
PGBACKREST_RENDERER="${REPO_ROOT}/infra/scripts/render-pgbackrest-config.py"
TEXTFILE_COLLECTOR_DIR="${TEXTFILE_COLLECTOR_DIR:-/var/lib/node_exporter/textfile_collector}"

usage() {
  cat <<'EOF'
Uso: bash infra/scripts/oracle-db-bootstrap.sh [up|down|logs|ps|sync-roles|stanza-create|backup-full|backup-diff|check]

Comandos:
  up           Sobe ou recria a stack de banco.
  down         Derruba a stack de banco.
  logs         Mostra logs da stack de banco.
  ps           Mostra o estado dos serviços.
  sync-roles   Reaplica os usuários e senhas operacionais a partir do .env.
  stanza-create Cria/verifica o stanza do pgBackRest.
  backup-full  Executa backup full via pgBackRest.
  backup-diff  Executa backup differential via pgBackRest.
  check        Executa check e info do pgBackRest.
EOF
}

require_env_file() {
  if [[ ! -f "${ENV_FILE}" ]]; then
    echo "Arquivo ausente: ${ENV_FILE}"
    echo "Copie infra/oracle/db/.env.example para infra/oracle/db/.env e preencha os valores reais."
    exit 1
  fi
}

read_env_value() {
  local key="$1"
  awk -F= -v key="$key" '$1 == key { print substr($0, index($0, "=") + 1); exit }' "${ENV_FILE}"
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
  python3 "${PGBACKREST_RENDERER}" "${ENV_FILE}" "${PG_HBA_TEMPLATE}" "${PG_HBA_RUNTIME_FILE}"
}

write_backup_metric() {
  local type="$1"
  local timestamp
  local target_file

  timestamp="$(date +%s)"
  target_file="${TEXTFILE_COLLECTOR_DIR}/pgbackrest_${type}.prom"

  mkdir -p "${TEXTFILE_COLLECTOR_DIR}"
  cat > "${target_file}" <<EOF
desk_pgbackrest_last_success_timestamp_seconds{type="${type}"} ${timestamp}
EOF
}

compose_cmd() {
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" "$@"
}

sync_roles() {
  local postgres_superuser
  local postgres_superuser_password
  local postgres_db
  local migration_user
  local migration_password
  local app_user
  local app_password
  local bi_user
  local bi_password
  local backup_user
  local backup_password
  local monitor_user
  local monitor_password
  local pgbouncer_auth_user
  local pgbouncer_auth_password

  postgres_superuser="$(read_env_value POSTGRES_SUPERUSER)"
  postgres_superuser_password="$(read_env_value POSTGRES_SUPERUSER_PASSWORD)"
  postgres_db="$(read_env_value POSTGRES_APP_DB)"
  migration_user="$(read_env_value MIGRATION_DB_USER)"
  migration_password="$(read_env_value MIGRATION_DB_PASSWORD)"
  app_user="$(read_env_value APP_DB_USER)"
  app_password="$(read_env_value APP_DB_PASSWORD)"
  bi_user="$(read_env_value BI_DB_USER)"
  bi_password="$(read_env_value BI_DB_PASSWORD)"
  backup_user="$(read_env_value BACKUP_DB_USER)"
  backup_password="$(read_env_value BACKUP_DB_PASSWORD)"
  monitor_user="$(read_env_value MONITOR_DB_USER)"
  monitor_password="$(read_env_value MONITOR_DB_PASSWORD)"
  pgbouncer_auth_user="$(read_env_value PGBOUNCER_AUTH_USER)"
  pgbouncer_auth_password="$(read_env_value PGBOUNCER_AUTH_PASSWORD)"

  if [[ -z "${postgres_superuser}" ]]; then
    postgres_superuser="postgres"
  fi

  if [[ -z "${postgres_db}" ]]; then
    postgres_db="deskimperial"
  fi

  compose_cmd up -d postgres

  compose_cmd exec -T -u postgres \
    -e PGPASSWORD="${postgres_superuser_password}" \
    postgres psql \
      -h 127.0.0.1 \
      -U "${postgres_superuser}" \
      -d "${postgres_db}" \
      -v db_name="${postgres_db}" \
      -v migration_user="${migration_user}" \
      -v migration_password="${migration_password}" \
      -v app_user="${app_user}" \
      -v app_password="${app_password}" \
      -v bi_user="${bi_user}" \
      -v bi_password="${bi_password}" \
      -v backup_user="${backup_user}" \
      -v backup_password="${backup_password}" \
      -v monitor_user="${monitor_user}" \
      -v monitor_password="${monitor_password}" \
      -v pgbouncer_auth_user="${pgbouncer_auth_user}" \
      -v pgbouncer_auth_password="${pgbouncer_auth_password}" <<'SQL'
SELECT CASE
  WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'migration_user')
    THEN format('ALTER ROLE %I WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION', :'migration_user', :'migration_password')
  ELSE format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION', :'migration_user', :'migration_password')
END \gexec

SELECT CASE
  WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user')
    THEN format('ALTER ROLE %I WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION', :'app_user', :'app_password')
  ELSE format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION', :'app_user', :'app_password')
END \gexec

SELECT CASE
  WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'bi_user')
    THEN format('ALTER ROLE %I WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION', :'bi_user', :'bi_password')
  ELSE format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION', :'bi_user', :'bi_password')
END \gexec

SELECT CASE
  WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'backup_user')
    THEN format('ALTER ROLE %I WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION', :'backup_user', :'backup_password')
  ELSE format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION', :'backup_user', :'backup_password')
END \gexec

SELECT CASE
  WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'monitor_user')
    THEN format('ALTER ROLE %I WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION', :'monitor_user', :'monitor_password')
  ELSE format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION', :'monitor_user', :'monitor_password')
END \gexec

SELECT CASE
  WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'pgbouncer_auth_user')
    THEN format('ALTER ROLE %I WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION', :'pgbouncer_auth_user', :'pgbouncer_auth_password')
  ELSE format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION', :'pgbouncer_auth_user', :'pgbouncer_auth_password')
END \gexec

SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'db_name', :'migration_user') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'db_name', :'app_user') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'db_name', :'bi_user') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'db_name', :'backup_user') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'db_name', :'monitor_user') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'db_name', :'pgbouncer_auth_user') \gexec
SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'app_user') \gexec
SELECT format('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO %I', :'app_user') \gexec
SELECT format('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO %I', :'app_user') \gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO %I', :'migration_user', :'app_user') \gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO %I', :'migration_user', :'app_user') \gexec
SELECT format('GRANT pg_monitor TO %I', :'monitor_user') \gexec
SELECT format('GRANT USAGE ON SCHEMA pgbouncer TO %I', :'pgbouncer_auth_user') \gexec
SELECT format('GRANT EXECUTE ON FUNCTION pgbouncer.get_auth(text) TO %I', :'pgbouncer_auth_user') \gexec
SQL
}

main() {
  local action="${1:-up}"
  local stanza=""

  case "${action}" in
    up|down|logs|ps|sync-roles|stanza-create|backup-full|backup-diff|check)
      ;;
    *)
      usage
      exit 1
      ;;
  esac

  require_env_file
  require_docker
  render_pgbackrest_config
  stanza="$(read_env_value PGBACKREST_STANZA)"
  if [[ -z "${stanza}" ]]; then
    stanza="deskimperial"
  fi

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
    sync-roles)
      sync_roles
      ;;
    stanza-create)
      compose_cmd up -d --build postgres pgbackrest
      compose_cmd exec -T -u postgres postgres sh -lc "pgbackrest --stanza='${stanza}' stanza-create"
      ;;
    backup-full)
      compose_cmd up -d postgres pgbackrest
      compose_cmd exec -T -u postgres postgres sh -lc "pgbackrest --stanza='${stanza}' --type=full backup"
      write_backup_metric full
      ;;
    backup-diff)
      compose_cmd up -d postgres pgbackrest
      compose_cmd exec -T -u postgres postgres sh -lc "pgbackrest --stanza='${stanza}' --type=diff backup"
      write_backup_metric diff
      ;;
    check)
      compose_cmd up -d postgres pgbackrest
      compose_cmd exec -T -u postgres postgres sh -lc "pgbackrest --stanza='${stanza}' check && pgbackrest --stanza='${stanza}' info"
      ;;
  esac
}

main "$@"
