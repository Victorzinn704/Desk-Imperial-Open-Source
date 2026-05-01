# Matriz de Drift Documental - Desk Imperial

- Data: 2026-05-01
- Commit auditado: `d8b6457`
- Base metodologica: `C:\Users\Desktop\Downloads\PROMPT_DOC_AUDIT_DESK_IMPERIAL.md`, adaptado de Express para NestJS.

## Escopo e criterio

Esta matriz separa duas profundidades de auditoria:

1. **Auditoria completa** nos documentos que hoje funcionam como porta de entrada, fonte canonica declarada ou explicacao de arquitetura/comportamento atual.
2. **Triagem editorial** nos documentos historicos, runbooks datados, relatorios de release, agentes e artefatos de auditoria. Nesses casos, o foco e classificar o papel do arquivo (`canonico`, `historico`, `auditoria`, `legado`) para evitar que documento antigo seja lido como verdade atual.

Legenda:

- `OK` - bate com o codigo atual
- `DRIFT` - contradiz o codigo atual ou a infraestrutura atual
- `FALTA` - o codigo atual implementa algo relevante que o doc nao cobre
- `ORFAO` - descreve caminho removido ou que nao deve mais ser tratado como ativo
- `DUPLICATA` - repete assunto que deveria estar centralizado em outro doc

## Veredito executivo

1. O problema mais serio de documentacao hoje **nao e falta de quantidade**. E **governanca ruim do que e canonico**.
2. `README.md`, `docs/README.md`, `docs/INDEX.md` e `DOCS_DESK_IMPERIAL.md` ainda mandam o leitor confiar em documentos e premissas que ja driftaram.
3. Os maiores eixos de drift sao:
   - **infra/deploy**: Railway/Neon como estado atual, enquanto o repo ja opera Oracle/Ampere como runtime real;
   - **realtime**: namespace, eventos e topologia de rooms ja mudaram;
   - **auth/PIN**: a doc ainda mistura cookie/sessao com Bearer/JWT em fluxos operacionais;
   - **superficie funcional nova**: Telegram, Sentry, preferencias de notificacao, smart draft de produto, barcode/Open Food Facts e pipeline de imagens ainda estao subdocumentados nos docs canonicos.
4. O arquivo `docs/release/*` continua valioso como **historico tecnico**, mas **nao pode continuar sendo tratado como fonte primaria de entendimento atual**.
5. A busca local **nao encontrou tunel GitHub dedicado versionado**. O que existe no repo sao workflows GitHub e tuneis Oracle/SSH/WireGuard (`infra/scripts/oracle-ops-tunnel.ps1`, `infra/scripts/oracle-builder-deploy.ps1`, `infra/scripts/oracle-db-tunnel.ps1`).

## Documentos canonicos e de entrada

### Doc: `README.md`

| # | Afirmação no doc | Evidência atual no código | Status |
|---|---|---|---|
| 1 | Deploy atual: `Railway (atual) · Oracle Cloud + Neon (alvo)` (`README.md:75`) | O runtime versionado atual e Oracle: `infra/oracle/compose.yaml:24-156` define `api`, `web`, `nginx`, `certbot`; o fluxo de release usa `infra/scripts/oracle-builder-deploy.ps1:21-43`, `:225-243`, `:245-282` | `DRIFT` |
| 2 | URL canonica de health local: `http://localhost:4000/api/health` (`README.md:150-154`) | O prefixo global e `/api/v1` em `apps/api/src/main.ts:294`; health canonico e `GET /api/v1/health` em `apps/api/src/modules/health/health.controller.ts:4-10`; `/api/health` existe so como alias legado em `apps/api/src/main.ts:220-231` | `DRIFT` |
| 3 | `apps/api` teria `15 módulos de domínio` (`README.md:212`) | `AppModule` conecta 16 feature modules em `apps/api/src/app.module.ts:13-28`; a arvore `apps/api/src/modules` tem 17 diretorios top-level, incluindo `mailer`, em `Get-ChildItem apps/api/src/modules -Directory` registrado no `recon.md` | `DRIFT` |
| 4 | Stack `Next.js 16 + React 19` | `apps/web/package.json:40-44` confirma `next@^16.1.7`, `react@^19.1.1`, `react-dom@^19.1.1` | `OK` |
| 5 | O README atual nao menciona Telegram, Sentry, preferencias de notificacao, smart draft de produto nem barcode/catalogo inteligente | Telegram e preferencias existem em `apps/api/src/modules/notifications/notifications.controller.ts:24-86` e `notification-preferences.controller.ts:22-49`; Sentry web existe em `apps/web/next.config.ts:83-92` e `apps/web/lib/observability/sentry.ts:18-30`; smart draft existe em `apps/api/src/modules/products/products.controller.ts:40-43`; barcode lookup existe em `apps/web/app/api/barcode/lookup/route.ts` | `FALTA` |

