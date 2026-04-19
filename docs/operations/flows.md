# Fluxos de Operação - Desk Imperial

**Versão:** 1.1.0  
**Última atualização:** 17 de abril de 2026  
**Status:** ✅ Documentado e Testado

---

## Visão Geral

Este documento descreve os principais fluxos operacionais do Desk Imperial, incluindo comandas, pedidos, funcionários e hierarquia de permissões.

Todos os exemplos HTTP abaixo usam o prefixo publico atual `/api/v1`.

---

## 1. Hierarquia de Empresa e Funcionários

### 1.1 Modelo de Dados

```
User (OWNER)
├── companyOwnerId: null (é o dono)
├── role: OWNER
├── workspaceMembers: User[] (funcionários vinculados)
└── employees: Employee[] (cadastros de funcionários)

User (STAFF)
├── companyOwnerId: userId do OWNER
├── role: STAFF
└── employeeAccount: Employee (vínculo opcional)

Employee
├── userId: userId do OWNER (empresa dona)
├── loginUserId: userId do STAFF (vínculo com login)
├── employeeCode: código único (ex: "001")
└── displayName: nome exibido
```

### 1.2 Fluxo: Cadastro de Funcionário

```
┌─────────────┐
│   OWNER     │
│  cadastra   │
│ funcionário │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  POST /api/v1/employees                 │
│  {                                      │
│    employeeCode: "002",                 │
│    displayName: "Maria Silva",          │
│    temporaryPassword: "Temp@123"        │
│  }                                      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  1. Valida role = OWNER                 │
│  2. Gera email técnico de login         │
│     staff.<owner>.<code>@login...       │
│  3. Hash da senha temporária (argon2id) │
│  4. Cria User (role=STAFF)              │
│  5. Cria Employee com vínculo           │
│  6. Marca email como verificado         │
│  7. Registra audit log                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Response:                              │
│  {                                      │
│    employee: {                          │
│      id: "emp-123",                     │
│      employeeCode: "002",               │
│      displayName: "Maria Silva",        │
│      hasLogin: true,                    │
│      email: "staff.owner-id.002@login.deskimperial.internal" │
│    }                                    │
│  }                                      │
└─────────────────────────────────────────┘
```

### 1.3 Regras de Negócio

| Regra | Descrição |
|-------|-----------|
| **Apenas OWNER cadastra** | STAFF não pode cadastrar funcionários |
| **Email único** | `staff.<owner>.<employeeCode>@login.deskimperial.internal` |
| **Senha temporária** | Exige troca no primeiro login (futuro) |
| **Vínculo opcional** | Funcionário pode não ter login (ex: temporário) |
| **Código único** | `employeeCode` único por empresa |

---

## 2. Comandas e Mesas

### 2.1 Modelo de Dados

```
Comanda
├── id: cuid()
├── companyOwnerId: userId do OWNER
├── openedByUserId: userId que abriu
├── mesaId: mesa vinculada (opcional)
├── currentEmployeeId: garçom responsável
├── cashSessionId: caixa do garçom
├── status: OPEN | IN_PREPARATION | READY | CLOSED | CANCELLED
├── items: ComandaItem[]
├── customerName: nome do cliente
├── participantCount: número de pessoas
├── discountAmount: desconto aplicado
├── serviceFeeAmount: taxa de serviço
└── notes: observações

Mesa
├── id: cuid()
├── companyOwnerId: userId do OWNER
├── tableLabel: identificação (ex: "Mesa 1")
├── capacity: capacidade máxima
├── section: seção (ex: "Salão", "Varanda")
├── active: true/false
└── positionX, positionY: planta baixa
```

### 2.2 Fluxo: Abertura de Comanda

```
┌─────────────┐
│  Garçom ou  │
│    OWNER    │
│   abre      │
│  comanda    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  POST /api/v1/operations/comandas       │
│  {                                      │
│    tableLabel: "Mesa 5",                │
│    customerName: "João Cliente",        │
│    participantCount: 4,                 │
│    items: [                             │
│      { productId: "prod-1", qty: 2 }    │
│    ],                                   │
│    employeeId: "emp-001" (opcional)     │
│  }                                      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Validações:                            │
│  1. Usuário tem permissão (OWNER/STAFF) │
│  2. Mesa disponível (se informada)      │
│  3. Caixa aberto (para STAFF)           │
│  4. Dia comercial aberto                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Transação:                             │
│  1. Cria Comanda (status=OPEN)          │
│  2. Cria ComandaItem[]                  │
│  3. Vincula mesa (opcional)             │
│  4. Vincula garçom (opcional)           │
│  5. Registra audit log                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Response:                              │
│  {                                      │
│    comanda: {                           │
│      id: "comanda-123",                 │
│      status: "OPEN",                    │
│      tableLabel: "Mesa 5",              │
│      items: [...],                      │
│      totalAmount: 150.00                │
│    }                                    │
│  }                                      │
└─────────────────────────────────────────┘
```

