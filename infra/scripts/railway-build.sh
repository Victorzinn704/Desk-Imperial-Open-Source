#!/usr/bin/env sh
set -eu

service_name="${RAILWAY_SERVICE_NAME:-}"

case "$service_name" in
  imperial-desk-web)
    echo "Building Railway service: $service_name"
    npm run build --workspace @partner/web
    ;;
  imperial-desk-api)
    echo "Building Railway service: $service_name"
    npm run build --workspace @partner/api
    ;;
  *)
    echo "Servico Railway nao reconhecido para build: $service_name" >&2
    exit 1
    ;;
esac
