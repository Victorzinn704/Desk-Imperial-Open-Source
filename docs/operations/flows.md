# Fluxos de Operacao — Desk Imperial

**Versao:** 1.2.0  
**Ultima atualizacao:** 2026-05-01  
**Status:** Fonte operacional atual

---

## Visao geral

Este documento descreve os fluxos operacionais principais do Desk Imperial com base no runtime atual de `apps/api` e `apps/web`.

Todos os exemplos HTTP abaixo usam o prefixo publico atual `/api/v1`.

Princípios que governam estes fluxos:

- sessao e identidade sao baseadas em cookie HttpOnly + guards de sessao
- mutacoes autenticadas exigem CSRF
- STAFF opera no escopo do workspace do owner, com restricoes de permissao
- realtime acelera a tela, mas o baseline continua vindo do snapshot HTTP quando necessario

---

## 1. Empresa, owner e funcionarios

### 1.1 Modelo de relacao

```text
User (OWNER)
├── companyOwnerId: null
├── role: OWNER
├── workspaceMembers: User[] (contas STAFF)
└── employees: Employee[] (cadastros operacionais)

User (STAFF)
├── companyOwnerId: userId do OWNER
├── role: STAFF
└── employeeAccount: Employee | null

Employee
├── userId: userId do OWNER (workspace owner)
├── loginUserId: userId STAFF sintetico
├── employeeCode: codigo unico por workspace
└── displayName: nome operacional
```

### 1.2 Fluxo: cadastro de funcionario

```text
OWNER
  -> POST /api/v1/employees
     { displayName: "Maria Silva" }
  -> SessionGuard + CsrfGuard + AdminPinGuard
  -> backend:
       1. valida role OWNER
       2. gera employeeCode e senha temporaria
       3. cria Employee
       4. garante User STAFF vinculado
       5. grava audit log
  -> response:
       {
         employee: { id, employeeCode, displayName, ... },
         credentials: { employeeCode, temporaryPassword }
       }
```

### 1.3 Fluxo: emissao ou rotacao de acesso

```text
OWNER
  -> POST /api/v1/employees/:employeeId/access
     ou PATCH /api/v1/employees/:employeeId/access/password
  -> AdminPinGuard
  -> backend emite novas credenciais e sincroniza o login STAFF
```

### 1.4 Regras de negocio

| Regra | Estado atual |
| --- | --- |
| Apenas OWNER gerencia equipe | Confirmado |
| Criacao exige validacao administrativa quando houver PIN | Confirmado |
| STAFF real usa `User` vinculado ao `Employee` | Confirmado |
| Desativar/revogar acesso invalida ou refresca sessao | Confirmado |

---

## 2. Comandas, caixa e mesas

### 2.1 Modelo operacional resumido

```text
Comanda
├── companyOwnerId / workspaceOwnerUserId
├── openedByUserId
├── mesaId (opcional)
├── currentEmployeeId (opcional)
├── cashSessionId (opcional)
├── status: OPEN | IN_PREPARATION | READY | CLOSED | CANCELLED
├── items: ComandaItem[]
├── customerName / customerDocument
├── participantCount
├── discountAmount
├── serviceFeeAmount
└── notes

Mesa
├── tableLabel
├── capacity
├── section
├── status
└── planta / coordenadas
```

### 2.2 Fluxo: abertura de comanda

```text
OWNER ou STAFF
  -> POST /api/v1/operations/comandas
     {
       tableLabel,
       customerName?,
       participantCount?,
       items?,
       employeeId?,
       cashSessionId?,
       mesaId?
     }
  -> SessionGuard + CsrfGuard
  -> backend valida:
       1. permissao do ator
       2. mesa / caixa / dia operacional
       3. itens iniciais e ajustes monetarios
  -> transacao:
       1. cria Comanda
       2. cria itens iniciais, se houver
       3. vincula mesa/funcionario/caixa
       4. grava audit log
       5. publica realtime (`comanda.opened`, cozinha/mesa quando couber)
```

