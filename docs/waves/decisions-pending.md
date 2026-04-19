# Decisions Pending

Date: 2026-04-17

Context: these are the architecture and delivery decisions that remain ambiguous enough to deserve explicit approval before the next implementation wave. Items already fixed by operator directive are recorded separately below.

Status update:

- All decisions in this document were resolved by operator directive on 2026-04-17.
- This file remains as the canonical record of what was pending, what was chosen, and which implementation constraints are now locked for the next phases.

## Resolved Directives During Fase 0

- `auth` is no longer treated as a normal single wave. It is a mini-program of its own, to be executed only after the earlier backend waves and under dedicated RFC/governance because it touches session handling, LGPD-sensitive flows, recovery, audit, and future mobile support.

### Auth Baseline Evidence

Current code confirms the mini-program framing:

- `apps/api/src/modules/auth/guards/session.guard.ts:10-12` authenticates from the session cookie path only.
- `apps/api/src/modules/auth/auth-session.service.ts:83-99` creates opaque session tokens and persists only `tokenHash`.
- `apps/api/src/modules/auth/auth-session.service.ts:318-343` writes session and CSRF cookies, not Bearer credentials.
- `apps/api/src/modules/auth/auth.controller.ts:63-89` exposes authenticated routes behind `SessionGuard` / `CsrfGuard`, with no refresh endpoint.
- `apps/web/lib/api-core.ts:67-81` and `apps/web/lib/api-auth.ts:147-259` consume auth through `credentials: 'include'`, CSRF, and cookie-backed session assumptions.

Immediate implication:

- auth cannot be safely folded into a standard module migration after `employees`
- auth needs its own RFC stack, contract decisions, storage strategy, and coordinated backend/web rollout

## Resolved Decisions

### 1. Global Error Filter Ownership — RESOLVED

Why this is pending:

- The current runtime filter is `HttpExceptionFilter` in `apps/api/src/common/filters/http-exception.filter.ts`.
- It serializes the legacy shape and does not distinguish `AppError`, `Result`-translated domain failures, and generic Nest `HttpException`.

Options:

- Option A: retrofit the existing `HttpExceptionFilter`
- Option B: introduce a new `AppExceptionFilter` and make it the single error envelope authority

Original recommendation:

- Choose Option B.
- Keep `HttpException` support inside the adapter layer, but make the new filter the sole owner of `{ "error": { "code", "message", "details?" } }`.

Decision:

- Option B accepted.

Locked constraints:

- Create a new `AppExceptionFilter` as the single owner of the public error envelope.
- Mark the legacy `HttpExceptionFilter` as deprecated in code.
- Remove the legacy filter only in the final removals stage, with a dedicated commit when no imports remain.

Why:

- The target architecture explicitly separates expected business errors, infra errors, and translation at the Nest boundary.
- A dedicated filter name prevents keeping legacy semantics by accident.

### 2. Exact Shape Of `error.details` — RESOLVED

Why this is pending:

- Validation failures from `ZodValidationPipe` currently emit a string array via `BadRequestException`.
- Domain and infra failures will need structured details without leaking unstable internals.

Options:

- Option A: free-form object, module decides ad hoc
- Option B: stable object with optional `issues` array for validation and module-specific keys for domain conflicts
- Option C: raw Zod issue array for validation, raw exception payload otherwise

Original recommendation:

- Choose Option B.

Suggested baseline:

- validation: `{ issues: [{ path: string[], code: string, message: string }] }`
- domain conflict: module-specific named fields only
- infra error: omit `details` unless the information is safe and actionable

Why:

- It preserves machine-readability without freezing library-specific payloads into the public API.

Decision:

- Option B accepted.

Locked constraints:

- Validation errors must use the fixed shape:
  - `{ "error": { "code": "validation_error", "message": "Dados inválidos", "details": { "issues": [{ "path": string[], "code": string, "message": string }] } } }`
