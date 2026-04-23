# Banco de Dados — Desk Imperial

**Versão:** 1.0  
**Última atualização:** 2026-04-01  
**ORM:** Prisma  
**Banco:** PostgreSQL 17 (migração em curso do Neon para a Ampere self-hosted; Neon permanece apenas como origem transitória até o cutover)

---

## Visão geral

Além do schema transacional padrão, o banco passa a ter um schema analítico `bi` para leitura de gestão e Metabase. Esse schema não substitui o OLTP; ele existe para evitar dashboard pesado em cima das tabelas operacionais.

O banco tem 22 modelos organizados em grupos funcionais:

| Grupo               | Modelos                                                                               |
| ------------------- | ------------------------------------------------------------------------------------- |
| Identidade e acesso | User, Session, Employee                                                               |
| Operações           | CashSession, CashMovement, CashClosure, Mesa, Comanda, ComandaItem, ComandaAssignment |
| Vendas              | Order, OrderItem                                                                      |
| Portfólio           | Product, ProductComboItem                                                             |
| Financeiro          | (derivado de Order e Comanda)                                                         |
| Conformidade        | ConsentDocument, UserConsent, UserCookiePreference                                    |
| Auditoria           | AuditLog                                                                              |
| Configurações       | WorkspacePreference                                                                   |

**Princípio central:** cada entidade de negócio é filtrada por `companyOwnerId` (o `id` do usuário OWNER do workspace).

---

## Entidades

### User

Representa o dono do negócio (OWNER) ou um colaborador com acesso ao sistema.

| Campo                       | Tipo          | Descrição                                                 |
| --------------------------- | ------------- | --------------------------------------------------------- |
| `id`                        | String (UUID) | Identificador único                                       |
| `email`                     | String        | E-mail único — usado no login                             |
| `name`                      | String        | Nome do usuário                                           |
| `passwordHash`              | String        | Hash argon2id da senha                                    |
| `role`                      | Enum          | `OWNER` ou `STAFF`                                        |
| `companyName`               | String?       | Nome do negócio (OWNER)                                   |
| `companyCity`               | String?       | Cidade do negócio                                         |
| `companyAddress`            | String?       | Endereço completo                                         |
| `companyLat` / `companyLng` | Float?        | Coordenadas geocodificadas                                |
| `emailVerified`             | Boolean       | Se o e-mail foi verificado                                |
| `emailVerificationCode`     | String?       | Código temporário de verificação                          |
| `passwordResetToken`        | String?       | Token de reset de senha (hashed)                          |
| `adminPinHash`              | String?       | Hash do Admin PIN                                         |
| `adminPinLockedUntil`       | DateTime?     | Timestamp de bloqueio do PIN                              |
| `adminPinAttempts`          | Int           | Tentativas incorretas consecutivas                        |
| `companyOwnerId`            | String?       | FK para o OWNER do workspace (STAFF aponta para seu dono) |
| `createdAt` / `updatedAt`   | DateTime      | Timestamps                                                |

**Relações:**

- `companyOwner` → User (STAFF aponta para seu OWNER)
- `staff[]` → User[] (OWNER tem lista de funcionários)
- `sessions[]` → Session[]

---

### Session

Armazena sessões autenticadas.

| Campo               | Tipo          | Descrição                                 |
| ------------------- | ------------- | ----------------------------------------- |
| `id`                | String (UUID) | Identificador único                       |
| `userId`            | String        | FK para User                              |
| `token`             | String        | Token de sessão (hashed)                  |
| `expiresAt`         | DateTime      | Expiração da sessão                       |
| `createdAt`         | DateTime      | Criação                                   |
| `ipAddress`         | String?       | IP de origem                              |
| `userAgent`         | String?       | User agent do cliente                     |
| `demoAccessGrantId` | String?       | FK para DemoAccessGrant se for conta demo |

---

### Employee

Representa um funcionário do workspace com dados de folha de pagamento.

