# Reconhecimento da Documentacao - Desk Imperial

- Data: 2026-05-01
- Commit auditado: `d8b6457`
- Prompt-base adaptado de Express para NestJS: o mapeamento de backend usa `@Controller`/decorators, modulos, guards e bootstrap do Nest em vez de `app.get()`/routers Express.

## 1. Escopo e metodo

- Premissa operacional: a documentacao acumulou drift nas ultimas 3+ semanas e o codigo e a fonte de verdade.
- Metodo desta fase: mapear monorepo, mudancas recentes, superficie funcional, variaveis de ambiente e o acervo de Markdown antes de editar qualquer doc narrativa.
- Observacao paralela sobre GitHub: a busca local encontrou workflows GitHub e automacao via `git credential manager`, mas os tuneis/keys versionados sao de OCI/SSH/WireGuard (`infra/scripts/oracle-ops-tunnel.ps1`, `infra/scripts/oracle-builder-deploy.ps1`), nao um tunel GitHub dedicado.

## 2.1 Mapa do monorepo

- Workspaces raiz: `apps/*`, `packages/*` (`package.json`).
- Pipeline Turbo: `build`, `dev`, `lint`, `test`, `typecheck` (`turbo.json`).

| Path | Package | Papel observado | Scripts-chave | Evidencia |
|---|---|---|---|---|
| `apps/api` | `@partner/api` | API NestJS, Prisma, realtime, integracoes e observabilidade | `dev, build, build:verify, start, backfill:product-images:pexels, lint` | `apps/api/package.json` |
| `apps/web` | `@partner/web` | Frontend Next.js App Router, PWA, realtime client e impressao QZ Tray | `dev, build, start, analyze, lint, typecheck` | `apps/web/package.json` |
| `packages/api-contract` | `@partner/api-contract` | Contrato OpenAPI publicado do backend | `` | `packages/api-contract/package.json` |
| `packages/types` | `@partner/types` | Tipos e contratos Zod compartilhados | `` | `packages/types/package.json` |

### Estrutura de alto nivel observada

```text
apps/
  api/                # NestJS + Prisma + Socket.IO + Sentry + Telegram
  web/                # Next.js App Router + React Query + Faro + Sentry + QZ Tray
packages/
  api-contract/       # openapi.json exportado
  types/              # contratos Zod e tipos compartilhados
docs/                 # acervo documental atual, incluindo arquitetura, operacoes, seguranca, testing e waves
infra/                # docker, oracle, tuneis, compose, runners e hardening
scripts/              # qualidade, smoke, deploy, chaves e integracoes operacionais
```

## 2.2 Linha do tempo das ultimas 4 semanas

### Commits sem merge

```text
d8b6457 | 2026-04-29 | feat(platform): harden qz tray recovery and scaffold intelligence boundaries
cbe70a0 | 2026-04-29 | fix(web): configure mobile qz tray printing
a5d92d1 | 2026-04-29 | fix(web): prefer serial thermal printer selection
3b7c70e | 2026-04-29 | fix(web): prioritize qz serial thermal printers
8350f9c | 2026-04-29 | feat(web): add quick comanda printing
1a99aa3 | 2026-04-29 | fix(web): support qz tray bluetooth serial printing
4c63b18 | 2026-04-29 | feat(web): densify finance hero and simplify shell controls
90c4cc5 | 2026-04-29 | fix(web): restore lab shell breakpoints and add tooling baseline
95ee7ea | 2026-04-29 | perf(web): streamline comanda modal and kitchen runtime
445311b | 2026-04-29 | perf(web): streamline mobile entry and pdv runtime
3722f3d | 2026-04-28 | perf(web): reduce runtime cost on low-end clients
0c3b4c3 | 2026-04-28 | refactor(web): split dashboard salao staff and realtime runtime
edaf125 | 2026-04-26 | refactor(api): centralize comanda cash sync flows
4b57a75 | 2026-04-26 | refactor(api): extract shared comanda draft preparation
0add7df | 2026-04-26 | refactor(web): split staff mobile shell and beverage visual boundaries
80e8e90 | 2026-04-25 | feat(runtime): stabilize pwa flows and finance mix visuals
74751c2 | 2026-04-25 | fix(security): clear npm audit findings
b8d5f5e | 2026-04-24 | feat(operations): stabilize mobile comanda and realtime telemetry
f61cd1e | 2026-04-24 | fix(pwa): compact mobile cookie banner
5cfe8b5 | 2026-04-24 | fix(pwa): improve comanda flow and category mix
c905660 | 2026-04-24 | fix(finance): align category mix surfaces
623703d | 2026-04-24 | fix(pwa): pin pdv checkout action
412b1b5 | 2026-04-24 | fix(pwa): open full lab surfaces from mobile
cfd5ab0 | 2026-04-24 | fix(pwa): keep mobile actions above bottom nav
8426229 | 2026-04-24 | fix(pwa): refresh owner app entry and product imagery
2d549b7 | 2026-04-24 | feat(pwa): stabilize mobile actions and barcode scanner
34758d1 | 2026-04-24 | docs(ops): document vm2 observability wiring
26a7635 | 2026-04-24 | fix(catalog): improve combo and beverage product visuals
bffadf5 | 2026-04-24 | feat(runtime): stabilize mobile flows and add product image pipeline
b9bbf7d | 2026-04-23 | fix(web): tighten owner pwa shell and image sourcing
b69199c | 2026-04-23 | fix(web): stabilize owner app flows and pdv dock
e901a21 | 2026-04-23 | fix(web): tighten overview football widget
fc42a5b | 2026-04-22 | docs(architecture): remover módulo users obsoleto
1ce395d | 2026-04-22 | docs(roadmap): marcar docs/DEMO.md como concluído
28d4e80 | 2026-04-22 | docs(readme): alinhar packages e módulos da API
796d1c8 | 2026-04-22 | feat(web): fix mobile entry and football overview
60e7f75 | 2026-04-22 | feat(web): add football widgets and tighten owner pwa
95953a6 | 2026-04-22 | docs: record production smoke metrics
46e592a | 2026-04-22 | docs: record local release deploy
50074b5 | 2026-04-22 | chore: prepare web api release
b7f292b | 2026-04-21 | refactor(web): stabilize owner pwa surfaces
2ad7cf9 | 2026-04-21 | refactor(web): split owner today surface
0095f23 | 2026-04-21 | refactor(web): split owner mobile shell
59b5687 | 2026-04-21 | refactor(web): split owner quick register flow
159ada6 | 2026-04-21 | feat: stabilize pwa contracts and workspace baseline
d38b496 | 2026-04-21 | feat(web): save design lab stabilization baseline
cb4dbbd | 2026-04-20 | feat(web): stabilize lab config and overview
587d606 | 2026-04-19 | feat: consolidate design-lab desktop and api contracts
907023e | 2026-04-18 | docs(security): add audit baseline triage
ac7d12a | 2026-04-18 | docs(api): add redis smoke test runbook
a28d403 | 2026-04-18 | test(api): gate redis smoke on explicit availability
5a87ec8 | 2026-04-18 | docs(known-bugs): archive resolved baseline layout failures
a2bcdea | 2026-04-18 | test(web): update compact dashboard shell width assertion
70a5175 | 2026-04-18 | test(web): update desktop dashboard shell width assertion
8f90e9e | 2026-04-17 | docs: refine baseline known bugs triage
6fbe085 | 2026-04-17 | docs: add phase 0 baseline and diagnosis
c8b1d6f | 2026-04-17 | chore: checkpoint da linha do tempo
92cce95 | 2026-04-12 | docs: add pre-feature stabilization gate
09bff54 | 2026-04-12 | chore(web): align next env type reference
e0756ba | 2026-04-12 | chore: detect preflight worktree mutations
2f3978e | 2026-04-12 | chore: clean backend lint leftovers
1abafb1 | 2026-04-12 | fix: restore recovered operational contracts
d59999d | 2026-04-12 | chore: add local quality guardrails
a51b526 | 2026-04-12 | fix(web): restore landing page experience
8263892 | 2026-04-12 | refactor(web): split use-operations-realtime.test.ts (2052 -> 1038 lines, -49%)
ea809f2 | 2026-04-12 | refactor(api): extract actor, alerts, and rate-limit utils from auth-login.service.ts
60a1e1c | 2026-04-11 | refactor(api): extract combo, import, and update utils from products.service.ts
15a75bd | 2026-04-11 | refactor(api): extract realtime and response utils from cash-session.service.ts
ab07360 | 2026-04-11 | refactor(api): split finance-analytics.util.ts (560 -> 170 lines)
de1511b | 2026-04-11 | refactor(api): extract 4 utils from orders.service.ts (780 -> 626 lines)
9735514 | 2026-04-11 | fix: remove unused variables and imports
28133da | 2026-04-11 | fix(api): remove unused snapshot select imports from helpers service
87c5d98 | 2026-04-11 | refactor(api): extract snapshot select constants from operations-helpers.service.ts
a70c526 | 2026-04-11 | fix(web): restore missing barrel exports in api.ts
bc9d28e | 2026-04-11 | chore: remove dead code components and clean up api.ts barrel
71e923b | 2026-04-11 | refactor(api): decompose operations-helpers.service.ts (1473 -> 777 lines)
29fcfa9 | 2026-04-11 | refactor(web): extract realtime patching logic from use-operations-realtime.ts
29190ad | 2026-04-11 | refactor(api): extract kitchen, mesa, and response utils from comanda.service.ts
e65f66e | 2026-04-11 | fix: resolve typecheck errors in API and web
f66b6bf | 2026-04-11 | chore: update docs, infra scripts, audit logs, and package-lock
df726b5 | 2026-04-11 | refactor(web): apply eslint fixes across all web components and lib
8debf7c | 2026-04-11 | refactor(api): apply eslint curly fixes and clean up unused imports
8bdc42c | 2026-04-11 | refactor(api): decompose auth.service.ts (2434 -> 303 lines) into 5 domain services
fb16838 | 2026-04-11 | chore: enforce strict eslint rules and add backend e2e CI job
770ac35 | 2026-04-10 | refactor(api): extract session resolution from comanda.service.ts
f38ac08 | 2026-04-10 | refactor(web): extract socket hook from use-operations-realtime.ts
c7b91f2 | 2026-04-10 | refactor(api): extract realtime publish logic from comanda.service.ts
5d6a024 | 2026-04-10 | refactor(api): extract validation utils from comanda.service.ts
60f6e58 | 2026-04-09 | refactor(api): extract realtime status utils from comanda.service.ts
0e89d9a | 2026-04-09 | fix(web): fix postal code timeout detection after api decomposition
e13db7c | 2026-04-09 | refactor(web): decompose api.ts (1309 lines) into 7 domain modules
d982241 | 2026-04-09 | fix: resolve remaining web typecheck errors
1c2eb16 | 2026-04-09 | fix: resolve all 14 web typecheck errors
f9e4ed1 | 2026-04-09 | fix: resolve eslint errors to enable commit of typecheck fixes
9879bee | 2026-04-09 | feat: consolidate all changes from audit and refactoring sessions
cb759a3 | 2026-04-09 | fix(audit): apply critical quick wins from technical audit
bda9114 | 2026-04-08 | fix(web): compact dashboard sidebar footer
18bfd22 | 2026-04-08 | fix(web): harden responsive shell and mobile close flow
7ee42b3 | 2026-04-08 | fix(infra): archive clean sources for oracle deploy
0192eda | 2026-04-08 | fix(web): improve responsive dashboard and mobile operations
bb98122 | 2026-04-07 | fix(web): tighten portfolio actions and app-scoped AI
7d7ed41 | 2026-04-07 | Revert "feat(web): elevate dashboard shell and operational panels"
7446c77 | 2026-04-07 | feat(web): elevate dashboard shell and operational panels
deecf9b | 2026-04-07 | revert(web): restore frontend to football games baseline
0335fe2 | 2026-04-07 | feat(web): add design lab app shell
7bfecc3 | 2026-04-07 | feat(web): rebuild dashboard frontend and settings panels
75be3ac | 2026-04-07 | fix(infra): normalize oracle deploy ssh commands
7c4d19c | 2026-04-07 | feat(web): add football games calendar widget
3566523 | 2026-04-06 | fix(design-lab): update command center prototype
e4074ff | 2026-04-06 | fix(ui): resolve design-lab build errors + eslint config update
bcab4ab | 2026-04-06 | feat(ui): dashboard full visual reform — sidebar, shell, pdv, settings, mobile
c68fe27 | 2026-04-06 | feat(ui): design-lab scaffold + metric-card refinement
979c460 | 2026-04-06 | feat(ui): metric-card redesign, theme toggle, topbar, sales env polish
7b205ac | 2026-04-06 | feat(ui): visual reform — globals cleanup, shared components polish, oracle ops
babe17d | 2026-04-06 | chore(release): harden oracle deploy flow
2b8e89f | 2026-04-06 | Revert "feat(ui): fluid SaaS design system — desk-card v2 + metric-card rewrite"
1a2fe15 | 2026-04-06 | feat(ui): fluid SaaS design system — desk-card v2 + metric-card rewrite
6db7b25 | 2026-04-05 | fix(ci): align private branch with green public baseline
b0491a2 | 2026-04-05 | chore(sync): align private branch with green test baseline
c034625 | 2026-04-04 | feat(quality): stabilize workspace and refresh project profile
```

