# Plano Mestre — Desk Imperial (2026-04-26)

**Objetivo:** Sair do estado atual (6.1/10) para ~7.2/10 em 30 dias, ~8.0/10 em 90 dias.
**Método:** Correção cirúrgica de P0+P1 → elevação de qualidade → features de alto retorno.

---

## Corrigir Agora (48h) — 3 ações, ~2h total

| #   | Ação                                                     | ID(s)   | Esforço | Depende de | Métrica de sucesso                                          |
| --- | -------------------------------------------------------- | ------- | ------- | ---------- | ----------------------------------------------------------- |
| 1   | Configurar webhook Alertmanager (Discord/Slack/Telegram) | AUD-403 | 1h      | —          | Alerta de teste chega no canal                              |
| 2   | Unificar mensagens de erro auth (login, reset, verify)   | AUD-408 | 30min   | —          | Mesmo status code e mensagem para usuário existe/não existe |
| 3   | Adicionar rate limit no endpoint de registro             | AUD-409 | 15min   | —          | POST /register retorna 429 após N tentativas                |

**Gate:** `npm run test:critical` + `npm run lint` + `npm run typecheck` passam.

---

## Corrigir Em Seguida (7 dias) — 9 ações, ~12-15h total

| #   | Ação                                                                     | ID(s)   | Esforço | Depende de | Métrica de sucesso                                                          |
| --- | ------------------------------------------------------------------------ | ------- | ------- | ---------- | --------------------------------------------------------------------------- |
| 4   | Mover amount check para dentro da transação Serializable                 | AUD-410 | 2h      | —          | createComandaPayment atômico. Teste confirma.                               |
| 5   | Unificar closeCashClosure em transação única                             | AUD-412 | 2h      | —          | closeCashClosure atômico. Teste confirma.                                   |
| 6   | Adicionar debounce 200ms no useMobileDetection                           | AUD-407 | 1h      | —          | Sem jank ao redimensionar                                                   |
| 7   | Adicionar loading.tsx em app/dashboard/ e app/design-lab/                | AUD-405 | 3h      | —          | Dashboard mostra skeleton, não spinner full-page                            |
| 8   | Extrair DashboardWireframeHeader para arquivo próprio com React.memo     | AUD-406 | 3h      | —          | Toggle de tema não re-renderiza dashboard inteiro                           |
| 9   | Criar EnvironmentErrorBoundary e wrappar 8 dynamic() calls               | AUD-406 | 2h      | 8          | Crash de gráfico não derruba dashboard                                      |
| 10  | Adicionar índices nas 7 FKs faltantes                                    | AUD-415 | 1h      | —          | Migration criada. Explain mostra index scan.                                |
| 11  | Mover render-blocking fonts para next/font/google                        | AUD-425 | 1h      | —          | CSS @import removido do globals.css                                         |
| 12  | Adicionar idempotency middleware (Redis-based) para endpoints de mutação | AUD-411 | 4h      | Redis      | POST com Idempotency-Key repetido retorna resultado original, não duplicata |

**Gate:** `npm run test:critical` + `npm run test:coverage:sonar` + `npm run lint` + `npm run typecheck` + `npm run build`. Todos passam.

---

## Otimizar Depois (30 dias) — 10 ações, ~30-40h total

| #   | Ação                                                                        | ID(s)       | Esforço | Depende de | Métrica de sucesso                                            |
| --- | --------------------------------------------------------------------------- | ----------- | ------- | ---------- | ------------------------------------------------------------- |
| 13  | Criar scaffolding de teste NestJS com banco em memória                      | AUD-401     | 5h      | —          | 1 teste de integração funcional com TestModule                |
| 14  | Testes de integração para comanda.service (top 5 métodos)                   | AUD-401     | 8h      | 13         | 5 métodos críticos com >80% branch coverage                   |
| 15  | Extrair auth-core.module.ts (guards/decorators) e quebrar ciclo             | AUD-402     | 4h      | 13         | `forwardRef` removido. Módulos testáveis isoladamente.        |
| 16  | Quebrar comanda.service.ts: extrair comanda-kitchen.service.ts              | AUD-404     | 3h      | 14         | Kitchen logic em serviço dedicado. <400 linhas cada.          |
| 17  | Corrigir instrumentation.ts Faro + adicionar W3C traceparent nos requests   | AUD-413     | 3h      | —          | Traces frontend correlacionados com backend no Tempo          |
| 18  | Configurar NestJS para usar pino como logger padrão                         | AUD-414     | 2h      | —          | Logs de negócio aparecem no Loki                              |
| 19  | Aplicar next/image em landing page + marketing components                   | AUD-426     | 2h      | —          | 80%+ imagens com next/image. LCP <2.5s em mobile.             |
| 20  | Corrigir audit trail: não dropar erros, estender para product/employee/cash | AUD-416/417 | 3h      | 14         | Audit log sem falhas silenciosas. Todos os módulos auditados. |
| 21  | Adicionar paginação no snapshot live                                        | AUD-430     | 2h      | 14         | `findMany` com `take` + cursor. Payload Socket.IO <50KB.      |
| 22  | Substituir Framer Motion sync na landing page por lazy                      | AUD-429     | 1h      | —          | Landing page LCP <1.5s. Bundle JS <200KB.                     |

