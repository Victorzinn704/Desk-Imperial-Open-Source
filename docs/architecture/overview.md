# Overview de Arquitetura

## 1. Escopo

Este documento descreve a arquitetura tecnica atual do Desk Imperial com foco no comportamento implementado.

## 2. Stack atual

- Monorepo: npm workspaces + Turbo
- Backend: NestJS 11 + Prisma + PostgreSQL + Redis + Socket.IO
- Frontend: Next.js 16 + React 19 + TanStack Query
- Contratos compartilhados: `packages/types` (Zod-first)
- Contrato OpenAPI gerado: `packages/api-contract/openapi.json`

## 3. Estrutura de alto nivel

```text
apps/
  api/   -> API REST, auth, seguranca, dominio operacional/comercial, realtime
  web/   -> App Router, shells owner/staff, dashboards e UX operacional
packages/
  types/        -> contratos compartilhados com Zod + z.infer
  api-contract/ -> openapi.json gerado pela API
```

## 4. Estado atual da superficie publica

- Prefixo HTTP ativo: `/api/v1`
- Docs publicos da API:
  - `GET /api/v1/openapi.json`
  - `GET /api/v1/docs`
- Modulo `operations` ja usa validacao de borda com Zod
- O restante do backend esta em migracao gradual para o mesmo modelo

Veja tambem: [system-map.md](./system-map.md)

## 5. Principios arquiteturais

- API como fonte de verdade de regras de negocio.
- Isolamento por workspace em todas as rotas de dominio.
- Sessao server-side com cookies HttpOnly.
- CSRF obrigatorio para mutacoes autenticadas.
- Realtime por workspace no namespace /operations.
- Cache e rate limit com Redis em pontos criticos.
- Contratos compartilhados definidos em Zod sempre que a interface cruza workspaces.

## 6. Backend por camadas

- Controller: contrato HTTP + guardas + validacao de borda.
- Service: regra de negocio + transacoes + auditoria.
- Prisma: persistencia relacional.
- CacheService: cache de leitura, invalidacao por prefixo e rate limit.

## 7. Frontend por camadas

- App Router e componentes por dominio.
- TanStack Query para dados remotos.
- Mutacoes com invalidacao seletiva e patches locais.
- Hook de realtime para envelopes de operacao e sincronizacao.

## 8. Realtime

- Gateway autenticado por sessao.
- Sala por workspace.
- Redis adapter opcional para propagacao entre instancias.
- Cliente combina patch local + fallback por invalidacao debounce.

## 9. Seguranca aplicada

- SessionGuard para rotas autenticadas.
- CsrfGuard para mutacoes.
- CORS por allowlist.
- Rate limiting por dominio em Redis.
- Audit log de eventos sensiveis.

## 10. Observacoes de evolucao

- O fluxo de market intelligence foi endurecido para POST + CSRF.
- O gate principal de CI foi elevado para full-stack (backend + frontend + seguranca + build).
- Ainda ha oportunidade de reduzir acoplamento no hook de realtime web.
- A base TS estrita e o OpenAPI gerado ja fazem parte do ciclo padrao de validacao.