| Campo                     | Tipo          | Descrição                                 |
| ------------------------- | ------------- | ----------------------------------------- |
| `id`                      | String (UUID) | Identificador único                       |
| `companyOwnerId`          | String        | FK para User (OWNER do workspace)         |
| `userId`                  | String?       | FK para User se o funcionário tiver login |
| `name`                    | String        | Nome do funcionário                       |
| `role`                    | String?       | Cargo                                     |
| `salarioBase`             | Decimal       | Salário fixo mensal                       |
| `percentualVendas`        | Decimal       | Comissão percentual sobre vendas          |
| `active`                  | Boolean       | Se está ativo                             |
| `createdAt` / `updatedAt` | DateTime      | Timestamps                                |

**Nota:** `salarioBase` e `percentualVendas` são armazenados como `Decimal(10,2)` — precisão monetária garantida.

---

### CashSession

Representa uma sessão de caixa aberta por um operador.

| Campo            | Tipo          | Descrição                          |
| ---------------- | ------------- | ---------------------------------- |
| `id`             | String (UUID) | Identificador único                |
| `companyOwnerId` | String        | Workspace                          |
| `operatorId`     | String        | FK para Employee                   |
| `openedAt`       | DateTime      | Quando o caixa foi aberto          |
| `closedAt`       | DateTime?     | Quando foi fechado (null = aberto) |
| `openingBalance` | Decimal       | Valor de abertura                  |
| `closingBalance` | Decimal?      | Valor de fechamento                |
| `status`         | Enum          | `OPEN` ou `CLOSED`                 |

---

### CashMovement

Registra entradas e saídas do caixa.

| Campo            | Tipo          | Descrição             |
| ---------------- | ------------- | --------------------- |
| `id`             | String (UUID) | Identificador único   |
| `cashSessionId`  | String        | FK para CashSession   |
| `companyOwnerId` | String        | Workspace             |
| `type`           | Enum          | `INCOME` ou `EXPENSE` |
| `amount`         | Decimal       | Valor da movimentação |
| `description`    | String?       | Descrição             |
| `createdAt`      | DateTime      | Timestamp             |

---

### CashClosure

Registro do fechamento diário do caixa.

| Campo            | Tipo          | Descrição                    |
| ---------------- | ------------- | ---------------------------- |
| `id`             | String (UUID) | Identificador único          |
| `companyOwnerId` | String        | Workspace                    |
| `businessDate`   | String        | Data de negócio (YYYY-MM-DD) |
| `closedAt`       | DateTime      | Quando foi fechado           |
| `totalRevenue`   | Decimal       | Receita total do dia         |
| `totalCost`      | Decimal       | Custo total                  |
| `totalProfit`    | Decimal       | Lucro total                  |

---

### Mesa

Representa uma mesa ou ponto de atendimento do negócio.

| Campo            | Tipo          | Descrição                           |
| ---------------- | ------------- | ----------------------------------- |
| `id`             | String (UUID) | Identificador único                 |
| `companyOwnerId` | String        | Workspace                           |
| `label`          | String        | Nome/número da mesa                 |
| `capacity`       | Int?          | Capacidade de pessoas               |
| `posX` / `posY`  | Float?        | Posição na planta do salão          |
| `status`         | Enum          | `AVAILABLE`, `OCCUPIED`, `RESERVED` |
| `active`         | Boolean       | Se está ativa                       |

---

### Comanda

Comanda de atendimento — a entidade central do PDV.

| Campo               | Tipo          | Descrição                                   |
| ------------------- | ------------- | ------------------------------------------- |
| `id`                | String (UUID) | Identificador único                         |
| `companyOwnerId`    | String        | Workspace                                   |
| `mesaId`            | String?       | Mesa vinculada (opcional)                   |
| `currentEmployeeId` | String?       | Funcionário responsável                     |
| `customerName`      | String?       | Nome do cliente                             |
| `customerDocument`  | String?       | CPF ou CNPJ validado                        |
| `status`            | Enum          | `OPEN`, `IN_PREPARATION`, `READY`, `CLOSED` |
| `discount`          | Decimal       | Desconto aplicado                           |
| `surcharge`         | Decimal       | Acréscimo aplicado                          |
| `openedAt`          | DateTime      | Abertura                                    |
| `closedAt`          | DateTime?     | Fechamento                                  |
| `total`             | Decimal       | Valor total calculado                       |

**Índice de performance:** `@@index([companyOwnerId, openedAt])` — otimiza o snapshot ao vivo que filtra por workspace + janela de data.

