# Threat Model dos Fluxos Criticos

**Data:** 2026-05-19
**Estado:** canonico
**Escopo:** auth, isolamento por workspace, realtime/PWA, Mercado Pago Point, Telegram, impressao termica, catalogo externo e observabilidade.

## Objetivo

Este documento transforma a seguranca do Desk Imperial em evidencia revisavel. Ele nao substitui testes, Semgrep, Gitleaks, Nmap ou auditoria manual; ele define o que precisa ser protegido, quais barreiras existem hoje e quais provas devem acompanhar qualquer mudanca nesses fluxos.

## Fronteiras de confianca

| Fronteira                  | Entrada                                       | Risco principal                                   | Regra                                                                     |
| -------------------------- | --------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------- |
| Browser/PWA -> API         | cookies, headers, body JSON, multipart        | CSRF, XSS, payload malicioso, sessao roubada      | validar DTO/schema, exigir sessao, CSRF em mutacao e escopo por workspace |
| Socket.IO -> realtime      | cookie/session token, handshake, rooms        | join indevido, replay, sessao revogada            | autenticar handshake, segmentar rooms e invalidar cache de sessao         |
| Mercado Pago -> API        | webhook publico, assinatura, payload externo  | spoofing, replay, fechamento indevido             | validar assinatura, idempotencia e reconciliacao server-side              |
| Telegram -> API            | webhook publico, chatId, comandos             | comando falso, abuso de bot, enumeracao           | segredo timing-safe, rate limit, vinculo workspace/usuario                |
| API -> QZ/cliente local    | certificado, assinatura, payload de impressao | spoofing local, impressao indevida, PII no recibo | certificado assinado, usuario autorizado e dados minimos                  |
| API -> provedores externos | barcode, Open Food Facts, imagens, Gemini     | schema drift, prompt injection, dados ruins       | timeout, cache, schema runtime e fallback controlado                      |
| Runtime -> logs/telemetria | request, erro, breadcrumb, body parcial       | vazamento de PII/segredo                          | redaction antes de enviar para Sentry/Faro/logs                           |

## Ativos protegidos

- sessao autenticada e cookies HttpOnly;
- workspace e dados multi-tenant;
- caixa, comandas, pagamentos, itens de cozinha e historico;
- credenciais de Mercado Pago, Telegram, Sentry, Gemini e e-mail;
- Admin PIN e prova temporaria;
- dados pessoais em cadastro, logs, recibos e notificacoes;
- disponibilidade do PDV/PWA, API, Redis e Postgres.

## Fluxos criticos

### 1. Auth, sessao e CSRF

**Ameacas principais**

- roubo/reuso de sessao;
- CSRF em mutacoes autenticadas;
- injection em login, OTP ou fluxo de recuperacao;
- enumeracao de usuarios por mensagens diferentes.

**Controles atuais**

- sessao server-side com cookie HttpOnly;
- CSRF double-submit com comparacao timing-safe;
- secrets obrigatorios no bootstrap;
- normalizacao defensiva em auth antes de consulta Prisma;
- rate limit em auth e OTP;
- audit log para eventos sensiveis.

**Evidencia atual**

- `apps/api/test/session.guard.spec.ts`
- `apps/api/test/csrf.guard.spec.ts`
- `apps/api/test/auth-rate-limit.service.spec.ts`
- `apps/api/test/auth.service*.spec.ts`
- `docs/security/backend-injection-audit-2026-05-03.md`

**Lacuna residual**

- policy formal de TTL/refresh e revogacao cross-device ainda precisa virar criterio operacional de release.

### 2. Isolamento por workspace

**Ameacas principais**

- usuario STAFF/OWNER acessar caixa, mesa, comanda, produto ou relatorio de outro workspace;
- query nova esquecer `companyOwnerId`/`workspaceOwnerUserId`;
- cache Redis compartilhar chave sem workspace.

**Controles atuais**

