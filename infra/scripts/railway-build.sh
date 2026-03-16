#!/usr/bin/env sh
set -eu

service_name="${RAILWAY_SERVICE_NAME:-}"

case "$service_name" in
  imperial-desk-web)
    npm ci
    npm run build --workspace @partner/web
    ;;
  imperial-desk-api|"")
    npm ci
    npm run build --workspace @partner/api
    ;;
  *)
    echo "Servico Railway nao reconhecido para build: $service_name" >&2
    exit 1
    ;;
esac
