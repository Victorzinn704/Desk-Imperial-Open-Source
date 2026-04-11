# Refatoração Cirúrgica — Progresso Consolidado

**Data de início:** 2026-04-09
**Última atualização:** 2026-04-10
**Branch:** `sync/private-quality-2026-04-04` (35 commits ahead de origin/main)

---

## Objetivo
Decompor 4 god files em módulos coesos sem alterar comportamento observável.

---

## Progresso por Módulo

### 1. `apps/web/lib/api.ts` — ✅ CONCLUÍDO
| Métrica | Antes | Depois |
|---------|-------|--------|
| Linhas | 1309 | 102 (barrel) + 7 módulos |
| Arquivos | 1 | 8 |

**Arquivos criados:**
- `apps/web/lib/api-core.ts` — `apiFetch`, `ApiError`, utilitários de timeout/CSRF/telemetria
- `apps/web/lib/api-auth.ts` — `login`, `loginDemo`, `register`, `logout`, password, email, profile
- `apps/web/lib/api-products.ts` — CRUD de produtos (7 funções)
- `apps/web/lib/api-finance.ts` — `fetchFinanceSummary`, `fetchPillars`, `fetchMarketInsight`
- `apps/web/lib/api-operations.ts` — comanda, cash, kitchen, mesa (20 funções)
- `apps/web/lib/api-employees.ts` — CRUD de funcionários (5 funções)
- `apps/web/lib/api-misc.ts` — postal code, consent, orders, activity feed

**Commits:**
- `e13db7c` — decomposição inicial
- `0e89d9a` — fix postal code timeout

---

### 2. `apps/web/components/operations/use-operations-realtime.ts` — 🟡 PARCIAL
| Métrica | Antes | Depois |
|---------|-------|--------|
| Linhas | 1258 | 1181 + 81 (socket hook) |
| Arquivos | 1 | 2 |

**Arquivos criados:**
- `apps/web/components/operations/hooks/use-operations-socket.ts` — conexão Socket.IO, reconexão, event listeners (81 linhas)

**O que falta:**
- Extrair ~1100 linhas de patching logic (live, kitchen, summary) para arquivo separado
- O hook principal ainda contém todo o código de patch inline

**Commits:**
- `f38ac08` — extração do socket hook

---

### 3. `apps/api/src/modules/operations/comanda.service.ts` — 🟡 PARCIAL
| Métrica | Antes | Depois |
|---------|-------|--------|
| Linhas | 1615 | 1303 + 337 (4 utils) |
| Arquivos | 1 | 5 |

**Arquivos criados:**
- `comanda-realtime-status.utils.ts` (13 linhas) — `toRealtimeStatus`, `toRealtimeOpenStatus`
- `comanda-realtime-publish.utils.ts` (211 linhas) — `publishComandaOpened/Updated/Closed`, `publishKitchenItemQueued/Updated`, `buildKitchenItemRealtimeDelta`
- `comanda-validation.utils.ts` (25 linhas) — `calculateDraftItemsSubtotal`, `assertMonetaryAdjustmentsWithinSubtotal`
- `comanda-session-resolver.utils.ts` (88 linhas) — `resolveComandaSessionContext`, `resolveStaffSessionContext`, `resolveOwnerSessionContext`

**O que falta:**
- Métodos de resolução de mesa (`resolveMesaSelection`, `assertMesaAvailability`)
- Métodos de kitchen (`propagateKitchenStatusToComanda`, `deriveComandaStatusFromKitchen`)
- Métodos de response (`buildComandaResponse`, `buildOptionalSnapshot`)
- Métodos de low stock (`checkLowStockAfterClose`)
- Métodos de kitchen state (`takeMatchingKitchenState`)

**Commits:**
- `60f6e58` — realtime status utils
- `5d6a024` — validation utils
- `c7b91f2` — realtime publish utils
- `770ac35` — session resolver utils

---

### 4. `apps/api/src/modules/auth/auth.service.ts` — ❌ NÃO INICIADO
| Métrica | Antes | Depois |
|---------|-------|--------|
| Linhas | 2434 | 2434 |

**Plano de decomposição (não executado):**
- `auth-registration.service.ts` — `register`, geocoding, consent, verification code dispatch
- `auth-login.service.ts` — `login`, `loginDemo`, actor resolution, session creation
- `auth-password.service.ts` — `requestPasswordReset`, `resetPassword`, OTP delivery
- `auth-verification.service.ts` — `requestEmailVerification`, `verifyEmail`
- `auth-session.service.ts` — `validateSessionToken`, `getCurrentUser`, `updateProfile`, `logout`, cookie management