**Relações:**

- `items[]` → ComandaItem[]
- `assignments[]` → ComandaAssignment[]

---

### ComandaItem

Item dentro de uma comanda.

| Campo           | Tipo          | Descrição                                        |
| --------------- | ------------- | ------------------------------------------------ |
| `id`            | String (UUID) | Identificador único                              |
| `comandaId`     | String        | FK para Comanda                                  |
| `productId`     | String        | FK para Product                                  |
| `quantity`      | Int           | Quantidade                                       |
| `unitPrice`     | Decimal       | Preço unitário no momento da venda               |
| `kitchenStatus` | Enum          | `QUEUED`, `IN_PREPARATION`, `READY`, `DELIVERED` |
| `notes`         | String?       | Observações do item                              |

---

### Order

Pedido formal com validação de estoque e cálculo de lucro.

| Campo                         | Tipo          | Descrição                           |
| ----------------------------- | ------------- | ----------------------------------- |
| `id`                          | String (UUID) | Identificador único                 |
| `companyOwnerId`              | String        | Workspace                           |
| `employeeId`                  | String?       | Funcionário que fez a venda         |
| `customerId`                  | String?       | Referência ao cliente               |
| `customerDocument`            | String?       | CPF/CNPJ                            |
| `customerCity`                | String?       | Cidade do cliente (para o mapa)     |
| `customerLat` / `customerLng` | Float?        | Coordenadas geocodificadas          |
| `status`                      | Enum          | `PENDING`, `CONFIRMED`, `CANCELLED` |
| `currency`                    | Enum          | `BRL`, `USD`, `EUR`                 |
| `discount`                    | Decimal       | Desconto total                      |
| `total`                       | Decimal       | Valor total                         |
| `totalCost`                   | Decimal       | Custo total                         |
| `totalProfit`                 | Decimal       | Lucro calculado                     |
| `createdAt`                   | DateTime      | Timestamp                           |

---

### OrderItem

Item dentro de um pedido.

| Campo       | Tipo          | Descrição                               |
| ----------- | ------------- | --------------------------------------- |
| `id`        | String (UUID) | Identificador único                     |
| `orderId`   | String        | FK para Order                           |
| `productId` | String        | FK para Product                         |
| `quantity`  | Int           | Quantidade vendida                      |
| `unitPrice` | Decimal       | Preço unitário                          |
| `unitCost`  | Decimal       | Custo unitário (para cálculo de margem) |

---

### Product

Produto do portfólio.

| Campo                     | Tipo          | Descrição               |
| ------------------------- | ------------- | ----------------------- |
| `id`                      | String (UUID) | Identificador único     |
| `companyOwnerId`          | String        | Workspace               |
| `name`                    | String        | Nome                    |
| `category`                | String?       | Categoria               |
| `description`             | String?       | Descrição               |
| `unitPrice`               | Decimal       | Preço de venda          |
| `unitCost`                | Decimal       | Custo (para margem)     |
| `currency`                | Enum          | `BRL`, `USD`, `EUR`     |
| `unit`                    | String?       | Unidade (ex: kg, un, L) |
| `stockQuantity`           | Int           | Quantidade em estoque   |
| `isCombo`                 | Boolean       | Se é um combo           |
| `comboDescription`        | String?       | Descrição do combo      |
| `active`                  | Boolean       | Se está ativo no PDV    |
| `createdAt` / `updatedAt` | DateTime      | Timestamps              |

**Relações:**

- `comboItems[]` → ProductComboItem[] (se for combo)

---

### ProductComboItem

Componente de um produto combo.

| Campo       | Tipo          | Descrição                           |
| ----------- | ------------- | ----------------------------------- |
| `id`        | String (UUID) | Identificador único                 |
| `comboId`   | String        | FK para Product (o combo pai)       |
| `productId` | String        | FK para Product (o item componente) |
| `quantity`  | Int           | Quantidade do componente no combo   |

---

### ConsentDocument

Versão de documento legal (termos de uso, política de privacidade).

