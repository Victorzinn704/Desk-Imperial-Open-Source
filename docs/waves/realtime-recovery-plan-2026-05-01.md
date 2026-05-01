# Realtime Recovery Plan — 2026-05-01

## Objetivo

Recuperar a camada realtime do Desk Imperial sem limpeza impulsiva, sem regressão invisível e sem remover suporte vivo por engano.

## Regras de execução

1. Não remover nada sem inventário Wave 0.
2. Primeiro adicionar medição e caminho novo; depois desativar caminho antigo.
3. Cada wave precisa de:
   - hipótese
   - alvo
   - smoke
   - rollback
4. O sucesso é medido em:
   - latência percebida
   - fan-out
   - consistência
   - estabilidade de reconnect
   - redução de ruído

## Wave 0 — Congelar baseline

### Meta

Saber exatamente o que existe antes de mexer.

### Artefato de referência

- `docs/waves/realtime-wave-0-inventory-2026-05-01.md`

### Critério de saída

- publishers conhecidos
- consumers conhecidos
- rooms/namespaces conhecidos
- superfícies que montam realtime conhecidas
- lista explícita do que não pode sair ainda

## Wave 1 — Instrumentação obrigatória

### Meta

Transformar hipótese em métrica.

### Status local em 2026-05-01

Implementado neste corte:
- `connect -> auth_ok`
- `connect -> auth_fail`
- `mutation -> first_emit` para:
  - `open-comanda`
  - `add-comanda-item`
  - `add-comanda-items`
  - `replace-comanda`
  - `assign-comanda`
  - `update-comanda-status`
  - `create-comanda-payment`
  - `update-kitchen-item-status`
  - `close-comanda`
  - `open-cash-session`
  - `create-cash-movement`
  - `close-cash-session`
  - `close-cash-closure`
- `publish_duration`
- `payload_bytes`
- `workspace_listener_count`
- `global_listener_count`
- `dispatch_targets`
- `socket_room_size`
- `closeComanda_duration`
- `recalculateCashSession_duration`
- `auditLog_duration`
- `cache_hit`
- `cache_miss`
- `negative_cache_hit`
- `active_socket_instances`
- `listener_count`
- `event_receive -> patch_applied`
- `patch_applied -> paint`
- `time_to_fresh_baseline_after_reconnect`
- `events_out_of_order` com heurística de `createdAt` por entidade
- `events_dropped` com heurística de descarte local por snapshot não aplicável

### Servidor

Medir:
- `connect -> auth_ok`
- `connect -> auth_fail`
- `mutation -> first_emit`
- `publish_duration`
- `payload_bytes`
- `fanout_count`
- `room_size`
- `closeComanda_duration`
- `recalculateCashSession_duration`
- `auditLog_duration`
- `cache_hit`
- `cache_miss`
- `negative_cache_hit`

### Cliente

Medir:
- `active_socket_instances`
- `listener_count`
- `event_receive -> patch_applied`
- `patch_applied -> paint`
- `reconcile_scheduled`
- `reconcile_merged`
- `reconcile_settled`
- `events_out_of_order`
- `events_dropped`
- `time_to_fresh_baseline_after_reconnect`

### Arquivos-alvo

- `apps/api/src/modules/operations-realtime/operations-realtime.gateway.ts`
- `apps/api/src/modules/operations-realtime/operations-realtime.service.ts`
- `apps/api/src/modules/auth/auth-session.service.ts`
- `apps/api/src/modules/operations/comanda.service.ts`
- `apps/api/src/modules/operations/cash-session.service.ts`
- `apps/web/components/operations/hooks/use-operations-socket.ts`
- `apps/web/components/operations/use-operations-realtime.ts`
- `apps/web/lib/operations/operations-performance-diagnostics.ts`

### Testes/smokes

- login owner/staff
- abrir comanda
- adicionar item
- cozinha `QUEUED -> IN_PREPARATION -> READY`
- fechar comanda
- logout/revogação com socket aberto
- reconnect após queda

### Rollback

- métricas são aditivas
- se causarem ruído, desativar emissão/flush por flag

## Wave 2 — Correções seguras sem mudar contrato principal

### Meta

