# Realtime Wave 0 Inventory — 2026-05-01

## Objetivo

Congelar o estado atual da malha realtime antes de qualquer intervenção estrutural.

Este documento existe para impedir:

- remoção por suposição
- refactor sem prova de uso
- troca de contrato sem saber quem consome
- limpeza de “legado” que ainda sustenta produção, QA ou recovery

## Pipeline atual

### Cliente -> transporte -> gateway -> broker -> cliente

1. O cliente cria o socket em `apps/web/components/operations/hooks/use-operations-socket.ts`.
2. A conexão vai para o namespace `/operations` definido em `apps/api/src/modules/operations-realtime/operations-realtime.gateway.ts`.
3. A autenticação roda em `handleConnection()` e delega para `authenticateOperationsRealtimeSocket()` em `apps/api/src/modules/operations-realtime/operations-realtime.socket-auth.ts`.
4. O socket autenticado entra em uma única room por workspace: `workspace:{workspaceOwnerUserId}`.
5. O backend publica por `OperationsRealtimeService.publishWorkspaceEvent()` em:
   - bus do workspace
   - bus global `__all__`
   - namespace room do Socket.IO
6. O cliente recebe o envelope, tenta aplicar patch local e, se necessário, agenda reconcile/refetch.

## Namespace e rooms atuais

### Namespace

- `/operations`

### Rooms confirmadas

- `workspace:{workspaceOwnerUserId}`

### Não encontrei rooms adicionais confirmadas

Não há, na árvore auditada, `join()` adicional para:

- cozinha
- caixa
- mesa
- summary
- employee
- comanda específica

## Eventos confirmados no contrato operacional

Backend e frontend escutam/publicam estes 9 eventos de domínio:

1. `cash.opened`
2. `cash.updated`
3. `comanda.opened`
4. `comanda.updated`
5. `comanda.closed`
6. `cash.closure.updated`
7. `kitchen.item.queued`
8. `kitchen.item.updated`
9. `mesa.upserted`

Evento de transporte fora da lista tipada:

- `operations.error`

## Publishers confirmados

### Comanda

Arquivo principal:

- `apps/api/src/modules/operations/comanda.service.ts`

Helpers de publish:

- `apps/api/src/modules/operations/comanda-realtime-publish.utils.ts`

Fluxos confirmados:

- abrir comanda
- adicionar item
- adicionar lote de itens
- editar/substituir comanda
- desconto/taxa
- status de comanda
- status de item da cozinha
- fechar comanda

### Caixa

Arquivo principal:

- `apps/api/src/modules/operations/cash-session.service.ts`

Helpers de publish:

- `apps/api/src/modules/operations/cash-realtime-publish.utils.ts`

### Mesa

Arquivo principal:

- `apps/api/src/modules/operations/operations.service.ts`

## Consumers confirmados

### Cliente web/mobile

Hook base:

- `apps/web/components/operations/use-operations-realtime.ts`

Socket hook:

- `apps/web/components/operations/hooks/use-operations-socket.ts`

Patchers:

- `apps/web/lib/operations/operations-realtime-patching.ts`
- `apps/web/lib/operations/operations-realtime-live.patchers.ts`
- `apps/web/lib/operations/operations-realtime-kitchen.patchers.ts`
- `apps/web/lib/operations/operations-realtime-comanda.mapper.ts`

### Backend interno

Consumer global confirmado:

- `apps/api/src/modules/notifications/notifications.service.ts`

Ponto de acoplamento:

- `OperationsRealtimeService.subscribeAll()`

## Cruzamentos WS <-> REST/HTTP

### Baselines HTTP usados como cura de consistência

- `fetchOperationsLive`
- `fetchOperationsKitchen`
- `fetchOperationsSummary`
- `fetchOrders`
- `fetchFinanceSummary`

### Reconnect recovery atual

Ao reconectar, o cliente invalida baseline e depende de HTTP para se realinhar.

Arquivos:

- `apps/web/components/operations/hooks/use-operations-socket.ts`
- `apps/web/components/operations/use-operations-realtime.ts`
- `apps/web/lib/operations/operations-query.ts`

## Superfícies que montam realtime hoje

### Produção/rotas reais

- Owner mobile:
  - `apps/web/components/owner-mobile/use-owner-mobile-shell-controller.ts`
- Staff mobile:
  - `apps/web/components/staff-mobile/use-staff-mobile-shell-realtime.ts`
- Shell desktop/dashboard autenticado:
  - `apps/web/components/dashboard/dashboard-shell.tsx`

### Rota especial que pode duplicar socket

- `apps/web/app/dashboard-wireframe/page.tsx`

Observação:

- `apps/web/app/dashboard/page.tsx` hoje redireciona e não monta o shell diretamente.

## Fluxos críticos que dependem de realtime

1. Abertura de comanda
2. Adição de item
3. Mudança de status da cozinha
4. Mudança de status da comanda
5. Fechamento de comanda
6. Abertura/atualização de caixa
7. Atualização de mesa
8. Notificações derivadas para Telegram

## Achados Wave 0 que bloqueiam remoção “no escuro”

### Não remover ainda

1. `subscribeAll()`
   - ainda há consumer real em `NotificationsService`
2. room `workspace:{workspaceOwnerUserId}`
   - ainda é o único canal funcional confirmado
3. `comanda.updated`
   - apesar de ruim, ainda sustenta múltiplos fluxos
4. `cash.updated`
   - ainda alimenta patch parcial no cliente
5. `kitchen.item.*`
   - continuam sendo fonte de verdade para cozinha
6. `dashboard-wireframe`
   - só remover depois de provar desuso operacional/QA
7. fallback de refetch/reconcile
   - só reduzir depois de existir protocolo melhor de ordering/correlação

### Não confundir com “seguro para remover”

- duplicação de socket no `dashboard-wireframe` é real, mas contextual
- `paymentMethod: null` em `comanda.closed` é dívida de contrato, não autorização automática para remover o campo
- `perMessageDeflate: false` não é o gargalo principal; mudar isso agora seria desvio

## Baseline operacional disponível

Artefatos já existentes:

- `.cache/perf/operations-status-notification-smoke-20260501.json`
- `.cache/perf/operations-mobile-browser-smoke-20260501.json`

Leitura correta desses smokes:

- eles não provaram storm de invalidation no observer path
- eles não eliminam os problemas de topologia, payload e consistência
- eles servem como baseline para comparar mudanças futuras

## Regra de mudança a partir daqui

Nenhum componente, evento, room, helper, fallback ou rota desta malha deve ser removido sem:

1. prova de uso ou desuso
2. mapeamento do(s) consumer(s)
3. smoke correspondente
4. rollback claro
