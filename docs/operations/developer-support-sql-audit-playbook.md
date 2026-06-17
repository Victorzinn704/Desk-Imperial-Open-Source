# SQL Audit Playbook Para Suporte

**Escopo:** consultas read-only para investigar API, comanda, caixa, produto, pagamento e workspace.  
**Banco:** PostgreSQL via Prisma.  
**Regra principal:** produção só deve usar usuário read-only, com menor privilégio e sem exportar PII.

> As tabelas seguem os modelos Prisma atuais (`"User"`, `"Product"`, `"Comanda"`, `"ComandaItem"`, `"ComandaPayment"`, `"PaymentTerminalIntent"`, `"CashSession"`, `"CashMovement"`, `"Employee"`). Se o schema mudar, valide em `apps/api/prisma/schema.prisma` antes de executar.

## 1. Segurança antes de consultar

- Rodar somente `SELECT`.
- Preferir `LIMIT`.
- Não copiar hash de senha, cookie, token, documento, telefone ou e-mail real para relatório.
- Usar placeholders como `:user_id`, `:company_owner_id`, `:comanda_id`.
- Não executar `UPDATE`, `DELETE`, `INSERT`, `TRUNCATE`, `ALTER`, `DROP` ou função de manutenção em investigação de suporte.
- Em produção, registrar quem consultou, quando e por qual incidente.

## 2. Identificar usuário e workspace

```sql
SELECT
  u.id,
  u.email,
  u.role,
  u.status,
  u."companyOwnerId",
  u."companyName",
  u."createdAt",
  u."updatedAt"
FROM "User" u
WHERE u.email = :email
LIMIT 5;
```

Uso:

- diferenciar owner de funcionário;
- confirmar se o usuário pertence ao workspace esperado;
- investigar `401`/`403` quando o usuário existe, mas a sessão ou permissão falha.

## 3. Ver sessões recentes de um usuário

```sql
SELECT
  s.id,
  s."userId",
  s."employeeId",
  s."createdAt",
  s."expiresAt",
  s."revokedAt"
FROM "Session" s
WHERE s."userId" = :user_id
ORDER BY s."createdAt" DESC
LIMIT 10;
```

Uso:

- verificar sessão expirada ou revogada;
- validar se `/api/v1/auth/me` deveria responder autenticado;
- investigar login em dispositivo errado.

## 4. Conferir funcionário vinculado ao usuário

```sql
SELECT
  e.id,
  e."userId" AS owner_id,
  e."loginUserId",
  e."employeeCode",
  e."displayName",
  e.active,
  e."createdAt",
  e."updatedAt"
FROM "Employee" e
WHERE e."loginUserId" = :user_id
   OR e."userId" = :company_owner_id
ORDER BY e."updatedAt" DESC
LIMIT 20;
```

Uso:

- validar staff que recebe `403`;
- confirmar vínculo com owner;
- investigar funcionário inativo.

## 5. Buscar produto por barcode

```sql
SELECT
  p.id,
  p."userId",
  p.name,
  p.barcode,
  p.brand,
  p.category,
  p."requiresKitchen",
  p.stock,
  p."lowStockThreshold",
  p.active,
  p."catalogSource",
  p."updatedAt"
FROM "Product" p
WHERE p."userId" = :company_owner_id
  AND p.barcode = :barcode
LIMIT 5;
```

Uso:

- investigar cadastro rápido por EAN;
- validar duplicidade por workspace;
- verificar se item deveria ir para cozinha por `requiresKitchen`.

## 6. Conferir comandas abertas

```sql
SELECT
  c.id,
  c."companyOwnerId",
  c."cashSessionId",
  c."mesaId",
  c."tableLabel",
  c.status,
  c."participantCount",
  c."subtotalAmount",
  c."discountAmount",
  c."serviceFeeAmount",
  c."totalAmount",
  c."openedAt",
  c."updatedAt"
FROM "Comanda" c
WHERE c."companyOwnerId" = :company_owner_id
  AND c.status = 'OPEN'
ORDER BY c."openedAt" DESC
LIMIT 50;
```

Uso:

- investigar salão/PWA fora de sincronia;
- confirmar se `operations/live` deveria trazer a comanda;
- validar conflito de mesa ocupada.

## 7. Inspecionar uma comanda completa

```sql
SELECT
  c.id,
  c.status,
  c."tableLabel",
  c."cashSessionId",
  c."subtotalAmount",
  c."discountAmount",
  c."serviceFeeAmount",
  c."totalAmount",
  c."openedAt",
  c."closedAt",
  c."updatedAt"
FROM "Comanda" c
WHERE c.id = :comanda_id
  AND c."companyOwnerId" = :company_owner_id
LIMIT 1;
```

Uso:

- validar estado de abertura/fechamento;
- checar se o id pertence ao workspace correto;
- investigar `404` versus `403`.

## 8. Itens de uma comanda