- `path` is always an array, never a dot-notation string.
- `code` comes from the native Zod issue code.
- `message` is always in PT-BR.
- Each module must document the `details` shape for each domain error kind in its `<module>.errors.ts`.
- Those documented shapes must also appear in the OpenAPI error schemas for the relevant endpoints.
- Raw payload exposure is explicitly forbidden:
  - never expose raw `ZodError`
  - never expose raw Prisma error messages
  - never expose stack traces in production

### 3. Correlation ID Trust Policy — RESOLVED

Why this is pending:

- `apps/api/src/app.module.ts:70-78` and `apps/api/src/main.ts:120-135` already propagate `x-request-id`, but there is no explicit policy defining whether inbound IDs are trusted, normalized, or always replaced.

Options:

- Option A: trust any inbound `X-Request-Id`
- Option B: always generate a new internal ID
- Option C: accept inbound value only if it matches a strict format; otherwise generate a new one

Original recommendation:

- Choose Option C.

Why:

- It preserves trace continuity for trusted callers while avoiding log pollution and malformed IDs.

Decision:

- Option C accepted.

Locked constraints:

- Accept inbound `X-Request-Id` only if it matches one of:
  - valid UUID v4
  - valid ULID
  - alphanumeric string with 8 to 128 characters and no special characters
- Any other inbound value must be discarded and replaced with a newly generated UUID v4.
- The generated internal format is always UUID v4.
- The header must be propagated as `X-Request-Id` on both request handling and response output.
- The structured log field name is `requestId` in camelCase.

### 4. Orders Pagination Standard — RESOLVED

Why this is pending:

- The plan requires a single standard for `orders`, but the current modernization plan does not lock `cursor` versus `offset`.

Original options:

- Option A: offset pagination
- Option B: cursor pagination using `(createdAt, id)`

Original recommendation:

- Choose Option B for new `v1` list endpoints in migrated modules.

Why:

- It is more stable under concurrent writes.
- It aligns better with future mobile consumption and scrolling feeds.

Decision:

- Hybrid policy accepted, split by use case.

Locked constraints:

- Use cursor pagination for operational/feed surfaces:
  - active comandas
  - recent orders
  - infinite-scroll lists
  - mobile/staff operational flows
- Use offset pagination for report/history surfaces:
  - day closing
  - monthly reports
  - exports
  - numbered historical views where the operator expects page navigation
- Cursor pagination format is now fixed:
  - request: `?cursor=<opaque_base64>&limit=50`
  - max limit: `100`
  - default limit: `50`
  - response: `{ data: [...], pageInfo: { nextCursor, hasNextPage } }`
  - invalid cursor returns `400` with stable code `invalid_cursor`
- Offset pagination format is now fixed:
  - request: `?page=1&pageSize=50`
  - max page size: `100`
  - response: `{ data: [...], pageInfo: { page, pageSize, totalItems, totalPages, hasNextPage, hasPreviousPage } }`
- OpenAPI must expose distinct pagination schemas:
  - `CursorPaginated<T>`
  - `OffsetPaginated<T>`
- Each endpoint must explicitly document which pagination strategy it uses and why.

### 5. Auth Token Model For The Mini-Program — RESOLVED

Why this is pending:

- Current auth is cookie-backed session storage only.
- The future design must support existing web cookies plus mobile-ready Bearer/JWT and refresh rotation without regressing LGPD, audit, or rate limiting.

Options:

- Option A: opaque access token + opaque refresh token
- Option B: short-lived JWT access token + opaque hashed refresh token persisted and rotated
- Option C: JWT access token + JWT refresh token

Original recommendation:

- Choose Option B.

Why:

- JWT access tokens solve mobile Bearer transport cleanly.
- Opaque refresh tokens keep rotation, revocation, and blacklist semantics under server control.
- This avoids long-lived self-contained refresh tokens that are harder to revoke safely.

Decision:

- Option B accepted.

Locked constraints:

- Access token:
  - short-lived JWT
- Refresh token:
  - opaque
  - persisted
  - hashed with SHA-256
  - rotated on use