### 2.3 Fluxo: adicionar itens

```text
POST /api/v1/operations/comandas/:comandaId/items
POST /api/v1/operations/comandas/:comandaId/items/batch

validacoes:
- comanda pertence ao workspace
- comanda ainda esta aberta
- produto existe e esta ativo

efeitos:
- cria item(ns)
- recalcula totais
- pode enfileirar item para cozinha
- publica `comanda.updated` e `kitchen.item.queued` quando necessario
```

### 2.4 Fluxo: substituir ou reatribuir comanda

```text
PATCH /api/v1/operations/comandas/:comandaId
POST  /api/v1/operations/comandas/:comandaId/assign

uso:
- corrigir dados da comanda
- trocar itens por substituicao total
- reatribuir para outro funcionario
```

### 2.5 Fluxo: pagamento e fechamento

```text
POST /api/v1/operations/comandas/:comandaId/payments
POST /api/v1/operations/comandas/:comandaId/close

validacoes:
- comanda aberta
- caixa aberto para registrar lancamento
- desconto/taxa validos
- se o owner tiver PIN configurado, a prova administrativa precisa estar valida

efeitos:
- registra pagamento(s)
- recalcula totais finais
- muda status para CLOSED
- atualiza caixa/closure
- libera mesa
- publica `comanda.closed`, `cash.updated`, `cash.closure.updated`, `mesa.upserted`
```

### 2.6 Fluxo: caixa

```text
POST /api/v1/operations/cash-sessions
POST /api/v1/operations/cash-sessions/:cashSessionId/movements
POST /api/v1/operations/cash-sessions/:cashSessionId/close
POST /api/v1/operations/closures/close

efeitos:
- abertura de caixa -> `cash.opened`
- movimento ou fechamento -> `cash.updated`
- fechamento de closure -> `cash.closure.updated`
```

### 2.7 Estados da comanda

```text
OPEN -> IN_PREPARATION -> READY -> CLOSED
  \-------------------------------> CANCELLED
```

`CANCELLED` continua existindo no dominio, mas os fluxos mais quentes hoje passam por `OPEN`, `IN_PREPARATION`, `READY` e `CLOSED`.

---

## 3. Pedidos e vendas

### 3.1 Fluxo: criacao de pedido

```text
OWNER ou STAFF
  -> POST /api/v1/orders
     {
       items: [{ productId, quantity, unitPrice? }],
       customerName,
       buyerType,
       buyerDocument,
       buyerCity,
       sellerEmployeeId?,
       channel?,
       currency?
     }
  -> SessionGuard + CsrfGuard
  -> backend valida:
       1. produtos ativos
       2. estoque disponivel
       3. documento e dados do comprador
       4. vendedor ativo, se informado
       5. desconto implicito por `unitPrice`, quando houver
  -> transacao:
       1. decrementa estoque
       2. calcula receita/custo/lucro
       3. aplica geocodificacao
       4. cria `Order` + `OrderItems`
       5. grava audit log
```

### 3.2 Desconto em pedido

O fluxo atual nao trabalha com um campo unico `discountAmount` no request. O desconto aparece quando o item entra com `unitPrice` abaixo do preco base.

Regra vigente:

- STAFF pode aplicar desconto ate o teto permitido
- acima do teto, o owner precisa ter PIN configurado e a prova administrativa precisa estar valida
- a prova administrativa vem do cookie HttpOnly emitido por `/api/v1/admin/verify-pin`

### 3.3 Cancelamento de pedido

```text
POST /api/v1/orders/:orderId/cancel

validacoes:
- pedido pertence ao workspace
- pedido ainda nao esta cancelado
- cancelamento respeita a politica de permissao

efeitos:
- devolve estoque
- marca pedido como cancelado
- grava audit log
```

---

## 4. Tempo real operacional