### Arquivos mais alterados no periodo

| Alteracoes | Arquivo |
|---:|---|
| 18 | `apps/web/components/dashboard/environments/overview-environment.tsx` |
| 17 | `apps/api/src/modules/operations/comanda.service.ts` |
| 17 | `apps/web/components/dashboard/dashboard-shell.tsx` |
| 16 | `apps/web/components/owner-mobile/owner-mobile-shell.tsx` |
| 15 | `apps/web/app/globals.css` |
| 15 | `apps/web/components/dashboard/dashboard-sidebar.tsx` |
| 15 | `apps/web/components/staff-mobile/mobile-order-builder.tsx` |
| 15 | `apps/web/components/dashboard/metric-card.tsx` |
| 15 | `apps/web/components/dashboard/finance-overview-total.tsx` |
| 13 | `apps/web/components/pdv/pdv-board.tsx` |
| 13 | `apps/web/components/staff-mobile/mobile-comanda-list.tsx` |
| 13 | `apps/web/components/staff-mobile/staff-mobile-shell.tsx` |
| 12 | `apps/web/components/dashboard/finance-doughnut-chart.tsx` |
| 12 | `apps/web/components/owner-mobile/owner-comandas-view.tsx` |
| 11 | `apps/web/components/owner-mobile/owner-mobile-shell.test.tsx` |
| 11 | `apps/web/components/dashboard/sales-performance-card.tsx` |
| 11 | `apps/web/components/pdv/pdv-comanda-modal.tsx` |
| 11 | `apps/web/components/dashboard/salao-environment.tsx` |
| 11 | `apps/web/components/dashboard/dashboard-topbar.tsx` |
| 11 | `apps/web/components/dashboard/finance-chart.tsx` |

### Branches mais recentes

```text
+ docs/public-refresh-20260501
  remotes/public/docs/public-refresh-20260501
* docs/baseline-cleanup-1c
  remotes/origin/docs/baseline-cleanup-1c
+ investigation/nest-runtime-upgrade
+ investigation/next-upgrade
+ investigation/nodemailer-patch
+ temp/merge-pr4-from-origin-main
  remotes/origin/HEAD -> origin/main
  remotes/origin/main
+ docs/baseline-cleanup-1d
+ hotfix/protobufjs-cve
  remotes/origin/hotfix/protobufjs-cve
+ docs/baseline-cleanup-1c-retake
  docs/baseline-cleanup-1b
  docs/baseline-cleanup-1a
  docs/baseline-and-diagnosis
  sync/private-quality-2026-04-04
  remotes/origin/sync/private-quality-2026-04-04
  remotes/public/sync/private-quality-2026-04-04
```

### Leitura inicial do periodo

- O foco recente concentrou-se em `operations/comanda`, runtime mobile/owner/staff, shell do dashboard, Telegram, QZ Tray, Sentry e hardening de deploy.
- Os hotspots mais mexidos batem com as areas mais propensas a drift documental: realtime, fluxos operacionais, PWA mobile, observabilidade, impressao e integracoes externas.

## 2.3 Superficie funcional

### Backend NestJS - controladores e rotas

