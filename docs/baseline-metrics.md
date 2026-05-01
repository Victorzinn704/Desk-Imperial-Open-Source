# Baseline Metrics

Date: 2026-04-17

Scope: Fase 0 da rodada de fechamento da modernizacao. Este snapshot foi coletado antes de abrir qualquer wave funcional nova.

Reference map: `docs/architecture/system-map.md`

## Command Snapshot

| Metric                    | Command                                  | Result                | Notes                                                 |
| ------------------------- | ---------------------------------------- | --------------------- | ----------------------------------------------------- |
| Root typecheck            | `npm run typecheck`                      | 21.584s               | Green                                                 |
| API build                 | `npm --workspace @partner/api run build` | 22.266s               | Green                                                 |
| Web build                 | `npm --workspace @partner/web run build` | 26.161s               | Green                                                 |
| Types build               | n/a                                      | n/a                   | `packages/types` has no `build` script                |
| API contract build        | n/a                                      | n/a                   | `packages/api-contract` is generated artifact package |
| Full workspace test suite | `npm run test`                           | 22.603s until failure | Red; failed before full completion                    |
| Lint warning map          | `npm run quality:warnings`               | 13.9s                 | 592 warnings, 0 errors, 3 alerts                      |
| OpenAPI route count       | `node -e ...openapi.json...`             | 18 routes             | Counted from `packages/api-contract/openapi.json`     |

## Current Baseline Status

### Green

- Root `typecheck`
- API build
- Web build
- No `console.*` usage in backend source (`apps/api/src`)
- OpenAPI artifact present at `packages/api-contract/openapi.json`

### Red Or Blocked

- Full test suite is not green.
- Backend cold start metric could not be measured because `npm --workspace @partner/api run start` exited with code `1` before binding HTTP.

## Full Test Baseline

Command: `npm run test`

Observed failures on 2026-04-17:

- `apps/web/components/dashboard/dashboard-shell.render.test.tsx`
  - expected desktop shell width token `224px`, got `232px`
  - expected compact shell width token `64px`, got `68px`
- `apps/api/test/be-01-operational-smoke.spec.ts`
  - `MaxRetriesPerRequestError` from Redis (`ioredis`) in smoke scenario

Interpretation:

- The workspace-wide gate is currently red before any new wave starts.
- The backend smoke failure is environment-dependent and consistent with the repo runbook note that Redis-backed smoke must be available before trusting the backend coverage/test baseline.
- The web failure is deterministic and unrelated to the modernization plan; it should be triaged as existing baseline drift, not silently absorbed into a future refactor wave.

## Coverage Snapshot

Coverage values below come from the latest on-disk workspace artifacts:

- `apps/api/coverage/coverage-summary.json` modified `2026-04-13T01:34:54.306Z`
- `apps/web/coverage/coverage-summary.json` modified `2026-04-14T12:59:38.552Z`

| Workspace | Lines  | Branches | Functions | Statements | Source                                    |
| --------- | ------ | -------- | --------- | ---------- | ----------------------------------------- |
| API       | 90.54% | 75.21%   | 91.96%    | 90.72%     | `apps/api/coverage/coverage-summary.json` |
| Web       | 69.11% | 60.00%   | 66.18%    | 68.47%     | `apps/web/coverage/coverage-summary.json` |

Note:

- This is the latest known coverage baseline available locally.
- A fresh full coverage run was not adopted as the baseline because the current full suite is red and the API smoke path depends on Redis-backed execution.

## Web Production Artifact Size

Measured after `npm --workspace @partner/web run build`:

- `.next` total size: `1,275,892,125` bytes
- `.next/standalone`: not emitted in the current build configuration

This metric is intentionally recorded as the full local production artifact size, not just first-load JS.

## Backend Cold Start

Attempted command path:

- build: `npm --workspace @partner/api run build`
- boot attempt: `npm --workspace @partner/api run start`
- target probe: `GET http://127.0.0.1:4000/api/v1/health`

Result:

- status: not measurable in this snapshot
- reason: start command exited with code `1` before the server bound HTTP
- stdout: only the npm script banner and `node ./scripts/start-dist.mjs`
- stderr: npm lifecycle failure wrapper only; no application stack trace was emitted

This is now a baseline blocker for the future transversal operational wave because graceful shutdown and health checks are irrelevant if the built runtime cannot be boot-profiled reliably.

## Static Analysis Snapshot

### TypeScript And `any`

