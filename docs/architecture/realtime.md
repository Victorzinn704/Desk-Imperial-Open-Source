# Tempo Real — Desk Imperial

**Versão:** 1.1  
**Última atualização:** 2026-05-01  
**Tecnologia:** Socket.IO  
**Namespace:** `/operations`

> **Atualização 2026-05-01:** auditoria + reconstrução Fase 0+1+2 entregue (C2, C5, C6, C4, C1 + event loop monitor). Estado pós-reconstrução, decisões de design e instruções para próximos agentes em [docs/operations/realtime-reconstruction-2026-05-01.md](../operations/realtime-reconstruction-2026-05-01.md). Os comportamentos descritos abaixo refletem o pipeline pós-reconstrução.

---

## Visão geral

O realtime do Desk Imperial sincroniza comandas, cozinha, caixa e mesas entre as superfícies web e mobile sem recarga manual.

O modelo atual combina:

- mutação HTTP como fonte de verdade;
- emissão de envelopes Socket.IO do servidor para o cliente;
- patch local no cache do frontend;
- refresh controlado quando o patch não basta ou quando a sessão volta de reconnect.

Este documento descreve o comportamento atual da malha. O backlog de recuperação e redução de ruído fica em [../waves/realtime-recovery-plan-2026-05-01.md](../waves/realtime-recovery-plan-2026-05-01.md).

---

## Pipeline atual

```text
cliente -> HTTP /api/v1/operations/* -> service de dominio -> publish realtime
        -> namespace /operations -> rooms do workspace -> patch local / reconcile
```

Fluxo típico de mutação:

1. o cliente envia uma mutação HTTP autenticada, por exemplo `POST /api/v1/operations/comandas/:comandaId/status`;
2. a API valida sessão, CSRF e regra de negócio;
3. após persistir o estado, a API publica um envelope realtime;
4. o gateway emite o envelope nas rooms compatíveis com aquele domínio;
5. o frontend aplica patch local e, se necessário, agenda refresh do baseline.

---

## Namespace, transport e ciclo de vida

### Namespace

- namespace atual: `/operations`

### Transport

- servidor aceita `websocket` e `polling`
- cliente web atual tenta `polling` + `websocket`, com upgrade habilitado e jitter de reconexao

### Heartbeat

- `pingInterval`: `25000`
- `pingTimeout`: `20000`

### Reconexão e retomada

No cliente:

- `reconnectionDelay`: `2000`
- `reconnectionDelayMax`: `10000`
- ao voltar para foreground ou recuperar conectividade, o cliente pede refresh controlado do baseline
- eventos tratados explicitamente:
  - `visibilitychange`
  - `pageshow`
  - `online`
  - `operations.error`

---

## Autenticação da conexão

A conexão realtime exige sessão válida.

O gateway aceita autenticação via:

- cookie de sessão;
- `Authorization: Bearer ...`;
- `X-Access-Token`;
- campos equivalentes no handshake do Socket.IO.

Fluxo atual:

1. cliente tenta conectar em `/operations`;
2. gateway valida origem permitida;
3. aplica rate limit básico de churn de conexão;
4. valida a sessão;
5. se falhar, emite `operations.error` e desconecta;
6. se aceitar, associa o socket à sessão e às rooms do workspace.

---

## Topologia de rooms

A malha já não trabalha só com uma room única.

Rooms atuais:

- `workspace:{workspaceOwnerUserId}`
- `workspace:{workspaceOwnerUserId}:kitchen`
- `workspace:{workspaceOwnerUserId}:cash`
- `workspace:{workspaceOwnerUserId}:mesa`
- `workspace:{workspaceOwnerUserId}:employee:{employeeId}`

Assinatura atual por role:

- `OWNER`
  - `workspace`
  - `kitchen`
  - `mesa`
  - `cash`
- `STAFF`
  - `workspace`
  - `kitchen`
  - `mesa`
  - `employee:{employeeId}` quando aplicável

Objetivo prático:

- reduzir fan-out desnecessário;
- impedir que STAFF receba eventos financeiros;
- manter compatibilidade de `comanda.*` no canal amplo enquanto a malha ainda é refinada.

---

## Eventos atuais

### Servidor -> cliente

