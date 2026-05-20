# Reconstrução da Camada Realtime — 2026-05-01

> **Audiência:** próximo agente (Codex/outro engenheiro) que precisar entender o estado atual da malha realtime sem reler 200 mensagens de contexto.
> **Status:** Fase 0 (observabilidade) + Fase 1 (quick wins) + Fase 2 (idempotência+ordering) entregues nesta linha de trabalho. Fase 3 deferida. Fase 4 condicional.
> **Fonte da decisão:** auditoria técnica de 2026-05-01 consolidada neste documento e no napkin do repositório.
> **Validação manual:** [realtime-reconstruction-validation-playbook.md](realtime-reconstruction-validation-playbook.md).

## 1. Contexto rápido

Em 2026-05-01 um laudo anterior alegou múltiplos bugs críticos no realtime (`JSON.stringify` bloqueando event loop, churn de socket por re-render, broadcast único por tenant). **Auditoria independente confirmou que essas alegações eram alucinação ou exagero** — código não existia, useRef já estava aplicado, segregação por sub-canal já existia.

A auditoria identificou 10 problemas reais (P1-P10). Esta reconstrução implementa **5 correções (C2, C5, C6, C4, C1) + Fase 0 de observabilidade** sob 6 princípios estritos: stack imutável, minimum viable fix, reversível por config, antes-depois mensurável, reuso da telemetria existente, **budget LOC ≤400**.

## 2. Mapa da malha pós-reconstrução

```
[Cliente Next.js / TanStack Query / Zustand]
  └─ apps/web/components/operations/use-operations-realtime.ts        ← consumer
       │  • dedup por envelope.id (Set FIFO 200)              ← C4
       │  • buffer durante reidratação (cap 100)              ← C1
       │  • drenagem ordenada após refreshBaseline            ← C1
       └─ apps/web/components/operations/hooks/use-operations-socket.ts
            │  • transports: ['websocket', 'polling']         ← C6
            │  • upgrade: true                                 ← C6
            │  • randomizationFactor: 0.5                      ← C5
            └─ socket.io-client → namespace `/operations`
                                    │
[Backend NestJS] ←──────────────────┘
  ├─ operations-realtime.gateway.ts
  │   • afterInit: hard-fail se NODE_ENV=production sem REDIS_URL  ← C2
  ├─ operations-realtime.service.ts        ← publisher puro
  ├─ operations-realtime.types.ts          ← 9 eventos + canais segregados
  ├─ operations-realtime.socket-auth.ts    ← extração de token + auth
  └─ operations-realtime-sessions.service.ts ← Map em memória (P2 ainda em aberto)

[Process API]
  └─ common/observability/event-loop-monitor.util.ts        ← Fase 0
      • monitorEventLoopDelay(node:perf_hooks)
      • OTel histogram desk.process.event_loop_lag (p50/p95/p99/max)
```

**Eventos** (`operations-realtime.types.ts`): `cash.opened`, `cash.updated`, `comanda.opened`, `comanda.updated`, `comanda.closed`, `cash.closure.updated`, `kitchen.item.queued`, `kitchen.item.updated`, `mesa.upserted`.

**Canais** (`resolveOperationsRealtimeEventChannels`): `cash.*` → `:cash` (OWNER), `kitchen.*` → `:kitchen`, `mesa.*` → `:mesa`, demais → workspace global do tenant.

## 3. O que foi entregue (todas as 5 correções + Fase 0)