### 4.1 Namespace e transporte

- namespace: `/operations`
- servidor: `websocket + polling`
- cliente web atual: `websocket` only, `upgrade: false`
- autenticacao: cookie de sessao, `Authorization`, `X-Access-Token` ou `handshake.auth.token`

### 4.2 Rooms atuais

```text
workspace:{workspaceOwnerUserId}
workspace:{workspaceOwnerUserId}:kitchen
workspace:{workspaceOwnerUserId}:cash
workspace:{workspaceOwnerUserId}:mesa
workspace:{workspaceOwnerUserId}:employee:{employeeId}
```

Regras atuais:

- OWNER entra em `workspace`, `kitchen`, `mesa` e `cash`
- STAFF entra em `workspace`, `kitchen`, `mesa` e na room pessoal quando houver `employeeId`
- STAFF nao recebe `cash.*` via socket

### 4.3 Eventos atuais

```typescript
// Caixa
'cash.opened'
'cash.updated'
'cash.closure.updated'

// Comandas
'comanda.opened'
'comanda.updated'
'comanda.closed'

// Cozinha
'kitchen.item.queued'
'kitchen.item.updated'

// Mesas
'mesa.upserted'

// Erro semantico de socket
'operations.error'
```

### 4.4 Fluxo de conexao

```text
frontend
  -> io(`${NEXT_PUBLIC_API_URL}/operations`, {
       transports: ['websocket'],
       upgrade: false,
       withCredentials: true
     })
  -> gateway valida:
       1. origem
       2. rate limit de churn
       3. sessao
  -> socket entra nas rooms do ator
  -> reconnect/foreground:
       - visibilitychange
       - pageshow
       - online
       - operations.error
  -> ao reconectar, o cliente agenda refresh do baseline HTTP
```

### 4.5 Garantias e limites

- nao existe replay/cursor no protocolo atual
- nao existe garantia de exactly-once
- consistencia final depende de patch + refresh controlado
- eventos financeiros e operacionais ja estao melhor segmentados, mas `comanda.updated` ainda concentra semantica demais

---

## 5. Cache e desempenho

### 5.1 Chaves importantes

| Chave | TTL / padrao |
| --- | --- |
| `finance:summary:{userId}` | 120s |
| `products:list:{userId}:{scope}` | 300s |
| `employees:list:{userId}` | 600s |
| `orders:summary:{userId}` | 90s |
| `operations:live:{workspaceOwnerUserId}:{businessDate}:{mode}:{scope}` | 30s |
| `operations:kitchen:{workspaceOwnerUserId}:{businessDate}:{scope}` | curto, por view |
| `operations:summary:{workspaceOwnerUserId}:{businessDate}:{scope}` | curto, por view |

### 5.2 Estrategia de invalidacao

- produtos invalidam catalogo e, quando necessario, financeiro
- pedidos invalidam financeiro e resumo de pedidos
- employees invalidam a lista de equipe
- operations invalida por prefixo `live`, `kitchen` e `summary`
- realtime nao substitui invalidacao; ele reduz latencia percebida e evita refresh total em todo evento

---

## 6. Seguranca e permissoes

### 6.1 Matriz resumida

| Operacao | OWNER | STAFF |
| --- | --- | --- |
| Gerir funcionarios | ✅ | ❌ |
| Gerir produtos | ✅ | ❌ |
| Importar produtos | ✅ | ❌ |
| Abrir/editar comanda | ✅ | ✅ |
| Operar cozinha | ✅ | ✅ |
| Registrar pedido | ✅ | ✅ |
| Cancelar pedido | ✅ | restrito por politica |
| Acessar financeiro | ✅ | ❌ |
| Configurar/Admin PIN | ✅ | ❌ |

### 6.2 Fluxo do Admin PIN