- Explicit `any` matches across `apps/` and `packages/`: `435`
- Explicit `any` matches in non-test source files only: `3`
- Implicit `any` surfaced by compiler: `0`

Non-test source `any` occurrences:

- `apps/api/src/modules/employees/employees.service.ts:208`
- `apps/api/src/modules/employees/employees.service.ts:232`
- `apps/web/components/shared/use-offline-queue.ts:111`

### `@ts-ignore` And `@ts-expect-error`

Count: `3`

Files:

- `apps/web/lib/cookie-consent.test.ts:205`
- `apps/web/lib/cookie-consent.test.ts:211`
- `apps/web/components/pdv/pdv-operations.coverage.test.ts:58`

### Backend `console.*`

- Count: `0`
- Files: none under `apps/api/src`

## Validation Stack Baseline

Current `class-validator` / `class-transformer` usage in backend source: `21` files

By module:

- `admin-pin`
  - `apps/api/src/modules/admin-pin/dto/remove-pin.dto.ts`
  - `apps/api/src/modules/admin-pin/dto/setup-pin.dto.ts`
  - `apps/api/src/modules/admin-pin/dto/verify-pin.dto.ts`
- `auth`
  - `apps/api/src/modules/auth/dto/demo-login.dto.ts`
  - `apps/api/src/modules/auth/dto/forgot-password.dto.ts`
  - `apps/api/src/modules/auth/dto/login.dto.ts`
  - `apps/api/src/modules/auth/dto/register.dto.ts`
  - `apps/api/src/modules/auth/dto/reset-password.dto.ts`
  - `apps/api/src/modules/auth/dto/update-profile.dto.ts`
  - `apps/api/src/modules/auth/dto/verify-email.dto.ts`
- `consent`
  - `apps/api/src/modules/consent/dto/update-cookie-preferences.dto.ts`
- `employees`
  - `apps/api/src/modules/employees/dto/create-employee.dto.ts`
  - `apps/api/src/modules/employees/dto/update-employee.dto.ts`
- `geocoding`
  - `apps/api/src/modules/geocoding/dto/lookup-postal-code.dto.ts`
- `market-intelligence`
  - `apps/api/src/modules/market-intelligence/dto/get-market-insight.body.dto.ts`
- `orders`
  - `apps/api/src/modules/orders/dto/create-order.dto.ts`
  - `apps/api/src/modules/orders/dto/list-orders.query.ts`
- `products`
  - `apps/api/src/modules/products/dto/create-product.dto.ts`
  - `apps/api/src/modules/products/dto/list-products.query.ts`
  - `apps/api/src/modules/products/dto/product-combo-item.dto.ts`
  - `apps/api/src/modules/products/dto/update-product.dto.ts`

## Security And Dependency Snapshot

### `npm audit --json`

Summary:

- total vulnerabilities: `14`
- critical: `1`
- high: `4`
- moderate: `6`
- low: `3`

Highest-impact entries observed:

- `protobufjs` critical advisory, fix available
- `@nestjs/cli` high-severity chain, with fix path also removing multiple transitive advisories
- `glob` high advisory via `@nestjs/cli`
- `picomatch` high advisory via Nest CLI transitive tree
- `vite` high advisory in frontend toolchain

### `npm outdated --json`

Highest-impact outdated dependencies observed:

- `@nestjs/cli` `10.3.2 -> 11.0.21`
- `prisma` and `@prisma/client` `6.19.3 -> 7.7.0`
- `next` `16.2.3 -> 16.2.4`
- `turbo` `2.8.17 -> 2.9.6`
- `typescript-eslint` `8.57.0 -> 8.58.2`
- `vitest` `4.1.3 -> 4.1.4`
- `react` / `react-dom` `19.2.4 -> 19.2.5`

Interpretation:

- Security debt exists but is concentrated in tooling and transitive chains, especially around Nest CLI and Vite.
- Major upgrades for Prisma and TypeScript exist but should not be mixed into the modernization waves without dedicated RFC scope.

## Notes For The Next Gate

- The foundation checkpoint tag `refactor-foundation-stable` was created on commit `c8b1d6f` because the local worktree already contained uncommitted changes. This tag is a committed rollback marker, not a snapshot of every local file currently modified.
- `operations` is not fully compliant with the target architecture yet; see `docs/waves/wave-0-operations-gap.md`.
- `auth` must be treated as a mini-program with its own RFC stack; see `docs/waves/decisions-pending.md`.