| ID         | Arquivo                                                                   | Mudança                                                                                                                                                                                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C2**     | `apps/api/src/modules/operations-realtime/operations-realtime.gateway.ts` | `throw new Error('REDIS_URL obrigatório em produção…')` em `afterInit` quando `NODE_ENV=production` e nenhuma das `REDIS_URL/REDIS_PRIVATE_URL/REDIS_PUBLIC_URL` resolve. Impede falha silenciosa de fan-out em multi-pod.                                                                               |
| **C5**     | `apps/web/components/operations/hooks/use-operations-socket.ts`           | `randomizationFactor: 0.5` no `io()`. Espalha reconexão em queda compartilhada.                                                                                                                                                                                                                          |
| **C6**     | mesmo arquivo                                                             | `transports: ['websocket', 'polling']`, `upgrade: true`. Habilita fallback automático para long-polling em redes restritas.                                                                                                                                                                              |
| **C4**     | `apps/web/components/operations/use-operations-realtime.ts`               | Dedup por `envelope.id` (`processedEnvelopeIdsRef` Set + `processedEnvelopeIdsOrderRef` array para FIFO de 200). Drop com `recordOperationsRealtimeEnvelopeDropped({ reason: 'duplicate-id' })`. Reset ao iniciar `refreshBaseline`.                                                                     |
| **C1**     | mesmo arquivo                                                             | `isSyncingRef` + `reidratationBufferRef` (cap 100). Eventos chegando durante `refreshBaseline` são bufferizados; drenados na ordem original via `handleEventRef.current?.(envelope)` após `Promise.all` resolver. Acima do cap, drop com `reason: 'buffer-overflow'`.                                    |
| (suporte)  | `apps/web/lib/operations/operations-performance-diagnostics.ts`           | `OperationsRealtimeDropReason` estendido para `'no-applicable-snapshot' \| 'duplicate-id' \| 'buffer-overflow'`.                                                                                                                                                                                         |
| **Fase 0** | `apps/api/src/common/observability/event-loop-monitor.util.ts` (**novo**) | `startEventLoopMonitor()` envolvendo `node:perf_hooks.monitorEventLoopDelay`. Amostra a cada `OTEL_METRICS_EXPORT_INTERVAL_MS` (default 15s). Emite p50/p95/p99/max no histograma OTel `desk.process.event_loop_lag` com label `percentile`. Singleton com `stopEventLoopMonitor()` para shutdown limpo. |
| **Fase 0** | `apps/api/src/main.ts`                                                    | Plug do monitor no bootstrap (skip em `NODE_ENV=test`); parada no graceful shutdown junto com OTel.                                                                                                                                                                                                      |

### Cobertura de testes adicionada

- `apps/api/test/operations-realtime.gateway.spec.ts` linha 93: `'afterInit em producao sem redis lanca erro de boot (hard-fail C2)'`.
- `apps/web/components/operations/use-operations-realtime.socket.test.tsx`:
  - linha 547: `'(C4) envelope com mesmo id e descartado na segunda entrega sem aplicar patch duplo'`
  - linha 588: `'(C1) envelopes acima do limite durante reidratacao sao descartados com buffer-overflow'`

### Polish round 2026-05-01 (segunda passagem)

Após a primeira entrega Fase 0+1+2, três melhorias surgicais foram aplicadas mantendo o mesmo budget:

| Mudança                                    | Arquivo                                                                                                                                                | LOC | Razão                                                                                                                                                                                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Warmup do event loop monitor**           | `apps/api/src/common/observability/event-loop-monitor.util.ts`                                                                                         | +5  | A primeira amostra concentra ruído de bootstrap (Nest module init, OTel SDK warm-up). Skipar a leitura inicial evita enviesar p95/p99 do resto da sessão.                                                                                                        |
| **Unificação do dedup de toast**           | `apps/web/components/operations/use-operations-realtime.ts` (`notifiedEnvelopeIdsRef` + `maybeNotifyRealtimeStatusChange`)                             | ~12 | Antes: `string[]` com `includes()` O(n) e `splice()`. Depois: `{ set: Set<string>, order: string[] }` com `has()`/`add()` O(1) e `shift()` controlado. Padrão idêntico ao do C4 (patch dedup), reduzindo divergência cognitiva.                                  |
| **Telemetria de drop em erro de baseline** | `apps/web/components/operations/use-operations-realtime.ts` (catch do `refreshBaseline`) + `operations-performance-diagnostics.ts` (drop reason union) | ~15 | Antes: envelopes bufferizados durante uma reidratação que falha eram descartados em silêncio. Depois: cada um vira `recordOperationsRealtimeEnvelopeDropped({ reason: 'baseline-error' })`. Dashboards distinguem perda por falha de REST de perda por overflow. |

### C10 — `stale-business-date` (materializado externamente)

Durante a sessão, o filtro por `businessDate` (C10 do plano original) **foi implementado** em `use-operations-realtime.ts` linhas 239-253. Status migrou de "Fase 4 condicional" para "implementado":