### 2.3 Fluxo: Adição de Itens

```
┌─────────────┐
│  Garçom     │
│  adiciona   │
│   item      │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  POST /api/v1/operations/comandas/:id/items│
│  {                                      │
│    productId: "prod-1",                 │
│    quantity: 2,                         │
│    notes: "Sem gelo"                    │
│  }                                      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Validações:                            │
│  1. Comanda existe e pertence à empresa │
│  2. Comanda está aberta                 │
│  3. Produto existe e está ativo         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Transação:                             │
│  1. Cria ComandaItem                    │
│  2. Atualiza comanda (updatedAt)        │
│  3. Emite evento WebSocket              │
│  4. Registra audit log                  │
└─────────────────────────────────────────┘
```

### 2.4 Fluxo: Fechamento de Comanda

```
┌─────────────┐
│  OWNER ou   │
│  Garçom     │
│   fecha     │
│  comanda    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  POST /api/v1/operations/comandas/:id/close│
│  {                                      │
│    paymentMethod: "CREDIT_CARD",        │
│    discountAmount: 10.00,               │
│    serviceFeeAmount: 15.00              │
│  }                                      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Validações:                            │
│  1. Comanda está aberta                 │
│  2. OWNER autoriza desconto (PIN)       │
│  3. Caixa aberto para lançamento        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Transação:                             │
│  1. Calcula totais                      │
│  2. Aplica desconto/taxa                │
│  3. Muda status para CLOSED             │
│  4. Cria registro financeiro            │
│  5. Libera mesa                         │
│  6. Emite evento WebSocket              │
│  7. Registra audit log                  │
└─────────────────────────────────────────┘
```

### 2.5 Estados da Comanda

```
┌─────────┐     ┌──────────────┐     ┌───────┐
│  OPEN   │────▶│IN_PREPARATION│────▶│ READY │
└─────────┘     └──────────────┘     └───┬───┘
    │                                    │
    │                                    │
    ▼                                    ▼
┌──────────┐                        ┌─────────┐
│CANCELLED │                        │ CLOSED  │
└──────────┘                        └─────────┘
```

---

## 3. Pedidos e Vendas

### 3.1 Modelo de Dados

```
Order
├── id: cuid()
├── userId: companyOwnerId
├── customerName: nome do cliente
├── buyerType: PERSON | COMPANY
├── buyerDocument: CPF ou CNPJ
├── buyerCity, buyerState, buyerCountry: local da venda
├── buyerLatitude, buyerLongitude: geocodificação
├── employeeId: vendedor (STAFF)
├── sellerCode, sellerName: dados do vendedor
├── status: COMPLETED | CANCELLED
├── currency: BRL | USD | EUR
├── totalRevenue: faturamento total
├── totalCost: custo total
├── totalProfit: lucro total
├── totalItems: quantidade de itens
├── channel: canal de venda (ex: "PDV", "IFOOD")
├── notes: observações
└── items: OrderItem[]

OrderItem
├── productId: produto vendido
├── productName: nome no momento da venda
├── category: categoria
├── quantity: quantidade
├── unitCost: custo unitário (convertido)
├── unitPrice: preço de venda (convertido)
├── lineRevenue: quantity × unitPrice
├── lineCost: quantity × unitCost
└── lineProfit: lineRevenue - lineCost
```

### 3.2 Fluxo: Criação de Pedido

