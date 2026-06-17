# Developer Support Test And Debug Matrix

**Objetivo:** provar que o Developer Support Kit não é documentação genérica. Cada linha liga requisito, fluxo real do Desk, ferramenta e evidência.

## 1. Matriz principal

| ID     | Fluxo                        | O que testar/debugar                       | Ferramenta                        | Evidência esperada                                                  | Documento                                    |
| ------ | ---------------------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------------------------- | -------------------------------------------- |
| TD-001 | Health/API viva              | API responde e devolve headers rastreáveis | curl/Postman/PHP                  | status `200`, `x-request-id` quando aplicável                       | `http-request-examples.md`                   |
| TD-002 | OpenAPI                      | contrato atual importável                  | curl/Postman                      | JSON válido de `/api/v1/openapi.json`                               | `README.md`                                  |
| TD-003 | Login owner                  | sessão/cookie emitidos                     | Postman/PHP                       | `Set-Cookie`, status esperado, request id                           | `auth-flow-debug.md`                         |
| TD-004 | `/auth/me` sem sessão        | erro controlado                            | curl/Postman/PHP                  | `401` sem dado sensível                                             | `common-api-errors.md`                       |
| TD-005 | Mutação sem CSRF             | proteção ativa                             | curl/Postman                      | `403` esperado                                                      | `auth-flow-debug.md`                         |
| TD-006 | Mutação com CSRF             | request autenticado válido                 | curl/Postman                      | passa da barreira CSRF ou falha por regra real                      | `http-request-examples.md`                   |
| TD-007 | Staff em rota owner          | autorização por função                     | Postman                           | `403` sem vazamento                                                 | `security-lab-suite-2026-06-11.md`           |
| TD-008 | Produto com payload inválido | validação de contrato                      | Postman/OpenAPI                   | `400/422` conforme rota                                             | `common-api-errors.md`                       |
| TD-009 | Produto por barcode          | lookup/catálogo local                      | SQL + rota interna                | produto local ou fallback manual                                    | `sql-audit-playbook.md`                      |
| TD-010 | Abrir comanda                | regra de mesa/caixa/comanda                | Postman + SQL                     | `201/200` ou `409` explicado                                        | `developer-support-case-studies.md`          |
| TD-011 | Item de cozinha              | regra `requiresKitchen`                    | SQL + REST + realtime             | `kitchenStatus` coerente                                            | `developer-support-case-studies.md`          |
| TD-012 | Snapshot live                | API versus UI/PWA                          | curl + browser                    | REST contém estado esperado                                         | `api-troubleshooting.md`                     |
| TD-013 | Point intent                 | criação de intenção                        | Postman + SQL                     | intent `PENDING` ou erro explicado                                  | `mercado-pago-point.md`                      |
| TD-014 | Webhook duplicado            | idempotência                               | SQL + logs                        | sem pagamento local duplicado                                       | `developer-support-case-studies.md`          |
| TD-015 | PWA estado antigo            | cache/realtime/service worker              | REST + logs + screenshot          | causa separada entre API e frontend                                 | `reproduction-lab.md`                        |
| TD-016 | Laravel consumidor           | integração backend externa                 | guia Laravel                      | exemplo com cookie/CSRF/status/request id                           | `laravel-integration.md`                     |
| TD-017 | Drift Postman/OpenAPI        | coleção saiu do contrato ou allowlist      | `npm run support:validate`        | rotas no OpenAPI ou exceção explícita                               | `validate-developer-support-kit.mjs`         |
| TD-018 | Coleção contra API local     | fluxo real com sessão e CSRF               | `npm run support:smoke:local`     | health, OpenAPI, login, produtos, comanda e item sem `403` indevido | `run-developer-support-collection-smoke.mjs` |
| TD-019 | Readiness de servidor        | health/OpenAPI sem mutação                 | `npm run support:smoke:readiness` | health `200`; OpenAPI `200` ou `404` esperado por flag              | `production-rollout.md`                      |

## 2. Critério de debug bom

Um debug é aceito quando responde:

- qual request foi feito?
- qual status voltou?
- qual `x-request-id` identifica a trilha?
- qual payload foi enviado, sem segredo?
- qual regra de negócio era esperada?
- qual query read-only confirma ou nega o estado?
- qual log ou evento reforça a hipótese?
- qual ação corrige ou orienta o cliente?

## 3. Critério de debug ruim

Rejeitar diagnósticos que:

- não têm `x-request-id` quando a API gerou resposta;
- dizem "problema de API" sem reproduzir;
- orientam `UPDATE` manual em produção;
- pedem cookie/token/senha do cliente;
- confundem `401` com `403`;
- tratam `409` de regra de negócio como erro interno;
- assumem `422` como padrão global sem validar rota;
- fecham pagamento Point pelo browser.

## 4. Como rodar validação documental

```powershell
npx prettier --check docs/support docs/operations/developer-support-playbook.md docs/operations/developer-support-http-examples.md docs/operations/developer-support-sql-audit-playbook.md docs/operations/developer-support-case-studies.md docs/api/desk-imperial-support.postman_collection.json examples/php-api-client examples/laravel-api-client scripts/validate-developer-support-kit.mjs scripts/run-developer-support-collection-smoke.mjs
npm run support:validate
npm run support:smoke:readiness
npm run quality:scope:strict
npm run lint:secrets
```

Se PHP estiver instalado:

```powershell
php -l examples/php-api-client/src/DeskImperialClient.php
php -l examples/php-api-client/examples/health.php
php -l examples/php-api-client/examples/login.php
php -l examples/php-api-client/examples/error-handling.php
```

Se a API local estiver ativa:

```powershell
$env:DESK_SUPPORT_OWNER_PASSWORD='<senha-local-demo>'
$env:DESK_SUPPORT_STAFF_PASSWORD='<senha-local-staff>'
npm run support:smoke:local
```

Se o servidor estiver ativo:

```powershell
$env:DESK_SUPPORT_BASE_URL='https://api.seudominio.com/api/v1'
$env:DESK_SUPPORT_EXPECT_OPENAPI='false'
npm run support:smoke:readiness
```

## 5. Próximo nível

Quando a API local estiver ativa, validar:

- coleção Postman importada;
- health real;
- login demo;
- `/auth/me`;
- mutation sem CSRF;
- mutation com CSRF;
- endpoint staff proibido;
- query read-only de comanda/produto.

Não usar produção real para aprender ferramenta; usar local, demo ou staging.