### Doc: `docs/README.md`

| # | Afirmação no doc | Evidência atual no código | Status |
|---|---|---|---|
| 1 | Fontes canonicas atuais: `README.md`, `DOCS_DESK_IMPERIAL.md`, `release/` (`docs/README.md:12-18`) | `DOCS_DESK_IMPERIAL.md:17-37` ainda manda confiar em `docs/release/*`; varios release docs continuam acoplados a Railway/Neon, enquanto o runtime real do repo e Oracle/Ampere (`infra/oracle/compose.yaml:24-156`, `infra/scripts/oracle-builder-deploy.ps1:21-43`) | `DRIFT` |
| 2 | `architecture/authentication-flow.md` e `testing/testing-guide.md` estariam entre as fontes mais confiaveis (`docs/README.md:22-30`) | `authentication-flow.md` esta relativamente alinhado, mas a governanca ignora docs ativos e mais novos de waves, Telegram e seguranca operacional, por exemplo `docs/waves/realtime-recovery-plan-2026-05-01.md` e `docs/operations/telegram-bot-rollout.md` | `DRIFT` |
| 3 | Estrutura de longo prazo proposta (`docs/README.md:37-72`) nao contempla `waves/`, `_meta/audit/` e a trilha atual de operacao/seguranca | O repo ja usa `docs/waves/*` para governar realtime e debt recovery; esta auditoria esta em `docs/_meta/audit/*` | `FALTA` |

### Doc: `DOCS_DESK_IMPERIAL.md`

| # | Afirmação no doc | Evidência atual no código | Status |
|---|---|---|---|
| 1 | O proprio arquivo e `docs/release/*` sao fonte primaria de entendimento atual (`DOCS_DESK_IMPERIAL.md:17-37`) | A propria base documental de release ainda carrega premissas antigas de Railway/Neon em varios lugares; hoje isso conflita com o runtime Oracle/Ampere (`infra/oracle/compose.yaml:24-156`, `infra/scripts/oracle-builder-deploy.ps1:21-43`) | `DRIFT` |
| 2 | O documento fala do sistema em alto nivel, mas nao cobre Telegram, Sentry, notificacoes por usuario/workspace, smart draft nem barcode/media pipeline | Implementacoes reais estao em `apps/api/src/modules/notifications/*`, `apps/web/lib/observability/sentry.ts:18-30`, `apps/web/next.config.ts:83-92`, `apps/api/src/modules/products/products.controller.ts:40-43`, `apps/web/app/api/barcode/lookup/route.ts`, `apps/web/app/api/media/pexels/search/route.ts` | `FALTA` |
| 3 | A diretriz canonica reforca `docs/release/*` como leitura primaria (`DOCS_DESK_IMPERIAL.md:29-37`) | Os docs de release devem permanecer como evidencia e historico, nao como contrato editorial central do estado atual | `DRIFT` |

### Doc: `docs/INDEX.md`

| # | Afirmação no doc | Evidência atual no código | Status |
|---|---|---|---|
| 1 | `architecture/modules.md` cobre `16 módulos de domínio` (`docs/INDEX.md:38`, `:133`) | A surface real de modulos mudou e a contagem hardcoded ficou instavel: `apps/api/src/app.module.ts:13-28` e `apps/api/src/modules/*` | `DRIFT` |
| 2 | O indice nao lista `waves/` como trilha operacional ativa | A trilha de recuperacao realtime esta em uso e atualizada em `docs/waves/realtime-wave-0-inventory-2026-05-01.md`, `docs/waves/realtime-recovery-plan-2026-05-01.md`, `docs/waves/realtime-validation-checklist-2026-05-01.md` | `FALTA` |
| 3 | O indice nao lista Telegram rollout, Sentry web/api ou o workflow de teste de seguranca recente | Esses artefatos existem em `docs/operations/telegram-bot-rollout.md`, `apps/web/next.config.ts:83-92`, `apps/api/src/instrument.ts`, `docs/security/security-testing-workflow-2026-04-30.md` | `FALTA` |
| 4 | A secao `Release e diagnóstico` mistura runbooks historicos com leitura recomendada sem diferenciar documentos historicos de documentos canonicos atuais | Os arquivos sao uteis, mas precisam ser explicitamente marcados como historicos e nao como guia de onboarding atual | `DRIFT` |

