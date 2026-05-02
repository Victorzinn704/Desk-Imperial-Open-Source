# Playbook de Validação — Reconstrução Realtime (Fase 0+1+2)

> **Audiência:** quem vai validar manualmente em staging antes do rollout em prod.
> **Pré-requisito:** branch com a reconstrução de 2026-05-01 deployada em staging. Doc de origem: [realtime-reconstruction-2026-05-01.md](realtime-reconstruction-2026-05-01.md).
> **Tempo total:** ~45 minutos para os 6 cenários abaixo.

## 0. Pré-flight

Antes de iniciar a validação:

- [ ] Confirmar que o build de staging está apontando para a branch com a reconstrução (commit que inclui `event-loop-monitor.util.ts`).
- [ ] Verificar no dashboard OTel da API que `desk.process.event_loop_lag` está aparecendo com label `percentile=p50/p95/p99/max`. Se não aparecer em 30s após o boot, o monitor não subiu — abrir runbook de OTel.
- [ ] Confirmar `desk.operations.realtime.redis_adapter_state = configured` em staging (log de boot da API).
- [ ] Abrir DevTools no navegador para inspecionar o store de telemetria do cliente: `window.__DESK_IMPERIAL_OPERATIONS_PERF__.events`.

## 1. C2 — Hard-fail Redis em produção

**Objetivo:** confirmar que a API recusa boot em `NODE_ENV=production` sem `REDIS_URL`.

**Onde executar:** ambiente de CI ou container isolado. **Não execute em staging real** — vai derrubar o pod.

**Passos:**

1. Em CI ou container local, definir `NODE_ENV=production` e remover `REDIS_URL`/`REDIS_PRIVATE_URL`/`REDIS_PUBLIC_URL`.
2. Tentar bootar a API: `npm --workspace @partner/api start` (ou equivalente).
3. **Esperado:** processo encerra com `Error: REDIS_URL obrigatório em produção: defina REDIS_URL/REDIS_PRIVATE_URL/REDIS_PUBLIC_URL para que o adapter Socket.IO atravesse instâncias.`
4. Se ocorrer fallback silencioso (boot completa, log "Socket.IO usando adapter em memória"): **fix não está em HEAD, abortar deploy**.

**Cobertura automatizada:** `apps/api/test/operations-realtime.gateway.spec.ts` linha 93 (`'afterInit em producao sem redis lanca erro de boot (hard-fail C2)'`).

## 2. C5 + C6 — Reconexão com jitter e fallback de transport

**Objetivo:** confirmar que o cliente espalha reconexão e cai pra polling em rede WS bloqueada.

**Setup C5 (jitter):**

1. Abrir 5 abas simultaneamente em staging (mesmo workspace).
2. Em cada aba, abrir DevTools → console → confirmar `socketIO.io.opts.randomizationFactor === 0.5` (ou inspecionar via Network tab para ver o handshake).
3. Em todas as abas simultaneamente, derrubar a conexão por 5s (DevTools → Network → "Offline" → wait 5s → restaurar).
4. Anotar o timestamp do `connect` event de cada aba (visível no perf store: `events.filter(e => e.type === 'socket-lifecycle' && e.phase === 'connect')`).
5. **Esperado:** timestamps espalhados em janela ≥1s (não todos em t=2s exato).
6. Se todos em <500ms de diferença: jitter não está ativo, abortar.

**Setup C6 (polling fallback):**

1. Em uma aba, abrir DevTools → Network → bloquear a URL `**/socket.io/?*&transport=websocket*` (botão direito → block request URL).
2. Fazer reload da página.
3. **Esperado:** após ~3s, conexão se estabelece via polling. Network tab mostra requests `polling` em vez de `websocket`. UI funciona normalmente.
4. Se a UI ficar em `connecting` indefinidamente: fallback não está habilitado, abortar.

## 3. C4 — Dedup de patch por envelope.id

**Objetivo:** confirmar que envelope duplicado é descartado e não aplica patch 2×.

