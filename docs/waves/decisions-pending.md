# Decisions Pending

Date: 2026-04-17

Context: these are the architecture and delivery decisions that remain ambiguous enough to deserve explicit approval before the next implementation wave. Items already fixed by operator directive are recorded separately below.

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

## Pending Decisions

### 1. Global Error Filter Ownership

Why this is pending:

- The current runtime filter is `HttpExceptionFilter` in `apps/api/src/common/filters/http-exception.filter.ts`.
- It serializes the legacy shape and does not distinguish `AppError`, `Result`-translated domain failures, and generic Nest `HttpException`.

Options:

- Option A: retrofit the existing `HttpExceptionFilter`
- Option B: introduce a new `AppExceptionFilter` and make it the single error envelope authority

Recommendation:

- Choose Option B.
- Keep `HttpException` support inside the adapter layer, but make the new filter the sole owner of `{ "error": { "code", "message", "details?" } }`.

Why:

- The target architecture explicitly separates expected business errors, infra errors, and translation at the Nest boundary.
- A dedicated filter name prevents keeping legacy semantics by accident.

### 2. Exact Shape Of `error.details`

Why this is pending:

- Validation failures from `ZodValidationPipe` currently emit a string array via `BadRequestException`.
- Domain and infra failures will need structured details without leaking unstable internals.

Options:

- Option A: free-form object, module decides ad hoc
- Option B: stable object with optional `issues` array for validation and module-specific keys for domain conflicts
- Option C: raw Zod issue array for validation, raw exception payload otherwise

Recommendation:

- Choose Option B.

Suggested baseline:

- validation: `{ issues: [{ path: string, code: string, message: string }] }`
- domain conflict: module-specific named fields only
- infra error: omit `details` unless the information is safe and actionable

Why:

- It preserves machine-readability without freezing library-specific payloads into the public API.

### 3. Correlation ID Trust Policy

Why this is pending:

- `apps/api/src/app.module.ts:70-78` and `apps/api/src/main.ts:120-135` already propagate `x-request-id`, but there is no explicit policy defining whether inbound IDs are trusted, normalized, or always replaced.

Options:

- Option A: trust any inbound `X-Request-Id`
- Option B: always generate a new internal ID
- Option C: accept inbound value only if it matches a strict format; otherwise generate a new one

Recommendation:

- Choose Option C.

Why:

- It preserves trace continuity for trusted callers while avoiding log pollution and malformed IDs.

### 4. Orders Pagination Standard

Why this is pending:

- The plan requires a single standard for `orders`, but the current modernization plan does not lock `cursor` versus `offset`.

Options:

- Option A: offset pagination
- Option B: cursor pagination using `(createdAt, id)`

Recommendation:

- Choose Option B for new `v1` list endpoints in migrated modules.

Why:

- It is more stable under concurrent writes.
- It aligns better with future mobile consumption and scrolling feeds.

### 5. Auth Token Model For The Mini-Program

Why this is pending:

- Current auth is cookie-backed session storage only.
- The future design must support existing web cookies plus mobile-ready Bearer/JWT and refresh rotation without regressing LGPD, audit, or rate limiting.

Options:

- Option A: opaque access token + opaque refresh token
- Option B: short-lived JWT access token + opaque hashed refresh token persisted and rotated
- Option C: JWT access token + JWT refresh token

Recommendation:

- Choose Option B.

Why:

- JWT access tokens solve mobile Bearer transport cleanly.
- Opaque refresh tokens keep rotation, revocation, and blacklist semantics under server control.
- This avoids long-lived self-contained refresh tokens that are harder to revoke safely.

### 6. Rollback Tag Semantics While The Worktree Is Dirty

Why this is pending:

- The requested checkpoint tag must point to a commit, but the local workspace already contains uncommitted validated work from prior steps.

Options:

- Option A: tag the last committed checkpoint only
- Option B: create a broad snapshot commit first, then tag it
- Option C: skip tag creation until the worktree is clean

Recommendation:

- Choose Option A for Fase 0, and document the limitation explicitly.

Current action taken:

- `refactor-foundation-stable` was created on commit `c8b1d6f`

Why:

- It gives a real rollback point without force-committing unrelated local changes into a synthetic snapshot.

## Auth Mini-Program Implications

This is not a pending decision anymore; it is a planning constraint that must shape later RFCs:

- auth gets its own RFC stack and approval cadence
- the mini-program must cover cookie web flows and Bearer/JWT mobile flows together
- refresh rotation, revocation, audit, consent versioning, email verification, and rate limiting are in scope from day one of that mini-program