### Doc: `docs/DOC-PLAN.md`

| # | Afirmação no doc | Evidência atual no código | Status |
|---|---|---|---|
| 1 | `docs/architecture/modules.md` foi criado como retrato dos `16 módulos de domínio` (`docs/DOC-PLAN.md:56`) | A contagem ja driftou; o doc precisa abandonar numero fixo e passar a listar modulos por arquivo/owner | `DRIFT` |
| 2 | `docs/architecture/realtime.md` foi criado como fluxo Socket.IO definitivo (`docs/DOC-PLAN.md:58`) | O realtime foi redesenhado desde 2026-04-01: namespace, eventos, rooms e reconnect mudaram em `apps/api/src/modules/operations-realtime/operations-realtime.types.ts:3-60` e `apps/web/components/operations/hooks/use-operations-socket.ts:52-168` | `DRIFT` |

## Produto

### Doc: `docs/product/overview.md`

| # | Afirmação no doc | Evidência atual no código | Status |
|---|---|---|---|
| 1 | O desenvolvedor encontraria `16 módulos de domínio bem separados` (`docs/product/overview.md:69`) | A contagem ja nao e estavel; o wiring atual do Nest conecta 16 feature modules e a arvore tem 17 diretorios top-level em `apps/api/src/modules` | `DRIFT` |
| 2 | O panorama funcional nao menciona Telegram, preferencias de notificacao, barcode lookup, smart draft e pipeline de imagens | Essas superficies ja estao implementadas em `apps/api/src/modules/notifications/*`, `apps/api/src/modules/products/products.controller.ts:40-43`, `apps/web/app/api/barcode/lookup/route.ts`, `apps/web/app/api/media/pexels/search/route.ts` | `FALTA` |
| 3 | O quadro `Funcional e rodando em produção` continua util para produto, mas esta incompleto para o estado atual do sistema | O sistema hoje tambem tem integrações Telegram/Sentry e fluxos de cadastro inteligente que nao aparecem na visao de produto | `FALTA` |

### Doc: `docs/product/requirements.md`

| # | Afirmação no doc | Evidência atual no código | Status |
|---|---|---|---|
| 1 | `RNF-03.3` diz `Deploy contínuo via Railway com zero downtime` (`docs/product/requirements.md:233-237`) | O runtime versionado do repo e Oracle com builder + compose e deploy por `infra/scripts/oracle-builder-deploy.ps1:21-43`, `:225-243`; o web/api sobem por `infra/oracle/compose.yaml:24-156` | `DRIFT` |
| 2 | `RNF-03.1` usa `/api/health` como health principal (`docs/product/requirements.md:233-236`) | O endpoint canonico esta sob prefixo `/api/v1/health` em `apps/api/src/main.ts:294` e `apps/api/src/modules/health/health.controller.ts:4-10`; `/api/health` e alias legado em `apps/api/src/main.ts:220-231` | `DRIFT` |
| 3 | O documento nao cobre notificacoes Telegram nem preferencias por usuario/workspace | Endpoints existem em `apps/api/src/modules/notifications/notifications.controller.ts:24-86` e `notification-preferences.controller.ts:22-49` | `FALTA` |
| 4 | O documento nao cobre `products/smart-draft` nem o cadastro inteligente com Gemini | `POST /products/smart-draft` existe em `apps/api/src/modules/products/products.controller.ts:40-43` | `FALTA` |

### Doc: `docs/product/risks-and-limitations.md`

