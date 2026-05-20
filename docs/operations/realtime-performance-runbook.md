# Realtime e Operacoes — Performance Runbook

Data: 2026-04-24

> **Update 2026-05-16:** o smoke de performance agora mede latencia, payload p95, alvo p95 e threshold estrito, alem de gerar relatorio Markdown/JSON. Use isso como linha de base antes de qualquer alteracao em PWA, Redis, Socket.IO, Mercado Pago ou Telegram.

> **Update 2026-05-17:** baseline local completo validado com API `http://localhost:4000/api/v1` e web `http://localhost:3000`. Relatorios gerados em `.cache/performance/operations-baseline-local-strict.md` e `.cache/performance/operations-mobile-smoke-local.json`.

> **Update 2026-05-19:** mutacoes owner/staff mobile que retornam `ComandaRecord` agora sincronizam a cache `operations/kitchen` diretamente pela resposta da API. A fila da cozinha nao deve depender apenas de WebSocket/refetch para mostrar itens recem-criados; o WebSocket continua sendo a fonte de fan-out entre clientes e o reconcile REST fica como correção de consistencia.

> **Update 2026-05-01:** Reconstrução Fase 0+1+2 adicionou (a) hard-fail de Redis em prod, (b) buffer de envelopes durante reidratação + dedup por `envelope.id`, (c) event loop monitor (`desk.process.event_loop_lag`). Métricas novas a observar: `realtime-envelope-dropped` por `reason` (inclui `duplicate-id`, `buffer-overflow`, `baseline-error` e `stale-business-date`). Decisões e diff em [realtime-reconstruction-2026-05-01.md](realtime-reconstruction-2026-05-01.md).

## Objetivo

Medir gargalos de comandas, salao e cozinha antes de mudar arquitetura. A regra e simples: se a operacao parece lenta, primeiro medir:

- `operations/live` e `operations/kitchen`
- fan-out por room (`workspace`, `kitchen`, `mesa`, `cash`, `employee`)
- Redis/cache e adapter do Socket.IO
- tempo entre mutacao -> `first_emit`
- churn de reconnect, `operations.error` e refresh de foreground (`visibilitychange`, `pageshow`, `online`)

## Regra de UX quente: mutacao deve aquecer as caches da tela

Para fluxos de PWA e frente de caixa, uma mutacao bem-sucedida nao deve esperar exclusivamente o fan-out do WebSocket para atualizar a propria tela. Sempre que a resposta da API trouxer uma entidade final confiavel:

- atualizar a cache principal da tela afetada;
- atualizar caches derivadas pequenas, como `operations/kitchen`, quando a entidade tiver informacao suficiente;
- manter o reconcile REST agendado para corrigir divergencias e preencher campos que nao vieram na resposta;
- nunca fabricar estado de cozinha a partir de payload incompleto se o backend ainda nao confirmou `kitchenStatus`.

Exemplo atual: `openComanda`, `addComandaItem`, `addComandaItems` e `replaceComanda` sincronizam `operations/kitchen` a partir da `ComandaRecord` retornada pelo backend. Isso reduz atraso percebido no PWA sem remover a protecao de WebSocket + REST fallback.

## Smoke local ou remoto

Com API ja ativa:

```bash
npm run smoke:operations:performance
```

Gerando relatorio local:

```bash
npm run smoke:operations:performance -- --report .cache/performance/operations-baseline.md
```

Gerando JSON para comparacao automatizada:

```bash
npm run smoke:operations:performance -- --report .cache/performance/operations-baseline.json --report-format=json
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

Smoke PWA/realtime local:

```bash
DESK_SMOKE_APP_BASE_URL=http://localhost:3000 \
DESK_SMOKE_API_BASE_URL=http://localhost:4000/api/v1 \
DESK_SMOKE_EVENT_TIMEOUT_MS=30000 \
npm run smoke:operations:mobile -- --report .cache/performance/operations-mobile-smoke-local.md
```

Use o mesmo hostname para app e API durante o smoke local. Exemplo: `localhost` com `localhost`, ou `127.0.0.1` com web iniciada usando `NEXT_PUBLIC_API_URL=http://127.0.0.1:4000`. Misturar `127.0.0.1` no app com API configurada como `localhost` vira cross-site no navegador e o cookie `SameSite=Lax` nao acompanha a chamada.

