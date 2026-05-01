# packages/types

Pacote compartilhado de contratos entre `apps/api` e `apps/web`.

## Regra principal

Os contratos aqui sao Zod-first.

- o schema e a fonte de verdade
- o tipo TypeScript e derivado com `z.infer`
- API e Web importam do mesmo lugar

## Conteudo atual

- schemas Zod de transporte em `src/contracts.ts`
- tipos inferidos a partir desses schemas
- patterns de validacao compartilhados em `src/validation-patterns.ts`

## Exemplo

```ts
import { healthResponseSchema, type HealthResponse } from '@contracts/contracts'

const parsed: HealthResponse = healthResponseSchema.parse(payload)
```

## Quando colocar algo aqui

Coloque neste pacote:

- request/response shapes compartilhados entre workspaces
- records expostos pela API e consumidos pelo Web
- enums e validacoes reutilizadas por mais de um workspace

Nao coloque aqui:

- tipos internos de dominio da API
- tipos do Prisma
- estados locais de UI

## Arquivos principais

- `src/contracts.ts`
- `src/validation-patterns.ts`
- `src/index.ts`
