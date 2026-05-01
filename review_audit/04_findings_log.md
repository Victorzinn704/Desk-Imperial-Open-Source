# Log Consolidado de Achados — Desk Imperial (2026-04-26)

**Fonte:** cross-analysis de 13 agentes + auditor-chefe
**Método:** deduplicação, conciliação de contradições, classificação sintoma→gargalo→causa raiz

---

## Resumo por Prioridade

| Prioridade | Qtde | Critério |
|---|---|---|
| **P0** — Crítico, atacar hoje | 3 | Risco de dados, instabilidade, segurança |
| **P1** — Alto, próximos 7 dias | 12 | Degradação de UX, débito estrutural pesado |
| **P2** — Importante, 30 dias | 15 | Qualidade, cobertura, manutenibilidade |
| **P3** — Evolutivo, 60-90 dias | 10 | Melhorias incrementais |
| **P4** — Oportunidade, backlog | 5 | Nice-to-have |

**Total:** 45 achados ativos

---

## P0 — Crítico (atacar hoje)

### AUD-401 (P0): Zero testes unitários no backend — 131 arquivos de módulo sem cobertura

- **Confiança:** Confirmado (executado)
- **Evidência cruzada:** F06 (structure) + TST-001 (tests)
- **Evidência:** `find apps/api/src/modules -name '*.spec.ts'` retorna 0. 131 arquivos de source, 0 testes co-localizados. `comanda.service.ts` (1377 linhas), `orders.service.ts` (633 linhas), `operations-helpers.service.ts` (722 linhas) sem nenhuma proteção.
- **Sintoma:** Deploy sem safety net; refatorações de alto risco
- **Gargalo:** Ausência de cultura de teste no backend
- **Causa raiz:** Testes colocados em `api/test/` separado, sem co-localização, desincentivando escrita durante desenvolvimento
- **Impacto técnico:** Mudanças em comanda/orders/auth podem quebrar produção sem detecção prévia
- **Impacto UX:** Bugs de regressão em fluxo operacional (PDV, comandas) afetam operação do estabelecimento
- **Recomendação:** Criar scaffolding de teste NestJS com banco em memória. Cobrir top 3 services (comanda, orders, auth) com testes de integração. Migrar para co-localização.
- **Esforço:** XL (2-4 semanas)
- **Risco de mexer:** Baixo (adicionar testes não quebra produção)

### AUD-402 (P0): 3 dependências circulares via forwardRef — Auth ↔ Consent ↔ Geocoding

- **Confiança:** Confirmado (leitura direta)
- **Evidência cruzada:** F02 (structure) + ARC-001 (architecture)
- **Evidência:** `auth.module.ts:19` — `forwardRef(() => ConsentModule), forwardRef(() => GeocodingModule)`, `consent.module.ts:9` — `forwardRef(() => AuthModule)`, `geocoding.module.ts:8` — `forwardRef(() => AuthModule)`
- **Sintoma:** Impossibilidade de testar módulos isoladamente; ordem de inicialização frágil
- **Gargalo:** Dependência bidirecional triangular
- **Causa raiz:** Auth module exporta guards/decorators que Consent e Geocoding precisam, mas Auth também depende de Consent (registro) e Geocoding
- **Impacto:** Refatorar qualquer desses 3 módulos pode quebrar inicialização. Testes isolados impossíveis.
- **Recomendação:** Extrair `auth-core.module.ts` com guards/decorators. Auth, Consent, Geocoding importam auth-core sem ciclo.
- **Esforço:** M (2-3 dias)
- **Risco de mexer:** Médio (mexe na inicialização da aplicação)

### AUD-403 (P0): Alertmanager sem canal de notificação — alertas são gerados mas nunca entregues

- **Confiança:** Confirmado (leitura direta)
- **Evidência cruzada:** OPS-002 (devops) + OBS-015 (observability)
- **Evidência:** `infra/oracle/ops/.env:17` — `ALERTMANAGER_WEBHOOK_URL=` (vazio). 14 alert rules definidas em `alert.rules.yml:1-143`. Nenhum receiver configurado (email, Slack, Telegram).
- **Sintoma:** Alertas do Prometheus disparam mas ninguém sabe
- **Gargalo:** Canal de entrega não configurado
- **Causa raiz:** Stack de observabilidade foi provisionada mas a última milha (notificação) nunca foi completada
- **Impacto:** API pode cair, latência pode explodir — dev solo só descobre quando usuário reporta
- **Recomendação:** Configurar webhook Discord/Slack ou Telegram bot. Preencher `ALERTMANAGER_WEBHOOK_URL`. Testar disparo.
- **Esforço:** S (1-2h)
- **Risco de mexer:** Baixo