| # | Afirmação no doc | Evidência atual no código | Status |
|---|---|---|---|
| 1 | Dependencia critica de `Neon (PostgreSQL)` (`docs/product/risks-and-limitations.md:137-144`) | O runtime versionado atual injeta `DATABASE_URL`/`DIRECT_URL` no compose Oracle em `infra/oracle/compose.yaml:35-36`; o proprio repositório ja registra cutover Ampere em docs de release, entao tratar Neon como dependencia atual canonica driftou | `DRIFT` |
| 2 | `Deploy em instância única no Railway` (`docs/product/risks-and-limitations.md:148-160`) | A esteira versionada atual usa builder Oracle + compose Oracle + nginx/certbot/redis/api/web em `infra/oracle/compose.yaml:1-166` e `infra/scripts/oracle-builder-deploy.ps1:21-43`, `:225-243` | `DRIFT` |
| 3 | O documento nao registra o risco atual mais caro: consistencia e ruido do realtime em reconnect/mobile | A trilha oficial de recuperacao ja existe em `docs/waves/realtime-recovery-plan-2026-05-01.md` | `FALTA` |

## Arquitetura

### Doc: `docs/architecture/overview.md`

| # | Afirmação no doc | Evidência atual no código | Status |
|---|---|---|---|
| 1 | `Realtime por workspace no namespace /operations` (`docs/architecture/overview.md:33-39`) | O namespace `/operations` esta correto em `apps/api/src/modules/operations-realtime/operations-realtime.types.ts:3` e o cliente conecta em `apps/web/components/operations/hooks/use-operations-socket.ts:166-168` | `OK` |
| 2 | O overview nao cita Sentry, Telegram, preferencias de notificacao nem a segmentacao nova de rooms | Essas camadas ja fazem parte do comportamento real e deveriam aparecer ao menos como componentes auxiliares de runtime | `FALTA` |

### Doc: `docs/architecture/authentication-flow.md`

| # | Afirmação no doc | Evidência atual no código | Status |
|---|---|---|---|
| 1 | Sessao server-side com cookies HttpOnly e CSRF duplo | `apps/api/src/modules/auth/auth-session.service.ts:73-83`, `:362-395`, `apps/api/src/main.ts:153-166` | `OK` |
| 2 | Guards `SessionGuard` para leitura e `SessionGuard + CsrfGuard` para mutacoes | Exemplo em `apps/api/src/modules/auth/auth.controller.ts:58-79` e `apps/api/src/modules/operations/operations.controller.ts:67-262` | `OK` |
| 3 | Rate limiting por Redis para auth e seguranca | `apps/api/src/modules/auth/auth-rate-limit.service.ts` e wiring global do cache/Redis em `apps/api/src/app.module.ts:128-129` | `OK` |
| 4 | O resumo de endpoints e generico demais e nao captura `POST /auth/demo`, `verify-email/request` e `verify-email/confirm` | `apps/api/src/modules/auth/auth.controller.ts:26-54` | `FALTA` |

### Doc: `docs/architecture/local-development.md`

| # | Afirmação no doc | Evidência atual no código | Status |
|---|---|---|---|
| 1 | `.env.example` como fonte documental principal, `apps/api/.env` e `apps/web/.env.local` como locais | `apps/api/src/app.module.ts:52-63`, `apps/web/lib/observability/sentry.ts:39-79` e `.env.example` confirmam essa estrategia | `OK` |
| 2 | `local:backend:prepare`, `local:backend:sync-demo` e smoke de bootstrap | Scripts existem no root `package.json`; o guia esta alinhado ao fluxo atual | `OK` |
| 3 | O guia ainda nao menciona Sentry web/api nem as envs de Telegram/notification preferences | Elas ja fazem parte do runtime e deveriam aparecer em uma secao de integracoes opcionais/observabilidade | `FALTA` |

### Doc: `docs/architecture/modules.md`

