# Logs And Observability Debug

Use este roteiro quando o diagnóstico precisa sair do HTTP e entrar em logs, Sentry, Faro ou métricas.

## 1. Correlação principal

O identificador principal é `x-request-id`.

Onde aparece:

- resposta HTTP;
- filtro global de erro da API;
- logs estruturados;
- cliente web, quando a resposta é processada;
- documentação de observabilidade.

Referência:

- `docs/security/observability-and-logs.md`

## 2. O que procurar

| Fonte       | Procurar por                                    |
| ----------- | ----------------------------------------------- |
| API logs    | `requestId`, rota, status, latência, exceção    |
| Sentry API  | stack trace, ambiente, release, fingerprint     |
| Faro/Web    | erro client-side, rota, status code, requestId  |
| Prometheus  | latência, erro, fila, saúde de dependência      |
| Worker logs | jobs Mercado Pago, Telegram, webhook, impressão |

## 3. Redaction obrigatória

Não registrar:

- cookie;
- token;
- senha;
- PIN;
- hash sensível;
- documento;
- terminal ID real;
- segredo de webhook;
- payload de pagamento com dado real.

## 4. Diagnóstico por fluxo

| Fluxo   | Evidência útil                              |
| ------- | ------------------------------------------- |
| Auth    | login, `/auth/me`, sessão, CSRF             |
| Comanda | request da mutação, snapshot live, socket   |
| Cozinha | item, `kitchenStatus`, evento realtime      |
| Point   | intent, webhook, worker, provider status    |
| Barcode | barcode normalizado, provider, fallback     |
| PWA     | status REST, cache, service worker, console |

## 5. Quando abrir incidente

Abrir incidente se houver:

- falha generalizada de auth;
- confirmação financeira incorreta;
- perda de isolamento por workspace;
- dados reais expostos em log;
- fila travada afetando operação;
- erro recorrente em fluxo P0.