- Refresh token rotation must include replay detection:
  - if an already-rotated refresh token is reused, invalidate the whole refresh-token family immediately
  - force complete re-login
  - emit a security audit event with warning or error severity
- Refresh token TTL:
  - 30 days sliding expiration
  - hard cap at 90 days
- Refresh token family model:
  - each login creates a `family_id`
  - rotation advances within that family
  - replay invalidates the entire family
- JWT key rotation:
  - `kid` in JWT header
  - multiple active verification keys supported
  - old tokens remain valid until natural expiration
- JWT claims must stay minimal:
  - `sub`
  - `tenantId`
  - `role`
  - `iat`
  - `exp`
  - `jti`
- JWT must never include:
  - email
  - name
  - CPF
  - any personal data

Auth mini-program gate tests that are now mandatory:

- replay of rotated refresh token invalidates the entire family
- expired access token is rejected even when refresh is still valid
- logout revokes refresh immediately
- brute force on login is rate-limited
- JWT with unknown `kid` is rejected
- JWT with invalid signature is rejected
- token from one tenant cannot access another tenant's resources

### 6. Rollback Tag Semantics While The Worktree Is Dirty — RESOLVED

Why this is pending:

- The requested checkpoint tag must point to a commit, but the local workspace already contains uncommitted validated work from prior steps.

Options:

- Option A: tag the last committed checkpoint only
- Option B: create a broad snapshot commit first, then tag it
- Option C: skip tag creation until the worktree is clean

Original recommendation:

- Choose Option A for Fase 0, and document the limitation explicitly.

Current action taken:

- `refactor-foundation-stable` was created on commit `c8b1d6f`

Why:

- It gives a real rollback point without force-committing unrelated local changes into a synthetic snapshot.

Decision:

- Option A accepted for this transition only.

Locked constraints:

- Keep `refactor-foundation-stable` on commit `c8b1d6f` as the pre-Fase-0 rollback marker.
- Create `phase-0-complete` on the merge commit of `docs/baseline-and-diagnosis` into `main`.
- From this point on, a phase or wave may only be closed when:
  - the worktree is clean
  - the branch is merged
  - the completion tag is created on the merge commit in `main`
- Future tags must follow the pattern:
  - `phase-0-complete`
  - `wave-<n>-<module>-complete`
- This tag discipline must be documented in the operational runbook under tag and rollback policy.

## Auth Mini-Program Implications

This is not a pending decision anymore; it is a planning constraint that must shape later RFCs:

- auth gets its own RFC stack and approval cadence
- the mini-program must cover cookie web flows and Bearer/JWT mobile flows together
- refresh rotation, revocation, audit, consent versioning, email verification, and rate limiting are in scope from day one of that mini-program

## Cross-Cutting Architectural Constraints

### Tenant Isolation

Desk Imperial is multi-tenant. Each commercial establishment is an isolated tenant. Tenant isolation is a cross-cutting architectural invariant that every wave must preserve, not an auth-only concern.

Locked constraints:

- Every tenant-scoped resource must have `tenantId` as a required field in the domain model and in persistence.
- Repositories must always filter by `tenantId` when reading tenant-scoped resources.
- Repositories must always validate `tenantId` ownership on write operations:
  - `update`
  - `delete`
  - any mutation that changes a tenant-scoped resource
- Services must receive `tenantId` explicitly, either as a direct parameter or through an explicit request-context type.
- Services must never infer tenant scope implicitly from unrelated identifiers.
- Guards must extract `tenantId` from the authenticated identity and inject it into the request context consumed by downstream layers.
- No cross-tenant query is allowed unless there is an explicit administrative operation flag.
- No such administrative cross-tenant operation exists in the current modernization scope.
- Repository unit tests must include at least one negative isolation scenario per migrated module:
  - wrong tenant returns no data
  - wrong tenant cannot mutate the resource

Wave exit criteria extension for every tenant-scoped module:

- [ ] Domain model has required `tenantId`
- [ ] Repository filters by `tenantId` on reads
- [ ] Repository validates `tenantId` on writes
- [ ] Cross-tenant isolation test exists