---

## P1 — Alto (7 dias)

### AUD-404 (P1): ComandaService — god service de 1377 linhas com 25 imports

- **Confiança:** Confirmado (leitura direta)
- **Evidência cruzada:** F01 (structure) + ARC-002 (architecture) + BE-001 (backend)
- **Evidência:** `apps/api/src/modules/operations/comanda.service.ts:1-1377`. Importa de 8 domínios. Lida com CRUD, cozinha, caixa, realtime, mesas, pagamentos, estoque baixo.
- **Sintoma:** Qualquer mudança em comanda é perigosa. Difícil de testar.
- **Gargalo:** Responsabilidades não separadas
- **Causa raiz:** Crescimento orgânico sem refatoração de extração. Serviço acumulou responsabilidades.
- **Recomendação:** Extrair em: comanda-crud, comanda-kitchen, comanda-payment, comanda-realtime. Delegate via injeção.
- **Esforço:** L (3-5 dias, alto risco)
- **Risco de mexer:** Alto (requer cobertura de teste antes, ver P0 acima)

### AUD-405 (P1): Sem Suspense/loading.tsx — waterfall loading em toda dashboard

- **Confiança:** Confirmado (leitura direta)
- **Evidência cruzada:** FE-001 (frontend)
- **Evidência:** 0 arquivos `loading.tsx` no app. `dashboard-shell.tsx:193` — `if (isLoading) return <LoadingState />` (renderização bloqueante).
- **Sintoma:** Usuário vê spinner full-page enquanto dados carregam em cascata
- **Gargalo:** Dados carregados sequencialmente (session → queries), sem streaming
- **Causa raiz:** Arquitetura de loading imperativa em vez de declarativa (Suspense)
- **Recomendação:** Adicionar `loading.tsx` em `dashboard/`, `design-lab/`. Wrappar queries em Suspense com skeleton.
- **Esforço:** M (2-3 dias)
- **Risco de mexer:** Baixo

### AUD-406 (P1): DashboardShell monolítico — 665 linhas, 10 hooks, 0 memoização

- **Confiança:** Confirmado (leitura direta)
- **Evidência cruzada:** FE-002 (frontend) + git hotspot (66 commits)
- **Evidência:** `dashboard-shell.tsx:1-665`. 10 hooks na linha 186-227. 4 sub-componentes inline. `WireframeThemeButton` (line 522) usa `useTheme()` — toggle de tema re-renderiza 665 linhas inteiras.
- **Sintoma:** Re-renders em cascata a cada change de estado
- **Gargalo:** Componente único sem memoização
- **Causa raiz:** Sub-componentes inline dentro do mesmo arquivo, sem React.memo
- **Recomendação:** Extrair header, loading, theme button para arquivos separados com React.memo.
- **Esforço:** M (1-2 dias)
- **Risco de mexer:** Médio (extração pura, mas muitas dependências)

### AUD-407 (P1): useMobileDetection sem debounce — resize causa centenas de re-renders

- **Confiança:** Confirmado (leitura direta)
- **Evidência cruzada:** FE-010 (frontend)
- **Evidência:** `hooks/useMobileDetection.ts:18` — `window.addEventListener('resize', check)` sem debounce. Duas instâncias em `dashboard-shell.tsx:187-188`.
- **Sintoma:** Jank severo ao redimensionar janela
- **Gargalo:** Event listener sem debounce dispara setState a cada pixel
- **Causa raiz:** Hook de detecção de mobile sem otimização de performance
- **Recomendação:** Adicionar debounce de 200ms. Usar threshold-crossing detection.
- **Esforço:** S (1-2h)
- **Risco de mexer:** Baixo

### AUD-408 (P1): User enumeration em 3 endpoints de auth

- **Confiança:** Confirmado (leitura direta)
- **Evidência cruzada:** SEC-AUTH-001/002/003 (security)
- **Evidência:** Login (401 vs 403), password-reset (email existe vs não), email-verification — todos retornam mensagens diferentes.
- **Sintoma:** Atacante pode enumerar emails registrados
- **Gargalo:** Mensagens de erro distintas revelam estado do usuário
- **Causa raiz:** Design assimétrico de resposta (uns endpoints genéricos, outros específicos)
- **Recomendação:** Unificar respostas de erro. Sempre retornar mensagem genérica.
- **Esforço:** S (trocar 3 linhas)
- **Risco de mexer:** Baixo

