# Load Testing

## Objetivo

Manter uma base versionada de stress test e smoke de carga para:

- API health
- login HTTP
- página de login do web

## Ferramenta

Os scripts foram preparados em `k6`:

- `tests/load/k6/api-health.js`
- `tests/load/k6/api-auth-login.js`
- `tests/load/k6/web-login-page.js`
- `tests/load/k6/critical-flows.js`
- `tests/load/k6/ci-latency-gate.js`

## Como rodar

### API health

```bash
k6 run tests/load/k6/api-health.js
```

### API auth login

```bash
k6 run -e BASE_URL=http://localhost:4000 -e LOGIN_EMAIL=demo@deskimperial.online -e LOGIN_PASSWORD=Demo@123 tests/load/k6/api-auth-login.js
```

### Web login

```bash
k6 run -e BASE_URL=http://localhost:3000 tests/load/k6/web-login-page.js
```

### Cenário crítico consolidado (recomendado)

```bash
npm run test:load:critical
```

Metas de latência (thresholds já codificados no script):

- `health_steady`: `p95 < 350ms`, `p99 < 700ms`
- `auth_login_peak`: `p95 < 900ms`, `p99 < 1500ms`
- erro HTTP global: `< 3%`

Variáveis opcionais:

- `BASE_URL` (default `http://localhost:4000`)
- `LOGIN_EMAIL`
- `LOGIN_PASSWORD`

### Gate de latência para CI

```bash
npm run test:load:ci
```

Meta do gate:

- `http_req_duration`: `p95 < 900ms`, `p99 < 1500ms`
- `http_req_failed`: `< 3%`
- checks: `> 99%`

## Status desta baseline

- scripts versionados
- não executados nesta rodada
- uso recomendado em staging ou ambiente local controlado

## Observações

- os scripts de login não devem ser apontados para produção pública sem janela controlada
- para stress real de Redis/Postgres/realtime, é necessário ambiente dedicado
- instalar o binário do k6 no runner/local antes de usar `npm run test:load:critical`
