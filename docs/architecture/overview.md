# Overview de Arquitetura

**Versão:** 1.1  
**Última atualização:** 2026-05-01

## 1. Escopo

Este documento descreve a arquitetura tecnica atual do Desk Imperial com foco no comportamento implementado.

## 2. Stack atual

- Monorepo: npm workspaces + Turbo
- Backend: NestJS 11 + Prisma + PostgreSQL + Redis + Socket.IO
- Frontend: Next.js 16 + React 19 + TanStack Query
- Observabilidade: OpenTelemetry + Grafana Faro + Sentry
- Contratos compartilhados: `packages/types` (Zod-first)
- Contrato OpenAPI gerado: `packages/api-contract/openapi.json`

## 3. Estrutura de alto nivel

```text
apps/
  api/   -> API REST, auth, seguranca, dominio operacional/comercial, notificacoes e realtime
  web/   -> App Router, shells owner/staff, dashboards, UX operacional e APIs auxiliares do frontend
packages/
  types/        -> contratos compartilhados com Zod + z.infer
  api-contract/ -> openapi.json gerado pela API
```

## 4. Estado atual da superficie publica

- Prefixo HTTP ativo: `/api/v1`
- Alias legado de health ainda existe em `/api/health`, mas a borda principal e documentada é `/api/v1/*`
- Docs publicos da API:
  - `GET /api/v1/openapi.json`
  - `GET /api/v1/docs`
- Modulo `operations` ja usa validacao de borda com Zod
- `products` ja expõe `smart-draft`, import CSV e enriquecimento de catálogo
- `notifications` concentra Telegram, preferências por workspace e preferências por usuário
- O restante do backend segue em migracao gradual para o mesmo modelo

Veja tambem: [system-map.md](./system-map.md)

## 5. Principios arquiteturais

- API como fonte de verdade de regras de negocio.
- Isolamento por workspace em todas as rotas de dominio.
- Sessao server-side com cookies HttpOnly.
- CSRF obrigatorio para mutacoes autenticadas.
- Realtime por workspace no namespace `/operations`, com rooms segmentadas por dominio.
- Cache e rate limit com Redis em pontos criticos.
- Contratos compartilhados definidos em Zod sempre que a interface cruza workspaces.
- Integracoes externas ficam atras de boundaries explicitos, nao dentro dos services de dominio.

## 6. Backend por camadas

- Controller: contrato HTTP + guardas + validacao de borda.
- Service: regra de negocio + transacoes + auditoria.
- Prisma: persistencia relacional.
- CacheService: cache de leitura, invalidacao por prefixo e rate limit.
- Integracoes outbound: Telegram, e-mail e webhook sob `notifications`.
- Plataforma de inteligencia: boundary separado para Gemini, tools e canais futuros.

## 7. Frontend por camadas

- App Router e componentes por dominio.
- TanStack Query para dados remotos.
- Mutacoes com invalidacao seletiva e patches locais.
- Hook de realtime para envelopes de operacao, sincronizacao e refresh controlado.
- APIs auxiliares no frontend para barcode lookup e busca de imagens quando o fluxo exige edge/server code.

## 8. Realtime

- Gateway autenticado por sessao.
- Rooms segmentadas por `workspace`, `kitchen`, `cash`, `mesa` e `employee`.
- Redis adapter opcional para propagacao entre instancias.
- Cliente combina patch local + fallback por reconcile/refresh controlado.

## 9. Seguranca aplicada

- SessionGuard para rotas autenticadas.
- CsrfGuard para mutacoes.
- CORS por allowlist.
- Rate limiting por dominio em Redis.
- Audit log de eventos sensiveis.
- Webhook do Telegram protegido por segredo compartilhado.
- Sentry no backend e frontend para erro, trace e sourcemaps.

## 10. Observacoes de evolucao

- O fluxo de market intelligence foi endurecido para POST + CSRF.
- O gate principal de CI foi elevado para full-stack (backend + frontend + seguranca + build).
- O realtime ainda esta em recuperacao incremental de topologia, consistencia e ruido.
- Ainda ha oportunidade de reduzir acoplamento no hook de realtime web.
- A base TS estrita e o OpenAPI gerado ja fazem parte do ciclo padrao de validacao.