### AUD-409 (P1): Sem rate limiting no endpoint de registro

- **Confiança:** Confirmado (leitura direta)
- **Evidência cruzada:** SEC-AUTH-004 (security)
- **Evidência:** `auth.controller.ts:28-31` — `POST /auth/register` sem `@UseGuards(ThrottlerGuard)`. Login e password-reset têm rate limit.
- **Sintoma:** Possível DoS por registro em massa
- **Gargalo:** Rate limit ausente no registro
- **Causa raiz:** Esquecimento de aplicar guard existente ao novo endpoint
- **Recomendação:** Adicionar `ThrottlerGuard` ao endpoint register (3 registros/IP/hora)
- **Esforço:** S (15 min + deploy)
- **Risco de mexer:** Baixo

### AUD-410 (P1): TOCTOU em createComandaPayment — verificação de valor fora da transação

- **Confiança:** Confirmado (leitura direta)
- **Evidência cruzada:** BE-001 (backend)
- **Evidência:** `comanda.service.ts` — amount gate check carrega comanda fora da transação. Valor pode mudar entre check e write.
- **Sintoma:** Condição de corrida em pagamento de comanda
- **Gargalo:** Leitura e escrita não atômicas
- **Causa raiz:** Check pré-transação com dado stale
- **Recomendação:** Mover amount check para dentro da transação Serializable
- **Esforço:** S (refatorar 1 método)
- **Risco de mexer:** Baixo

### AUD-411 (P1): Sem idempotência em endpoints de escrita — retentativas criam duplicatas

- **Confiança:** Confirmado (leitura direta)
- **Evidência cruzada:** BE-002 (backend)
- **Evidência:** Nenhum endpoint de mutação aceita `Idempotency-Key`. Retry de POST/PATCH cria registros duplicados.
- **Sintoma:** Cliente retenta operação → comanda duplicada, pedido duplicado
- **Gargalo:** Ausência de idempotency keys
- **Causa raiz:** Design de API não contempla retries seguros
- **Recomendação:** Adicionar middleware de idempotency com Redis. Clientes enviam header.
- **Esforço:** M (2-3 dias)
- **Risco de mexer:** Médio

### AUD-412 (P1): closeCashClosure com TOCTOU não-atômico

- **Confiança:** Confirmado (leitura direta)
- **Evidência cruzada:** BE-003 (backend)
- **Evidência:** `closeCashClosure` — sync → check → update não atômico
- **Sintoma:** Fechamento de caixa inconsistente sob concorrência
- **Gargalo:** Operação multi-step sem atomicidade
- **Causa raiz:** Sync de estado separado do update
- **Recomendação:** Unificar em transação Serializable única
- **Esforço:** S (refatorar 1 método)
- **Risco de mexer:** Médio

### AUD-413 (P1): Falta de correlação de traces frontend↔backend — tracing distribuído quebrado

- **Confiança:** Confirmado (leitura direta)
- **Evidência cruzada:** OBS-007/008 (observability)
- **Evidência:** `instrumentation.ts` é um dead stub. Faro nunca inicializa automaticamente. Sem W3C traceparent no frontend.
- **Sintoma:** Impossível rastrear request do frontend até o backend
- **Gargalo:** Inicialização do Faro quebrada, sem propagação de trace
- **Causa raiz:** `instrumentation.ts` é stub nunca completado
- **Recomendação:** Corrigir initialization do Faro. Adicionar header W3C traceparent nos requests.
- **Esforço:** M (1-2 dias)
- **Risco de mexer:** Baixo

### AUD-414 (P1): Backend Logger usa NestJS Logger em vez de pino — logs de negócio nunca chegam ao Loki

- **Confiança:** Confirmado (leitura direta)
- **Evidência cruzada:** OBS-003/004 (observability)
- **Evidência:** Serviços usam `new Logger(ComandaService.name)` do NestJS. Apenas HTTP requests passam pelo pino-http. Erros de negócio ficam fora do pipeline.
- **Sintoma:** Logs de negócio (ex.: "Comanda X fechada com valor Y") não são ingeridos no Loki
- **Gargalo:** Dois sistemas de logging coexistindo; só um exporta para OTLP
- **Causa raiz:** NestJS Logger padrão não foi substituído pelo pino para application logs
- **Recomendação:** Configurar NestJS para usar pino como logger padrão via nestjs-pino
- **Esforço:** M (1-2 dias, afeta todos os módulos)
- **Risco de mexer:** Baixo