| # | Afirmação no doc | Evidência atual no código | Status |
|---|---|---|---|
| 1 | O mapa inclui `cache/` dentro de `apps/api/src/modules/` (`docs/architecture/modules.md:27-45`) | `CacheModule` vive fora de `src/modules`, em `apps/api/src/cache/cache.module.ts`; `AppModule` o importa por `apps/api/src/app.module.ts:10`, `:128-129` | `DRIFT` |
| 2 | Auth endpoints resumidos como `POST /auth/verify-email` (`docs/architecture/modules.md:70-78`) | Os endpoints reais sao `POST /auth/verify-email/request` e `POST /auth/verify-email/confirm`, alem de `POST /auth/demo`, em `apps/api/src/modules/auth/auth.controller.ts:26-54` | `DRIFT` |
| 3 | Operations endpoints usam rotas antigas singulares (`POST /operations/comanda`, `PATCH /operations/comanda/:id/status`, `POST /operations/cash-session/open`) (`docs/architecture/modules.md:129-137`) | As rotas atuais sao `POST /operations/comandas`, `POST /operations/comandas/:comandaId/status`, `POST /operations/cash-sessions`, `POST /operations/cash-sessions/:cashSessionId/close`, etc., em `apps/api/src/modules/operations/operations.controller.ts:67-223` | `DRIFT` |
| 4 | Namespace realtime `/operations-realtime` e arquivo `operations-realtime.auth.ts` (`docs/architecture/modules.md:151-167`) | O namespace atual e `/operations` em `apps/api/src/modules/operations-realtime/operations-realtime.types.ts:3`; o arquivo de auth atual e `operations-realtime.socket-auth.ts` | `DRIFT` |
| 5 | Eventos propagados `comanda:updated`, `comanda:created`, `comanda:closed`, `cash:updated` (`docs/architecture/modules.md:165-168`) | Os nomes atuais usam dot notation: `comanda.opened`, `comanda.updated`, `comanda.closed`, `cash.updated`, `cash.opened`, `cash.closure.updated`, `kitchen.item.*`, `mesa.upserted` em `apps/api/src/modules/operations-realtime/operations-realtime.types.ts:63-72` | `DRIFT` |
| 6 | O modulo `notifications` hoje ja nao e apenas canal previsto; Telegram e preferencias ja estao ativos | Controladores reais em `apps/api/src/modules/notifications/notifications.controller.ts:24-86` e `notification-preferences.controller.ts:22-49` | `FALTA` |

### Doc: `docs/architecture/realtime.md`

| # | Afirmação no doc | Evidência atual no código | Status |
|---|---|---|---|
| 1 | Namespace `/operations-realtime` (`docs/architecture/realtime.md:5-6`, `:26`, `:56`, `:95`) | O namespace atual e `/operations` em `apps/api/src/modules/operations-realtime/operations-realtime.types.ts:3`; o cliente conecta em `apps/web/components/operations/hooks/use-operations-socket.ts:166-168` | `DRIFT` |
| 2 | Eventos `comanda:created`, `comanda:updated`, `comanda:closed`, `cash:updated`, `operations:patch` (`docs/architecture/realtime.md:71-77`) | Eventos atuais estao em `apps/api/src/modules/operations-realtime/operations-realtime.types.ts:63-72` e usam dot notation; `operations:patch` nao existe mais como evento canonico | `DRIFT` |
| 3 | Uma unica sala por workspace (`docs/architecture/realtime.md:63`) | O servidor hoje segmenta `workspace`, `workspace:kitchen`, `workspace:cash`, `workspace:mesa` e `workspace:employee:{id}` em `apps/api/src/modules/operations-realtime/operations-realtime.types.ts:5-60`; o join por role acontece em `apps/api/src/modules/operations-realtime/operations-realtime.gateway.ts:150-163` | `DRIFT` |
| 4 | Frontend atualiza `sem invalidar a query` e `sem fazer nova requisição HTTP` (`docs/architecture/realtime.md:97-106`) | O client atual combina patch local com refresh de baseline/reconnect controlado em `apps/web/components/operations/hooks/use-operations-socket.ts:64-129` e `apps/web/components/operations/use-operations-realtime.ts` | `DRIFT` |
| 5 | `Redis Pub/Sub` como adapter entre instancias | O adapter Redis continua ativo quando `REDIS_URL` existe em `apps/api/src/modules/operations-realtime/operations-realtime.gateway.ts:94-115` | `OK` |

### Doc: `docs/architecture/database.md`

