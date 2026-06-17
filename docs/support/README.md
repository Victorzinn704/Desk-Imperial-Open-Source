# Developer Support Kit

**Objetivo:** reunir a documentação de suporte técnico para desenvolvedores que integram ou depuram a API do Desk Imperial.

Esta pasta é a porta de entrada. A fonte operacional detalhada fica em `docs/operations/developer-support-*`, para evitar documentação paralela com drift.

## Como usar

1. Comece pelo playbook central:
   - `docs/operations/developer-support-playbook.md`
2. Se o problema for autenticação/autorização:
   - `docs/support/auth-flow-debug.md`
   - `docs/architecture/authentication-flow.md`
3. Se o problema for HTTP/status code:
   - `docs/support/common-api-errors.md`
   - `docs/support/api-troubleshooting.md`
4. Se precisar reproduzir:
   - `docs/support/http-request-examples.md`
   - `docs/support/reproduction-lab.md`
5. Se precisar validar dados:
   - `docs/support/sql-audit-playbook.md`
6. Se precisar comunicar diagnóstico:
   - `docs/support/customer-diagnostic-template.md`
7. Se precisar consultar padrões recorrentes:
   - `docs/case-studies/developer-support-cases.md`

## Princípios

- Não colar token, cookie, senha, PIN, certificado, segredo ou dado real de cliente.
- Toda investigação deve ter endpoint, método, status code, `x-request-id`, payload sanitizado e horário.
- SQL em suporte deve ser read-only.
- O contrato deve vir de `/api/v1/openapi.json`, não de memória.
- Se a documentação divergir da API, a divergência vira bug de documentação ou contrato.

## Materiais práticos

| Material                                                   | Uso                                             |
| ---------------------------------------------------------- | ----------------------------------------------- |
| `docs/support/developer-support-prd.md`                    | PRD da frente, requisitos e definição de valor  |
| `docs/support/developer-support-test-debug-matrix.md`      | matriz de testes, debug e aceite                |
| `docs/support/local-environment-validation.md`             | validação local com PHP, API e smoke da coleção |
| `docs/support/production-rollout.md`                       | rollout seguro no servidor e no GitHub          |
| `docs/support/laravel-integration.md`                      | guia para consumidor Laravel                    |
| `docs/api/desk-imperial-support.postman_collection.json`   | coleção inicial para Postman/Insomnia           |
| `examples/php-api-client/`                                 | cliente PHP mínimo para demonstrar integração   |
| `examples/laravel-api-client/`                             | exemplo Laravel copiável para app consumidor    |
| `docs/operations/developer-support-diagnostic-template.md` | template completo de diagnóstico                |
| `docs/operations/developer-support-sql-audit-playbook.md`  | queries read-only para auditoria                |
| `docs/operations/developer-support-http-examples.md`       | exemplos `curl` e fluxos de request/response    |
| `docs/operations/developer-support-case-studies.md`        | casos recorrentes de diagnóstico                |
| `docs/security/security-lab-suite-2026-06-11.md`           | evidência de IDOR/security smoke                |
| `docs/security/observability-and-logs.md`                  | logs, Sentry, Faro e correlação por `requestId` |
| `docs/architecture/api-lifecycle-governance.md`            | governança de API, contrato, versionamento      |
| `docs/product/user-flows.md`                               | fluxos e endpoints de produto                   |

## Resultado esperado

Com esse kit, um problema reportado por cliente/desenvolvedor deve virar um diagnóstico com:

- reprodução controlada;
- evidência HTTP;
- evidência de logs/observabilidade;
- SQL read-only quando necessário;
- causa raiz ou hipótese falsificável;
- resposta técnica clara;
- critério de escalonamento.

## Validação local

```powershell
npm run support:validate
npm run support:smoke:local
npm run support:smoke:readiness
npm run quality:scope:strict
npm run lint:secrets
```

O validador cruza a coleção Postman com o OpenAPI vigente. Endpoints que ainda não entram no artefato OpenAPI de operações, como `auth`, `health`, `products` e `employees`, precisam estar numa allowlist explícita com motivo.

O smoke local exige API ativa em `http://127.0.0.1:4000/api/v1` e a variável `DESK_SUPPORT_OWNER_PASSWORD` definida no processo. Ele executa a coleção Postman como fluxo real: health, OpenAPI, login, sessão, produtos, snapshot, cozinha, abertura de comanda, item e diagnóstico de Point.
Para validar autorização, defina também `DESK_SUPPORT_STAFF_PASSWORD`; por padrão o smoke usa `demo@deskimperial.online` e `VD-001` como empresa/código do funcionário local.

Para servidor ou produção, use `npm run support:smoke:readiness`. O smoke completo da coleção cria comanda/item/intent e não deve ser apontado para produção real.