### AUD-415 (P1): 7 colunas FK sem índices dedicados — sequential scans em constraint checks

- **Confiança:** Confirmado (leitura do schema)
- **Evidência cruzada:** DB-001 (data)
- **Evidência:** Prisma schema — 7 FK columns sem `@@index`. Constraint checks e joins fazem sequential scan.
- **Sintoma:** Queries mais lentas em tabelas com FK não indexadas
- **Gargalo:** Ausência de índices
- **Causa raiz:** Schema criado sem auditoria de índices
- **Recomendação:** Adicionar índices nos FKs faltantes via migration
- **Esforço:** S (criar migration)
- **Risco de mexer:** Baixo

---

## P2 — Importante (30 dias)

- **AUD-416:** Audit trail falha silenciosamente (DB-005) — `audit-log.service.ts` ignora erros de insert
- **AUD-417:** Sem audit log para product/employee/cash (DB-003) — apenas auth e orders são auditados
- **AUD-418:** 38 imports cross-module no backend (ARC-004) — leakage entre módulos NestJS
- **AUD-419:** `operations-realtime-patching.ts` com complexidade 90 (FE + PERF) — função `buildComandaFromPayload` com 71 linhas e complexidade 90
- **AUD-420:** `findMany` sem paginação no snapshot live (PERF-003) — retorna todas as comandas sem limite
- **AUD-421:** 3 requisições HTTP paralelas no page load do dashboard (PERF-009) — sem batching ou dedup
- **AUD-422:** `isKitchenCategory` duplicado em API e Web (F03) — 105 linhas idênticas
- **AUD-423:** Lib importa de component — violação de camada (F05) — lib/operations/ depende de hook de componente
- **AUD-424:** Sem error boundaries para lazy-loaded environments (FE-004) — crash de gráfico derruba toda a dashboard
- **AUD-425:** Render-blocking Google Fonts CSS @import (FE-005) — `globals.css:2` bloqueia first paint
- **AUD-426:** Apenas 2 usos de next/image (FE-006) — imagens não otimizadas
- **AUD-427:** 69.11% coverage web — 16pp abaixo do gate (TST-004) — arquivos críticos em ~3%
- **AUD-428:** E2E cobre só auth — fluxo PDV/comanda/cozinha sem cobertura (TST-003)
- **AUD-429:** Framer Motion importado diretamente na landing page (FE-009) — ~150KB extra no first load
- **AUD-430:** `recalculateCashSession` carrega todas comandas + itens a cada pagamento (PERF-001)

---

## P3 — Evolutivo (60-90 dias)

- **AUD-431:** Duplicação massiva de mock setup (TST-005) — 780+ jest.fn() repetidos
- **AUD-432:** Tests não co-localizados com módulos (TST-001) — 0 testes em src/modules/
- **AUD-433:** `closeComanda` executa 8+ operações DB sequenciais (PERF-002)
- **AUD-434:** Legacy/wireframe duplicates — ~1700 linhas de código obsoleto (F08)
- **AUD-435:** Flat lib/ structure — 25 arquivos sem agrupamento (F07)
- **AUD-436:** Sem deployment guide documentado (DOC-005) — bus factor 1 para deploy
- **AUD-437:** ROADMAP.md stale (25 dias) — DOC-004
- **AUD-438:** Sem disaster recovery runbook consolidado (OPS-009)
- **AUD-439:** `operations-realtime.module.ts` misplaced (F10) — fora do diretório
- **AUD-440:** Turborepo pipeline sem `inputs` declarations (OPS-003) — rebuilds desnecessários

---

## P4 — Oportunidade (backlog)

- **AUD-441:** Dead code: `pin-rate-limiter.ts` deprecated (F04) — 5 min para deletar
- **AUD-442:** `lazy-components.tsx` marcado 'use client' sem necessidade (FE-008) — 30 min
- **AUD-443:** `Toaster` fora do ThemeProvider (FE-011) — não segue tema manual
- **AUD-444:** Scripts sem --help (DOC-001) — 21 scripts, 1 com documentação
- **AUD-445:** Rollback procedure não documentado (OPS-001)