- `AuthContext` carrega `workspaceOwnerUserId`;
- helpers de workspace centralizam resolucao e papel;
- queries operacionais filtram por `companyOwnerId`;
- chaves Redis de operacoes, produtos e financeiro incluem workspace;
- testes de operacoes cobrem isolamento e autorizacao negativa.

**Evidencia atual**

- `apps/api/src/common/utils/workspace-access.util.ts`
- `apps/api/test/operations-helpers.auth.spec.ts`
- `apps/api/test/operations-service.spec.ts`
- `apps/api/test/admin-pin.guard.spec.ts`
- `apps/api/test/telegram-link.service.spec.ts`

**Lacuna residual**

- falta uma suite e2e curta que prove isolamento por workspace via HTTP real em rotas de maior risco.

### 3. Realtime e PWA operacional

**Ameacas principais**

- socket continuar ativo apos logout/revogacao;
- room errada receber evento financeiro/cozinha;
- PWA aplicar patch duplicado ou fora de ordem;
- fallback REST esconder erro de autorizacao.

**Controles atuais**

- namespace `/operations`;
- rooms segmentadas por workspace, cozinha, caixa, mesa e funcionario;
- cache de sessao invalidavel por sessionId;
- patches incrementais com reconcile/fallback REST;
- metricas e smoke de performance para eventos mobile.

**Evidencia atual**

- `apps/api/test/operations-realtime.gateway.spec.ts`
- `apps/api/test/operations-realtime.auth.spec.ts`
- `apps/api/test/operations-realtime.socket-auth.spec.ts`
- `apps/web/scripts/operations-mobile-perf-smoke.mjs`
- `apps/web/scripts/operations-mobile-perf-report.mjs`
- `docs/operations/realtime-performance-runbook.md`

**Lacuna residual**

- ainda falta medir Android real como gate complementar ao smoke local controlado.

### 4. Mercado Pago Point

**Ameacas principais**

- webhook falso fechar comanda;
- replay de webhook alterar status duas vezes;
- divergencia entre metodo pago real e metodo exibido;
- intent antiga impedir nova tentativa legitima.

**Controles atuais**

- assinatura HMAC validada com comparacao timing-safe;
- worker de webhook separado do controller;
- runtime de terminal order com reconciliacao;
- registros de intent vinculados a comanda/workspace;
- testes unitarios de cliente, webhook e reconciliacao.

**Evidencia atual**

- `apps/api/src/modules/operations/mercado-pago-webhook-signature.util.ts`
- `apps/api/test/mercado-pago-webhook.controller.spec.ts`
- `apps/api/test/mercado-pago-point.client.spec.ts`
- `apps/api/test/comanda-terminal-payment.service.spec.ts`
- `apps/api/test/comanda-terminal-payment-reconcile.service.spec.ts`
- `docs/operations/mercado-pago-point.md`

**Lacuna residual**

- precisa de teste staging/publico com webhook real do Mercado Pago e evidencia de fechamento + impressao.

### 5. Telegram

**Ameacas principais**

- comando forjado por webhook sem segredo;
- brute force de token de vinculacao;
- chatId externo operar workspace errado;
- resposta do bot vazar dados de outro usuario.

**Controles atuais**

- webhook secret obrigatorio quando bot esta ativo;
- comparacao timing-safe;
- vinculo Telegram por token com expiracao/consumo unico;
- preferencias por workspace/usuario;
- outbound worker com retry policy.

**Evidencia atual**

- `apps/api/test/notifications.telegram.controller.spec.ts`
- `apps/api/test/telegram-link.service.spec.ts`
- `apps/api/test/telegram-bot.service.spec.ts`
- `apps/api/test/telegram-bot.messages.spec.ts`
- `docs/operations/telegram-bot-rollout.md`

**Lacuna residual**

- falta matriz de comandos por papel e workspace para o bot inteligente com Gemini.

### 6. Impressao termica e QZ

**Ameacas principais**

