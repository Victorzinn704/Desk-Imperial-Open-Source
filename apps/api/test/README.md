# API Tests as Documentation

This folder is not only for regression safety.
It is also a practical documentation layer for open source users.

## 1. Why this matters

With MIT licensing, users can reuse, adapt and extend the project.
Well-structured tests reduce guesswork and increase trust because they show:

- expected behavior
- error handling rules
- authorization boundaries
- domain invariants in real scenarios

## 2. How to read this folder

Suggested reading order for newcomers:

1. auth and guards
2. operations and realtime
3. products and orders
4. finance and analytics
5. infrastructure and edge-case utilities

## 3. Domain map (examples)

- Auth and security: auth.service.spec.ts, session.guard.spec.ts, csrf.guard.spec.ts, admin-pin.guard.spec.ts
- Operations core: operations-service.spec.ts, operations.facade.service.spec.ts, comanda.service.\*.spec.ts, cash-session.service.spec.ts
- Realtime: operations-realtime.\*.spec.ts, operations-types.realtime.spec.ts
- Products: products.service.spec.ts, products-import.util.spec.ts
- Finance: finance.service.spec.ts, pillars.service.spec.ts, finance-analytics.util.spec.ts
- Infra/runtime: prisma.service.spec.ts, cache.service.spec.ts, env.validation.spec.ts, infrastructure.utils.spec.ts

## 4. Test writing contract

When adding or changing business logic:

- add at least one happy path test
- add at least one guard/error path test
- include role or ownership assertions when authorization is relevant
- include cache/realtime side effects when the flow emits events or invalidates keys
- keep test names behavior-oriented (what + expected result)

## 5. Open source confidence checklist

Before opening a PR:

- verify changed flows have tests in this folder
- prefer clear fixtures and deterministic dates/ids
- avoid opaque mocks when behavior can be explicit
- document non-obvious business rules in test names or short comments

The goal is simple: a contributor should understand the domain by reading tests, even before reading every service implementation.