- Antes do `applyRealtimeEnvelope`, compara `envelope.payload.businessDate` contra `liveSnapshot.businessDate`.
- Divergência → `recordOperationsRealtimeEnvelopeDropped({ reason: 'stale-business-date' })` + return cedo (evita rodar patchers).
- Comentário no código indica que o patcher já filtra internamente; o drop precoce é só observabilidade e custo CPU.

## 4. Diff total acumulado

| Arquivo                                                                   | Mudança    | LOC líquido                |
| ------------------------------------------------------------------------- | ---------- | -------------------------- |
| `apps/api/src/modules/operations-realtime/operations-realtime.gateway.ts` | Modificado | +5                         |
| `apps/api/src/main.ts`                                                    | Modificado | +7                         |
| `apps/api/src/common/observability/event-loop-monitor.util.ts`            | **Novo**   | +60                        |
| `apps/web/components/operations/hooks/use-operations-socket.ts`           | Modificado | +3                         |
| `apps/web/components/operations/use-operations-realtime.ts`               | Modificado | +64                        |
| `apps/web/lib/operations/operations-performance-diagnostics.ts`           | Modificado | 0 (tipo)                   |
| **Total**                                                                 | —          | **~145 LOC** (budget ≤400) |

**1 arquivo novo** (budget ≤4). **0 dependências npm novas**. Todos os eixos honrados.

## 5. Validação local rápida

```bash
# Typecheck (ambos exit 0, output vazio)
cd apps/api && npx tsc --noEmit
cd apps/web && npx tsc --noEmit -p tsconfig.typecheck.json

# Suite API realtime (38/38)
cd apps/api && npx jest \
  test/operations-realtime.gateway.spec.ts \
  test/operations-realtime.service.spec.ts \
  test/operations-realtime.socket-auth.spec.ts \
  test/operations-realtime.auth.spec.ts \
  test/operations-types.realtime.spec.ts \
  --runInBand

# Suite Web realtime (14/14)
cd apps/web && npx vitest run components/operations/use-operations-realtime.socket.test.tsx
```

**Falha pré-existente conhecida e fora de escopo:** `apps/api/test/operations-realtime.publishers.spec.ts` tem 5 testes falhando porque a signature de `publishComandaClosed` ganhou o terceiro parâmetro `instrumentation?` no commit `890dc5e` mas o teste não foi atualizado. Não é regressão desta reconstrução (verificado via `git stash`+re-run idêntico).

**Validação manual em staging:** [realtime-reconstruction-validation-playbook.md](realtime-reconstruction-validation-playbook.md) — playbook completo com 6 cenários e critérios de promoção prod.

## 6. Telemetria

| Métrica                                                                     | Onde                                                 | Origem                                                                      |
| --------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------- |
| `desk.process.event_loop_lag` (OTel) com label `percentile=p50/p95/p99/max` | Backend, todo processo da API exceto `NODE_ENV=test` | **NOVO** — `event-loop-monitor.util.ts`                                     |
| `realtime-envelope-dropped` com `reason: 'duplicate-id'`                    | Cliente, perf store local                            | **NOVO** — disparado por C4                                                 |
| `realtime-envelope-dropped` com `reason: 'buffer-overflow'`                 | Cliente, perf store local                            | **NOVO** — disparado por C1                                                 |
| `realtime-envelope-dropped` com `reason: 'baseline-error'`                  | Cliente, perf store local                            | **NOVO (polish round)** — envelopes perdidos quando `refreshBaseline` lança |
| `realtime-envelope-dropped` com `reason: 'stale-business-date'`             | Cliente, perf store local                            | **NOVO (C10)** — virada de business day em sessão longa                     |
| `realtime-envelope-dropped` com `reason: 'no-applicable-snapshot'`          | Cliente                                              | Pré-existente                                                               |
| `realtime-envelope-out-of-order`                                            | Cliente                                              | Pré-existente — só telemetriza, não corrige                                 |
| `realtime-envelope-processed`                                               | Cliente                                              | Pré-existente                                                               |
| `reconnect-refresh` com `status` e `durationMs`                             | Cliente                                              | Pré-existente — agora envolve a janela com buffer                           |
| `desk.operations.realtime.publish.*`                                        | Backend                                              | Pré-existente                                                               |
| `desk.operations.realtime.socket.auth.*`                                    | Backend                                              | Pré-existente                                                               |
| `desk.operations.realtime.redis_adapter_state`                              | Backend                                              | Pré-existente — em prod nem chega a registrar (boot trava antes)            |

