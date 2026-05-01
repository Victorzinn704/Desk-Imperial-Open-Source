# Database Audit — Desk Imperial

**Schema**: `apps/api/prisma/schema.prisma` (650 lines, 22 models, 17 enums)
**Provider**: PostgreSQL, Prisma ORM
**Audit Date**: 2026-04-26

---

## DB Score: 7/10

> Solid multi-tenant schema with correct FK cascade discipline, good indexing on hot paths, and
> Serializable isolation for critical writes. Main gaps are audit completeness, missing FK indexes
> on non-tenant relations, and a soft but real TOCTOU in stock verification.

---

## Findings

### DB-001 — Missing indexes on foreign keys (5 occurrences)

- **Severity**: Medium
- **Confidence**: High
- **Evidence**:
  - `schema.prisma:428` — `CashMovement.createdByUserId` references `User.id` (Restrict), no index
  - `schema.prisma:455` — `CashClosure.closedByUserId` references `User.id` (SetNull), no index
  - `schema.prisma:504` — `Comanda.mesaId` references `Mesa.id` (SetNull), no index
  - `schema.prisma:506` — `Comanda.closedByUserId` references `User.id` (SetNull), no index
  - `schema.prisma:505` — `Comanda.openedByUserId` references `User.id` (Restrict), no index
  - `schema.prisma:554` — `ComandaAssignment.assignedByUserId` references `User.id` (Restrict), no index
  - `schema.prisma:580` — `ComandaPayment.createdByUserId` references `User.id` (Restrict), no index
- **Impact**: `ON DELETE RESTRICT` check lookups on these FKs perform sequential scans when the
  parent is touched. On large `CashMovement` or `Comanda` tables this causes measurable
  write amplification on every employee/user/table deletion or status closure.
- **Recommendation**: Add single-column `@@index` on each bare FK not already covered by a leading
  column in a compound index.
- **Effort**: Low (one `@@index` per field in `schema.prisma`, migrate).

---

### DB-002 — CUID primary keys drive B-tree index fragmentation

- **Severity**: Low
- **Confidence**: Medium
- **Evidence**: All 22 models use `@default(cuid())` (`schema.prisma:103,164,188,206,221,239,258,272,
282,300,341,357,383,416,438,462,481,522,543,562,590,632`).
- **Impact**: CUIDs are not time-ordered. PostgreSQL B-tree indexes on random PKs cause page-split
  churn, especially on high-write tables (`AuditLog`, `CashMovement`, `ComandaItem`, `OrderItem`).
  Measurable at scale (~100k+ rows/day) but academic at current volumes.
- **Recommendation**: Consider `@default(uuid_v7())` (time-sortable UUID) if Prisma 5+/PostgreSQL
  14+ is available. Otherwise `bigserial` remains the gold standard for OLTP write throughput but
  breaks Prisma's `@id` portability.
- **Effort**: High (requires PK migration strategy).

---

### DB-003 — Audit trail gaps: no logging for product, employee, cash operations

- **Severity**: High
- **Confidence**: High
- **Evidence**:
  - `audit-log.service.ts:153-173` — `record()` is called only from `OrdersService` and
    `ComandaService`.
  - Grep across `src/modules/`: no audit calls in product CRUD, employee CRUD, cash session
    open/close, cash movement create, mesa CRUD, comanda assignment (only read, no write log).
- **Impact**: Product catalog changes, employee hiring/termination, cash adjustments, and table
  management are invisible in the audit trail. These are high-value audit events for compliance
  (especially cash adjustments and employee record changes).
- **Recommendation**: Add `this.auditLogService.record(...)` calls in:
  - `ProductsService` (create, update, activate/deactivate)
  - `EmployeeService` (create, update, toggle active)
  - `CashSessionService` (open, close, force-close)
  - `CashMovementService` (create supply/withdrawal/adjustment)
  - `MesaService` (create, update, toggle active)
  - `ComandaService.assignComanda` (already has log, but no write-side log exists)
  - `AuthService` (user role changes, status changes)
- **Effort**: Medium (7-10 insertion points, ~3-5 lines each).

---

### DB-004 — TOCTOU in order stock verification

- **Severity**: Low
- **Confidence**: High
- **Evidence**:
  - `orders.service.ts:267-268` — `assertRequestedStockAvailability()` reads stock outside the
    transaction.
  - `orders.service.ts:371-385` — Actual decrement runs with `stock: { gte: requestedQuantity }`
    guard inside a `Serializable` transaction.
- **Impact**: Two concurrent orders can both pass the pre-check and enter the transaction. One
  will fail with "Estoque insuficiente" (user-facing error). No data corruption — the guard
  prevents negative stock. The pre-check is a UX fast-path that can produce false-negative
  errors under concurrency. Low severity because the correctness condition is held.
- **Recommendation**: Either move the stock check inside the transaction (preferable) or document
  the pre-check as a non-guarantee. The redundant read is harmless for correctness but wastes
  a DB round-trip.
- **Effort**: Low (reorder 3 lines inside the `$transaction` block).

---

### DB-005 — AuditLog.record() silently drops persistence failures

- **Severity**: High
- **Confidence**: High
- **Evidence**: `audit-log.service.ts:169-172`:
  ```
  } catch (error) {
      this.logger.warn('Nao foi possivel persistir audit log...')
      this.logger.debug(error)
  }
  ```
- **Impact**: If the DB is unavailable or the `AuditLog` table is full, all audit writes fail
  silently. No retry, no dead-letter queue, no alert. The system operates without audit
  coverage and nobody knows. This undermines the entire audit trail for compliance.
- **Recommendation**: At minimum, buffer failed writes to a local in-memory ring buffer with a
  periodic flush. Ideally, use a non-blocking async queue (pg-boss, BullMQ) for audit writes
  so they don't compete with the main transaction. Add a health-check that surfaces audit
  write failure rate.
