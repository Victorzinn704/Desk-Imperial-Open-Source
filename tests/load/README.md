# Load testing

Este diretório concentra testes de carga para validar desempenho sem regressao.

## Cenário crítico (recomendado)

Executa dois fluxos em paralelo:

- `health_steady`: taxa constante para confirmar estabilidade da API.
- `auth_login_peak`: rampa de autenticação para validar pico de latencia.

Metas de latencia:

- `health_steady`: `p95 < 350ms`, `p99 < 700ms`
- `auth_login_peak`: `p95 < 900ms`, `p99 < 1500ms`
- erro global HTTP: `< 3%`

Comando:

```bash
npm run test:load:critical
```

Gate para CI:

```bash
npm run test:load:ci
```

Variáveis opcionais:

- `BASE_URL` (default: `http://localhost:4000`)
- `LOGIN_EMAIL`
- `LOGIN_PASSWORD`

Exemplo:

```bash
BASE_URL=http://localhost:4000 LOGIN_EMAIL=ceo@empresa.com LOGIN_PASSWORD=segredo k6 run tests/load/k6/critical-flows.js
```
