# Tempo Real — Desk Imperial

**Versão:** 1.0  
**Última atualização:** 2026-04-01  
**Tecnologia:** Socket.IO  
**Namespace:** `/operations-realtime`

---

## Visão geral

O sistema de tempo real do Desk Imperial permite que toda a equipe de um workspace veja o estado das comandas, caixa e mesas atualizado imediatamente, sem precisar recarregar a página.

Quando alguém abre uma comanda, muda o status ou fecha um pedido, essa mudança aparece na tela de todos os outros dispositivos conectados em menos de um segundo.

---

## Arquitetura

```
┌─────────────┐     HTTP REST        ┌─────────────────┐
│   Frontend  │ ──────────────────── │   API (NestJS)  │
│  (Next.js)  │                      │                 │
│             │     Socket.IO        │  operations-    │
│             │ ════════════════════ │  realtime       │
│             │  /operations-realtime│  gateway        │
└─────────────┘                      └────────┬────────┘
                                              │
                                         Redis Pub/Sub
                                              │
                                     (outras instâncias
                                      se houver scale)
```

**Fluxo de uma mutação:**

```
1. Frontend faz requisição REST (ex: PATCH /comanda/:id/status)
2. API processa a mutação e persiste no banco
3. API publica evento no canal do workspace via Redis Pub/Sub
4. Gateway Socket.IO recebe o evento e emite para todos os clientes do workspace
5. Frontend recebe o evento e aplica patch otimista no estado local
   → Sem recarregar o snapshot completo
   → Sem fazer nova requisição HTTP
```

---

## Autenticação da conexão

A conexão Socket.IO **exige sessão válida**. Conexões sem sessão são rejeitadas antes de qualquer evento ser processado.

**Fluxo de autenticação:**

```
1. Cliente tenta conectar ao namespace /operations-realtime
2. Gateway verifica o cookie de sessão na requisição de handshake
3. Se sessão inválida ou expirada → desconecta imediatamente
4. Se sessão válida → associa socket ao workspace (companyOwnerId)
5. Cliente entra na sala do workspace
```

**Isolamento:** cada workspace tem sua própria sala Socket.IO. Um evento emitido para o workspace A nunca chega ao workspace B.

---

## Eventos

### Eventos emitidos pelo servidor → cliente

| Evento             | Quando é emitido                          | Payload                      |
| ------------------ | ----------------------------------------- | ---------------------------- |
| `comanda:created`  | Nova comanda aberta                       | dados completos da comanda   |
| `comanda:updated`  | Status, itens ou dados da comanda mudaram | dados atualizados            |
| `comanda:closed`   | Comanda fechada                           | id e timestamp de fechamento |
| `cash:updated`     | Caixa aberto ou fechado                   | dados da sessão de caixa     |
| `operations:patch` | Patch incremental do snapshot             | diff com as mudanças         |

### Eventos emitidos pelo cliente → servidor

O frontend **não emite eventos** para mudar estado. Toda mutação passa pela API REST com validação CSRF.

O Socket.IO no Desk Imperial é **unidirecional do servidor para o cliente** — o servidor publica, o cliente consome.

---

## Comportamento do frontend

### Conexão

O hook `use-operations-realtime.ts` gerencia o ciclo de vida da conexão:

```
1. Monta quando o usuário está autenticado e no painel
2. Conecta ao namespace /operations-realtime com cookie de sessão
3. Registra listeners para os eventos relevantes
4. Desmonta e desconecta quando o componente sai da tela
```

### Patch otimista

Ao receber um evento, o frontend atualiza o estado local via `setQueryData` do TanStack Query **sem invalidar a query** (sem nova requisição HTTP):

```typescript
// Exemplo conceitual — não é o código real
queryClient.setQueryData(OPERATIONS_LIVE_KEY, (prev) => {
  return applyPatch(prev, event.payload)
})
```

Isso garante que a tela atualize em milissegundos, com zero latência de rede adicional.

### Cache e TTL

O snapshot ao vivo tem TTL de 30 segundos no Redis. Quando o cache expira:

- A próxima requisição HTTP busca o snapshot completo do banco
- Enquanto o cache é válido, atualizações chegam via Socket.IO

---

## Redis Pub/Sub

Em produção, o Desk Imperial usa o Redis como adapter do Socket.IO. Isso permite que múltiplas instâncias da API se comuniquem:

```
Instância A (recebe mutação)
    → publica evento no Redis channel do workspace

Instância B (tem clientes conectados)
    → recebe evento do Redis
    → emite para os clientes Socket.IO conectados
```

**Configuração:**

- `REDIS_URL` é usado tanto para cache quanto para Pub/Sub
- Se Redis não estiver disponível, Socket.IO funciona apenas em uma instância (sem sincronização entre instâncias)

---

## Garantias e limitações

### O que é garantido

- Isolamento: eventos de um workspace nunca chegam a outro
- Autenticação: conexões sem sessão válida são rejeitadas
- Consistência eventual: se o cliente perde a conexão, ao reconectar busca o snapshot completo via HTTP

### O que não é garantido

- **Entrega exatamente uma vez:** se o cliente estiver offline no momento do evento, ele não recebe o evento histórico. A reconciliação acontece via HTTP no próximo `refetch`.
- **Ordem absoluta dos eventos:** em cenários de alta concorrência, a ordem de chegada dos eventos pode variar. O design assume que o estado final é sempre reconciliável via snapshot HTTP.

---

## Diagnóstico

**Como verificar se o Socket.IO está funcionando:**

1. Acesse `GET /api/health` — verifica se Redis está acessível
2. Abra o painel em dois dispositivos com o mesmo usuário
3. Abra uma comanda em um dispositivo — deve aparecer no outro em menos de 1 segundo

**Problemas comuns:**

| Sintoma                                     | Causa provável                | Solução                                         |
| ------------------------------------------- | ----------------------------- | ----------------------------------------------- |
| Atualizações não chegam em tempo real       | Redis offline                 | Verificar `REDIS_URL` e status do Redis         |
| Conexão cai imediatamente                   | Sessão expirada               | Verificar TTL da sessão e cookies               |
| Atualizações chegam apenas em uma instância | Redis Pub/Sub não configurado | Verificar `REDIS_URL` nas variáveis de ambiente |
| Eventos de outro workspace chegando         | Bug crítico                   | Abrir issue imediatamente                       |