- **Effort**: Medium (requires queue infrastructure or at least a ring-buffer + flush timer).

---

### DB-006 — Kitchen item writes use ReadCommitted instead of Serializable

- **Severity**: Medium
- **Confidence**: Medium
- **Evidence**: `comanda.service.ts:1233`:
  ```
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  ```
  All other Comanda/Order writes use `Serializable`.
- **Impact**: `updateKitchenItemStatus` reads `comandaItem` → `comanda` → propagates status. Under
  `ReadCommitted`, two concurrent kitchen status updates on sibling items of the same comanda
  can read stale comanda state and produce a derived status that doesn't reflect all writes.
  In practice this is low-risk (kitchen updates are serialized by humans), but inconsistent
  with the rest of the codebase's isolation posture.
- **Recommendation**: Use `Serializable` for consistency, or add an optimistic lock
  (`updatedAt` check) on the comanda row. The comment around this choice should explain why
  `ReadCommitted` was selected (likely to avoid serialization failures on a high-contention
  kitchen screen).
- **Effort**: Low (change one line, test retry logic).

---

### DB-007 — Product barcode unique constraint per user may be too restrictive

- **Severity**: Low
- **Confidence**: Medium
- **Evidence**: `schema.prisma:333` — `@@unique([userId, barcode])`.
- **Impact**: If a product has no barcode (legitimate — free-form items, bulk items), the `null`
  value in a composite unique constraint still compares as `NULL != NULL` in PostgreSQL ANSI
  mode, which means multiple products with `barcode = null` won't collide. However, Prisma's
  behavior with `@@unique` and nullable fields can be surprising across DB dialects. Not
  currently a bug but a schema design choice worth documenting.
- **Recommendation**: Document that `barcode = null` products are exempt from the uniqueness
  check. Add an integration test for two products with `barcode = null` + same `userId`.
- **Effort**: Low (add test + comment).

---

### DB-008 — No pagination cursor indexes on high-cardinality list queries

- **Severity**: Low
- **Confidence**: High
- **Evidence**: All list queries (`orders.service.ts:141`, `comanda.service.ts`) use `take: N` +
  `orderBy: createdAt: 'desc'` without cursor-based keyset pagination.
  - `schema.prisma:513-518` — Comanda compound indexes include `openedAt` ordering but none
    are designed as cursor-friendly (leading equality + trailing sort column).
- **Impact**: Offset-based pagination (`{ skip: N }`) degrades linearly. The current code doesn't
  use `skip`, so it's fine for now. But as the API grows and needs pagination, the current
  index design will require adding dedicated cursor indexes.
- **Recommendation**: When pagination is needed, add cursor-friendly indexes like
  `@@index([companyOwnerId, status, createdAt, id])` and use `{ cursor: { id }, take: N }`
  with a compound WHERE.
- **Effort**: Low (design note, no code change needed yet).

---

### DB-009 — `Comanda` has both `mesaId` and `tableLabel` — potential denormalization drift

- **Severity**: Low
- **Confidence**: Medium
- **Evidence**: `schema.prisma:484` — `tableLabel` (String) and `mesaId` (String?, FK → Mesa).
  `Mesa` also has `label` (String) at line 464.
- **Impact**: `tableLabel` is denormalized from `Mesa.label`. If a `Mesa.label` is updated
  after comandas are opened, comanda records will carry stale table labels. The code uses
  `resolvedTableLabel` from the mesa resolver, but historical comandas are not updated. This
  is potentially intentional (preserve history) but undocumented.
- **Recommendation**: Add a schema comment explaining the denormalization policy. If
  historical accuracy matters, denormalize explicitly. If not, remove `tableLabel` from
  `Comanda` and join through `Mesa` in read queries.
- **Effort**: Low (documentation only, unless column is removed — then medium).

---

### DB-010 — `stock` field on `Product` is `Int` — no fractional inventory support

- **Severity**: Low
- **Confidence**: High
- **Evidence**: `schema.prisma:320` — `stock Int`. Combo component consumption uses
  `totalUnits * quantity` (integer), correct.
- **Impact**: Cannot track fractional inventory (e.g., 1.5 kg of flour). All stock must be
  in whole-unit granularity. Acceptable for most retail use cases but may surface if
  weight-based products are ever added.
- **Recommendation**: If fractional inventory is needed, change `stock` to `Decimal` or add
  a `stockDecimal` column. Hold for now unless a feature request exists.
- **Effort**: Low (schema change + migration if needed).
- **Recommendation**: Change to `Serializable` with a retry-on-serialization-failure wrapper,
  matching the rest of the codebase's posture.
- **Effort**: Low (1-line change + retry wrapper).

---

## Summary

| ID     | Title                                    | Severity | Effort |
| ------ | ---------------------------------------- | -------- | ------ |
| DB-001 | Missing FK indexes (7 FKs)               | Medium   | Low    |
| DB-002 | CUID PK index fragmentation              | Low      | High   |
| DB-003 | Audit trail gaps (product/employee/cash) | High     | Medium |
| DB-004 | TOCTOU in stock pre-check                | Low      | Low    |
| DB-005 | Audit log silently drops failures        | High     | Medium |
| DB-006 | Kitchen items use ReadCommitted          | Medium   | Low    |
| DB-007 | Barcode unique constraint with null      | Low      | Low    |
| DB-008 | No cursor pagination indexes             | Low      | Low    |
| DB-009 | Denormalized tableLabel on Comanda       | Low      | Low    |
| DB-010 | stock Int — no fractional support        | Low      | Low    |

**Top priorities**: DB-005 (audit persistence), DB-003 (audit coverage), DB-001 (FK indexes).