```text
1. Frontend chama POST /api/v1/admin/verify-pin
2. Backend valida PIN do owner
3. Backend grava prova curta em cookie HttpOnly
4. Endpoint protegido por AdminPinGuard ou verificacao de prova aceita a operacao
5. Expirou a prova -> fluxo precisa ser repetido
```

O fluxo atual **nao** devolve JWT para o browser.

---

## 7. Auditoria

### 7.1 Eventos rastreados com mais frequencia

| Recurso | Exemplos |
| --- | --- |
| Produto | `product.created`, `product.updated`, `product.archived`, `product.restored`, `product.imported` |
| Pedido | `order.created`, `order.cancelled` |
| Funcionario | `employee.created`, `employee.updated`, `employee.access_issued`, `employee.access_revoked` |
| Comanda | `comanda.opened`, `comanda.closed`, `comanda.cancelled` |
| Auth | `auth.login.succeeded`, `auth.password-reset.requested` |
| Admin PIN | `admin-pin.verified`, `admin-pin.failed`, `admin-pin.removed` |
| Notificacoes | `telegram.linked`, `telegram.unlinked`, `notifications.preferences.updated` |

### 7.2 Estrutura resumida

```typescript
AuditLog {
  actorUserId: string
  event: string
  resource: string
  resourceId: string
  severity: 'INFO' | 'WARN' | 'ERROR'
  metadata: object
  ipAddress: string
  userAgent: string
  createdAt: string
}
```

---

## 8. Erros comuns

| Erro | HTTP | Exemplo de mensagem |
| --- | --- | --- |
| Produto nao encontrado | 404 | `Produto nao encontrado para esta conta.` |
| Estoque insuficiente | 400 | `Estoque insuficiente para X.` |
| Documento invalido | 400 | `Informe um CPF/CNPJ valido.` |
| Sem permissao | 403 | `Apenas o dono pode ...` |
| Mesa ocupada | 409 | `Essa mesa ja possui uma comanda aberta.` |
| Caixa fechado | 409 | `Abra o caixa do funcionario antes.` |
| PIN ausente/invalido | 403 | `Validacao administrativa ausente, invalida ou expirada.` |

Padrao de erro HTTP:

```json
{
  "statusCode": 400,
  "message": "Mensagem do dominio",
  "error": "Bad Request"
}
```

---

## 9. Exemplos de cliente

### 9.1 Abrir comanda

```typescript
async function openComanda(payload: OpenComandaPayload) {
  const response = await api.post('/operations/comandas', payload)
  return response.data
}
```

### 9.2 Registrar pedido

```typescript
async function createOrder(payload: CreateOrderPayload) {
  const response = await api.post('/orders', payload)
  return response.data
}
```

### 9.3 Escutar realtime operacional

```typescript
const socket = io(`${apiBaseUrl}/operations`, {
  transports: ['websocket'],
  upgrade: false,
  withCredentials: true,
})

socket.on('kitchen.item.queued', (envelope) => {
  queryClient.invalidateQueries({ queryKey: ['operations', 'kitchen'] })
})

socket.on('comanda.closed', (envelope) => {
  queryClient.invalidateQueries({ queryKey: ['operations', 'live'] })
})

socket.on('operations.error', ({ message }) => {
  toast.error(message)
})
```

---

## 10. Checklist rapido

### Antes de abrir comanda

- [ ] Sessao valida
- [ ] CSRF valido
- [ ] Caixa do funcionario aberto, se o fluxo exigir
- [ ] Mesa disponivel, se informada
- [ ] Produtos existem e estao ativos

### Antes de registrar pedido

- [ ] Produtos existem e estao ativos
- [ ] Estoque suficiente
- [ ] Documento do comprador valido
- [ ] Desconto dentro da politica ou PIN validado

### Antes de confiar no realtime apos reconnect

- [ ] Socket voltou a `connected`
- [ ] baseline HTTP foi refrescado
- [ ] `operations.error` nao foi emitido

---

**Fim do documento.**