| # | Afirmação no doc | Evidência atual no código | Status |
|---|---|---|---|
| 1 | `O banco tem 22 modelos` (`docs/architecture/database.md:14`) | O schema atual tem **26** modelos: `apps/api/prisma/schema.prisma` possui models nas linhas `108`, `176`, `199`, `217`, `232`, `250`, `269`, `283`, `293`, `311`, `332`, `348`, `362`, `376`, `417`, `433`, `459`, `492`, `514`, `538`, `557`, `598`, `619`, `638`, `666`, `708` | `DRIFT` |
| 2 | `Session.token` (`docs/architecture/database.md:69-78`) | O campo real e `tokenHash` em `apps/api/prisma/schema.prisma:176-181`; a implementacao usa hash SHA-256 em `apps/api/src/modules/auth/auth-session.service.ts:47-49`, `:104-110` | `DRIFT` |
| 3 | `Employee` com campos `userId`, `name`, `salarioBase`, `percentualVendas` (`docs/architecture/database.md:86-96`) | O modelo atual usa `employeeCode`, `displayName`, `salaryAmount`, `commissionRate`, `workspaceOwnerUserId`, `loginUserId` em `apps/api/prisma/schema.prisma:433-455` | `DRIFT` |
| 4 | `UserCookiePreference` e `WorkspacePreference` (`docs/architecture/database.md:23-25`, `:318-329`) | O schema atual tem `CookiePreference`, `NotificationPreference` e `UserNotificationPreference`, mas nao `WorkspacePreference`; vide `apps/api/prisma/schema.prisma:283`, `:348`, `:362` | `DRIFT` |
| 5 | O documento nao cobre `TelegramAccount`, `TelegramLinkToken`, `NotificationPreference`, `UserNotificationPreference`, `ComandaPayment`, `DemoAccessGrant`, `PasswordResetToken`, `OneTimeCode` | Todos esses modelos existem no schema atual em `apps/api/prisma/schema.prisma:199-232`, `:311-362`, `:638-664` | `FALTA` |
| 6 | Produção ainda ligada a `Railway` / `railway-start.sh` (`docs/architecture/database.md:425`) | O deploy versionado atual e Oracle com compose e builder (`infra/oracle/compose.yaml:24-156`, `infra/scripts/oracle-builder-deploy.ps1:21-43`) | `DRIFT` |

## Operacoes e seguranca

### Doc: `docs/operations/flows.md`

| # | Afirmação no doc | Evidência atual no código | Status |
|---|---|---|---|
| 1 | Fluxo realtime mostra `Authorization: Bearer <token>` como caminho principal (`docs/operations/flows.md:454-458`) | O socket extractor aceita `auth.token`, `auth.bearer`, header `authorization`, `x-access-token` e **cookies de sessao**; para web, `withCredentials` e cookie sao o caminho real em `apps/api/src/modules/operations-realtime/operations-realtime.socket-auth.ts:28-63` e `apps/web/components/operations/hooks/use-operations-socket.ts:52-59` | `DRIFT` |
| 2 | Admin PIN retornaria `token JWT (10 min)` (`docs/operations/flows.md:541-545`) | O fluxo real emite `challengeId` opaco, persiste prova em Redis e seta cookie HttpOnly; controller em `apps/api/src/modules/admin-pin/admin-pin.controller.ts:29-49`, service em `apps/api/src/modules/admin-pin/admin-pin.service.ts:118-175`, `:234-260` | `DRIFT` |
| 3 | A matriz de permissoes e razoavelmente util, mas o texto nao reflete Telegram/notificacoes nem a divisao mobile owner/staff mais recente | Componentes e APIs atuais ja contemplam owner/staff mobile e integracao Telegram | `FALTA` |

### Doc: `docs/operations/realtime-performance-runbook.md`

| # | Afirmação no doc | Evidência atual no código | Status |
|---|---|---|---|
| 1 | Medir `operations/live`, `operations/kitchen`, Redis/cache e Socket.IO antes de mexer em arquitetura | Isso continua alinhado com a wave de recuperacao e com o hot path atual | `OK` |
| 2 | O runbook ja aponta para `desk.operations.realtime.publish.duration` e conexoes de socket | A Wave 1 instrumentou publish/auth/socket metrics em `apps/api/src/common/observability/business-telemetry.util.ts` e hooks web correlatos | `OK` |
| 3 | O texto ainda nao cita a segmentacao recente de rooms, `negative cache` e reconnect policy de foreground/resume | Implementacoes existem em `apps/api/src/modules/operations-realtime/operations-realtime.types.ts:5-60`, `apps/api/src/modules/auth/auth-session.service.ts:156-163`, `apps/web/components/operations/hooks/use-operations-socket.ts:64-129` | `FALTA` |