| Dominio | Prefixo / exemplos | Evidencia |
|---|---|---|
| Health | `/api/v1/health`, `/ready`, `/live` | `apps/api/src/modules/health/health.controller.ts:4-18` |
| Auth | `/api/v1/auth/register`, `login`, `logout`, `me`, `activity-feed`, `verify-email/*`, `reset-password` | `apps/api/src/modules/auth/auth.controller.ts:21-88` |
| Consentimento | `/api/v1/consent/documents`, `/me`, `/preferences` | `apps/api/src/modules/consent/consent.controller.ts:14-51` |
| Produtos | `/api/v1/products`, `smart-draft`, `import`, `restock-bulk`, restore/delete | `apps/api/src/modules/products/products.controller.ts:34-101` |
| Funcionarios | `/api/v1/employees`, `:employeeId/access`, `restore` | `apps/api/src/modules/employees/employees.controller.ts:15-71` |
| Pedidos | `/api/v1/orders`, `:orderId/cancel` | `apps/api/src/modules/orders/orders.controller.ts:14-31` |
| Financeiro | `/api/v1/finance/summary`, `/pillars` | `apps/api/src/modules/finance/finance.controller.ts:11-23` |
| Operacoes | `/api/v1/operations/live`, `kitchen`, `summary`, caixa, comandas, mesas, kitchen-items` | `apps/api/src/modules/operations/operations.controller.ts:67-262` |
| Telegram / notificacoes | `/api/v1/notifications/telegram/*`, `/notifications/preferences/*` | `apps/api/src/modules/notifications/notifications.controller.ts:24-86`, `apps/api/src/modules/notifications/notification-preferences.controller.ts:22-49` |
| Geocoding / IA | `/api/v1/geocoding/postal-code/lookup`, `/market-intelligence/insights`, `/intelligence-platform/capabilities` | `apps/api/src/modules/geocoding/geocoding.controller.ts:8-13`, `apps/api/src/modules/market-intelligence/market-intelligence.controller.ts:13-18`, `apps/api/src/modules/intelligence-platform/intelligence-platform.controller.ts:12-16` |

### Frontend Next.js App Router - paginas

- Total de paginas `page.tsx` encontradas em `apps/web/app`: 38

```text
apps\web\app\page.tsx
apps\web\app\ai\page.tsx
apps\web\app\app\page.tsx
apps\web\app\app\owner\page.tsx
apps\web\app\app\owner\cadastro-rapido\page.tsx
apps\web\app\app\staff\page.tsx
apps\web\app\cadastro\page.tsx
apps\web\app\cozinha\page.tsx
apps\web\app\cozinha\kiosk\page.tsx
apps\web\app\dashboard\page.tsx
apps\web\app\dashboard\configuracoes\page.tsx
apps\web\app\dashboard-wireframe\page.tsx
apps\web\app\design-lab\page.tsx
apps\web\app\design-lab\cadastro-rapido\page.tsx
apps\web\app\design-lab\caixa\page.tsx
apps\web\app\design-lab\calendario\page.tsx
apps\web\app\design-lab\config\page.tsx
apps\web\app\design-lab\cozinha\page.tsx
apps\web\app\design-lab\cozinha\kiosk\page.tsx
apps\web\app\design-lab\equipe\page.tsx
apps\web\app\design-lab\financeiro\page.tsx
apps\web\app\design-lab\ia\page.tsx
apps\web\app\design-lab\overview\page.tsx
apps\web\app\design-lab\payroll\page.tsx
apps\web\app\design-lab\pdv\page.tsx
apps\web\app\design-lab\pedidos\page.tsx
apps\web\app\design-lab\portfolio\page.tsx
apps\web\app\design-lab\salao\page.tsx
apps\web\app\financeiro\page.tsx
apps\web\app\ia\page.tsx
apps\web\app\lite\page.tsx
apps\web\app\lite\pwa\page.tsx
apps\web\app\lite\web\page.tsx
apps\web\app\login\page.tsx
apps\web\app\recuperar-senha\page.tsx
apps\web\app\redefinir-senha\page.tsx
apps\web\app\sentry-example-page\page.tsx
apps\web\app\verificar-email\page.tsx
```

- Observacao operacional: o repositorio mantem superficies produtivas (`/app`, `/app/owner`, `/app/staff`, `/dashboard`, `/cozinha`) e trilhas congeladas/experimentais (`/dashboard-wireframe`, `/design-lab/*`, `/sentry-example-page`).

### Bootstrap, middleware e seguranca transversal

| Item | Observacao | Evidencia |
|---|---|---|
| Prefixo global | API exposta sob `/api/v1` | `apps/api/src/main.ts:294` |
| Helmet | Cabecalhos de seguranca ativados no bootstrap | `apps/api/src/main.ts:99` |
| CORS | CORS configurado no bootstrap | `apps/api/src/main.ts:154` |
| Cookies assinados | `cookie-parser` configurado com segredo | `apps/api/src/main.ts:288` |
| Validacao | `ValidationPipe` global ativo | `apps/api/src/main.ts:297` |
| Sentry server-side | `SentryModule.forRoot()` e filtro global anotado | `apps/api/src/app.module.ts:127`, `apps/api/src/common/filters/http-exception.filter.ts:9` |

### Sessao, cookies e CSRF

| Item | Observacao | Evidencia |
|---|---|---|
| Nome do cookie de sessao | Resolvido por servico central de sessao | `apps/api/src/modules/auth/auth-session.service.ts:73` |
| Nome do cookie CSRF | Resolvido por servico central de sessao | `apps/api/src/modules/auth/auth-session.service.ts:77` |
| CSRF derivado da sessao | Token construido a partir do `sessionId` | `apps/api/src/modules/auth/auth-session.service.ts:81` |
| Escrita do cookie CSRF | Cookie emitido em resposta autenticada | `apps/api/src/modules/auth/auth-session.service.ts:368` |
| Escrita do cookie de sessao | Cookie HttpOnly emitido no login/refresh | `apps/api/src/modules/auth/auth-session.service.ts:383-393` |
| SameSite/secure | Politica depende de `COOKIE_SAME_SITE` e ambiente | `apps/api/src/modules/auth/auth-session.service.ts:411`, `apps/api/src/config/env.validation.ts:135-142` |
| Guard de sessao | Leitura do cookie autenticado | `apps/api/src/modules/auth/guards/session.guard.ts:11-12` |
| Guard de CSRF | Validacao `cookie + header + expectedToken` | `apps/api/src/modules/auth/guards/csrf.guard.ts:25-34` |

### Consentimento, LGPD e trilha de auditoria

| Item | Observacao | Evidencia |
|---|---|---|
| Modelos LGPD | `ConsentDocument`, `UserConsent`, `CookiePreference` no schema Prisma | `apps/api/prisma/schema.prisma:250-287` |
| Versionamento de consentimento | `CONSENT_VERSION` lido no controller/bootstrap | `apps/api/src/modules/consent/consent.controller.ts:51`, `apps/api/src/modules/consent/consent.bootstrap.ts:13` |
| Update de preferencias | `consent.cookies.updated` auditado no servico | `apps/api/src/modules/consent/consent.service.ts:135-180` |
| Audit trail | modelo `AuditLog` no Prisma | `apps/api/prisma/schema.prisma:291-303` |

### Realtime operacional

| Item | Observacao | Evidencia |
|---|---|---|
| Namespace Socket.IO | namespace dedicado de operacoes | `apps/api/src/modules/operations-realtime/operations-realtime.gateway.ts:47` |
| Heartbeat | `pingInterval=25000`, `pingTimeout=20000` | `apps/api/src/modules/operations-realtime/operations-realtime.gateway.ts:63-64` |
| Namespace anexado ao servico | gateway injeta namespace no publicador | `apps/api/src/modules/operations-realtime/operations-realtime.gateway.ts:121-122`, `apps/api/src/modules/operations-realtime/operations-realtime.service.ts:48-49` |
| Fan-out medido | servico calcula `dispatchTargets` e emite em channels/rooms | `apps/api/src/modules/operations-realtime/operations-realtime.service.ts:84-99` |
| Cliente web | hook usa `socket.io-client` e reconciles agendados | `apps/web/package.json:47`, `apps/web/lib/operations/operations-query.ts:24-27`, `apps/web/components/operations/use-operations-realtime.ts:115-138` |

### Modelo de dados e migrations

- ORM e schema: Prisma em `apps/api/prisma/schema.prisma` com 31 migrations aplicaveis listadas em `apps/api/prisma/migrations/`.
- Dominios persistidos centrais: usuarios/sessoes, consentimento/auditoria, produtos/combos, funcionarios, caixa, comandas/mesas/cozinha, pedidos, Telegram e preferencias de notificacao.

| Recorte | Evidencia |
|---|---|
| Sessoes multi-tenant | `Session` com `workspaceOwnerUserId`, `userId` e `employeeId` (`apps/api/prisma/schema.prisma:145-160`) |
| Operacao comercial | `CashSession`, `CashClosure`, `Mesa`, `Comanda`, `ComandaItem`, `ComandaPayment`, `Order` (`apps/api/prisma/schema.prisma:347-520`) |
| Telegram | `TelegramAccount`, `TelegramLinkToken`, `NotificationPreference`, `UserNotificationPreference` (`apps/api/prisma/schema.prisma:305-345`) |
| Ultimas migrations | `20260429193000_add_telegram_notifications_bot`, `20260430201000_add_notification_preferences`, `20260430213000_add_user_notification_preferences` |

### Zod, OpenAPI e contratos compartilhados

| Artefato | Papel | Evidencia |
|---|---|---|
| `packages/types/src/contracts.ts` | contratos Zod compartilhados | `packages/types/src/contracts.ts` |
| `apps/web/lib/validation.ts` | validacoes e fallback de consentimento no frontend | `apps/web/lib/validation.ts:387` |
| `apps/api/src/modules/operations/operations.schemas.ts` | schemas Zod do dominio operacional | `apps/api/src/modules/operations/operations.schemas.ts` |
| `apps/api/src/modules/operations/operations.openapi.ts` | mapeamento OpenAPI do dominio operacional | `apps/api/src/modules/operations/operations.openapi.ts` |
| `packages/api-contract/openapi.json` | contrato exportado para consumo externo | `packages/api-contract/openapi.json` |

### Observabilidade e integracoes externas

| Integracao | Evidencia | Observacao |
|---|---|---|
| Sentry API | `apps/api/package.json:51`, `apps/api/src/instrument.ts:39` | tracing/error monitoring server-side |
| Sentry Web | `apps/web/package.json:27`, `apps/web/next.config.ts:83-90`, `apps/web/lib/observability/sentry.ts:26` | SDK em browser/server/edge + sourcemaps |
| Grafana Faro | `apps/web/package.json:24`, `apps/web/instrumentation-client.ts:2-6` | RUM/telemetria frontend |
| Telegram bot | `apps/api/package.json:60`, `apps/api/src/modules/notifications/infra/telegram/telegram.adapter.ts:3`, `scripts/register-telegram-webhook.mjs:57-89` | bot profissional com webhook, comandos e perfil |
| QZ Tray | `apps/web/package.json:41`, `apps/web/components/pdv/use-thermal-printing.ts`, `scripts/setup-qz-lan-ip.mjs:3-60` | impressao termica desktop/LAN |
| ZXing | `apps/web/package.json:30` | leitura de codigo de barras no owner/mobile |
| Open Food Facts | `apps/web/app/api/barcode/lookup/route.ts:12-16` | lookup de barcode via API externa |
| Pexels | `scripts/set-pexels-key.ps1:82-83`, `apps/web/app/api/media/pexels/search/route.ts:2-32` | pipeline de imagens de catalogo |
| Redis adapter | `apps/api/package.json:54`, `apps/api/src/modules/operations-realtime/operations-realtime.service.ts` | sincronizacao realtime + cache/rate limit |

### Jobs, filas e agendamentos

- Nao ha evidencia de BullMQ/Bull, cron de framework ou worker dedicado na arvore principal.
- O codigo atual usa agendamento in-process e filas leves:
  - `scheduleWarmSummary()` para aquecimento de resumo financeiro (`apps/api/src/modules/finance/finance.service.ts:108,144,147`).
  - `queueDelivery()` para fila/supressao de notificacoes (`apps/api/src/modules/notifications/notifications.service.ts:81-195`).
  - timers de reconcile/refresh no cliente realtime (`apps/web/lib/operations/operations-query.ts:240`, `apps/web/components/operations/use-operations-realtime.ts:115-138`).

### Variaveis de ambiente detectadas

- Total de chaves referenciadas por `process.env.*` em `apps/`, `packages/`, `scripts/` e `infra/`: 92

```text
process.env.C
process.env.CI
process.env.CONSENT_VERSION
process.env.DATABASE_URL
process.env.DEMO_ACCOUNT_EMAIL
process.env.DEMO_STAFF_PASSWORD
process.env.DESK_API_BASE_URL
process.env.DESK_OPERATION_SMOKE_EMPLOYEE_CODE
process.env.DESK_OPERATION_SMOKE_ITERATIONS
process.env.DESK_OPERATION_SMOKE_KITCHEN_P95_MS
process.env.DESK_OPERATION_SMOKE_LIVE_P95_MS
process.env.DESK_OPERATION_SMOKE_LOGIN_MODE
process.env.DESK_OPERATION_SMOKE_STRICT
process.env.DESK_OPERATION_SMOKE_WARMUP_ITERATIONS
process.env.DESK_SESSION_COOKIE
process.env.DESK_SMOKE_API_BASE_URL
process.env.DESK_SMOKE_APP_BASE_URL
process.env.DESK_SMOKE_DEMO_STAFF_CODE
process.env.DESK_SMOKE_EVENT_TIMEOUT_MS
process.env.DESK_SMOKE_SOCKET_BASE_URL
process.env.DESK_SMOKE_SOCKET_ORIGIN
process.env.DIRECT_URL
process.env.DISABLE_DESIGN_LAB
process.env.NEXT_PUBLIC_API_URL
process.env.NEXT_PUBLIC_APP_URL
process.env.NEXT_PUBLIC_DISABLE_DESIGN_LAB
process.env.NEXT_PUBLIC_FARO_ALLOW_INSECURE_COLLECTOR
process.env.NEXT_PUBLIC_FARO_APP_NAME
process.env.NEXT_PUBLIC_FARO_APP_VERSION
process.env.NEXT_PUBLIC_FARO_BATCH_ITEM_LIMIT
process.env.NEXT_PUBLIC_FARO_BATCH_SEND_TIMEOUT_MS
process.env.NEXT_PUBLIC_FARO_CAPTURE_CONSOLE
process.env.NEXT_PUBLIC_FARO_COLLECTOR_URL
process.env.NEXT_PUBLIC_FARO_ENVIRONMENT
process.env.NEXT_PUBLIC_FARO_ERROR_DEDUPE_WINDOW_MS
process.env.NEXT_PUBLIC_FARO_EVENT_DOMAIN
process.env.NEXT_PUBLIC_FARO_MAX_SIGNALS_PER_MINUTE
process.env.NEXT_PUBLIC_FARO_SAMPLE_RATE
process.env.NEXT_PUBLIC_FARO_SLOW_API_SAMPLE_RATE
process.env.NEXT_PUBLIC_FARO_SLOW_API_THRESHOLD_MS
process.env.NEXT_PUBLIC_FARO_TRANSPORT_BACKOFF_MS
process.env.NEXT_PUBLIC_FARO_TRANSPORT_CONCURRENCY
process.env.NEXT_PUBLIC_QZ_TRAY_CONNECT_ORIGINS
process.env.NEXT_PUBLIC_QZ_TRAY_LAN_IP
process.env.NEXT_PUBLIC_SENTRY_DSN
process.env.NEXT_PUBLIC_SENTRY_ENABLE_LOGS
process.env.NEXT_PUBLIC_SENTRY_ENABLED
process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT
process.env.NEXT_PUBLIC_SENTRY_RELEASE
process.env.NEXT_PUBLIC_SENTRY_SEND_DEFAULT_PII
process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
process.env.NEXT_RUNTIME
process.env.NODE_ENV
process.env.NODE_OPTIONS
process.env.OPEN_FOOD_FACTS_API_URL
process.env.OPEN_FOOD_FACTS_USER_AGENT
process.env.PEXELS_API_KEY
process.env.PEXELS_API_URL
process.env.PLAYWRIGHT_BASE_URL
process.env.PLAYWRIGHT_SKIP_WEBSERVER
process.env.PORT
process.env.REDIS_PRIVATE_URL
process.env.REDIS_PUBLIC_URL
process.env.REDIS_URL
process.env.SENTRY_AUTH_TOKEN
process.env.SENTRY_DSN
process.env.SENTRY_ENABLE_LOGS
process.env.SENTRY_ENABLED
process.env.SENTRY_ENVIRONMENT
process.env.SENTRY_EXAMPLE_ENABLED
process.env.SENTRY_ORG
process.env.SENTRY_PROFILE_LIFECYCLE
process.env.SENTRY_PROFILE_SESSION_SAMPLE_RATE
process.env.SENTRY_PROJECT
process.env.SENTRY_PROJECT_WEB
process.env.SENTRY_RELEASE
process.env.SENTRY_SEND_DEFAULT_PII
process.env.SENTRY_SMOKE_PORT
process.env.SENTRY_TRACES_SAMPLE_RATE
process.env.SENTRY_WEB_DSN
process.env.SENTRY_WEB_ENABLE_LOGS
process.env.SENTRY_WEB_ENABLED
process.env.SENTRY_WEB_ENVIRONMENT
process.env.SENTRY_WEB_RELEASE
process.env.SENTRY_WEB_SEND_DEFAULT_PII
process.env.SENTRY_WEB_TRACES_SAMPLE_RATE
process.env.SONAR_COVERAGE
process.env.TELEGRAM_BOT_TOKEN
process.env.TELEGRAM_WEBHOOK_SECRET
process.env.TELEGRAM_WEBHOOK_URL
process.env.THROTTLER_LIMIT
process.env.THROTTLER_TTL_MS
```

### Testes existentes

- Arquivos de teste detectados: 192
- API (`apps/api/test`): 71
- Web (`apps/web`): 121
- Packages compartilhados: 0

## 2.4 Documentacao atual

- Arquivos Markdown/MDX rastreados pelo Git (fora de `node_modules`/`.next`): 185
- A classificacao abaixo e **preliminar**. Ela serve para priorizar a matriz de drift da Fase 2, nao para decretar remocao.

### Resumo por diretorio

| Diretorio | Qtde. docs |
|---|---:|
| `docs\agents` | 34 |
| `docs\release` | 30 |
| `docs\architecture` | 20 |
| `.` | 13 |
| `docs` | 12 |
| `review_audit` | 11 |
| `docs\testing` | 8 |
| `docs\product` | 8 |
| `docs\security` | 7 |
| `docs\operations` | 6 |
| `review_audit\agents` | 6 |
| `docs\frontend` | 3 |
| `apps\api\test` | 3 |
| `.github\ISSUE_TEMPLATE` | 3 |
| `docs\waves` | 2 |
| `docs\case-studies` | 2 |
| `infra\oracle` | 2 |
| `.github` | 1 |
| `packages\types` | 1 |
| `packages\api-contract` | 1 |
| `infra\oracle\runner` | 1 |
| `infra\oracle\ops` | 1 |
| `infra\oracle\network\wireguard` | 1 |
| `apps\web\components\dashboard` | 1 |
| `apps\web\docs` | 1 |

### Inventario completo

| Caminho | Ultima modificacao | Linhas | Resumo | Estado |
|---|---|---:|---|---|
| `.github/ISSUE_TEMPLATE/bug_report.md` | 2026-04-01 21:52:45 -0300 | 25 | O que aconteceu | DESATUALIZADO (suspeita) |
| `.github/ISSUE_TEMPLATE/feature_request.md` | 2026-04-01 21:52:45 -0300 | 18 | Qual problema isso resolve | DESATUALIZADO (suspeita) |
| `.github/ISSUE_TEMPLATE/question.md` | 2026-04-01 21:52:45 -0300 | 13 | Sua dúvida | DESATUALIZADO (suspeita) |
| `.github/pull_request_template.md` | 2026-03-26 02:01:28 -0300 | 41 | O que foi feito | DESATUALIZADO (suspeita) |
| `.interface-design/system.md` | 2026-04-08 01:45:27 -0300 | 35 | Sistema Visual — Desk Imperial | DESATUALIZADO (suspeita) |
| `apps/api/README.md` | 2026-04-18 13:15:41 -0300 | 37 | apps/api | OK |
| `apps/api/src/observability/README.md` | 2026-03-15 00:22:45 -0300 | 7 | Observability | DESATUALIZADO (suspeita) |
| `apps/api/test/EMAIL_TEMPLATE_TEST_CHECKLIST.md` | 2026-03-21 16:39:42 -0300 | 269 | Email Template Manual Testing Checklist | DESATUALIZADO (suspeita) |
| `apps/api/test/EMAIL_VALIDATION_REPORT.md` | 2026-03-21 16:39:42 -0300 | 371 | Email Template Validation Report | DESATUALIZADO (suspeita) |
| `apps/api/test/README.md` | 2026-04-02 14:36:40 -0300 | 38 | API Tests as Documentation | DESATUALIZADO (suspeita) |
| `apps/web/components/dashboard/REFACTORING_GUIDE.md` | 2026-03-17 20:30:55 -0300 | 63 | Guia de Refatoração do Dashboard Shell | DESATUALIZADO (suspeita) |
| `apps/web/docs/design-tokens.md` | 2026-03-22 18:11:13 -0300 | 16 | Desk Imperial — tokens de estilo | DESATUALIZADO (suspeita) |
| `apps/web/README.md` | 2026-03-15 00:22:45 -0300 | 27 | apps/web | DESATUALIZADO (suspeita) |
| `CHANGELOG.md` | 2026-04-11 15:14:51 -0300 | 63 | Changelog | OK |
| `CODE_OF_CONDUCT.md` | 2026-04-02 14:36:40 -0300 | 23 | Código de Conduta | DESATUALIZADO (suspeita) |
| `CONTRIBUTING.md` | 2026-04-02 14:36:40 -0300 | 140 | Como Contribuir — Desk Imperial | DESATUALIZADO (suspeita) |
| `DOCS_DESK_IMPERIAL.md` | 2026-04-02 14:36:40 -0300 | 250 | DESK IMPERIAL - AUDITORIA TECNICA E DOCUMENTACAO CONSOLIDADA | DESATUALIZADO (suspeita) |
| `docs/agents/00-core-operating-system.md` | 2026-03-23 15:44:45 -0300 | 52 | Core Operating System for Agents | OK |
| `docs/agents/01-reading-protocol.md` | 2026-03-23 15:44:45 -0300 | 74 | Reading Protocol for Every Agent | OK |
| `docs/agents/02-agent-specification-template.md` | 2026-03-23 15:44:45 -0300 | 79 | Agent Specification Template | OK |
| `docs/agents/03-soft-skills-factory.md` | 2026-03-23 15:44:45 -0300 | 77 | Soft Skills Factory for Agents | OK |
| `docs/agents/04-project-analysis.md` | 2026-03-23 15:44:45 -0300 | 40 | Project Analysis Memorandum | OK |
| `docs/agents/05-project-model.md` | 2026-03-23 15:44:45 -0300 | 31 | Project Model | OK |
| `docs/agents/06-requirements-model.md` | 2026-03-23 15:44:45 -0300 | 44 | Requirements Model | OK |
| `docs/agents/07-system-construction.md` | 2026-03-23 15:44:45 -0300 | 27 | System Construction Model | OK |
| `docs/agents/08-logical-guide.md` | 2026-03-23 15:44:45 -0300 | 30 | Logical Guide | OK |
| `docs/agents/09-flow-agent.md` | 2026-03-23 15:44:45 -0300 | 48 | Flow Agent Memorandum | OK |
| `docs/agents/10-risk-verification.md` | 2026-03-23 15:44:45 -0300 | 47 | Project Risk Verification Model | OK |
| `docs/agents/11-git-and-delivery.md` | 2026-03-23 15:44:45 -0300 | 52 | Git, Commit, Push and Delivery Model | OK |
| `docs/agents/12-scalability.md` | 2026-03-23 15:44:45 -0300 | 46 | Scalability Model | OK |
| `docs/agents/13-accessibility-equity-responsiveness.md` | 2026-03-23 15:44:45 -0300 | 53 | Accessibility, Equity and Responsiveness Model | OK |
| `docs/agents/14-language-migration.md` | 2026-03-23 15:44:45 -0300 | 47 | Language Migration Model | OK |
| `docs/agents/15-backend-agent.md` | 2026-03-23 15:44:45 -0300 | 48 | Backend Agent Memorandum | OK |
| `docs/agents/16-frontend-agent.md` | 2026-03-23 15:44:45 -0300 | 48 | Frontend Agent Memorandum | OK |
| `docs/agents/17-web-design-agent.md` | 2026-03-23 15:44:45 -0300 | 44 | Web Design Agent Memorandum | OK |
| `docs/agents/18-mobile-agent.md` | 2026-03-23 15:44:45 -0300 | 55 | Mobile Agent Memorandum | OK |
| `docs/agents/19-infra-agent.md` | 2026-03-23 15:44:45 -0300 | 61 | Infrastructure Agent Memorandum | OK |
| `docs/agents/20-cybersecurity-agent.md` | 2026-03-23 15:44:45 -0300 | 55 | Cybersecurity Agent Memorandum | OK |
| `docs/agents/21-information-security-agent.md` | 2026-03-23 15:44:45 -0300 | 54 | Information Security Agent Memorandum | OK |
| `docs/agents/22-debugging-agent.md` | 2026-03-23 15:44:45 -0300 | 61 | Debugging Agent Memorandum | OK |
| `docs/agents/23-system-testing-agent.md` | 2026-03-23 15:44:45 -0300 | 57 | System Testing Agent Memorandum | OK |
| `docs/agents/24-system-configuration-agent.md` | 2026-03-23 15:44:45 -0300 | 49 | System Configuration Agent Memorandum | OK |
| `docs/agents/25-cli-agent.md` | 2026-04-17 02:54:57 -0300 | 76 | CLI Agent Memorandum | OK |
| `docs/agents/26-railway-deploy-agent.md` | 2026-03-23 15:44:45 -0300 | 65 | Railway Deploy Agent Memorandum | OK |
| `docs/agents/27-creative-brainstorming-agent.md` | 2026-03-23 15:44:45 -0300 | 55 | Creative Brainstorming Agent Memorandum | OK |
| `docs/agents/28-ux-ui-plan-agent.md` | 2026-03-23 15:44:45 -0300 | 71 | UX and UI Plan Agent Memorandum | OK |
| `docs/agents/29-database-agent.md` | 2026-03-23 15:44:45 -0300 | 130 | Database Agent Memorandum | OK |
| `docs/agents/30-case-study-agent.md` | 2026-03-23 15:44:45 -0300 | 96 | Case Study Agent Memorandum | OK |
| `docs/agents/31-documentation-agent.md` | 2026-03-23 15:44:45 -0300 | 80 | Documentation Agent Memorandum | OK |
| `docs/agents/32-frontend-product-lead-agent.md` | 2026-04-06 17:07:13 -0300 | 337 | Frontend Product Lead Agent Memorandum | OK |
| `docs/agents/README.md` | 2026-04-06 17:07:13 -0300 | 88 | Agent Operating System | OK |
| `docs/architecture/ai-sandbox.md` | 2026-03-25 17:23:56 -0300 | 36 | AI Sandbox no test1 | DESATUALIZADO (suspeita) |
| `docs/architecture/authentication-flow.md` | 2026-04-02 14:36:40 -0300 | 47 | Authentication Flow | DESATUALIZADO (suspeita) |
| `docs/architecture/coding-standards.md` | 2026-04-11 15:14:51 -0300 | 281 | Coding Standards — Desk Imperial | DESATUALIZADO (suspeita) |
| `docs/architecture/database.md` | 2026-04-22 21:17:31 -0300 | 314 | Banco de Dados — Desk Imperial | OK |
| `docs/architecture/design-lab-audit-2026-04-19.md` | 2026-04-20 16:42:50 -0300 | 372 | Design-Lab Audit | OK |
| `docs/architecture/intelligence-platform-2026-04-29.md` | 2026-04-29 22:52:02 -0300 | 247 | Plataforma de Inteligencia, RAG e Telegram | OK |
| `docs/architecture/local-development.md` | 2026-04-21 19:26:15 -0300 | 111 | Desenvolvimento Local | OK |
| `docs/architecture/maintenance-center-stack-2026-04-29.md` | 2026-04-29 19:11:37 -0300 | 123 | Central de Review, Escalabilidade e Manutenção | OK |
| `docs/architecture/module-template.md` | 2026-04-11 15:14:51 -0300 | 174 | Module Template — Desk Imperial | DESATUALIZADO (suspeita) |
| `docs/architecture/modules.md` | 2026-04-29 22:52:02 -0300 | 251 | Módulos de Domínio — Desk Imperial API | OK |
| `docs/architecture/multi-surface-platform-strategy.md` | 2026-04-21 19:26:15 -0300 | 180 | Estrategia Multi-Superficie | OK |
| `docs/architecture/outbound-notifications.md` | 2026-04-26 15:59:39 -0300 | 81 | Notificacoes Externas e Telegram | OK |
| `docs/architecture/overview.md` | 2026-04-19 16:10:56 -0300 | 60 | Overview de Arquitetura | OK |
| `docs/architecture/professor-review-consolidated-2026-03-28.md` | 2026-03-28 19:19:09 -0300 | 244 | Consolidação da Avaliação Externa - 2026-03-28 | DESATUALIZADO (suspeita) |
| `docs/architecture/realtime.md` | 2026-04-01 20:57:02 -0300 | 118 | Tempo Real — Desk Imperial | DESATUALIZADO (suspeita) |
| `docs/architecture/refactoring-candidates-report.md` | 2026-04-11 15:14:51 -0300 | 153 | Refatoracao — Candidatos a Refatoracao Maior | DESATUALIZADO (suspeita) |
| `docs/architecture/refactoring-phase1-report.md` | 2026-04-11 15:14:51 -0300 | 63 | Fase 1: Padronização e ESLint — Relatório | DESATUALIZADO (suspeita) |
| `docs/architecture/security.md` | 2026-04-01 21:24:29 -0300 | 154 | Arquitetura de Segurança — Desk Imperial | DESATUALIZADO (suspeita) |
| `docs/architecture/sldd-working-agreement.md` | 2026-04-21 00:07:37 -0300 | 66 | SLDD Working Agreement — Desk Imperial | OK |
| `docs/architecture/system-map.md` | 2026-04-26 15:59:39 -0300 | 156 | Mapa do Sistema - Monorepo TS, Zod e OpenAPI | OK |
| `docs/baseline-metrics.md` | 2026-04-17 11:50:43 -0300 | 144 | Baseline Metrics | OK |
| `docs/case-studies/2026-02-arch-decisions-backlog.md` | 2026-03-23 15:44:45 -0300 | 55 | Registro: Decisões arquiteturais — histórico não documentado | DESATUALIZADO (suspeita) |
| `docs/case-studies/2026-03-redis-rate-limit-migration.md` | 2026-03-23 15:44:45 -0300 | 43 | Caso: Migração de rate limiting do PostgreSQL para Redis | DESATUALIZADO (suspeita) |
| `docs/CREATOR.md` | 2026-04-04 23:43:37 -0300 | 53 | Documento do Criador — Desk Imperial | DESATUALIZADO (suspeita) |
| `docs/DEMO.md` | 2026-04-01 21:05:09 -0300 | 52 | Demo — Desk Imperial | DESATUALIZADO (suspeita) |
| `docs/DOC-PLAN.md` | 2026-04-01 20:57:02 -0300 | 78 | Plano Mestre de Documentação — Desk Imperial | DESATUALIZADO (suspeita) |
| `docs/email/brevo-integration.md` | 2026-04-17 02:54:57 -0300 | 618 | Brevo Email Integration | OK |
| `docs/engineering-notes.md` | 2026-04-19 16:10:56 -0300 | 24 | Engineering Notes | OK |
| `docs/frontend/design-lab-responsive-standard.md` | 2026-04-21 00:07:37 -0300 | 87 | Design-Lab Responsive Standard | OK |
| `docs/frontend/ui-guidelines.md` | 2026-03-21 16:39:42 -0300 | 590 | UI Guidelines | DESATUALIZADO (suspeita) |
| `docs/frontend/visual-reform-audit-2026-04-06.md` | 2026-04-06 17:07:13 -0300 | 107 | Auditoria e Plano de Reforma Visual — Frontend Desk Imperial | DESATUALIZADO (suspeita) |
| `docs/GETTING-STARTED.md` | 2026-04-01 13:17:31 -0300 | 28 | Dicas para novos desenvolvedores | DESATUALIZADO (suspeita) |
| `docs/INDEX.md` | 2026-04-21 19:26:15 -0300 | 131 | Índice de Documentação — Desk Imperial | OK |
| `docs/known-bugs.md` | 2026-04-18 12:47:13 -0300 | 37 | Known Bugs | OK |
| `docs/operational-runbook.md` | 2026-04-19 16:10:56 -0300 | 59 | Operational Runbook | OK |
| `docs/operations/flows.md` | 2026-04-19 16:10:56 -0300 | 588 | Fluxos de Operação - Desk Imperial | OK |
| `docs/operations/kpi-realtime-mapping.md` | 2026-03-28 19:19:09 -0300 | 67 | KPI Realtime Mapping | DESATUALIZADO (suspeita) |
| `docs/operations/observability-oss-phase1.md` | 2026-04-11 15:14:51 -0300 | 167 | Observabilidade OSS Fase 1 (API) | DESATUALIZADO (suspeita) |
| `docs/operations/realtime-performance-runbook.md` | 2026-04-24 23:56:10 -0300 | 52 | Realtime e Operacoes — Performance Runbook | OK |
| `docs/operations/realtime-refinement-2026-03-28.md` | 2026-03-28 17:54:53 -0300 | 167 | Realtime Refinement - 2026-03-28 | DESATUALIZADO (suspeita) |
| `docs/operations/staging-incident-rollback-runbook.md` | 2026-04-17 02:54:57 -0300 | 70 | Runbook de Staging, Incidente e Rollback | DESATUALIZADO (suspeita) |
| `docs/product/design-lab-capability-matrix.md` | 2026-04-19 16:10:56 -0300 | 45 | Design-Lab Capability Matrix | OK |
| `docs/product/overview.md` | 2026-04-06 15:21:57 -0300 | 92 | O Produto — Desk Imperial | DESATUALIZADO (suspeita) |
| `docs/product/owner-pwa-mvp.md` | 2026-04-22 21:17:31 -0300 | 179 | Owner PWA MVP | OK |
| `docs/product/requirements.md` | 2026-04-06 15:21:57 -0300 | 200 | Requisitos — Desk Imperial | DESATUALIZADO (suspeita) |
| `docs/product/risks-and-limitations.md` | 2026-04-06 15:21:57 -0300 | 138 | Riscos e Limitações — Desk Imperial | DESATUALIZADO (suspeita) |
| `docs/product/staff-pwa-mvp.md` | 2026-04-21 19:26:15 -0300 | 81 | Staff PWA MVP | OK |
| `docs/product/stock-management.md` | 2026-04-02 14:36:40 -0300 | 106 | Gestão de Estoque — Desk Imperial | DESATUALIZADO (suspeita) |
| `docs/product/user-flows.md` | 2026-04-01 20:57:02 -0300 | 170 | Fluxos do Usuário — Desk Imperial | DESATUALIZADO (suspeita) |
| `docs/README.md` | 2026-04-02 14:36:40 -0300 | 70 | Documentacao do Projeto | DESATUALIZADO (suspeita) |
| `docs/release/AUDITORIA-CONSOLIDADA-2026-04-08.md` | 2026-04-09 17:32:54 -0300 | 298 | AUDITORIA CONSOLIDADA — DESK IMPERIAL | DESATUALIZADO (suspeita) |
| `docs/release/canonical-host-map-2026-04-22.md` | 2026-04-24 16:21:27 -0300 | 33 | Canonical Host Map | DESATUALIZADO (suspeita) |
| `docs/release/deploy-2026-04-23-local-release.md` | 2026-04-22 21:49:39 -0300 | 58 | Deploy 2026-04-23 — Local Release | DESATUALIZADO (suspeita) |
| `docs/release/diagnostico-performance-pwa-realtime-seguranca-2026-04-01.md` | 2026-04-02 14:36:40 -0300 | 114 | Diagnostico Tecnico Focado - Performance, PWA, Realtime e Seguranca | DESATUALIZADO (suspeita) |
| `docs/release/DIAGNOSTICO-TECNICO-PROFUNDO-2026-04-08.md` | 2026-04-09 17:32:54 -0300 | 318 | DIAGNOSTICO TECNICO PROFUNDO — DESK IMPERIAL | DESATUALIZADO (suspeita) |
| `docs/release/gaps-and-risks-2026-03-28.md` | 2026-03-28 19:35:15 -0300 | 45 | Gaps and Risks - 2026-03-28 | DESATUALIZADO (suspeita) |
| `docs/release/lohana-oci-inventory-2026-04-22.md` | 2026-04-22 21:17:31 -0300 | 56 | Lohana OCI Inventory | DESATUALIZADO (suspeita) |
| `docs/release/manual-smoke-checklist-2026-03-28.md` | 2026-03-28 19:35:15 -0300 | 26 | Manual Smoke Checklist - 2026-03-28 | DESATUALIZADO (suspeita) |
| `docs/release/mapa-real-sistema-2026-04-01.md` | 2026-04-06 15:21:57 -0300 | 237 | Mapa Real do Sistema - Desk Imperial | DESATUALIZADO (suspeita) |
| `docs/release/mapeamento-performance-imagens-telegram-2026-04-26.md` | 2026-04-26 15:59:39 -0300 | 279 | Mapeamento — Performance, Imagens e Telegram | DESATUALIZADO (suspeita) |
| `docs/release/multi-surface-delivery-workflow.md` | 2026-04-21 19:26:15 -0300 | 155 | Workflow de Entrega Multi-Superficie | DESATUALIZADO (suspeita) |
| `docs/release/network-exposure-model-2026-04-22.md` | 2026-04-22 21:17:31 -0300 | 83 | Network Exposure Model | DESATUALIZADO (suspeita) |
| `docs/release/observability-vm2-closure-2026-04-24.md` | 2026-04-24 16:21:27 -0300 | 45 | Observabilidade vm2 — Fechamento OTEL | DESATUALIZADO (suspeita) |
| `docs/release/oracle-cloud-runtime-plan-2026-04-04.md` | 2026-04-06 21:37:23 -0300 | 151 | Oracle Cloud + Neon — plano de runtime alvo | DESATUALIZADO (suspeita) |
| `docs/release/oracle-hardening-status-2026-04-22.md` | 2026-04-22 21:17:31 -0300 | 110 | Oracle Hardening Status | DESATUALIZADO (suspeita) |
| `docs/release/parecer-tecnico-final-2026-04-01.md` | 2026-04-02 14:36:40 -0300 | 49 | Parecer Tecnico Final - Liberacao Desk Imperial | DESATUALIZADO (suspeita) |
| `docs/release/plano-hardening-observabilidade-2026-04-02.md` | 2026-04-06 15:21:57 -0300 | 224 | Plano de Hardening de Observabilidade e Governanca | DESATUALIZADO (suspeita) |
| `docs/release/plano-lapidacao-release-2026-04-01.md` | 2026-04-17 02:54:57 -0300 | 152 | Plano de Lapidacao para Release Real | DESATUALIZADO (suspeita) |
| `docs/release/plano-vendas-telemetria-2026-04-02.md` | 2026-04-02 20:13:32 -0300 | 276 | Plano de Ataque — Gargalo de Vendas + Telemetria OSS | DESATUALIZADO (suspeita) |
| `docs/release/postgres-ampere-cutover-2026-04-22.md` | 2026-04-22 21:17:31 -0300 | 87 | Cutover Neon -> Ampere (Lohana) | DESATUALIZADO (suspeita) |
| `docs/release/postgres-ampere-remote-execution-2026-04-22.md` | 2026-04-22 21:17:31 -0300 | 116 | Execução Remota — PostgreSQL Ampere / Runner / Ops | DESATUALIZADO (suspeita) |
| `docs/release/proposta-ci-release-2026-04-01.md` | 2026-04-02 14:36:40 -0300 | 98 | Proposta de Pipeline CI para Release | DESATUALIZADO (suspeita) |
| `docs/release/pwa-owner-stabilization-2026-04-21.md` | 2026-04-22 21:17:31 -0300 | 168 | PWA Owner — Estabilizacao Estrutural 2026-04-21 | DESATUALIZADO (suspeita) |
| `docs/release/release-baseline-2026-03-28.md` | 2026-03-28 19:35:15 -0300 | 67 | Release Baseline - 2026-03-28 | DESATUALIZADO (suspeita) |
| `docs/release/release-criteria-2026-03-28.md` | 2026-04-17 02:54:57 -0300 | 52 | Release Criteria - 2026-03-28 | DESATUALIZADO (suspeita) |
| `docs/release/retomada-2026-04-22-product-catalog-base.md` | 2026-04-22 21:17:31 -0300 | 137 | Retomada - 2026-04-22 - Product Catalog Base | DESATUALIZADO (suspeita) |
| `docs/release/route-closure-matrix-2026-04-21.md` | 2026-04-21 19:26:15 -0300 | 61 | Matriz de Fechamento de Rotas — Web + PWA | DESATUALIZADO (suspeita) |
| `docs/release/sonarqube-auditoria-e-sprints-2026-04-03.md` | 2026-04-04 23:43:37 -0300 | 461 | SonarQube — plano de auditoria contínua e sprints de remediação | DESATUALIZADO (suspeita) |
| `docs/release/test-matrix-2026-03-28.md` | 2026-03-28 19:35:15 -0300 | 28 | Test Matrix - 2026-03-28 | DESATUALIZADO (suspeita) |
| `docs/release/web-pwa-closure-workflow-2026-04-21.md` | 2026-04-22 21:17:31 -0300 | 249 | Workflow de Fechamento — Web + PWA + Backend Local | DESATUALIZADO (suspeita) |
| `docs/security/admin-pin-hardening.md` | 2026-03-25 17:23:56 -0300 | 21 | Admin PIN Hardening | DESATUALIZADO (suspeita) |
| `docs/security/baseline.md` | 2026-04-19 16:10:56 -0300 | 703 | Security Baseline | OK |
| `docs/security/brevo-domain-setup.md` | 2026-03-19 00:41:34 -0300 | 56 | Brevo: Dominio e Sender | DESATUALIZADO (suspeita) |
| `docs/security/dependency-risk-acceptance-2026-04-01.md` | 2026-04-02 00:17:19 -0300 | 87 | Dependency Risk Acceptance - 2026-04-01 | DESATUALIZADO (suspeita) |
| `docs/security/deploy-checklist.md` | 2026-03-28 19:19:09 -0300 | 101 | Checklist de Deploy Seguro | DESATUALIZADO (suspeita) |
| `docs/security/observability-and-logs.md` | 2026-04-02 14:36:40 -0300 | 61 | Observability and Logs | DESATUALIZADO (suspeita) |
| `docs/security/security-baseline.md` | 2026-04-02 00:02:50 -0300 | 47 | Security Baseline | DESATUALIZADO (suspeita) |
| `docs/SESSION-REPORT-2026-03-26.md` | 2026-03-28 19:19:09 -0300 | 185 | Relatório de Testes — Desk Imperial | DESATUALIZADO (suspeita) |
| `docs/testing/AUDITORIA_TESTES_COMPLETA.md` | 2026-03-28 01:13:53 -0300 | 643 | 📋 DOCUMENTAÇÃO DE TESTES - DESK IMPERIAL | DESATUALIZADO (suspeita) |
| `docs/testing/coverage-snapshot-2026-04-03.md` | 2026-04-04 23:43:37 -0300 | 79 | Snapshot de Cobertura de Testes - 2026-04-03 | DESATUALIZADO (suspeita) |
| `docs/testing/coverage-upgrade-session-2026-04-03.md` | 2026-04-04 23:43:37 -0300 | 150 | Relatorio de Upgrade de Cobertura - Sessao 2026-04-03 | DESATUALIZADO (suspeita) |
| `docs/testing/load-testing.md` | 2026-04-02 14:36:40 -0300 | 54 | Load Testing | DESATUALIZADO (suspeita) |
| `docs/testing/PENDENCIAS-TESTES-2026-03-26.md` | 2026-03-26 14:57:40 -0300 | 160 | Pendências de Testes — Encerradas | DESATUALIZADO (suspeita) |
| `docs/testing/RELATORIO_EXECUCAO_TESTES_2026-03-27.md` | 2026-03-28 19:19:09 -0300 | 766 | 🧪 RELATÓRIO DE EXECUÇÃO DE TESTES - DESK IMPERIAL | DESATUALIZADO (suspeita) |
| `docs/testing/test-implementation-report.md` | 2026-03-26 14:57:40 -0300 | 278 | Relatório de Implementação de Testes e Documentação | DESATUALIZADO (suspeita) |
| `docs/testing/testing-guide.md` | 2026-04-02 14:36:40 -0300 | 82 | Testing Guide | DESATUALIZADO (suspeita) |
| `docs/troubleshooting.md` | 2026-04-02 14:36:40 -0300 | 186 | Troubleshooting Guide | DESATUALIZADO (suspeita) |
| `docs/waves/decisions-pending.md` | 2026-04-19 16:10:56 -0300 | 241 | Decisions Pending | OK |
| `docs/waves/wave-0-operations-gap.md` | 2026-04-17 11:50:43 -0300 | 67 | Wave 0 - Operations Gap Audit | DESATUALIZADO (suspeita) |
| `HOVER_PERFORMANCE_AUDIT.md` | 2026-03-21 16:39:42 -0300 | 168 | Dashboard Hover Performance Audit | DESATUALIZADO (suspeita) |
| `infra/oracle/db/README.md` | 2026-04-22 21:17:31 -0300 | 100 | Ampere DB Stack — PostgreSQL primário do Desk Imperial | OK |
| `infra/oracle/network/wireguard/README.md` | 2026-04-22 21:17:31 -0300 | 34 | WireGuard — malha privada entre Oracle e a Lohana | OK |
| `infra/oracle/ops/README.md` | 2026-04-22 21:17:31 -0300 | 91 | Oracle Ops Stack — Observabilidade, SonarQube e Metabase | OK |
| `infra/oracle/README.md` | 2026-04-22 21:17:31 -0300 | 68 | Oracle runtime base | OK |
| `infra/oracle/runner/README.md` | 2026-04-22 21:17:31 -0300 | 32 | Oracle Runner Stack — restore drill e pgBadger | OK |
| `infra/oracle/THREE_VM_STRATEGY.md` | 2026-04-22 21:17:31 -0300 | 82 | Estratégia Oracle — 5 VMs | OK |
| `MOBILE_PERFORMANCE_AUDIT.md` | 2026-03-28 21:09:45 -0300 | 298 | 📱 DESK IMPERIAL — Auditoria de Performance Mobile | DESATUALIZADO (suspeita) |
| `packages/api-contract/README.md` | 2026-04-19 16:10:56 -0300 | 23 | @partner/api-contract | OK |
| `packages/types/README.md` | 2026-04-19 16:10:56 -0300 | 29 | packages/types | OK |
| `PRD_DESK_IMPERIAL_RELEASE_V3.md` | 2026-04-02 14:36:40 -0300 | 137 | PRD - DESK IMPERIAL RELEASE V3 | DESATUALIZADO (suspeita) |
| `PRD_DESK_IMPERIAL_V2.md` | 2026-04-02 14:36:40 -0300 | 308 | PRD — DESK IMPERIAL v2.0 | DESATUALIZADO (suspeita) |
| `README_PROFILE.md` | 2026-04-04 23:43:37 -0300 | 60 | João Victor de Moraes da Cruz | DESATUALIZADO (suspeita) |
| `README.md` | 2026-04-22 23:56:01 -0300 | 244 | Desk Imperial | OK |
| `review_audit/00_master_index.md` | 2026-04-17 02:54:57 -0300 | 60 | Auditoria Desk Imperial — Master Index (FINAL — 2026-04-26) | DESATUALIZADO (suspeita) |
| `review_audit/01_repo_map.md` | 2026-04-17 02:54:57 -0300 | 93 | Mapa do Repositorio - Desk Imperial | DESATUALIZADO (suspeita) |
| `review_audit/02_assumptions_and_unknowns.md` | 2026-04-17 02:54:57 -0300 | 43 | Hipoteses, Incertezas e Lacunas - Desk Imperial | DESATUALIZADO (suspeita) |
| `review_audit/03_findings_log.md` | 2026-04-17 02:54:57 -0300 | 136 | Log Cumulativo de Achados - Desk Imperial | DESATUALIZADO (suspeita) |
| `review_audit/04_risk_matrix.md` | 2026-04-17 02:54:57 -0300 | 45 | Matriz de Riscos - Desk Imperial | DESATUALIZADO (suspeita) |
| `review_audit/05_maturity_scorecard.md` | 2026-04-17 02:54:57 -0300 | 36 | Scorecard de Maturidade - Desk Imperial | DESATUALIZADO (suspeita) |
| `review_audit/100_pre_feature_stabilization_plan.md` | 2026-04-17 02:54:57 -0300 | 65 | Gate de Estabilizacao Antes de Novas Features | DESATUALIZADO (suspeita) |
| `review_audit/101_code_fortification_sonar_refactoring_log.md` | 2026-04-17 02:54:57 -0300 | 76 | Log de Fortificacao Sonar e Refatoracao Segura | DESATUALIZADO (suspeita) |
| `review_audit/102_quality_warning_map.md` | 2026-04-17 02:54:57 -0300 | 131 | Quality Warning Map | DESATUALIZADO (suspeita) |
| `review_audit/99_master_improvement_plan.md` | 2026-04-17 02:54:57 -0300 | 76 | Plano Mestre de Melhoria - Desk Imperial | DESATUALIZADO (suspeita) |
| `review_audit/agents/architecture-reviewer.md` | 2026-04-17 02:54:57 -0300 | 76 | Auditoria Arquitetural - Desk Imperial | DESATUALIZADO (suspeita) |
| `review_audit/agents/backend-reviewer.md` | 2026-04-17 02:54:57 -0300 | 54 | Auditoria Backend - Desk Imperial | DESATUALIZADO (suspeita) |
| `review_audit/agents/frontend-reviewer.md` | 2026-04-17 02:54:57 -0300 | 89 | Auditoria Frontend - Desk Imperial | DESATUALIZADO (suspeita) |
| `review_audit/agents/infra-devops-reviewer.md` | 2026-04-17 02:54:57 -0300 | 37 | Auditoria Infra / DevOps - Desk Imperial | DESATUALIZADO (suspeita) |
| `review_audit/agents/qa-test-reviewer.md` | 2026-04-17 02:54:57 -0300 | 38 | Auditoria QA / Testes - Desk Imperial | DESATUALIZADO (suspeita) |
| `review_audit/agents/security-reviewer.md` | 2026-04-17 02:54:57 -0300 | 47 | Auditoria de Seguranca - Desk Imperial | DESATUALIZADO (suspeita) |
| `review_audit/REFACTORING_PROGRESS.md` | 2026-04-17 02:54:57 -0300 | 45 | Refatoracao Cirurgica - Progresso Consolidado | DESATUALIZADO (suspeita) |
| `ROADMAP.md` | 2026-04-22 23:56:03 -0300 | 97 | Roadmap — Desk Imperial | OK |
| `SECURITY-AUDIT.md` | 2026-03-27 12:06:31 -0300 | 269 | Desk Imperial — Auditoria de Segurança: XSS, Injeção de Script e Injeção de Texto | DESATUALIZADO (suspeita) |
| `SECURITY.md` | 2026-04-02 14:36:40 -0300 | 80 | Política de Segurança — Desk Imperial | DESATUALIZADO (suspeita) |
| `tests/load/README.md` | 2026-04-02 14:36:40 -0300 | 26 | Load testing | DESATUALIZADO (suspeita) |

## 3. Achados iniciais que ja alteram a trilha editorial

1. A documentacao atual esta espalhada entre `docs/`, `infra/`, relatorios de release/testes e artefatos de auditoria. O problema principal nao e ausencia de documentacao; e falta de fronteira entre runbook vivo, relatorio datado e backlog historico.
2. As areas com maior probabilidade de drift hoje sao: realtime, mobile owner/staff, Telegram, Sentry/observabilidade, QZ Tray/impressao, catalogo inteligente e seguranca operacional.
3. O backend e NestJS, nao Express. Qualquer doc que ainda descreva routers/middlewares estilo Express precisa ser reescrita com a semantica correta de `Controller`, guard, interceptor, bootstrap e modulo.
4. O repositorio ja tem documentacao recente de waves (`docs/waves/*`) e rollout de Telegram/Sentry. A trilha editorial precisa preservar isso como evidencia e reorganizar, nao apagar nem recontar do zero.
5. Nao apareceu um tunel GitHub dedicado no codigo versionado. O que existe sao workflows GitHub Actions e tuneis SSH/WireGuard/OCI para observabilidade, banco e builder Oracle.

## 4. Proximo passo da auditoria

- Fase 2: transformar este inventario em `drift-matrix.md`, comecando por `README.md`, `docs/README.md`, `docs/INDEX.md`, `docs/product/overview.md`, `docs/architecture/*`, `docs/operations/*`, `docs/security/*` e `docs/waves/*`.
- Criterio: cada afirmacao documental relevante sera comparada com uma evidencia do codigo atual ou marcada como `FALTA`/`DRIFT`.