- browser aceitar certificado errado;
- payload de recibo conter PII excessiva;
- PWA mobile tentar imprimir como se QZ estivesse local;
- impressao duplicada em retry de pagamento.

**Controles atuais**

- QZ tratado como agente local/LAN, nao como recurso da Oracle;
- certificado/assinatura servidos por endpoints proprios;
- runbook documenta limites de mobile, Bluetooth, USB e QZ Tray;
- payload de comanda termica fica em builder dedicado.

**Evidencia atual**

- `docs/operations/thermal-printing.md`
- `apps/web/lib/printing/*`
- `apps/web/app/api/printing/qz/*`

**Lacuna residual**

- falta teste automatizado de contrato do payload termico pos-pagamento e evidencia de assinatura QZ sem prompt repetido.

### 7. Catalogo externo, barcode e imagens

**Ameacas principais**

- provedor externo retornar schema inesperado;
- imagem generica ou incorreta degradar UX;
- input EAN/descricao virar URL externa abusiva;
- Gemini receber prompt sem limite ou contexto inseguro.

**Controles atuais**

- lookup server-side;
- cache e fallback de provedores;
- sanitizacao e normalizacao de GTIN/descricao;
- uso de fontes reais quando possivel, sem fake como resposta final.

**Evidencia atual**

- `apps/web/app/api/barcode/lookup/route.ts`
- `apps/web/lib/product-visuals.test.ts`
- `docs/product/catalog-intelligence.md`

**Lacuna residual**

- falta schema runtime consolidado para todos os provedores de imagem/produto.

### 8. Observabilidade, logs e telemetria

**Ameacas principais**

- Authorization, cookies, email, CPF/CNPJ, PIN ou token aparecerem em Sentry/Faro/log;
- stack trace revelar segredo ou estrutura interna;
- alerta nao chegar em incidente real.

**Controles atuais**

- Sentry com `beforeSend`;
- Faro com scrub de chaves sensiveis;
- Pino/logs estruturados;
- runbooks de observabilidade e alertas;
- readiness operacional inclui regras/runbooks.

**Evidencia atual**

- `apps/api/src/instrument.ts`
- `apps/web/lib/observability/faro.ts`
- `apps/web/lib/observability/faro-telemetry.test.ts`
- `docs/security/observability-and-logs.md`
- `docs/operations/sentry-rollout-2026-05-01.md`

**Lacuna residual**

- alerta real ainda depende de validacao operacional continua em Oracle/staging.

## Matriz minima de testes negativos

Rode esta matriz quando auth, operations, Mercado Pago, Telegram, QZ ou logs mudarem:

```bash
npm --workspace @partner/api run test -- csrf.guard session.guard admin-pin.guard operations-helpers.auth operations-service notifications.telegram.controller mercado-pago-webhook.controller telegram-link.service --runInBand
npm --workspace @partner/web run test -- faro-telemetry product-visuals
npm run lint:secrets
npm run lint:sast
npm run quality:contracts
```

Para superficie de host:

```bash
npm run security:nmap -- -Target api.deskimperial.online -Mode quick
```

## Criterio de pronto para mudancas de seguranca

Uma mudanca em fluxo critico so deve sair quando:

1. a ameaca tocada estiver mapeada neste documento;
2. houver teste negativo ou motivo documentado para nao automatizar;
3. logs/telemetria nao carregarem segredo ou PII;
4. `quality:contracts`, `lint:secrets` e testes focados passarem;
5. se envolver Oracle/staging, houver rollback ou runbook atualizado.

## Proximas provas que aumentam senioridade tecnica

1. suite e2e HTTP de isolamento por workspace;
2. teste staging real do Mercado Pago: webhook -> comanda fechada -> recibo;
3. DAST/ZAP baseline em staging com relatorio versionado;
4. matriz de comandos Telegram por role/workspace;
5. plano de migracao para criptografia at-rest e Admin PIN mais forte.