**Setup mais simples (via console):**

1. Abrir staging logado como STAFF de uma comanda em aberto.
2. No console DevTools, capturar o handler do socket: `const sock = window.io && window.io.sockets || /* via React DevTools */`. (Alternativa: pegar o handler diretamente via mock do `socket.on` se exposto em dev — pode exigir um instrumento ad-hoc.)
3. Mais prático: deixar a aba aberta, fazer uma mutação real (ex: mover comanda de OPEN → IN_PREPARATION pelo OWNER em outra aba), capturar o `envelope.id` no perf store: `window.__DESK_IMPERIAL_OPERATIONS_PERF__.events.filter(e => e.type === 'realtime-envelope-processed').slice(-1)`.
4. Reemitir o mesmo envelope manualmente via console (forçando `socket.emit('comanda.updated', envelope)` no cliente, ou usando o servidor para retransmitir o mesmo envelope).
5. **Esperado:**
   - Apenas 1 entrada `realtime-envelope-processed` no perf store.
   - 1 entrada `realtime-envelope-dropped` com `reason: 'duplicate-id'`.
   - Estado da UI inalterado pela retransmissão.
6. Se contagem de `processed` == 2: dedup não está pegando, abortar.

**Cobertura automatizada:** `apps/web/components/operations/use-operations-realtime.socket.test.tsx` linha 547 (`'(C4) envelope com mesmo id e descartado na segunda entrega sem aplicar patch duplo'`).

## 4. C1 — Buffer de envelopes durante reidratação

**Objetivo:** confirmar que eventos chegando durante `refreshBaseline` são bufferizados e drenados na ordem.

**Setup:**

1. Abrir staging em duas abas: A (observador) e B (atuador).
2. Na aba A, derrubar conexão por 5s (DevTools → Offline) → restaurar.
3. **Imediatamente após restaurar** (enquanto `refreshBaseline` ainda está em voo), em aba B fazer 3 mutações rápidas em sequência (ex: mover comanda 1, mover comanda 2, mover comanda 3).
4. Na aba A, inspecionar o perf store após estabilização (~5s):
   - `events.filter(e => e.type === 'reconnect-refresh' && e.status === 'success')` deve ter 1 entrada.
   - `events.filter(e => e.type === 'realtime-envelope-processed')` deve ter ≥3 entradas (3 mutações foram aplicadas).
   - **Ordem:** os timestamps `at` dos `realtime-envelope-processed` devem ser POSTERIORES ao `reconnect-refresh.at + reconnect-refresh.durationMs` (foram drenados depois do REST resolver).
5. Visualmente, na aba A as 3 comandas devem aparecer com o estado correto pós-mutação.
6. Se alguma comanda aparecer com estado intermediário (uma das mutações foi sobrescrita por refetch): buffer não pegou.

**Teste de overflow (opcional, requer flood):**

1. Repetir o cenário acima mas com 110+ mutações em rajada.
2. Esperado: `events.filter(e => e.type === 'realtime-envelope-dropped' && e.reason === 'buffer-overflow').length >= 10` (cap é 100).

**Cobertura automatizada:** mesmo arquivo, linha 588 (`'(C1) envelopes acima do limite durante reidratacao sao descartados com buffer-overflow'`).

## 5. Fase 0 — Event Loop Monitor

**Objetivo:** confirmar que o monitor está reportando histograma com 4 percentis.

**Passos:**

1. No dashboard OTel/Grafana de staging, abrir métrica `desk.process.event_loop_lag`.
2. **Esperado:**
   - 4 buckets visíveis com label `desk.process.event_loop_lag.percentile`: `p50`, `p95`, `p99`, `max`.
   - Atualização a cada 15s (ou conforme `OTEL_METRICS_EXPORT_INTERVAL_MS`).
   - Em staging idle, p95 ≤ 5ms; p99 ≤ 30ms.
3. Para gerar carga sintética (opcional):
   - Disparar 50 mutações simultâneas (`apps/api/scripts/...` ou via UI burst).
   - Observar p95/p99 subindo durante a rajada.
