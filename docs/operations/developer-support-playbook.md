# Developer Support Playbook

**Estado:** operacional  
**Escopo:** suporte técnico para desenvolvedores que consomem, integram ou depuram a API do Desk Imperial.  
**Não cobre:** atendimento comercial, manipulação manual de dados de produção ou alteração de segredo.

## 1. Objetivo

Este playbook transforma problemas de API em diagnóstico técnico verificável. Ele existe para reduzir respostas vagas como "deu erro" e levar cada investigação para evidências: requisição HTTP, status code, `x-request-id`, logs, Sentry/Faro, consulta SQL read-only e hipótese reproduzível.

O fluxo conversa com a arquitetura atual do projeto:

- API NestJS versionada em `/api/v1`;
- contrato OpenAPI em `/api/v1/openapi.json` e `/api/v1/docs`;
- sessão por cookie HttpOnly;
- CSRF double-submit em mutações autenticadas;
- isolamento por workspace/owner;
- `x-request-id` propagado entre frontend, API, logs e resposta de erro;
- integrações críticas com Mercado Pago Point, Telegram, QZ Tray, barcode/EAN e realtime.

Referências de base:

- `docs/architecture/authentication-flow.md`
- `docs/architecture/api-lifecycle-governance.md`
- `docs/operations/flows.md`
- `docs/operations/support-operations-handoff.md`
- `docs/security/observability-and-logs.md`
- `docs/security/security-lab-suite-2026-06-11.md`

## 2. Fluxo de investigação

```text
Relato do problema
  -> identificar endpoint, ator, ambiente e horário
  -> capturar método, headers, payload sanitizado e status code
  -> coletar x-request-id
  -> consultar logs/Sentry/Faro com esse identificador
  -> reproduzir em ambiente controlado com curl/Postman/Insomnia
  -> validar dados com SQL read-only
  -> classificar: uso incorreto, bug, regra de negócio, permissão, integração ou infraestrutura
  -> responder com causa raiz, evidência e próximo passo
```

Se não houver `x-request-id`, o primeiro passo é reproduzir o erro com uma requisição que gere um identificador rastreável. Sem isso, a investigação vira inferência fraca.

## 3. Mapa de status codes

| Status | Leitura operacional                                 | Onde investigar primeiro                                      |
| ------ | --------------------------------------------------- | ------------------------------------------------------------- |
| `200`  | Requisição aceita e respondida                      | validar se o corpo corresponde ao esperado                    |
| `201`  | Recurso criado                                      | conferir persistência e evento realtime, quando aplicável     |
| `400`  | Payload, query ou contrato inválido                 | schema/DTO, OpenAPI, serialização do cliente                  |
| `401`  | Sessão ausente, expirada ou inválida                | cookies, login, `/api/v1/auth/me`, ambiente e domínio         |
| `403`  | Usuário autenticado sem permissão ou CSRF inválido  | role, workspace, Admin PIN, `X-CSRF-Token`, Origin/Referer    |
| `404`  | Recurso não encontrado no escopo do usuário         | id usado, workspace, soft-delete, rota e tenant isolation     |
| `409`  | Conflito de regra de negócio                        | comanda/mesa/caixa/pagamento em estado incompatível           |
| `422`  | Validação semântica, quando a rota expuser esse uso | schema, campo obrigatório, enum, formato monetário ou barcode |
| `429`  | Rate limit                                          | ator, IP, rota, janela de limite e repetição automática       |
| `500`  | Falha não tratada                                   | `x-request-id`, logs API, Sentry, dependência externa         |

O projeto usa NestJS e pipes/filters próprios; por isso, erros de validação podem aparecer como `400` ou `422` conforme a superfície. Sempre confirme no corpo da resposta e no OpenAPI vigente antes de tratar isso como bug.

## 4. Diagnóstico por tipo de falha

