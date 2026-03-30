#!/usr/bin/env sh
set -eu

service_name="${RAILWAY_SERVICE_NAME:-}"

case "$service_name" in
  imperial-desk-web)
    echo "Building Railway service: $service_name"
    cd apps/web
    node ../../node_modules/next/dist/bin/next build
    ;;
  imperial-desk-api)
    echo "Building Railway service: $service_name"
    cd apps/api
    node ../../node_modules/prisma/build/index.js generate --schema prisma/schema.prisma
    ../../node_modules/.bin/nest build --builder tsc
    node -e "const fs=require('fs');const candidates=['dist/main.js','dist/src/main.js','dist/apps/api/src/main.js'];const source=candidates.find((file)=>file!=='dist/main.js'&&fs.existsSync(file));if(source){fs.copyFileSync(source,'dist/main.js')}else if(!fs.existsSync('dist/main.js')){console.error('Nenhum entrypoint do Nest encontrado em dist.');process.exit(1)}"
    ;;
  *)
    echo "Servico Railway nao reconhecido para build: $service_name" >&2
    exit 1
    ;;
esac