4. **Comportamento patológico a procurar:** p99 sustentado >100ms indica outro hotspot bloqueando event loop. Não é regressão da reconstrução, mas sinaliza outro investigação.

## 6. Smoke de não-regressão

**Objetivo:** confirmar que as mudanças não quebraram comportamentos preexistentes.

Rodar o playbook de smoke já existente: `docs/release/manual-smoke-checklist-2026-03-28.md` (todas as seções relacionadas a comandas, caixa, cozinha, salão).

Pontos de atenção específicos:

- [ ] `visibilitychange` — trocar de aba e voltar; UI deve atualizar via `requestBaselineRefresh`.
- [ ] `pageshow` — fechar e reabrir aba; mesmo comportamento.
- [ ] `online` — derrubar wifi e voltar; reconnect + baseline.
- [ ] Toast notifications — mover comanda em aba B; aba A deve mostrar toast 1× (não 2× por causa do dedup).
- [ ] Mobile — repetir os cenários 2-4 num celular real (Android/iOS) com tela bloqueada por 30s.

## 7. Critérios de saída para promover staging → prod

Validar **todos** antes de subir prod:

- [ ] Cenários 1-6 do playbook acima passam em staging.
- [ ] Janela de 7 dias mínima em staging com a reconstrução ativa.
- [ ] Dashboard OTel de staging mostra:
  - `event_loop_lag` p99 estável (sem crescimento sustentado).
  - `redis_adapter_state = configured` em 100% do uptime.
  - `recordOperationsReconnectRefreshEvent.duration_ms` p95 não regrediu mais de +800ms vs baseline pré-reconstrução.
- [ ] Telemetria do cliente (sample manual em N abas) mostra `realtime-envelope-dropped` com `reason: 'duplicate-id'` e/ou `'buffer-overflow'` aparecendo (prova que os mecanismos estão ativos, não dormentes).
- [ ] Zero relatos de "tela pisca em rede ruim" em UAT manual.
- [ ] Suite de testes API + Web verde em CI (38/38 + 14/14 da reconstrução).

## 8. Plano de rollback (caso algum critério falhe)

Cada correção é independente e revertível por commit isolado:

| Correção           | Como reverter                                                                                                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C2                 | Revert do bloco `if (process.env.NODE_ENV === 'production') throw` em `operations-realtime.gateway.ts`. Volta a comportar warn-only.                                                                                                  |
| C5                 | Remover `randomizationFactor: 0.5` em `use-operations-socket.ts`. Volta ao default implícito do Socket.IO.                                                                                                                            |
| C6                 | Voltar `transports: ['websocket']` e `upgrade: false` em `use-operations-socket.ts`.                                                                                                                                                  |
| C4                 | Remover bloco do dedup em `use-operations-realtime.ts` (`processedEnvelopeIdsRef` + check).                                                                                                                                           |
| C1                 | Remover bloco do buffer (`isSyncingRef`/`reidratationBufferRef`) e o handle ref. **Nota:** C4 e C1 dependem um do outro para ordering correto na drenagem; revert de C1 sem C4 ainda funciona, mas revert de C4 mantendo C1 é seguro. |
| Event loop monitor | Remover import + chamadas em `main.ts` e o arquivo `event-loop-monitor.util.ts`.                                                                                                                                                      |

Rollback parcial preferido: **uma correção por vez**, observar 24h, decidir.

## 9. Quem chamar se algo der errado

- Hard-fail Redis em prod (C2) derruba pod inesperadamente → time devops + verificar config de deploy.
- Race REST↔WS persiste após Fase 2 → reabrir investigação (talvez Fase 4 C8 cursor seja necessário).
- Latência de reconexão estourou budget +800ms p95 → flag para desativar buffer (C1) primeiro, manter C4.
- Telemetria não chega no Grafana → time observability + checar `OTEL_EXPORTER_OTLP_*`.
