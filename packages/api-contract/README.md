# @partner/api-contract

Artefato compartilhado com a especificacao OpenAPI gerada pela API.

## O que existe aqui

- `openapi.json`: especificacao publicada a partir dos schemas registrados pela API

## Fonte de verdade

Este pacote nao e editado manualmente.

Fluxo atual:

1. `apps/api/src/common/openapi/registry.ts` inicializa o registro
2. `apps/api/src/modules/**/**/*.openapi.ts` registram rotas e schemas
3. `apps/api/scripts/generate-openapi.ts` gera `packages/api-contract/openapi.json`

## Comandos

No root do monorepo:

```bash
npm run openapi:generate
npm run openapi:check
```

## Endpoints expostos pela API

- `GET /api/v1/openapi.json`
- `GET /api/v1/docs`

## Uso esperado

- validacao de drift em CI
- insumo para clients e tooling
- referencia publica da superficie HTTP documentada
