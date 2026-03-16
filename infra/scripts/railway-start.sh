#!/usr/bin/env sh
set -eu

service_name="${RAILWAY_SERVICE_NAME:-}"

case "$service_name" in
  imperial-desk-web)
    echo "Starting Railway service: $service_name"
    npm --workspace @partner/web run start
    ;;
  imperial-desk-api)
    echo "Starting Railway service: $service_name"
    npm --workspace @partner/api run start
    ;;
  *)
    echo "Servico Railway nao reconhecido para start: $service_name" >&2
    exit 1
    ;;
esac
