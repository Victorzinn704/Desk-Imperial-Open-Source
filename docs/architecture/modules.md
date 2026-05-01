# Modulos de Dominio — Desk Imperial API

**Versao:** 1.2  
**Ultima atualizacao:** 2026-05-01  
**Localizacao:** `apps/api/src/modules/`

---

## Visao geral

A API do Desk Imperial esta organizada por modulos de dominio com fronteiras claras. O estado atual da borda HTTP e:

- prefixo global ativo: `/api/v1`
- sessao baseada em cookie HttpOnly com guards de sessao e CSRF
- modulos mais novos usam Zod nos contratos de entrada
- a superficie OpenAPI e gerada a partir do runtime e publicada em `packages/api-contract/openapi.json`

Principio central: **todo acesso a dado operacional e financeiro e resolvido no escopo do workspace owner**. O codigo usa `workspaceOwnerUserId` ou `companyOwnerUserId` conforme a camada, mas a regra de negocio e a mesma: um workspace nao enxerga dados de outro.

---

## Mapa atual de modulos

```text
modules/
├── auth/                  # Autenticacao, sessao, CSRF, perfil, reset, verify-email
├── admin-pin/             # Validacao administrativa por PIN com prova opaca
├── operations/            # Comandas, caixa, cozinha, mesas e snapshot operacional
├── operations-realtime/   # Gateway Socket.IO e publicacao realtime operacional
├── orders/                # Vendas/pedidos com estoque, desconto e geocodificacao
├── products/              # Catalogo, combos, importacao e smart draft
├── finance/               # KPIs e analytics financeiros
├── employees/             # Equipe, acesso STAFF e folha operacional
├── consent/               # LGPD, documentos e preferencias de cookies
├── currency/              # Cotacoes com cache e fallback
├── geocoding/             # Geocodificacao de enderecos
├── notifications/         # Telegram, preferencias e webhook inbound
├── market-intelligence/   # Insight executivo via Gemini
├── intelligence-platform/ # Boundary de tools, RAG e politicas
├── monitoring/            # Audit log e observabilidade compartilhada
└── health/                # Health, readiness e liveness
```

Shared infrastructure fora dessa arvore:

- `database/prisma.module.ts` — Prisma global
- `cache/cache.module.ts` — Redis e `CacheService`

---

## Modulo: auth

**Responsabilidade:** autenticacao, sessao, CSRF e ciclo de identidade do usuario.

**Arquivos principais:**

- `auth.service.ts` — fachada do dominio
- `auth-session.service.ts` — emissao/validacao de sessao, cookies e CSRF
- `auth-login.service.ts` — login owner/staff/demo e resolucao de ator
- `auth-registration.service.ts` — cadastro de conta e bootstrap de workspace
- `auth-password.service.ts` — reset de senha
- `auth-email-verification.service.ts` — verify-email por OTP
- `auth-rate-limit.service.ts` — rate limit de auth e handshake realtime
- `auth.controller.ts` — borda HTTP