| Sintoma                             | Hipótese comum                                     | Evidência mínima esperada                                         |
| ----------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------- |
| Cliente não autentica               | cookie ausente, domínio errado, sessão expirada    | request de login, `Set-Cookie`, chamada a `/auth/me`, `requestId` |
| Cliente autenticado recebe `403`    | role incorreta, workspace errado ou CSRF ausente   | usuário, role, endpoint, header `X-CSRF-Token`, query read-only   |
| Payload válido no app falha na API  | drift entre cliente e contrato                     | payload sanitizado, OpenAPI, DTO/schema e teste de reprodução     |
| Comanda não aparece no salão/PWA    | mutação OK, mas cache/realtime não aplicou         | response da mutação, evento socket, `operations/live`, logs       |
| Item de comida não nasce na cozinha | produto sem `requiresKitchen` ou dispatcher falhou | `ComandaItem.kitchenStatus`, `Product.requiresKitchen`, evento    |
| Pagamento Point não fecha comanda   | webhook ausente, assinatura inválida ou fila lenta | intent, provider order/payment, logs do worker e webhook          |
| Webhook duplicado altera estado     | idempotência fraca ou reprocessamento incorreto    | idempotency key, `externalReference`, payment intent, audit log   |
| Cadastro por barcode não preenche   | provider externo lento, EAN inválido ou fallback   | barcode normalizado, resposta do lookup, timeout, cadastro manual |
| Erro aparece só no PWA/mobile       | cookie, service worker, rede, touch ou viewport    | dispositivo, navegador, versão, request waterfall e screenshot    |

## 5. Evidências que nunca devem faltar

- endpoint completo sem segredo;
- método HTTP;
- status code;
- `x-request-id`;
- horário aproximado com timezone;
- usuário/role/workspace sanitizados;
- payload sem PII, token, cookie, PIN ou documento real;
- trecho de log com redaction;
- consulta SQL read-only usada para confirmar o estado;
- resultado esperado versus resultado obtido.

## 6. Quando escalar para manutenção de código

Escalar apenas quando uma das condições abaixo for verdadeira:

1. a reprodução é consistente em ambiente controlado;
2. o contrato OpenAPI diverge do comportamento real;
3. a query read-only prova estado incompatível com a regra de negócio;
4. logs mostram exceção não tratada;
5. o erro afeta fluxo P0: autenticação, comanda, cozinha, caixa, pagamento, impressão ou webhook;
6. existe risco de segurança: IDOR, bypass de workspace, CSRF, exposição de segredo, PII em log ou confirmação financeira pelo browser.

Ao escalar, anexar o template de diagnóstico preenchido:

- `docs/operations/developer-support-diagnostic-template.md`

## 7. Kit complementar

| Documento                                                  | Uso                                                                  |
| ---------------------------------------------------------- | -------------------------------------------------------------------- |
| `docs/operations/developer-support-diagnostic-template.md` | modelo de investigação e comunicação técnica                         |
| `docs/operations/developer-support-http-examples.md`       | exemplos `curl`/Postman/Insomnia sem segredo                         |
| `docs/operations/developer-support-sql-audit-playbook.md`  | consultas read-only para validar dados e hipóteses                   |
| `docs/operations/developer-support-case-studies.md`        | casos de investigação que conectam API, logs, SQL e regra de negócio |
| `docs/operations/support-operations-handoff.md`            | handoff N1/N2/N3 operacional                                         |
| `docs/security/observability-and-logs.md`                  | correlação por logs, Sentry, Faro e `requestId`                      |
| `docs/product/critical-flows-traceability.md`              | rastreabilidade dos fluxos críticos                                  |

## 8. Critério de qualidade da investigação

Uma boa investigação técnica não é a que responde mais rápido; é a que reduz incerteza sem criar risco. O diagnóstico deve conseguir responder:

- o erro está no cliente, no contrato, na autorização, na regra de negócio, na integração ou na infraestrutura?
- qual evidência prova isso?
- o problema foi reproduzido?
- qual dado foi consultado?
- existe impacto em dinheiro, estoque, comanda, privacidade ou disponibilidade?
- a correção é suporte, configuração, documentação, rollback ou código?

Se qualquer resposta depender de palpite, a investigação ainda não está pronta para ser enviada como diagnóstico final.
