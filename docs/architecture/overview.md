# Overview de Arquitetura

## 1. Escopo

Este documento descreve a arquitetura tecnica atual do Desk Imperial com foco no comportamento implementado.

## 2. Stack atual

- Monorepo: npm workspaces + Turbo
- Backend: NestJS 11 + Prisma + PostgreSQL + Redis + Socket.IO
- Frontend: Next.js 16 + React 19 + TanStack Query
- Contratos compartilhados: packages/types

## 3. Estrutura de alto nivel

```text
apps/
  api/   -> API REST, auth, seguranca, dominio operacional/comercial, realtime
  web/   -> App Router, shells owner/staff, dashboards e UX operacional
packages/
  types/ -> contratos compartilhados
```

## 4. Principios arquiteturais

- API como fonte de verdade de regras de negocio.
- Isolamento por workspace em todas as rotas de dominio.
- Sessao server-side com cookies HttpOnly.
- CSRF obrigatorio para mutacoes autenticadas.
- Realtime por workspace no namespace /operations.
- Cache e rate limit com Redis em pontos criticos.

## 5. Backend por camadas

- Controller: contrato HTTP + guardas.
- Service: regra de negocio + transacoes + auditoria.
- Prisma: persistencia relacional.
- CacheService: cache de leitura, invalidacao por prefixo e rate limit.

## 6. Frontend por camadas

- App Router e componentes por dominio.
- TanStack Query para dados remotos.
- Mutacoes com invalidacao seletiva e patches locais.
- Hook de realtime para envelopes de operacao e sincronizacao.

## 7. Realtime

- Gateway autenticado por sessao.
- Sala por workspace.
- Redis adapter opcional para propagacao entre instancias.
- Cliente combina patch local + fallback por invalidacao debounce.

## 8. Seguranca aplicada

- SessionGuard para rotas autenticadas.
- CsrfGuard para mutacoes.
- CORS por allowlist.
- Rate limiting por dominio em Redis.
- Audit log de eventos sensiveis.

## 9. Observacoes de evolucao

- O fluxo de market intelligence foi endurecido para POST + CSRF.
- O gate principal de CI foi elevado para full-stack (backend + frontend + seguranca + build).
- Ainda ha oportunidade de reduzir acoplamento no hook de realtime web.
