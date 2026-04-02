#!/usr/bin/env sh
set -eu

service_name="${RAILWAY_SERVICE_NAME:-}"

case "$service_name" in
  imperial-desk-web)
    echo "Starting Railway service: $service_name"
    cd apps/web
    node ../../node_modules/next/dist/bin/next start --port "${PORT:-3000}"
    ;;
  imperial-desk-api)
    echo "Starting Railway service: $service_name"
    echo "Running Prisma migrations (deploy)"
    cd apps/api
    node ../../node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma
    api_entrypoint=""
    for candidate in "dist/apps/api/src/main.js" "dist/src/main.js" "dist/main.js"; do
      if [ -f "$candidate" ]; then
        api_entrypoint="$candidate"
        break
      fi
    done
    if [ -z "$api_entrypoint" ]; then
      echo "Entrypoint da API nao encontrado em apps/api/dist" >&2
      find dist -maxdepth 4 -name 'main.js' 2>/dev/null || true
      exit 1
    fi
    echo "Starting API with $api_entrypoint"
    node "$api_entrypoint"
    ;;
  *)
    echo "Servico Railway nao reconhecido para start: $service_name" >&2
    exit 1
    ;;
esac