```
┌─────────────┐
│  OWNER ou   │
│  Garçom     │
│  registra   │
│   venda     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  POST /api/v1/orders                    │
│  {                                      │
│    items: [                             │
│      { productId: "prod-1", qty: 2 }    │
│    ],                                   │
│    customerName: "João Cliente",        │
│    buyerType: "PERSON",                 │
│    buyerDocument: "12345678900",        │
│    buyerCity: "São Paulo",              │
│    sellerEmployeeId: "emp-001",         │
│    channel: "PDV",                      │
│    currency: "BRL"                      │
│  }                                      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Validações:                            │
│  1. Itens existem e estão ativos        │
│  2. Estoque disponível                  │
│  3. CPF/CNPJ válidos                    │
│  4. Vendedor ativo (se STAFF)           │
│  5. Desconto ≤ 15% (STAFF) ou PIN OWNER │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Transação (Serializable):              │
│  1. Decrementa estoque (produto a produto)│
│  2. Calcula totais por item             │
│  3. Converte moeda (se necessário)      │
│  4. Cria Order + OrderItems             │
│  5. Geocodifica endereço                │
│  6. Registra audit log                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Response:                              │
│  {                                      │
│    order: {                             │
│      id: "order-123",                   │
│      status: "COMPLETED",               │
│      totalRevenue: 100.00,              │
│      totalProfit: 50.00,                │
│      totalItems: 3                      │
│    }                                    │
│  }                                      │
└─────────────────────────────────────────┘
```

### 3.3 Fluxo: Cancelamento de Pedido

```
┌─────────────┐
│    OWNER    │
│  cancela    │
│   pedido    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  POST /api/v1/orders/:id/cancel         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Validações:                            │
│  1. Pedido existe e pertence à empresa  │
│  2. Pedido não está cancelado           │
│  3. Apenas OWNER pode cancelar          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Transação:                             │
│  1. Retorna estoque (item a item)       │
│  2. Muda status para CANCELLED          │
│  3. Registra cancelledAt                │
│  4. Registra audit log (WARN)           │
└─────────────────────────────────────────┘
```

### 3.4 Regras de Desconto

| Cenário | Regra |
|---------|-------|
| **OWNER com desconto** | Livre, sem limite |
| **STAFF até 15%** | Permitido sem autorização |
| **STAFF acima de 15%** | Exige Admin PIN do OWNER |
| **OWNER com PIN configurado** | Exige validação por token |

---

## 4. Tempo Real (WebSocket)

### 4.1 Eventos Emitidos

```typescript
// Conexão
socket.emit('operations.connected', { workspaceChannel })

// Comandas
socket.emit('comanda.created', { comanda })
socket.emit('comanda.updated', { comanda })
socket.emit('comanda.closed', { comanda })

// Pedidos
socket.emit('order.created', { order })
socket.emit('order.cancelled', { order })

// Erros
socket.emit('operations.error', { message })
```

### 4.2 Fluxo de Conexão

```
┌─────────────┐
│  Frontend   │
│   conecta   │
│  WebSocket  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  ws://api.deskimperial.online/operations│
│  Headers:                               │
│    Authorization: Bearer <token>        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Validações:                            │
│  1. Token de sessão válido              │
│  2. Usuário ativo                       │
│  3. Origem permitida (CORS)             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Join em workspace channel:             │
│    workspace:{companyOwnerId}           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Socket recebe eventos da empresa:      │
│    - Comandas criadas/atualizadas       │
│    - Pedidos registrados                │
│    - Atualizações de estoque            │
└─────────────────────────────────────────┘
```

---

## 5. Cache e Performance

### 5.1 Chaves de Cache

| Chave | TTL | Invalidação |
|-------|-----|-------------|
| `finance:{userId}` | 120s | Criação/edição de produto, pedido |
| `products:{userId}` | 300s | Criação/edição de produto |
| `orders:{userId}` | 90s | Criação/cancelamento de pedido |
| `employees:{userId}` | 600s | Criação/edição de funcionário |

### 5.2 Estratégia de Invalidação

```typescript
// Exemplo: após criar produto
await cache.del(cache.financeKey(userId))
await cache.del(cache.productsKey(userId))

// Exemplo: após criar pedido
await cache.del(cache.financeKey(userId))
await cache.del(cache.ordersKey(userId))
```

---

## 6. Segurança e Permissões

### 6.1 Matriz de Permissões

| Operação | OWNER | STAFF |
|----------|-------|-------|
| Cadastrar funcionário | ✅ | ❌ |
| Editar funcionário | ✅ | ❌ |
| Listar funcionários | ✅ | ❌ |
| Cadastrar produto | ✅ | ❌ |
| Editar produto | ✅ | ❌ |
| Importar produtos (CSV) | ✅ | ❌ |
| Abrir comanda | ✅ | ✅* |
| Registrar pedido | ✅ | ✅* |
| Cancelar pedido | ✅ | ❌ |
| Acessar financeiro | ✅ | ❌ |
| Admin PIN | ✅ | ❌ |

*STAFF exige caixa aberto e vínculo com funcionário ativo.

### 6.2 Admin PIN

**Uso:** Operações sensíveis que exigem autorização do OWNER.