### Doc: `docs/operations/telegram-bot-rollout.md`

| # | Afirmação no doc | Evidência atual no código | Status |
|---|---|---|---|
| 1 | Variaveis `TELEGRAM_BOT_*`, allowlist e webhook URL | `apps/api/src/modules/notifications/infra/telegram/telegram.adapter.ts`, `notifications.controller.ts:24-86`, scripts `scripts/register-telegram-webhook.mjs` e `scripts/configure-telegram-bot-profile.mjs` | `OK` |
| 2 | Health operacional do Telegram | `GET /notifications/telegram/health` existe em `apps/api/src/modules/notifications/notifications.controller.ts:85-86` | `OK` |
| 3 | O runbook de rollout nao cobre o perfil do bot (description, commands, menu, photo) nem as preferencias por usuario | O runtime ja suporta isso em `scripts/configure-telegram-bot-profile.mjs` e nas preferences APIs | `FALTA` |

### Doc: `docs/security/security-baseline.md`

| # | Afirmação no doc | Evidência atual no código | Status |
|---|---|---|---|
| 1 | Cookies HttpOnly/Secure/SameSite, hash forte, trilha de auditoria, versionamento de consentimentos | `apps/api/src/modules/auth/auth-session.service.ts:389-421`, `apps/api/src/modules/monitoring/audit-log.service.ts`, `apps/api/prisma/schema.prisma:250-293` | `OK` |
| 2 | Falhar bootstrap se `COOKIE_SECRET`/`CSRF_SECRET` estiverem ausentes ou fracos (`docs/security/security-baseline.md:14`) | `apps/api/src/main.ts:169-181`, `:304-305` | `OK` |
| 3 | O baseline nao menciona Sentry, encrypt-at-rest de campos sensiveis e Telegram data path, que ja entraram no repo | Evidencias em `apps/api/src/instrument.ts`, `apps/api/src/common/utils/field-encryption.util.ts`, `apps/api/prisma/schema.prisma:311-362` | `FALTA` |

### Doc: `docs/security/deploy-checklist.md`

| # | Afirmação no doc | Evidência atual no código | Status |
|---|---|---|---|
| 1 | Segredos e banco giram em torno de `Neon` (`docs/security/deploy-checklist.md:7`, `:16-23`) | O repo atual de deploy opera Oracle/Ampere via `infra/oracle/compose.yaml:24-156` e `infra/scripts/oracle-builder-deploy.ps1:21-43` | `DRIFT` |
| 2 | Repositorio privado ate a limpeza final (`docs/security/deploy-checklist.md:65-70`) | O projeto tem espelho open source e workflows GitHub publicos. Essa secao precisa virar politica contextual, nao regra absoluta | `DRIFT` |
| 3 | O checklist nao cobre DSNs/tokens de Sentry, Telegram webhook secret nem Cloudflare/origin allowlist | Todos estes elementos ja fazem parte do runtime e hardening atual | `FALTA` |

### Doc: `docs/security/security-testing-workflow-2026-04-30.md`

| # | Afirmação no doc | Evidência atual no código | Status |
|---|---|---|---|
| 1 | O foco correto agora e codigo/build antes de IDS/SIEM pesado | Scripts e tooling atuais confirmam esse baseline (`scripts/run-nmap-scan.ps1`, Semgrep, Gitleaks, Sonar, security workflows) | `OK` |
| 2 | A ordem `Nmap -> depois Snort/Wazuh` continua coerente com o estado atual do repo | Nada no codigo contradiz esta decisao; o repositorio tem hardening/scan e nao um IDS embarcado | `OK` |

## Waves e artefatos recentes

### Docs frescos e alinhados

Os arquivos abaixo estao coerentes com o codigo atual e devem ser preservados como docs operacionais ativas:

- `docs/waves/realtime-wave-0-inventory-2026-05-01.md`
- `docs/waves/realtime-recovery-plan-2026-05-01.md`
- `docs/waves/realtime-validation-checklist-2026-05-01.md`
- `docs/waves/dead-code-verification-2026-05-01.md`
- `docs/operations/telegram-bot-rollout.md`
- `docs/security/security-testing-workflow-2026-04-30.md`

