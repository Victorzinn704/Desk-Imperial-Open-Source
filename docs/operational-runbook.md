# Operational Runbook

## Running Tests Locally

### Redis-backed API smoke (`be-01-operational-smoke.spec.ts`)

1. Suba apenas o Redis local da stack oficial:

```powershell
$env:POSTGRES_DB = 'desk_imperial'
$env:POSTGRES_USER = 'desk_imperial'
$env:POSTGRES_PASSWORD = 'desk_imperial'
docker compose -f infra/docker/docker-compose.yml up -d redis
```

2. Verifique que o Redis do compose responde com `PONG`:

```powershell
$env:POSTGRES_DB = 'desk_imperial'
$env:POSTGRES_USER = 'desk_imperial'
$env:POSTGRES_PASSWORD = 'desk_imperial'
docker compose -f infra/docker/docker-compose.yml exec redis redis-cli -a change_me_in_prod ping
```

3. Exporte uma URL explícita aceita pelo smoke. Prioridade respeitada pelo teste: `REDIS_URL`, `REDIS_PRIVATE_URL`, `REDIS_PUBLIC_URL`.

```powershell
$env:REDIS_URL = 'redis://:change_me_in_prod@127.0.0.1:6379'
Remove-Item Env:REDIS_PRIVATE_URL -ErrorAction SilentlyContinue
Remove-Item Env:REDIS_PUBLIC_URL -ErrorAction SilentlyContinue
```

4. Rode o smoke Redis-backed da API:

```powershell
npm --workspace @partner/api run test -- test/be-01-operational-smoke.spec.ts
```

5. Com Redis ativo e `REDIS_URL` configurada, rode a suíte completa do workspace:

```powershell
npm test
```

### Comportamento esperado do helper de disponibilidade

- Se `REDIS_URL`, `REDIS_PRIVATE_URL` ou `REDIS_PUBLIC_URL` estiver definida, o smoke sempre roda. Se a URL apontar para um Redis caído, o teste falha.
- Se nenhuma URL explícita estiver definida, o smoke tenta o compose local em `redis://:change_me_in_prod@127.0.0.1:6379`.
- Se o compose local não responder, a suíte do smoke é marcada como `skip` em vez de falhar ambiguamente.

### Limpeza rápida do ambiente

Para desligar o Redis local depois da validação:

```powershell
$env:POSTGRES_DB = 'desk_imperial'
$env:POSTGRES_USER = 'desk_imperial'
$env:POSTGRES_PASSWORD = 'desk_imperial'
docker compose -f infra/docker/docker-compose.yml stop redis
```