| Campo         | Tipo          | Descrição                            |
| ------------- | ------------- | ------------------------------------ |
| `id`          | String (UUID) | Identificador único                  |
| `type`        | Enum          | `TERMS_OF_SERVICE`, `PRIVACY_POLICY` |
| `version`     | String        | Versão do documento (ex: "2026.03")  |
| `content`     | String        | Conteúdo do documento                |
| `publishedAt` | DateTime      | Data de publicação                   |
| `active`      | Boolean       | Se é a versão atual                  |

---

### UserConsent

Registro de aceite de documento legal por usuário.

| Campo        | Tipo          | Descrição               |
| ------------ | ------------- | ----------------------- |
| `id`         | String (UUID) | Identificador único     |
| `userId`     | String        | FK para User            |
| `documentId` | String        | FK para ConsentDocument |
| `acceptedAt` | DateTime      | Quando aceitou          |
| `ipAddress`  | String?       | IP de origem            |

---

### UserCookiePreference

Preferências de cookies por usuário.

| Campo       | Tipo          | Descrição                         |
| ----------- | ------------- | --------------------------------- |
| `id`        | String (UUID) | Identificador único               |
| `userId`    | String        | FK para User (único)              |
| `necessary` | Boolean       | Cookies necessários (sempre true) |
| `analytics` | Boolean       | Cookies de analytics              |
| `marketing` | Boolean       | Cookies de marketing              |
| `updatedAt` | DateTime      | Última atualização                |

---

### AuditLog

Registro imutável de eventos críticos do sistema.

| Campo            | Tipo          | Descrição                                        |
| ---------------- | ------------- | ------------------------------------------------ |
| `id`             | String (UUID) | Identificador único                              |
| `userId`         | String?       | Usuário que gerou o evento                       |
| `companyOwnerId` | String?       | Workspace relacionado                            |
| `action`         | String        | Tipo de ação (ex: `LOGIN_SUCCESS`, `PIN_FAILED`) |
| `metadata`       | JSON?         | Dados adicionais (campos sensíveis redigidos)    |
| `ipAddress`      | String?       | IP de origem                                     |
| `userAgent`      | String?       | User agent                                       |
| `createdAt`      | DateTime      | Timestamp imutável                               |

**Nota:** `AuditLog` não tem `updatedAt` — registros de auditoria são imutáveis por design.

---

## Relacionamentos principais

```
User (OWNER)
├── User[] staff (funcionários do workspace)
├── CashSession[]
├── Mesa[]
├── Comanda[]
├── Order[]
├── Product[]
├── Employee[]
└── Session[]

Comanda
├── ComandaItem[]
│   └── Product
└── ComandaAssignment[]
    └── Employee

Order
└── OrderItem[]
    └── Product

Product
└── ProductComboItem[] (se isCombo=true)
    └── Product (componentes)
```

---

## Decisões de design

### Valores monetários

Todos os valores monetários usam `Decimal(10,2)` via Prisma — nunca `Float`. Isso evita erros de precisão em cálculos financeiros.

No frontend, os valores são convertidos para `number` após recebimento da API.

### Isolamento por workspace

Não existe uma tabela `Workspace` separada. O isolamento é feito pelo campo `companyOwnerId` em todas as entidades de negócio — que referencia o `id` do usuário OWNER.

Isso simplifica o modelo mas exige que **toda query de negócio filtre por `companyOwnerId`**. Esse padrão é verificado nos testes de integração.

### Índices de performance

| Índice                       | Tabela  | Motivo                                                            |
| ---------------------------- | ------- | ----------------------------------------------------------------- |
| `(companyOwnerId, openedAt)` | Comanda | Query do snapshot ao vivo — filtra por workspace + janela de data |
| `(companyOwnerId)`           | Order   | Queries financeiras por workspace                                 |

### Soft delete

Produtos e funcionários usam `active: Boolean` em vez de deleção real. Isso preserva histórico de vendas sem quebrar integridade referencial.

---

## Migrations

As migrations ficam em `apps/api/prisma/migrations/`.

Para criar uma nova migration em desenvolvimento:

```bash
npm --workspace @partner/api run prisma:migrate:dev -- --name nome-da-migration
```

Para aplicar migrations em produção:

```bash
npm --workspace @partner/api run prisma:migrate:deploy
```

**Atenção:** migrations em produção usam `migrate:deploy`, não `migrate:dev`. O Railway aplica as migrations automaticamente no deploy via `railway-start.sh`.