| Evento                 | Uso principal                            | Canal atual |
| ---------------------- | ---------------------------------------- | ----------- |
| `cash.opened`          | abertura de caixa                        | `cash`      |
| `cash.updated`         | atualização de sessão de caixa           | `cash`      |
| `cash.closure.updated` | consolidação/fechamento de caixa         | `cash`      |
| `comanda.opened`       | nova comanda                             | `workspace` |
| `comanda.updated`      | mudança de status ou conteúdo da comanda | `workspace` |
| `comanda.closed`       | fechamento de comanda                    | `workspace` |
| `kitchen.item.queued`  | entrada de item na cozinha               | `kitchen`   |
| `kitchen.item.updated` | avanço de item na cozinha                | `kitchen`   |
| `mesa.upserted`        | mudança de mesa/planta operacional       | `mesa`      |

### Cliente -> servidor

O cliente não emite eventos de mutação operacional para alterar estado.

Toda mudança de estado continua passando por HTTP autenticado + CSRF.  
O Socket.IO é usado como trilha de propagação do servidor para os clientes.

---

## Payloads e autoridade de estado

O envelope atual inclui:

- `id`
- `event`
- `workspaceOwnerUserId`
- `actorUserId`
- `actorRole`
- `createdAt`
- `payload`

O payload ainda é híbrido:

- alguns eventos são deltas pequenos;
- outros carregam dados mais largos, como `cashSession` ou `kitchenItems`;
- `comanda.updated` ainda é um evento coringa e por isso continua sendo ponto de atenção.

Em outras palavras:

- a malha atual funciona;
- mas o contrato ainda não é o mais enxuto possível;
- o backlog de deltas, ordering e correlator permanece aberto.

---

## Comportamento do frontend

O hook base do cliente:

- monta a conexão quando a superfície operacional está ativa;
- registra listeners de todos os eventos operacionais conhecidos;
- desconecta com cleanup explícito ao desmontar;
- trata `operations.error` como falha semântica de sessão, não só queda de socket.

Modelo atual de sincronização:

1. recebe envelope;
2. tenta aplicar patch local sobre o cache;
3. registra métricas de processamento;
4. se o patch não fecha o estado, agenda reconcile/invalidate controlado.

O sistema já tem instrumentação para:

- lifecycle do socket;
- envelope processado;
- reconcile agendado/mesclado/settled;
- refresh após reconnect.

---

## Redis adapter e escala horizontal

Quando `REDIS_URL` está disponível:

- o gateway configura o `@socket.io/redis-adapter`;
- múltiplas instâncias conseguem propagar eventos entre si.

Quando Redis não está disponível:

- o gateway cai para adapter em memória;
- o realtime continua funcional em instância única;
- a escala horizontal deixa de propagar eventos entre nós.
- em `production`, o bootstrap do gateway falha se nenhum `REDIS_URL` estiver configurado, para evitar cluster parcial e perda silenciosa de propagacao entre instancias.

O runtime atual grava telemetria explícita sobre esse estado.

---

## Garantias e limitações atuais

### Garantido hoje

- autenticação de sessão no handshake;
- isolamento por workspace;
- rooms segmentadas por domínio operacional;
- refresh controlado após reconnect/foreground;
- fallback para baseline HTTP quando o patch não basta.

### Não garantido hoje

- replay de evento perdido;
- ordering absoluto entre eventos concorrentes;
- entrega exatamente uma vez;
- correlator completo entre mutação otimista e evento real em toda a malha.

Por isso a consistência atual é:

- forte na mutação HTTP;
- eventual no cliente reconnectado;
- ainda dependente de reconcile em alguns fluxos.

---

## Diagnóstico operacional

Validação mínima:

1. `GET /api/v1/health`
2. abrir a mesma superfície operacional em duas sessões do mesmo workspace
3. disparar:
   - abertura de comanda
   - atualização de item de cozinha
   - fechamento de comanda
4. confirmar propagação nas telas corretas

Problemas comuns:

| Sintoma                                          | Causa provável                                           | Ação recomendada                                                  |
| ------------------------------------------------ | -------------------------------------------------------- | ----------------------------------------------------------------- |
| conexão cai logo ao abrir a tela                 | sessão inválida, origem rejeitada ou rate limit de churn | revisar cookies, origem e logs do gateway                         |
| staff recebe dado financeiro                     | regressão de room scoping                                | auditar `resolveOperationsRealtimeEventChannels` e joins por role |
| reconnect volta “conectado” mas com estado velho | patch não fechou o estado e baseline não refrescou       | revisar `onReconnect` e reconcile                                 |
| funciona em instância única e falha em scale     | Redis adapter ausente ou degradado                       | validar `REDIS_URL` e telemetria do adapter                       |
