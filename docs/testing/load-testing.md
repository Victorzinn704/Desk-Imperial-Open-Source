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

## Status desta baseline

- scripts versionados
- não executados nesta rodada
- uso recomendado em staging ou ambiente local controlado

## Observações

- os scripts de login não devem ser apontados para produção pública sem janela controlada
- para stress real de Redis/Postgres/realtime, é necessário ambiente dedicado
