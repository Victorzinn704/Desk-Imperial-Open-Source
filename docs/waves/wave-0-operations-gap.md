# Wave 0 - Operations Gap Audit

Date: 2026-04-17

Conclusion: `operations` is not yet 100% aligned with the mandatory architecture. A stabilization wave is required before `products`.

## Checklist Result

| Checklist item                                                         | Status | Evidence                                                                                                                                                                             | Gap summary                                                                                                                            |
| ---------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Repository isolates Prisma completely                                  | No     | `apps/api/src/modules/operations/operations.module.ts:15-17`, `operations.service.ts:38`, `cash-session.service.ts:39`, `comanda.service.ts:59`, `operations-helpers.service.ts:159` | Prisma is still injected and queried directly inside services/helpers. There is no repository boundary in the module.                  |
| Service returns `Result<T, E>` for expected business failures          | No     | `cash-session.service.ts:66-79`, `cash-session.service.ts:145-160`, `comanda.service.ts:170`, `comanda.service.ts:376-410`, `operations.service.ts:219-336`                          | Expected domain failures still throw Nest HTTP exceptions from service code.                                                           |
| Discriminated unions exist for `Comanda`, `CashSession`, related state | No     | `operations.types.ts:1-113`, `operations.types.ts:180-200`, `cash-session.service.ts:158`, `comanda.service.ts:376`, `comanda.service.ts:873-881`                                    | State branching still relies on Prisma enums and optional fields instead of domain-safe unions.                                        |
| Mapper path is `PrismaRecord -> Domain -> Transport`                   | No     | `operations.types.ts:1`, `operations.types.ts:180-200`, `cash-response.utils.ts:18`, `comanda-response.utils.ts:18`                                                                  | Mapping goes directly from Prisma-shaped records to transport records. Domain model layer is missing.                                  |
| Controller is thin                                                     | Yes    | `operations.controller.ts:68-255`                                                                                                                                                    | Handlers validate with `ZodValidationPipe` and delegate without embedding business logic.                                              |
| Service tests use repository mocks                                     | No     | `apps/api/test/cash-session.service.spec.ts:21-36`, `apps/api/test/comanda.service.open-comanda-realtime.spec.ts:42-135`, `apps/api/test/operations-helpers.service.spec.ts:6-29`    | Tests still mock Prisma directly, so there is no seam proving service/repository separation.                                           |
| Global ExceptionFilter matches unified error envelope                  | No     | `apps/api/src/common/filters/http-exception.filter.ts:41-47`, `apps/api/src/common/pipes/zod-validation.pipe.ts:15-23`, `apps/api/src/main.ts:257-264`                               | Runtime errors still serialize to `{ statusCode, message, path, timestamp, requestId }`, not `{ error: { code, message, details? } }`. |
| Schemas registered in OpenAPI registry                                 | Yes    | `apps/api/src/modules/operations/operations.openapi.ts:50-488`, `apps/api/src/common/openapi/document.ts:20`                                                                         | The `operations` schemas and paths are wired into the registry and generated document.                                                 |

## Detailed Findings

### 1. Prisma Still Leaks Past The Persistence Boundary

Evidence:

- `apps/api/src/modules/operations/operations.service.ts:192-206` queries `mesa` and `comanda` directly.
- `apps/api/src/modules/operations/cash-session.service.ts:69-116` writes `cashSession` and `cashMovement` directly inside Prisma transactions.
- `apps/api/src/modules/operations/comanda.service.ts:155-176` reads `comanda` directly for details and also orchestrates large Prisma transactions later in the file.
- `apps/api/src/modules/operations/operations-helpers.service.ts:157-258` keeps `PrismaService` as a first-class collaborator for snapshot building and authorization helpers.

Impact:

- ORM details still shape service contracts and tests.
- Any future Prisma schema change still ripples into the domain layer.

### 2. Expected Business Errors Are Still HTTP Exceptions

Evidence:

- `apps/api/src/modules/operations/cash-session.service.ts:66`, `79`, `146`, `159`, `234`, `247`
- `apps/api/src/modules/operations/comanda.service.ts:170`, `209`, `376`, `498`, `641`, `789`, `873`, `877`, `881`, `1044`, `1048`, `1052`
- `apps/api/src/modules/operations/operations-helpers.service.ts:200`, `222`
- `apps/api/src/modules/operations/operations.service.ts:220`, `261`, `322`, `336`

Impact:

- Domain rules are coupled to Nest HTTP semantics.
- A later `Result -> HTTP` translator would require moving logic, not only changing surface adapters.

### 3. Domain State Is Not Expressed As Discriminated Unions

Evidence:

- `apps/api/src/modules/operations/operations.types.ts` imports Prisma models directly and builds `Pick<>` aliases over Prisma entities.
- `apps/api/src/modules/operations/comanda.service.ts:376`, `641`, `873-881`, `1044-1052` branch on raw status values.
- `apps/api/src/modules/operations/cash-session.service.ts:158`, `234` branch on raw `CashSessionStatus`.

Impact:

- Status-safe narrowing is unavailable.
- Invalid state combinations can still be represented implicitly.

### 4. Transport Mapping Exists, But Domain Mapping Does Not

Evidence:

- `apps/api/src/modules/operations/operations.types.ts:114-200` converts Prisma-like records directly into transport records.
- `apps/api/src/modules/operations/cash-response.utils.ts` and `comanda-response.utils.ts` assemble response payloads without an explicit domain layer between persistence and transport.

Impact:

- The module has transport mappers, but not repository/domain boundaries.
- This is enough for API consistency, not enough for the target architecture.

### 5. Thin Controller And OpenAPI Integration Are Already Correct

Confirmed:

- `apps/api/src/modules/operations/operations.controller.ts` keeps handlers as boundary adapters only.
- `apps/api/src/modules/operations/operations.schemas.ts` plus `operations.openapi.ts` are already connected to the central registry via `apps/api/src/common/openapi/document.ts:20`.

Impact:

- The stabilization wave should not revisit controller shape or OpenAPI registration except where error responses change.

## Minimum Stabilization Scope

The following items are the minimum justified scope for a dedicated stabilization wave:

- Introduce repository boundaries for the persistence-heavy slices inside `operations`.
- Define `OperationsError` discriminated unions and switch expected failures from `throw` to `Result<T, E>`.
- Replace Prisma-derived state handling with explicit domain types for `Comanda`, `CashSession`, and related aggregates.
- Move HTTP error translation to a boundary translator + unified global exception filter.
- Update service tests to mock repositories instead of mocking Prisma directly.

## Recommendation

Do not open `products` yet.

Required next step:

- open a dedicated RFC for `wave-0-operations-stabilization`
- keep the scope limited to persistence boundaries, domain error flow, error envelope, and test seams
- avoid opportunistic cleanup outside `operations`