## Funcionalidades atuais que faltam nos docs canonicos

1. **Sentry web e API**
   - `apps/api/src/instrument.ts`
   - `apps/api/src/app.module.ts:127`
   - `apps/web/next.config.ts:83-92`
   - `apps/web/lib/observability/sentry.ts:18-30`
2. **Telegram bot profissional + perfil + webhook + preferencias**
   - `apps/api/src/modules/notifications/notifications.controller.ts:24-86`
   - `apps/api/src/modules/notifications/notification-preferences.controller.ts:22-49`
   - `apps/api/src/modules/notifications/telegram-bot.service.ts`
   - `scripts/configure-telegram-bot-profile.mjs`
3. **Cadastro inteligente de produto**
   - `apps/api/src/modules/products/products.controller.ts:40-43`
   - `apps/api/src/modules/products/products-smart-draft.service.ts`
4. **Lookup de barcode e enrichment de catalogo**
   - `apps/web/app/api/barcode/lookup/route.ts`
   - `apps/web/app/api/media/pexels/search/route.ts`
5. **Topologia realtime atual**
   - namespace `/operations`
   - rooms segmentadas por kitchen/cash/mesa/employee
   - `operations.error`
   - refresh de baseline em reconnect/foreground
6. **Seguranca operacional nova**
   - `negative cache` de sessao
   - disconnect de socket por revogacao/logout
   - rate limit de churn realtime
   - Sentry em build/runtime

## Triagem editorial por cluster (cobertura do acervo)

Esta triagem cobre os 185 arquivos `*.md`/`*.mdx` rastreados hoje no repo. Nem todos precisam de reescrita. O problema e **canonizar o que deve ser historico**.

| Cluster | Volume | Papel correto | Situacao |
|---|---:|---|---|
| Raiz (`README.md`, `DOCS_DESK_IMPERIAL.md`, `CONTRIBUTING.md`, `SECURITY.md`, `ROADMAP.md`) | 13 | onboarding e governanca | `MISTO` - `README.md` e artefatos de contribuicao importam; `DOCS_DESK_IMPERIAL.md` nao deve continuar como fonte primaria |
| `docs/product/*` | 9 | contrato de produto atual | `DRIFT MODERADO/ALTO` - overview, requirements e risks precisam update |
| `docs/architecture/*` | 21 | arquitetura atual | `MISTO` - auth/local-dev razoavelmente alinhados; modules/realtime/database driftados |
| `docs/operations/*` | 7 | runbooks operacionais atuais | `MISTO` - telegram e performance sao uteis; flows esta driftado |
| `docs/security/*` | 10 | baseline e runbooks | `MISTO` - baseline/testing bons; deploy-checklist driftado |
| `docs/testing/*` | 8 | estrategia de testes | `TRIAGEM` - fora do caminho critico desta auditoria; revisar depois de governanca canonica |
| `docs/waves/*` | 7 | recovery/change management atual | `BOM` - docs frescos e alinhados |
| `docs/release/*` | dezenas | historico tecnico e evidence log | `NAO CANONICO` - manter, mas descanonizar |
| `docs/case-studies/*`, `docs/agents/*`, `review_audit/*` | dezenas | historico, prompts, artefatos de auditoria | `NAO CANONICO` |
| `infra/*/*.md`, `apps/*/*.md`, `packages/*/*.md` | baixo | docs locais por subsistema | `TRIAGEM` - revisar conforme editorial plan |

## Decisoes desta auditoria

1. `docs/release/*` permanece no repo, mas passa a ser **historico** e nao `fonte primaria`.
2. `DOCS_DESK_IMPERIAL.md` deve deixar de ser documento canonico e virar **snapshot/auditoria consolidada**.
3. `README.md`, `docs/README.md` e `docs/INDEX.md` precisam ser corrigidos primeiro. Enquanto eles estiverem errados, o leitor sempre entra pelo caminho errado.
4. Contagem fixa de modulos (`15`, `16`) deve ser removida dos docs. O correto e listar modulos por nome e ownership.
5. Docs de realtime devem ser reancorados em:
   - namespace `/operations`
   - dot events
   - rooms segmentadas
   - fallback de baseline/reconcile
6. Docs de deploy/infra devem abandonar Railway/Neon como estado atual e tratar Railway apenas como historico, quando aplicavel.