## 7. O que NÃO foi feito (deferred / out of scope)

### 7.1 Fase 3 — Sync de revogação de sessão entre nós (C3) — Deferred

**Razão:** ~50 LOC de bridge Redis pub/sub é complexidade morta sem prod multi-pod ativo.

**Quando executar:**

- Se prod virar multi-instância nas próximas 8 semanas, OU
- Se incidente de "sessão revogada continua recebendo eventos em outro pod" for reportado.

**Forma da execução:** reutilizar o `redisPubClient` que **já existe** no gateway (`operations-realtime.gateway.ts` linha 73). Canal sugerido: `operations:realtime:session-revoke`. Publisher e subscriber separados explicitamente para evitar loop. Detalhes na seção 15.1 do plano.

### 7.2 Fase 4 — Otimizações condicionais (C7/C8/C9/C10)

Cada item tem **gatilha métrica explícita**. Se não disparar em 30 dias após Fase 2, descarta (não adia).

- **C7 (delta granular em `comanda.updated`)** — gatilha: `payload_bytes` p95 > 4KB OU CPU do parser JSON mobile > 50ms p95.
- **C9 (ACK em fechamento de comanda/caixa)** — gatilha: ≥1 incidente de "comanda fechou no servidor mas cliente não atualizou".
- **C10 (filtro por businessDate)** — gatilha: ≥1 incidente de estado-do-dia-errado OU operação 24h confirmada.
- **C8 (cursor + replay window)** — gatilha: `envelope_out_of_order_count` ainda > 1% após Fase 2 OU requisito de offline-first surgir.

## 8. Decisões importantes

### 8.1 Por que não trocar `invalidateQueries` por `refetchQueries` no `refreshBaseline`

O plano original sugeria essa troca, mas auditoria pós-leitura do TanStack Query confirmou que **`invalidateQueries` com `refetchType: 'active'` (default) já aguarda o refetch das queries com observers ativos**. As queries de `live`/`kitchen`/`summary`/`mesas` são consumidas por componentes ativos enquanto o realtime está montado, então o `Promise.all` no `refreshBaseline` **já bloqueia até o refetch resolver**. A race window não é resolvida trocando a API — é resolvida bloqueando o aplicador WS durante a janela. **C1 implementou exatamente essa proteção sem mexer no padrão de invalidação.**

### 8.2 Por que dedup acontece DEPOIS do `applyRealtimeEnvelope`

Fluxo em `handleEvent`:

1. Curto-circuito do buffer (se `isSyncingRef`, push e retorna).
2. Curto-circuito do dedup (se `processedEnvelopeIdsRef.has(envelope.id)`, drop e retorna).
3. Aplica patch.
4. **Depois** registra id no Set.

Defensiva: se `applyRealtimeEnvelope` lançar (não throws hoje, mas a ordem cobre), o id não fica marcado e uma retransmissão futura pode tentar de novo.

### 8.3 Por que reset do dedup acontece NO INÍCIO do `refreshBaseline`, não no fim

Reset ANTES do await garante que envelopes pós-baseline (incluindo os do buffer drenado) sejam processados normalmente, mesmo com colisão de id. Reset no fim seria perigoso: o draining aplicaria os envelopes, registraria ids, e o reset apagaria, abrindo janela para reaplicação caso o socket retransmitisse.

### 8.4 Por que cap 200 ids no dedup, 100 no buffer

- 200 ids × 36 bytes UUID = ~7KB. Dentro do budget de 50KB por aba.
- 100 envelopes × payload típico 500B-2KB = ~50-200KB transient. Aceitável durante reidratação (segundos no pior caso).
- 100 envelopes cobre 30s de reidratação a 3 eventos/s. Acima disso, prefere drop telemetrado a inflar memória.