O smoke mobile cria ou reativa um produto tecnico de cozinha apenas contra API local (`localhost` ou `127.0.0.1`). Em API remota, a criacao de fixture exige `DESK_SMOKE_ALLOW_FIXTURES=true` para evitar alterar producao por acidente.

Modo estrito para release PWA/realtime:

```bash
DESK_SMOKE_APP_BASE_URL=http://localhost:3000 \
DESK_SMOKE_API_BASE_URL=http://localhost:4000/api/v1 \
DESK_SMOKE_EVENT_TIMEOUT_MS=30000 \
npm run smoke:operations:mobile -- --strict --report .cache/performance/operations-mobile-smoke-local.md
```

Orcamentos iniciais do smoke mobile:

- delivery realtime p95: ate `500ms`;
- paint p95 apos envelope realtime: ate `150ms`;
- processamento do envelope p95: ate `80ms`;
- envelopes descartados, fora de ordem ou reconnect com erro: `0`.

Esses valores sao conservadores para ambiente local e devem ser usados como linha de corte antes de investigar Android real. Se o local estiver verde e o Android lento, o problema esta em device/rede/PWA/service worker/foreground, nao no caminho basico de API + Socket.IO.

Suite local controlada, com build de API/web, logs e cleanup automatico:

```bash
npm run perf:operations:local
```

Ela falha se as portas `4000` ou `3000` ja estiverem em uso, sobe `next start` em vez de `next dev`, grava logs e relatorios em `.cache/performance/local-suite/<data>/`, roda REST + PWA/realtime em modo estrito e derruba os processos no final. Para reaproveitar um build local ja feito:

```bash
npm run perf:operations:local -- --skip-build
```

## Limites iniciais

- `operations/live` p95 estrito: ate `1200ms`
- `operations/kitchen` p95 estrito: ate `1000ms`

Alvos operacionais para UX fluida:

- `health` p95 alvo: ate `300ms`
- `operations/live?compactMode=true` p95 alvo: ate `600ms`
- `operations/live?includeCashMovements=true` p95 alvo: ate `900ms`
- `operations/kitchen` p95 alvo: ate `600ms`
- `operations/summary` p95 alvo: ate `800ms`

Esses limites sao gates temporarios. Quando a base estabilizar, reduzir para:

- `operations/live` p95: `600-800ms`
- `operations/kitchen` p95: `500-700ms`

## Metricas que devem aparecer no Grafana

- `desk.operations.live.duration`
- `desk.operations.kitchen.duration`
- `desk.operations.summary.duration`
- `desk.operations.realtime.publish.duration`
- `desk.operations.realtime.mutation_to_first_emit.duration`
- `desk.operations.realtime.events`
- `desk.operations.realtime.socket.connections`
- `desk.operations.realtime.socket.active`
- `desk.operations.realtime.redis_adapter.transitions`
- `desk.auth.session.cache.hit`
- `desk.auth.session.cache.miss`
- `desk.auth.session.cache.negative_hit`

## Leitura do resultado

- `health` lento: problema de rede, API, banco ou Redis.
- `operations-live-compact` lento: salao/PWA com gargalo no snapshot operacional.
- `operations-live-full` lento: caixa/movimentos pesando a leitura completa.
- `operations-kitchen` lento: KDS/cozinha com query, cache ou refresh excessivo.
- `operations-summary` lento: leitura executiva/owner impactada.
- `payload_p95` alto: reduzir shape antes de aumentar cache/polling.
- `ATTENTION`: passou no gate estrito, mas ainda nao esta bom para fluidez percebida.
- `SLOW`: nao seguir com deploy sem justificar ou corrigir.
- reconnect aparentemente saudavel mas com tela velha: checar `operations.error`, refresh de foreground e tempo ate baseline fresco.
- staff recebendo ruido indevido: checar room scoping e fan-out financeiro fora de `cash`.

## Baseline local de 2026-05-17

REST em modo estrito:

- `health`: p95 `3ms`, payload p95 `135B`;
- `operations/live?compactMode=true`: p95 `4ms`, payload p95 `6KB`, shape `employees=4 mesas=3`;
- `operations/live?includeCashMovements=true`: p95 `3ms`, payload p95 `8KB`;
- `operations/kitchen`: p95 `3ms`, payload p95 `141B`;
- `operations/summary`: p95 `2ms`, payload p95 `384B`.

PWA/realtime:

- `comanda.opened` owner: entrega `4ms`, paint `10.5ms`;
- `kitchen.item.queued` owner: entrega `13ms`, paint `15.5ms`;
- `comanda.opened` staff observando owner: entrega `1ms`, paint `0.9ms`;
- `kitchen.item.queued` staff: entrega `1ms`, paint `0.4ms`;
- `kitchen.item.updated`: entrega entre `1ms` e `2ms`, paint ate `7.3ms` no staff;
- `comanda.closed`: entrega `1ms`, paint `0.5ms`;
- contadores de reconciliacao/invalidation ficaram zerados no fluxo feliz, indicando patch realtime sem refresh manual.

Conclusao: no ambiente local medido, o gargalo reportado pelo usuario nao esta no REST nem no patch realtime basico. Proximas investigacoes devem focar rede/dispositivo PWA real, foreground/resume, service worker/cache do navegador, payload em base com mais volume e webhooks externos.

## Ordem de correcao

1. Verificar Redis conectado e adapter Socket.IO ativo.
2. Verificar cache hit/miss/negative-hit no auth e nas leituras de operations.
3. Medir `mutation -> first_emit` antes de culpar transporte.
4. Conferir fan-out por room e se evento financeiro vazou para `workspace` geral.
5. Medir queries lentas no Postgres.
6. Reduzir payload ou escopo da query antes de mexer na UI.
7. Validar novamente com o smoke em modo estrito.

## Linha quente de PWA/realtime

Para perseguir fluidez real, medir a cadeia inteira:

1. clique do usuario no PWA;
2. mutacao HTTP inicia;
3. transacao termina;
4. primeiro envelope realtime e emitido;
5. cliente recebe envelope;
6. patch local aplica;
7. proximo paint fica visivel.

O backend ja expoe:

- `desk.operations.comanda.close.duration`
- `desk.operations.realtime.mutation_to_first_emit.duration`
- `desk.operations.realtime.publish.duration`
- `desk.operations.realtime.publish.dispatch_targets`
- `desk.operations.realtime.publish.socket_room_size`

O frontend ja registra eventos diagnosticos em `getOperationsPerformanceEvents()`:

- `mutation-finished`
- `socket-lifecycle`
- `realtime-envelope-processed`
- `reconnect-refresh`
- `realtime-envelope-dropped`

Se a UX estiver lenta mas o REST estiver dentro do alvo, atacar primeiro delivery/painel PWA, nao banco.

Para Mercado Pago Point, `mutation_to_first_emit` deve iniciar no recebimento do webhook e terminar no primeiro evento realtime que fecha/atualiza a comanda. Isso mede assinatura, consulta ao provider, transacao, cache invalidation e publish inicial como uma cadeia unica.

## Quando considerar Go para realtime

Go so entra como linha quente depois de provar estes pontos:

- `operations/live` e `operations/kitchen` estao dentro dos alvos com payload adequado;
- Redis adapter esta ativo em producao e sem churn anormal;
- `mutation_to_first_emit` continua alto mesmo com queries e cache corrigidos;
- event loop lag do Node aparece correlacionado com payload/fan-out;
- a fronteira de dominio esta clara: worker/gateway de eventos, nao reescrita total do produto.

Sem essa evidencia, trocar runtime aumenta risco e pode mascarar problema de modelo de dados, payload ou cache.

## O que nao fazer

- Nao aumentar polling para mascarar realtime quebrado.
- Nao invalidar todas as queries a cada evento se patch incremental resolver.
- Nao colocar IDs de usuario/workspace em labels de metricas.
- Nao chamar Redis de saudavel sem `health`, metricas e smoke.
- Nao tratar reconnect como resolvido sem medir baseline fresco apos foreground/resume.
