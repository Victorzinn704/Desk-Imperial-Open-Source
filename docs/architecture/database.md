# Banco de Dados — Desk Imperial

**Versao:** 1.1  
**Ultima atualizacao:** 2026-05-01  
**ORM:** Prisma 6  
**Banco:** PostgreSQL 17 na Ampere da Lohana, com PgBouncer e acesso privado por WireGuard

---

## Visao geral

O banco atual do Desk Imperial tem duas camadas distintas:

1. `public` — schema transacional usado por API, web, auth, operacao e notificacoes.
2. `bi` — schema analitico com views e materialized views usadas por Metabase e leitura gerencial.

O runtime versionado do projeto nao usa mais Neon como estado atual. O caminho canonico hoje e:

- app/web na Oracle `vm-free-01`
- observabilidade e Metabase na Oracle `vm-free-02`
- PostgreSQL 17 + PgBouncer na Ampere da Lohana
- trafego servidor-servidor pela malha WireGuard

Referencias internas:

- [infra/oracle/README.md](../../infra/oracle/README.md)
- [infra/oracle/db/README.md](../../infra/oracle/db/README.md)
- [apps/api/prisma/schema.prisma](../../apps/api/prisma/schema.prisma)

---

## Mapa atual dos modelos

O schema Prisma atual tem **26 modelos**:

| Grupo | Modelos |
| --- | --- |
| Identidade e acesso | `User`, `Session`, `DemoAccessGrant`, `PasswordResetToken`, `OneTimeCode`, `ConsentDocument`, `UserConsent`, `CookiePreference`, `AuditLog` |
| Notificacoes | `TelegramAccount`, `TelegramLinkToken`, `NotificationPreference`, `UserNotificationPreference` |
| Catalogo | `Product`, `ProductComboItem` |
| Operacao | `Employee`, `CashSession`, `CashMovement`, `CashClosure`, `Mesa`, `Comanda`, `ComandaItem`, `ComandaAssignment`, `ComandaPayment` |
| Vendas | `Order`, `OrderItem` |

O documento antigo falava em 22 modelos e em uma migracao "em curso" do Neon. Isso driftou.

---

## Chaves de isolamento

O projeto nao usa uma unica chave para tudo. Hoje existem tres eixos principais:

### 1. `userId`

Usado em entidades centradas no dono do workspace ou em ownership direto:

- `Product`
- `Order`
- `Employee.userId`
- `Market intelligence` e caches correlatos

### 2. `companyOwnerId`

Usado na malha operacional multi-tenant do workspace:

- `CashSession`
- `CashMovement`
- `CashClosure`
- `Mesa`
- `Comanda`
- `ComandaAssignment`
- `ComandaPayment`

### 3. `workspaceOwnerUserId`

Usado quando a sessao ou notificacao precisa apontar para o workspace efetivo:

- `Session.workspaceOwnerUserId`
- `TelegramAccount.workspaceOwnerUserId`
- `TelegramLinkToken.workspaceOwnerUserId`
- `NotificationPreference.workspaceOwnerUserId`

Conclusao pratica: dizer que "tudo filtra por `companyOwnerId`" hoje e incompleto.

---

## Entidades centrais

### `User`

Representa OWNER ou STAFF com conta autenticavel.

Destaques atuais do modelo:

- `fullName`
- `role`
- `status`
- `preferredCurrency`
- endereco da empresa fragmentado em campos proprios
- `companyLatitude` / `companyLongitude`
- `emailVerifiedAt`
- `passwordChangedAt`
- `adminPinHash`
- relacao de workspace entre OWNER e membros por `companyOwnerId`

O modelo antigo baseado em `emailVerified: boolean` e `emailVerificationCode` ja nao reflete o schema real.

### `Session`

Sessao autenticada do portal.

Destaques atuais:

- `tokenHash` em vez de token plaintext
- `expiresAt`, `lastSeenAt`, `revokedAt`
- `workspaceOwnerUserId`
- `employeeId` opcional para STAFF
- `demoAccessGrant` opcional

Essa sessao e a base de auth HTTP e tambem do realtime.

### `Product`

Catalogo operacional do workspace.

Campos que ganharam peso no runtime atual:

- `barcode`
- `brand`
- `packagingClass`
- `measurementUnit`
- `measurementValue`
- `unitsPerPackage`
- `quantityLabel`
- `servingSize`
- `imageUrl`
- `catalogSource`
- `requiresKitchen`
- `lowStockThreshold`

Isso sustenta:

- cadastro rapido mobile
- lookup por EAN
- enriquecimento via Open Food Facts
- smart draft com Gemini
- combinacao de custo, preco e estoque no mesmo modelo

### `Employee`

Funcionario operacional e, opcionalmente, conta de login acoplada.

Destaques:

- `loginUserId` opcional
- `employeeCode`
- `displayName`
- `passwordHash` opcional
- `salarioBase`
- `percentualVendas`
- relacoes com caixa, vendas, comandas e sessoes

### `CashSession`, `CashClosure`, `Comanda`, `ComandaPayment`

Esses modelos formam o coracao operacional do produto.

Pontos importantes:

- `CashSession` guarda data de negocio, caixa aberto/fechado, valores esperados e realizados
- `CashClosure` consolida o fechamento por dia e workspace
- `Comanda` guarda totais monetarios separados (`subtotal`, `discount`, `serviceFee`, `total`)
- `ComandaPayment` separa pagamento operacional da comanda, com metodo, status e relacao opcional com caixa

O runtime atual nao depende mais de inferir tudo so a partir de `Order`.

### `Order` e `OrderItem`

Persistem a camada de venda formal e analytics comercial.

Destaques:

- `Order.comandaId` opcional e unico
- buyer metadata (`buyerType`, `buyerDocument`, cidade/estado/pais, geolocalizacao)
- `employeeId`, `sellerCode`, `sellerName`
- `channel`
- totais de receita, custo, lucro e itens

### `TelegramAccount` e preferencias de notificacao

O banco ja sustenta o bot oficial:

- vinculo de usuario/conta via `TelegramAccount`
- deeplink temporario via `TelegramLinkToken`
- preferencias do workspace via `NotificationPreference`
- preferencias do usuario via `UserNotificationPreference`

Esses modelos ja fazem parte do estado atual do produto, nao de uma trilha futura.

---

## Precisao monetaria e consistencia

Valores financeiros relevantes usam `Decimal` no schema Prisma:

- `Product.unitCost`
- `Product.unitPrice`
- `CashSession.*Amount`
- `CashMovement.amount`
- `CashClosure.*Amount`
- `Comanda.*Amount`
- `ComandaPayment.amount`
- `Order.totalRevenue`
- `Order.totalCost`
- `Order.totalProfit`

Isso evita drift de ponto flutuante em caixa, fechamento e margem.

---

## Indices relevantes no hot path

Os indices mais importantes hoje acompanham os filtros reais da aplicacao:

- `Session.tokenHash` unico
- `Session.workspaceOwnerUserId + expiresAt`
- `Product.userId + active`
- `Product.userId + barcode` unico
- `Employee.userId + employeeCode` unico
- `CashSession.companyOwnerId + businessDate + status`
- `CashClosure.companyOwnerId + businessDate` unico
- `Comanda.companyOwnerId + status + openedAt`
- `Comanda.companyOwnerId + cashSessionId + openedAt`
- `Comanda.currentEmployeeId + status + openedAt`
- `ComandaPayment.companyOwnerId + paidAt`
- `TelegramAccount.telegramChatId + status`
- `NotificationPreference.workspaceOwnerUserId + channel + eventType` unico

Se a documentacao falar em indice generico por `openedAt` ou em filtro unico por `companyOwnerId`, ela ja fica curta demais para o estado atual.

---

## Schema analitico `bi`

O schema `bi` existe de fato e ja esta materializado por migration.

Objetivo:

- tirar leitura pesada de cima do OLTP
- alimentar Metabase e consultas gerenciais
- manter agregados diarios fora do fluxo transacional quente

Artefatos atuais:

- `bi.sales_daily`
- `bi.sales_by_channel_daily`
- `bi.margin_daily`
- `bi.products_performance_daily`
- `bi.category_performance_daily`
- `bi.employee_performance_daily`
- `bi.cash_daily`
- `bi.comandas_daily`
- `bi.low_stock_snapshot`

Referencias:

- [apps/api/prisma/migrations/20260422093000_add_bi_schema/migration.sql](../../apps/api/prisma/migrations/20260422093000_add_bi_schema/migration.sql)
- [apps/api/prisma/sql/refresh-bi.sql](../../apps/api/prisma/sql/refresh-bi.sql)
- [infra/oracle/db/systemd/bi-refresh.timer](../../infra/oracle/db/systemd/bi-refresh.timer)

### Refresh

Local/manual:

```bash
npm --workspace @partner/api run prisma:refresh:bi
```

Runtime Oracle/Ampere:

- script operacional do host: `infra/oracle/db/scripts/refresh-bi.sh`
- timer systemd: `infra/oracle/db/systemd/bi-refresh.timer`

---

## Operacao de banco

### Desenvolvimento local

```bash
npm run db:up
npm --workspace @partner/api run prisma:migrate:deploy
npm run seed
```

### Runtime Oracle

- a API sobe com `prisma migrate deploy` antes do processo principal
- `DATABASE_URL` aponta para o PgBouncer privado
- `DIRECT_URL` aponta para o PostgreSQL direto da Ampere

Referencias:

- [infra/oracle/docker/api.Dockerfile](../../infra/oracle/docker/api.Dockerfile)
- [infra/oracle/compose.yaml](../../infra/oracle/compose.yaml)

---

## Guardrails de evolucao

1. Nao documentar Neon como banco atual do projeto.
2. Nao reduzir o banco a "22 modelos" ou a uma lista estatica sem conferir o schema.
3. Nao tratar `companyOwnerId` como chave unica universal; o runtime usa `userId`, `companyOwnerId` e `workspaceOwnerUserId` conforme a entidade.
4. Nao tratar Telegram, BI ou preferencias de notificacao como backlog futuro; isso ja esta no schema produtivo.
5. Toda mudanca neste documento precisa ser cruzada com `schema.prisma`, migrations recentes e runtime Oracle/Ampere.