### 8.5 Por que `randomizationFactor: 0.5` e não 0.7

Default do socket.io-client é 0.5. Setar explicitamente é apenas documentação visível no código. Subir para 0.7 só se métrica de pico de handshakes simultâneos pós-queda compartilhada se mostrar problemática em staging.

### 8.6 Por que NÃO removemos a flag warn no Redis adapter (C2)

O hard-fail só vale para `NODE_ENV=production`. Em dev/staging, o warn permite rodar sem Redis (caso de uso real). Não vira config opcional via env porque isso defeitaria o propósito do hard-fail (dev de produção esquecer de configurar e quebrar fan-out silenciosamente).

## 9. Cenários para o próximo agente

### Cenário A — Mexer em realtime para feature nova

1. Ler o plano-mãe + este doc + napkin (`Domain Behavior Guardrails` itens 1-7).
2. **Não** introduzir wrapper novo de telemetria — usar funções existentes em `business-telemetry.util.ts` e `operations-performance-diagnostics.ts`.
3. **Não** assumir que `JSON.stringify`/`Buffer.byteLength` bloqueando event loop é problema atual — não é.
4. **Não** mudar contrato de evento sem coordenar publisher/cliente (`operations-realtime.types.ts`).

### Cenário B — Apareceu sintoma de "tela pisca em rede ruim"

1. Ler dashboard com `realtime-envelope-dropped` agrupado por `reason`.
2. Se `reason=duplicate-id` é dominante → C4 está pegando retransmissões. Investigar por que servidor está retransmitindo.
3. Se `reason=buffer-overflow` é dominante → reidratação está demorando demais. Investigar latência REST de live/kitchen/summary/mesas.
4. Se `realtime-envelope-out-of-order` é alto e `reason=duplicate-id`/`buffer-overflow` não → considerar Fase 4 C8 (cursor de evento).

### Cenário C — Vai pra prod multi-pod

1. **Antes do deploy:** confirmar `REDIS_URL` definido em todos os pods. Sem isso, boot da API trava (C2).
2. **Implementar C3** antes de habilitar revogação de sessão como feature. Sem C3, revogação é parcial entre pods.
3. Em monitoring, criar alerta para `desk.operations.realtime.redis_adapter_state != configured`.

### Cenário D — Quer otimizar payload (`comanda.updated` carrega kitchenItems[])

1. Confirmar gatilha (`payload_bytes` p95 > 4KB) com dado real.
2. Se confirmada, executar C7 conforme seção 16.2 do plano.
3. Não fazer "preventivamente" — risco/LOC é alto e ganho não está provado.

## 10. Referências cruzadas

- **Resumo completo da auditoria + reconstrução:** este documento.
- **Playbook de validação manual em staging:** [realtime-reconstruction-validation-playbook.md](realtime-reconstruction-validation-playbook.md)
- **Doc de arquitetura realtime:** [docs/architecture/realtime.md](../architecture/realtime.md)
- **Refinement anterior (2026-03-28):** [realtime-refinement-2026-03-28.md](realtime-refinement-2026-03-28.md)
- **Performance runbook:** [realtime-performance-runbook.md](realtime-performance-runbook.md)
- **KPIs realtime:** [kpi-realtime-mapping.md](kpi-realtime-mapping.md)

## 11. Anti-checklist

- ❌ Trocar Socket.IO por SSE/Pusher/Ably/Liveblocks — o problema nunca foi o transporte.
- ❌ Introduzir event sourcing/CQRS — overkill para o porte atual.
- ❌ Adicionar CRDT no cliente — tipo de conflito que CRDT resolve não é o que aparece aqui.
- ❌ Criar service worker offline-first sem requisito explícito.
- ❌ Reescrever o gateway em microservice dedicado — 240 linhas de Nest fazendo só auth+join+disconnect já é minimalista.
- ❌ Medir "latência percebida" via RUM — telemetria existente é sinal suficiente.
- ❌ Otimizar telemetria do hot path — já é barata (verificado: O(1) + O(rooms~5)).
- ❌ Confiar em laudo antigo sem reverificar contra o código atual — laudo de 2026-05-01 anterior continha 3 alegações falsas confirmadas.