---

### 5. `apps/api/src/modules/operations/operations-helpers.service.ts` — ❌ NÃO INICIADO
| Métrica | Antes | Depois |
|---------|-------|--------|
| Linhas | 1458 | 1458 |

**Plano de decomposição (não executado):**
- `operations-snapshot.service.ts` — `buildLiveSnapshot`, `tryResolveLiveSnapshotFromCache`
- `operations-kitchen.service.ts` — `buildKitchenView`
- `operations-cash.service.ts` — `recalculateCashSession`, `syncCashClosure`, cash authorization
- `operations-comanda-helper.service.ts` — `recalculateComanda`, comanda authorization, draft items

---

## Quick Wins Aplicados

| # | Mudança | Arquivo | Commit |
|---|---------|---------|--------|
| 1 | Credenciais migradas para `.env` | `.env`, `.secrets/` ops-credentials.txt deletado | — |
| 2 | Senhas default removidas do docker-compose | `infra/docker/docker-compose.yml` | `cb759a3` |
| 3 | Healthchecks adicionados ao postgres/redis | `infra/docker/docker-compose.yml` | `cb759a3` |
| 4 | Redis com autenticação no compose | `infra/docker/docker-compose.yml` | `cb759a3` |
| 5 | `npm audit` habilitado no CI | `.github/workflows/ci.yml` | `cb759a3` |
| 6 | CSP habilitado no Helmet | `apps/api/src/main.ts` | `cb759a3` |
| 7 | Health check endpoints criados | `apps/api/src/modules/health/` | `cb759a3` |
| 8 | `.dockerignore` expandido | `.dockerignore` | `cb759a3` |

---

## Estado Atual de Validação

| Validação | Resultado |
|-----------|-----------|
| Typecheck (api) | ✅ PASS |
| Typecheck (web) | ✅ PASS |
| Lint | ✅ PASS |
| Testes críticos web | ✅ 214/214 PASS |
| Testes API | ⚠️ 42 falhas pre-existentes (não são regressões) |

**Testes falhando pre-existentes:**
- `be-01-operational-smoke.spec.ts` — precisa de infra (Postgres/Redis)
- `auth.service.coverage-boost.spec.ts` — erros de tipo no teste
- `comanda.service.helpers.spec.ts` — erros de tipo no teste
- `operations-realtime.publishers.spec.ts` — erros de tipo no teste

---

## Scorecard de Redução

| Módulo | Linhas Originais | Linhas no Principal | Linhas Extraídas | Redução |
|--------|-----------------|---------------------|------------------|---------|
| `api.ts` | 1309 | 102 | 1207 | -92% |
| `use-operations-realtime.ts` | 1258 | 1181 | 81 | -6% |
| `comanda.service.ts` | 1615 | 1303 | 337 | -19% |
| `auth.service.ts` | 2434 | 2434 | 0 | 0% |
| `operations-helpers.service.ts` | 1458 | 1458 | 0 | 0% |
| **TOTAL** | **8074** | **6478** | **1625** | **-20%** |

---

## Próximos Passos Recomendados

### Ordem de prioridade (menor risco → maior risco):
1. **Continuar `use-operations-realtime.ts`** — extrair patching logic (~1100 linhas)
2. **Continuar `comanda.service.ts`** — extrair mesa selection, kitchen, response methods
3. **Iniciar `operations-helpers.service.ts`** — 1458 linhas, risco médio
4. **Iniciar `auth.service.ts`** — 2434 linhas, maior risco (auth é crítico)

### Estratégia:
- Um módulo por sessão
- Extrair apenas blocos isolados (sem dependências cruzadas)
- Manter facade no service original delegando para os novos módulos
- Validar typecheck + testes a cada extração
- Commit atômico por extração

---

## Lições Aprendidas

1. **Agentes especializados falharam** em todas as tentativas de decomposição automática — introduziram erros de tipo que quebraram o build. A abordagem manual, método por método, é mais segura.
2. **Extrair funções utilitárias puras** é o menor delta seguro — zero dependências de `this`, fácil de testar isoladamente.
3. **Manter o facade** no service original preserva compatibilidade com testes existentes e consumers.
4. **42 testes da API já falhavam antes** de qualquer mudança — não são regressões, mas precisam ser corrigidos separadamente.