**Endpoints relevantes:**

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/demo`
- `POST /auth/forgot-password`
- `POST /auth/verify-email/request`
- `POST /auth/verify-email/confirm`
- `POST /auth/reset-password`
- `POST /auth/logout`
- `GET /auth/me`
- `PATCH /auth/profile`
- `GET /auth/activity`
- `GET /auth/activity-feed`

**Seguranca:**

- cookie de sessao com `HttpOnly`, `Secure` e `SameSite`
- padrao double-submit para CSRF (`csrf-token` + `x-csrf-token`)
- hash de senha com `argon2id`
- rate limit em login, reset, verify-email e conexao realtime

---

## Modulo: admin-pin

**Responsabilidade:** proteger operacoes sensiveis com PIN do owner validado server-side.

**Arquivos principais:**

- `admin-pin.service.ts` — setup, verificacao, prova e revogacao
- `admin-pin.guard.ts` — exige prova valida em endpoints protegidos
- `admin-pin.controller.ts` — borda HTTP

**Endpoints relevantes:**

- `GET /admin/pin`
- `POST /admin/verify-pin`
- `POST /admin/pin`
- `DELETE /admin/pin`

**Comportamento atual:**

- o frontend envia o PIN uma vez para emitir um challenge
- o backend grava uma prova curta em cookie HttpOnly
- endpoints com `AdminPinGuard` leem e validam essa prova
- nao existe JWT exposto ao browser nesse fluxo

---

## Modulo: operations

**Responsabilidade:** core operacional do produto — comandas, caixa, cozinha, mesas e visoes ao vivo.

**Arquivos principais:**

- `operations.service.ts` — fachada das operacoes
- `operations-helpers.service.ts` — montagem de snapshot/live views
- `comanda.service.ts` — ciclo de vida de comandas e itens
- `cash-session.service.ts` — abertura e fechamento de caixa
- `operations-domain.utils.ts` — invalidacao e helpers de dominio
- `operations.controller.ts` — endpoints REST
- `operations.schemas.ts` — contratos Zod da borda

**Endpoints relevantes:**

- `GET /operations/live`
- `GET /operations/kitchen`
- `GET /operations/summary`
- `POST /operations/cash-sessions`
- `POST /operations/cash-sessions/:cashSessionId/movements`
- `POST /operations/cash-sessions/:cashSessionId/close`
- `POST /operations/comandas`
- `POST /operations/comandas/:comandaId/items`
- `POST /operations/comandas/:comandaId/items/batch`
- `PATCH /operations/comandas/:comandaId`
- `POST /operations/comandas/:comandaId/assign`
- `POST /operations/comandas/:comandaId/status`
- `GET /operations/comandas/:comandaId/details`
- `POST /operations/comandas/:comandaId/payments`
- `POST /operations/comandas/:comandaId/close`
- `POST /operations/closures/close`
- `PATCH /operations/kitchen-items/:itemId/status`
- `GET /operations/mesas`
- `POST /operations/mesas`
- `PATCH /operations/mesas/:mesaId`

**Observacoes operacionais:**

- `live`, `kitchen` e `summary` usam cache e reconciliacao com realtime
- o hot path ainda concentra boa parte da complexidade do backend
- `closeComanda` e `cash` continuam sendo hotspots de latencia e manutencao

---

## Modulo: operations-realtime

**Responsabilidade:** transporte Socket.IO da malha operacional realtime.

**Namespace:** `/operations`

**Arquivos principais:**

- `operations-realtime.gateway.ts` — lifecycle do socket
- `operations-realtime.service.ts` — publicacao de envelopes
- `operations-realtime.socket-auth.ts` — autenticacao no connect
- `operations-realtime.sessions.service.ts` — indice `sessionId -> sockets`
- `operations-realtime.types.ts` — eventos, payloads e rooms

**Topologia atual:**

- room base: `workspace:{workspaceOwnerUserId}`
- rooms segmentadas:
  - `workspace:{id}:kitchen`
  - `workspace:{id}:cash`
  - `workspace:{id}:mesa`
  - `workspace:{id}:employee:{employeeId}`

**Eventos atuais:**

- `cash.opened`
- `cash.updated`
- `cash.closure.updated`
- `comanda.opened`
- `comanda.updated`
- `comanda.closed`
- `kitchen.item.queued`
- `kitchen.item.updated`
- `mesa.upserted`

**Comportamento atual:**

- OWNER entra em canais financeiros; STAFF nao
- autenticacao aceita sessao por cookie e headers de token
- o servidor suporta `websocket` e `polling`, mas o cliente web atual abre `websocket` only
- logout e revogacao de sessao derrubam sockets rastreados por `sessionId`
- ainda nao existe replay/cursor/exactly-once; a consistencia depende de patch + refresh controlado

---

## Modulo: orders

**Responsabilidade:** registro e cancelamento de vendas/pedidos.

**Arquivos principais:**

- `orders.controller.ts`
- `orders.service.ts`
- `orders-discount.utils.ts`

**Endpoints relevantes:**

- `GET /orders`
- `POST /orders`
- `POST /orders/:orderId/cancel`

**Comportamento critico:**

- criacao usa transacao forte para proteger estoque
- desconto acima do limite de STAFF exige validacao administrativa
- geocodificacao e enriquecimento comercial fazem parte do fluxo de venda

---

## Modulo: products

**Responsabilidade:** catalogo, combos, importacao e cadastro inteligente.

**Endpoints relevantes:**

- `GET /products`
- `POST /products`
- `POST /products/smart-draft`
- `POST /products/import`
- `PATCH /products/:productId`
- `POST /products/restock-bulk`
- `DELETE /products/:productId`
- `DELETE /products/:productId/permanent`
- `POST /products/:productId/restore`

**Comportamento atual:**

- importacao CSV continua ativa e protegida por sessao + CSRF
- `smart-draft` usa Gemini para montar rascunho operacional
- combos e estoque compartilham a mesma base de produto

---

## Modulo: finance

**Responsabilidade:** KPIs, comparativos e analytics financeiros.

**Comportamento atual:**

- resumo financeiro com cache curto
- rankings por produto e vendedor
- composicao por periodo e moeda
- consumo fortemente dependente das tabelas de pedido, comanda e caixa

---

## Modulo: employees

**Responsabilidade:** equipe, acesso STAFF e folha operacional.

**Endpoints relevantes:**

- `GET /employees`
- `POST /employees`
- `PATCH /employees/:employeeId`
- `POST /employees/:employeeId/access`
- `PATCH /employees/:employeeId/access/password`
- `DELETE /employees/:employeeId/access`
- `DELETE /employees/:employeeId`
- `POST /employees/:employeeId/restore`

**Comportamento atual:**

- o owner cria o funcionario e o backend emite credenciais temporarias
- acesso do STAFF e representado por `User` sintetico vinculado ao `Employee`
- revogacao e desativacao propagam refresh/revogacao de sessao

---

## Modulo: consent

**Responsabilidade:** conformidade LGPD para documentos e cookies.

**Comportamento atual:**

- documentos versionados
- aceite com trilha de data/versao/usuario
- preferencias de cookies por usuario

---

## Modulo: currency

**Responsabilidade:** cotacoes com cache e fallback.

**Comportamento atual:**

- consulta online com stale cache
- fallback configuravel por ambiente

---

## Modulo: geocoding

**Responsabilidade:** geocodificar enderecos para vendas e mapas.

**Comportamento atual:**

- timeout curto
- falha de geocodificacao nao deve bloquear o fluxo principal quando o ambiente estiver em modo permissivo

---

## Modulo: notifications

**Responsabilidade:** fronteira unica de notificacao externa e preferencias.

**Endpoints relevantes:**

- `POST /notifications/telegram/link-token`
- `GET /notifications/telegram/status`
- `DELETE /notifications/telegram/link`
- `GET /notifications/telegram/preferences`
- `POST /notifications/telegram/preferences`
- `POST /notifications/telegram/webhook`
- `GET /notifications/telegram/health`
- `GET /notifications/preferences/workspace`
- `POST /notifications/preferences/workspace`
- `GET /notifications/preferences/me`
- `POST /notifications/preferences/me`

**Comportamento atual:**

- Telegram ja esta em operacao
- preferencias existem em nivel de workspace e usuario
- webhook inbound valida `x-telegram-bot-api-secret-token`
- email e webhook generico permanecem como extensoes da mesma fronteira

---

## Modulo: market-intelligence

**Responsabilidade:** insight executivo sintetizado com IA.

**Comportamento atual:**

- cache curto por workspace
- uso controlado por rate limit
- depende de dados operacionais e financeiros, nao substitui relatorios transacionais

---

## Modulo: intelligence-platform

**Responsabilidade:** boundary de ferramentas e politicas para fluxos inteligentes.

**Comportamento atual:**

- nao concentra transacao core
- resolve permissao de tools por papel
- integra com `notifications`, `market-intelligence` e superficies assistidas

---

## Modulo: monitoring

**Responsabilidade:** audit log e observabilidade compartilhada.

**Comportamento atual:**

- `AuditLogService` centraliza trilha de eventos sensiveis
- Sentry, OpenTelemetry e logs estruturados atravessam varios modulos a partir dessa base

---

## Modulo: health

**Responsabilidade:** probes operacionais do runtime.

**Endpoints relevantes:**

- `GET /health`
- `GET /health/ready`
- `GET /health/live`

Na borda publica esses endpoints saem sob o prefixo global: `/api/v1/health`, `/api/v1/health/ready` e `/api/v1/health/live`.

---

## Cache compartilhado

`CacheService` fica fora de `modules/`, mas e parte estrutural do sistema. Chaves relevantes:

| Dado                     | Chave                                                                  |
| ------------------------ | ---------------------------------------------------------------------- |
| Finance summary          | `finance:summary:{userId}`                                             |
| Products list            | `products:list:{userId}:{scope}`                                       |
| Employees list           | `employees:list:{userId}`                                              |
| Orders summary           | `orders:summary:{userId}`                                              |
| Operations live          | `operations:live:{workspaceOwnerUserId}:{businessDate}:{mode}:{scope}` |
| Operations kitchen       | `operations:kitchen:{workspaceOwnerUserId}:{businessDate}:{scope}`     |
| Operations summary       | `operations:summary:{workspaceOwnerUserId}:{businessDate}:{scope}`     |
| Gemini insight           | `gemini:insight:{userId}:{currency}:{focus}`                           |
| Notification idempotency | `notifications:delivery:{workspaceOwnerUserId}:{idempotencyKey}`       |

---

## Notas de manutencao

- `operations` e `operations-realtime` continuam sendo a area mais sensivel para drift documental.
- `DOCS_DESK_IMPERIAL.md` e docs de `release/` nao sao fonte primaria para esta camada.
- Ao atualizar contratos, conferir sempre:
  - controller real
  - schemas Zod / DTOs
  - gateway/types do realtime
  - guards (`SessionGuard`, `CsrfGuard`, `AdminPinGuard`)