| Operação | Exige PIN |
|----------|-----------|
| Desconto > 15% em venda | ✅ |
| Fechamento de caixa | ✅ (futuro) |
| Cancelamento de venda grande | ✅ (futuro) |
| Alteração de configuração | ✅ (futuro) |

**Fluxo:**
1. Frontend solicita challenge (`POST /admin-pin/verify`)
2. Backend valida PIN e retorna token JWT (10 min)
3. Frontend anexa token em operações sensíveis
4. Backend valida token antes de processar

---

## 7. Auditoria (Audit Log)

### 7.1 Eventos Rastreados

| Recurso | Eventos |
|---------|---------|
| **Produto** | `product.created`, `product.updated`, `product.archived`, `product.restored`, `product.imported` |
| **Pedido** | `order.created`, `order.cancelled` |
| **Funcionário** | `employee.created`, `employee.updated` |
| **Comanda** | `comanda.opened`, `comanda.closed`, `comanda.cancelled` |
| **Auth** | `auth.login.succeeded`, `auth.password-reset.requested` |
| **Admin PIN** | `admin-pin.verified`, `admin-pin.failed` |

### 7.2 Estrutura do Audit Log

```typescript
AuditLog {
  id: cuid()
  actorUserId: userId que realizou a ação
  event: string (ex: "product.created")
  resource: string (ex: "product")
  resourceId: string (id do recurso)
  severity: INFO | WARN | ERROR
  metadata: object (dados da operação)
  ipAddress: string
  userAgent: string
  createdAt: DateTime
}
```

---

## 8. Tratamento de Erros

### 8.1 Erros Comuns

| Erro | HTTP | Mensagem |
|------|------|----------|
| Produto não encontrado | 404 | "Produto nao encontrado para esta conta." |
| Estoque insuficiente | 400 | "Estoque insuficiente para X. Disponivel: Y und." |
| CPF/CNPJ inválido | 400 | "Informe um CPF/CNPJ valido." |
| Sem permissão | 403 | "Apenas o dono pode [operacao]." |
| Mesa ocupada | 409 | "Essa mesa já possui uma comanda aberta." |
| Caixa fechado | 409 | "Abra o caixa do funcionario antes." |

### 8.2 Padrão de Resposta de Erro

```json
{
  "statusCode": 400,
  "message": "Estoque insuficiente para Produto X. Disponivel: 5 und. Solicitado: 10 und.",
  "error": "Bad Request"
}
```

---

## 9. Exemplos de Código

### 9.1 Abrir Comanda (Frontend)

```typescript
async function openComanda(data: OpenComandaPayload) {
  const response = await api.post('/operations/comandas', {
    tableLabel: data.tableLabel,
    customerName: data.customerName,
    participantCount: data.participantCount,
    items: data.items,
  })
  return response.data.comanda
}
```

### 9.2 Registrar Venda (Frontend)

```typescript
async function createOrder(data: CreateOrderPayload) {
  const response = await api.post('/orders', {
    items: data.items,
    customerName: data.customerName,
    buyerType: data.buyerType,
    buyerDocument: data.buyerDocument,
    buyerCity: data.buyerCity,
    sellerEmployeeId: data.sellerEmployeeId,
    channel: data.channel,
  })
  return response.data.order
}
```

### 9.3 Escutar Eventos em Tempo Real

```typescript
const socket = io('https://api.deskimperial.online/operations', {
  auth: { token: getAuthToken() },
})

socket.on('order.created', (order) => {
  queryClient.invalidateQueries(['orders'])
  toast.success(`Novo pedido: ${order.customerName}`)
})

socket.on('comanda.closed', (comanda) => {
  queryClient.invalidateQueries(['comandas'])
  toast.info(`Comanda fechada: ${comanda.tableLabel}`)
})
```

---

## 10. Checklist de Validação

### 10.1 Antes de Abrir Comanda

- [ ] Caixa do funcionário está aberto
- [ ] Mesa está disponível (se informada)
- [ ] Dia comercial está aberto
- [ ] Produtos existem e estão ativos

### 10.2 Antes de Registrar Venda

- [ ] Produtos existem e estão ativos
- [ ] Estoque é suficiente
- [ ] CPF/CNPJ são válidos
- [ ] Vendedor está ativo (se STAFF)
- [ ] Desconto está dentro do limite (ou PIN validado)

### 10.3 Antes de Cancelar Venda

- [ ] Venda não está cancelada
- [ ] Usuário é OWNER
- [ ] Estorno de estoque é desejado

---

**Fim do documento.**