```sql
SELECT
  i.id,
  i."comandaId",
  i."productId",
  i."productName",
  i.quantity,
  i."unitPrice",
  i."totalAmount",
  i."kitchenStatus",
  i."kitchenQueuedAt",
  i."kitchenReadyAt",
  i."createdAt",
  i."updatedAt"
FROM "ComandaItem" i
WHERE i."comandaId" = :comanda_id
ORDER BY i."createdAt" ASC;
```

Uso:

- investigar item não enviado para cozinha;
- validar quantidade/preço;
- conferir se a API persistiu o item antes do realtime.

## 9. Pagamentos de uma comanda

```sql
SELECT
  p.id,
  p."companyOwnerId",
  p."comandaId",
  p."cashSessionId",
  p.method,
  p.amount,
  p.status,
  p."paidAt",
  p."voidedAt",
  p."createdAt",
  p."updatedAt"
FROM "ComandaPayment" p
WHERE p."companyOwnerId" = :company_owner_id
  AND p."comandaId" = :comanda_id
ORDER BY p."paidAt" DESC;
```

Uso:

- investigar divergência entre comanda, caixa e pagamento;
- confirmar se pagamento foi criado de forma idempotente;
- diferenciar pagamento manual de Point.

## 10. Intent Point e reconciliação

```sql
SELECT
  t.id,
  t."companyOwnerId",
  t."comandaId",
  t."cashSessionId",
  t.status,
  t.method,
  t.amount,
  t."providerTerminalId",
  t."providerOrderId",
  t."providerPaymentId",
  t."providerStatus",
  t."externalReference",
  t."errorCode",
  t."expiresAt",
  t."approvedAt",
  t."rejectedAt",
  t."cancelledAt",
  t."createdAt",
  t."updatedAt"
FROM "PaymentTerminalIntent" t
WHERE t."companyOwnerId" = :company_owner_id
  AND t."comandaId" = :comanda_id
ORDER BY t."createdAt" DESC
LIMIT 20;
```

Uso:

- investigar pagamento Point lento;
- conferir se o webhook foi reconciliado;
- verificar duplicidade por `externalReference`;
- correlacionar provider order/payment com logs sem expor segredo.

## 11. Caixa aberto por data

```sql
SELECT
  cs.id,
  cs."companyOwnerId",
  cs."employeeId",
  cs."businessDate",
  cs.status,
  cs."openingCashAmount",
  cs."expectedCashAmount",
  cs."grossRevenueAmount",
  cs."realizedProfitAmount",
  cs."openedAt",
  cs."closedAt",
  cs."updatedAt"
FROM "CashSession" cs
WHERE cs."companyOwnerId" = :company_owner_id
  AND cs."businessDate"::date = :business_date
ORDER BY cs."openedAt" DESC;
```

Uso:

- investigar abertura de caixa;
- conferir se comanda foi associada à sessão correta;
- validar divergência de totais.

## 12. Movimentos de caixa

```sql
SELECT
  m.id,
  m."cashSessionId",
  m."companyOwnerId",
  m."employeeId",
  m.type,
  m.amount,
  m.note,
  m."createdAt"
FROM "CashMovement" m
WHERE m."companyOwnerId" = :company_owner_id
  AND m."cashSessionId" = :cash_session_id
ORDER BY m."createdAt" DESC
LIMIT 80;
```

Uso:

- investigar diferença de caixa;
- conferir sangria/reforço/entrada;
- validar se frontend está exibindo valor de forma divergente.

## 13. Duplicidade de webhook ou intent

```sql
SELECT
  t."externalReference",
  COUNT(*) AS total
FROM "PaymentTerminalIntent" t
WHERE t."companyOwnerId" = :company_owner_id
GROUP BY t."externalReference"
HAVING COUNT(*) > 1;
```

Uso:

- validar idempotência;
- detectar problema grave de duplicidade.

## 14. Produtos de cozinha sem status na comanda

```sql
SELECT
  i.id AS item_id,
  i."comandaId",
  i."productId",
  i."productName",
  i."kitchenStatus",
  p."requiresKitchen"
FROM "ComandaItem" i
JOIN "Product" p ON p.id = i."productId"
JOIN "Comanda" c ON c.id = i."comandaId"
WHERE c."companyOwnerId" = :company_owner_id
  AND p."requiresKitchen" = TRUE
  AND i."kitchenStatus" IS NULL
ORDER BY i."createdAt" DESC
LIMIT 50;
```

Uso:

- investigar regra "todo item de comida nasce na cozinha";
- abrir bug se a mutação deveria ter criado `kitchenStatus`.

## 15. Formato de resposta para anexar ao diagnóstico

```text
Query usada: Comanda + itens + pagamentos por comanda_id
Resultado: comanda OPEN, 2 itens persistidos, 1 item com kitchenStatus NULL
Leitura: API persistiu o item, mas a regra de cozinha não marcou o status.
Próximo passo: reproduzir mutação e verificar serviço de dispatch de cozinha.
```