Eliminar bugs confirmados sem redesenhar o protocolo inteiro.

### Status local em 2026-05-01

Implementado neste corte:
- disconnect explícito de sockets realtime por:
  - logout
  - revogação de sessões de employee
  - reset de senha com invalidação de sessões
- `negative cache` curto no auth path para token:
  - ausente
  - revogado
  - expirado
  - inativo
  - órfão
- rate limit básico e fail-open para churn de conexão realtime no handshake
- tratamento de `operations.error` no cliente com feedback explícito
- política explícita de `visibilitychange` / `pageshow` / `online` para pedir refresh controlado do baseline
- `useOfflineDrain` do staff estabilizado para não reexecutar apenas por rerender conectado
- queries mobile cobertas pelo refresh central deixaram de usar `refetchOnReconnect` duplicado:
  - owner: `operations`, `orders`, `kitchen`, `summary`, `finance`
  - staff: `operations`, `kitchen`

Ainda pendente nesta wave:
- smoke real de reconnect/mobile em produção após deploy deste corte

### Entradas

1. disconnect explícito por logout/revogação
2. tratar `operations.error` no cliente
3. `negative cache` curto para token inválido
4. rate limit básico por churn de conexão
5. corrigir `useOfflineDrain`
6. evitar refresh duplicado no reconnect mobile

### Arquivos-alvo

- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/auth/auth-session.service.ts`
- `apps/api/src/modules/operations-realtime/operations-realtime.gateway.ts`
- `apps/api/src/modules/operations-realtime/operations-realtime.socket-auth.ts`
- `apps/api/src/common/services/cache.service.ts`
- `apps/web/components/operations/hooks/use-operations-socket.ts`
- `apps/web/components/staff-mobile/use-staff-mobile-shell-realtime.ts`
- `apps/web/components/staff-mobile/use-staff-mobile-shell-controller.ts`
- `apps/web/components/owner-mobile/use-owner-mobile-shell-queries.ts`
- `apps/web/components/staff-mobile/use-staff-mobile-shell-queries.ts`

### Critério de saída

- sessão revogada derruba socket
- token inválido não martela banco indefinidamente
- drain staff não reexecuta em todo render conectado
- reconnect mobile não duplica recovery sem necessidade

### Rollback

- manter caminho de reconnect baseline atual
- manter auth path atual por trás do novo controle

## Wave 3 — Topologia de canais e autorização

### Meta

Reduzir ruído e exposição dentro do workspace.

### Status local em 2026-05-01

Implementado neste corte:
- novas rooms server-side adicionadas em paralelo:
  - `workspace:{id}:kitchen`
  - `workspace:{id}:cash`
  - `workspace:{id}:mesa`
  - `workspace:{id}:employee:{employeeId}`
- regras de join no handshake:
  - OWNER entra em `workspace`, `kitchen`, `mesa`, `cash`
  - STAFF entra em `workspace`, `kitchen`, `mesa` e `employee`
- roteamento Socket.IO por domínio:
  - `cash.*` e `cash.closure.updated` -> `workspace:{id}:cash`
  - `kitchen.item.*` -> `workspace:{id}:kitchen`
  - `mesa.upserted` -> `workspace:{id}:mesa`
  - `comanda.*` permanece em `workspace:{id}` por compatibilidade

Ainda não feito nesta wave:
- remover a room legada `workspace:{id}`
- migrar `comanda.*` para segmentação mais fina
- substituir `subscribeAll()` por barramento tenant-aware
- smoke real em produção após deploy deste corte

### Estratégia

Adicionar rooms novas em paralelo:
- `workspace:{id}`
- `workspace:{id}:kitchen`
- `workspace:{id}:cash`
- `workspace:{id}:mesa`
- `workspace:{id}:employee:{employeeId}`

### Regra de autorização

- OWNER entra nos canais financeiros
- STAFF entra apenas nos canais operacionais necessários

### Arquivos-alvo

- `apps/api/src/modules/operations-realtime/operations-realtime.gateway.ts`
- `apps/api/src/modules/operations-realtime/operations-realtime.service.ts`
- `apps/api/src/modules/operations-realtime/operations-realtime.types.ts`
- publishers em `apps/api/src/modules/operations/*realtime*.ts`
- `apps/web/components/operations/use-operations-realtime.ts`

### Não fazer nesta wave

- remover a room antiga imediatamente
- remover `comanda.updated`
- remover `subscribeAll()` sem substituto

### Critério de saída

- STAFF não recebe payload financeiro sensível
- fan-out médio por evento cai
- consumers críticos seguem funcionando com a room antiga ainda disponível

### Rollback

- fallback completo para `workspace:{id}` única

## Wave 4 — Consistência de estado

### Meta

Matar `ghost create`, `ghost item` e regressão por ordem.

### Entradas

1. `clientMutationId` ou `optimisticId`
2. `entityVersion` ou `sequence`
3. descarte explícito de evento velho
4. merge do evento real com entidade otimista
5. baseline inicial mais confiável para entidade ausente

### Arquivos-alvo

- `apps/web/lib/operations/operations-optimistic.ts`
- `apps/web/lib/operations/operations-realtime-patching.ts`
- `apps/web/lib/operations/operations-realtime-snapshot-helpers.ts`
- `apps/web/lib/operations/operations-realtime-comanda.mapper.ts`
- `apps/web/lib/operations/operations-realtime-kitchen.patchers.ts`
- `apps/api/src/modules/operations-realtime/operations-realtime.types.ts`
- `apps/api/src/modules/operations/comanda-realtime-publish.utils.ts`

### Critério de saída

- comanda otimista converge para a real
- item otimista converge para o item real
- evento atrasado não regrede estado
- reconnect não depende só de sorte + refetch

### Rollback

- manter fallback de invalidate/refetch enquanto o novo protocolo amadurece

## Wave 5 — Hot path backend

### Meta

Publicar mais cedo.

### Entradas

1. quebrar o critical section de `closeComanda`
2. mover side-effects pesados para outbox/job
3. reduzir recálculos full-scan
4. tirar auditoria síncrona do caminho quente quando possível
5. reduzir invalidação Redis por `SCAN`

### Arquivos-alvo

- `apps/api/src/modules/operations/comanda.service.ts`
- `apps/api/src/modules/operations/operations-cash.utils.ts`
- `apps/api/src/modules/operations/operations-auth.utils.ts`
- `apps/api/src/modules/operations/comanda-kitchen.utils.ts`
- `apps/api/src/modules/monitoring/audit-log.service.ts`
- `apps/api/src/modules/operations/operations-domain.utils.ts`
- `apps/api/src/common/services/cache.service.ts`

### Critério de saída

- `mutation -> first_emit` cai nos fluxos críticos
- `closeComanda_duration` cai
- carga de pico deixa de degradar tanto o publish

### Rollback

- manter side-effects no caminho antigo sob flag
- promover o novo fluxo por grupo de operações

## Smokes obrigatórios por wave

### Segurança e sessão

- login owner
- login staff
- logout com socket aberto
- revogação de sessão com socket aberto
- token inválido

### Operação

- abrir comanda
- adicionar item
- item entra na cozinha
- mudar status de item
- fechar comanda
- abrir/atualizar caixa

### Mobile

- app em foreground
- app volta do background
- troca `wifi -> 4G`
- tela bloqueada/desbloqueada
- reconnect após perda de rede

### Consistência

- optimistic open -> real open
- optimistic item -> real item
- evento atrasado
- reconnect com gap

## O que não remover sem prova

1. `subscribeAll()`
2. room `workspace:{id}`
3. `comanda.updated`
4. fallback de reconcile/refetch
5. `dashboard-wireframe`
6. payload redundante aparentemente “sobrando”, sem mapear consumers

## Critérios de aceite globais

1. menor fan-out por evento
2. menor tempo `mutation -> first_emit`
3. nenhum STAFF recebendo dado financeiro owner-level
4. zero `ghost create` reproduzível no smoke
5. zero `ghost item` reproduzível no smoke
6. reconnect mobile sem churn óbvio
7. socket revogado derrubado de forma explícita

## Próxima execução recomendada

1. fechar Wave 1
2. entrar em Wave 2
3. só depois atacar Wave 3

Se inverter isso, o risco de “limpeza por feeling” sobe demais.