**Gate:** `npm run test` completo passando. `npm run quality:preflight` verde. Cobertura web ≥75%.

---

## Estrutural (60-90 dias) — 6 ações, ~60-80h total

| #   | Ação                                                                          | ID(s)   | Esforço | Depende de | Métrica de sucesso                                                                  |
| --- | ----------------------------------------------------------------------------- | ------- | ------- | ---------- | ----------------------------------------------------------------------------------- |
| 23  | Quebrar comanda.service.ts completamente (4 serviços)                         | AUD-404 | 5h      | 14         | comanda-crud, comanda-kitchen, comanda-payment, comanda-realtime. Cada <500 linhas. |
| 24  | Extrair shared types duplicados (isKitchenCategory, etc) para packages/types/ | AUD-422 | 2h      | —          | Zero lógica duplicada API↔Web. packages/types/ é single source of truth.            |
| 25  | E2E: fluxo PDV → comanda → cozinha → pagamento                                | AUD-428 | 8h      | 14         | 1 spec E2E cobre fluxo operacional completo                                         |
| 26  | Migrar para Prisma 7                                                          | —       | 3h      | 23         | Build e testes passam em Prisma 7                                                   |
| 27  | Owner mobile: contrato offline paritário com staff                            | AUD-427 | 8h      | —          | Owner mobile funciona offline com mesma robustez do staff                           |
| 28  | Remover legacy/wireframe duplicates (~1700 linhas)                            | AUD-434 | 2h      | 25         | Zero imports para _-legacy-_.tsx ou _-wireframe-_.tsx                               |

**Gate:** `npm run verify:current-phase:strict` verde. Cobertura web ≥80%. ESLint warnings <400.

---

## Dependências entre Ações

```
Ações imediatas (48h)
  ├── 1, 2, 3 ──► independentes, atacar em paralelo
  │
Ações 7 dias
  ├── 4, 5, 6, 7, 9, 10, 11 ──► independentes
  ├── 8 depende de 7 (dashboard-shell refactor pós-loading.tsx)
  └── 12 ──► independente (Redis-based)
  │
Ações 30 dias
  ├── 13 ──► pré-requisito para 14, 15, 22
  ├── 14 ──► pré-requisito para 16, 20, 21, 23
  ├── 15, 17, 18, 19, 21 ──► independentes
  │
Ações 60-90 dias
  ├── 23 depende de 14
  ├── 24 depende de 15 (contracts stable)
  ├── 25 depende de 14 (test infra pronta)
  └── 26, 27, 28 ──► independentes (mas 26 arriscado sem 14)
```

---

## Métricas de Sucesso Globais

| Métrica                    | Hoje                      | Alvo 30 dias            | Alvo 90 dias             |
| -------------------------- | ------------------------- | ----------------------- | ------------------------ |
| Scorecard geral            | 6.1/10                    | 7.2/10                  | 8.0/10                   |
| ESLint warnings            | 855                       | <600                    | <400                     |
| Cobertura web              | 69.11%                    | ≥75%                    | ≥85%                     |
| Testes backend             | 0 arquivos em src/modules | ≥5 specs co-localizados | ≥20 specs co-localizados |
| Backend coverage           | 0% (src/modules)          | ≥40%                    | ≥70%                     |
| Alertmanager funcional     | Não                       | Sim                     | Sim                      |
| Tracing distribuído        | Quebrado                  | Funcional               | Funcional                |
| LCP mobile (estimado)      | >4s                       | <3s                     | <2.5s                    |
| Comanda.service linhas     | 1377                      | 1377 (testado)          | <500 por serviço         |
| Circular deps (forwardRef) | 3                         | 0                       | 0                        |

---

## Governança Contínua Recomendada

1. **Gate de pre-commit/push:** `npm run quality:preflight` (já existe) + `npm run test:critical`
2. **Revisão semanal de warnings:** `npm run quality:warnings` toda segunda, meta: -20 warnings/semana
3. **ADR para decisões estruturais:** template em `docs/architecture/adr-template.md`, novo ADR para cada refatoração P0/P1
4. **ROADMAP sync:** atualizar ROADMAP.md a cada merge de feature completada
5. **Alertmanager health check:** teste semanal de disparo de alerta
