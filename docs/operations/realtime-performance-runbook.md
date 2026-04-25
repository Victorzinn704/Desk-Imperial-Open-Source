# Realtime e Operacoes — Performance Runbook

Data: 2026-04-24

## Objetivo

Medir gargalos de comandas, salao e cozinha antes de mudar arquitetura. A regra e simples: se a operacao parece lenta, primeiro medir `operations/live`, `operations/kitchen`, Redis/cache e Socket.IO.

## Smoke local ou remoto

Com API ja ativa:

```bash
npm run smoke:operations:performance
```

Com API remota:

```bash
DESK_API_BASE_URL=https://api.deskimperial.online/api/v1 npm run smoke:operations:performance
```

Com sessao real ja autenticada:

```bash
DESK_SESSION_COOKIE="desk_session=..." npm run smoke:operations:performance
```

Modo estrito para release:

```bash
npm run smoke:operations:performance -- --strict
```

## Limites iniciais

- `operations/live` p95: ate `1200ms`
- `operations/kitchen` p95: ate `1000ms`

Esses limites sao gates temporarios. Quando a base estabilizar, reduzir para:

- `operations/live` p95: `600-800ms`
- `operations/kitchen` p95: `500-700ms`

## Metricas que devem aparecer no Grafana

- `desk.operations.live.duration`
- `desk.operations.kitchen.duration`
- `desk.operations.realtime.publish.duration`
- `desk.operations.realtime.events`
- `desk.operations.realtime.socket.connections`
- `desk.operations.realtime.socket.active`
- `desk.operations.realtime.redis_adapter.transitions`

## Leitura do resultado

- `health` lento: problema de rede, API, banco ou Redis.
- `operations-live-compact` lento: salao/PWA com gargalo no snapshot operacional.
- `operations-live-full` lento: caixa/movimentos pesando a leitura completa.
- `operations-kitchen` lento: KDS/cozinha com query, cache ou refresh excessivo.
- `operations-summary` lento: leitura executiva/owner impactada.

## Ordem de correcao

1. Verificar Redis conectado e adapter Socket.IO ativo.
2. Verificar cache hit/miss nas metricas de operations.
3. Medir queries lentas no Postgres.
4. Reduzir payload ou escopo da query antes de mexer na UI.
5. Validar novamente com o smoke em modo estrito.

## O que nao fazer

- Nao aumentar polling para mascarar realtime quebrado.
- Nao invalidar todas as queries a cada evento se patch incremental resolver.
- Nao colocar IDs de usuario/workspace em labels de metricas.
- Nao chamar Redis de saudavel sem `health`, metricas e smoke.
