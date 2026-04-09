# Mapa do Repositorio — Desk Imperial

**Data:** 2026-04-09
**Caminho:** `C:\Users\Desktop\Documents\desk-imperial`
**Branch:** master (PRs → main)
**Total:** ~54k linhas TS/TSX, ~69k arquivos totais (incluindo node_modules, dist, cache)

---

## 1. Estrutura Macro

```
desk-imperial/
├── apps/
│   ├── api/                    # NestJS backend (@partner/api)
│   │   ├── src/
│   │   │   ├── common/         # Utils, guards, interceptors, services compartilhados
│   │   │   ├── database/       # Prisma service
│   │   │   └── modules/        # Feature modules
│   │   │       ├── admin-pin/
│   │   │       ├── auth/       # 2433 linhas — modulo de autenticacao
│   │   │       ├── consent/
│   │   │       ├── employees/
│   │   │       ├── finance/
│   │   │       ├── geocoding/
│   │   │       ├── mailer/
│   │   │       ├── monitoring/ # Audit log
│   │   │       ├── operations/ # Comanda, cash session, mesa
│   │   │       ├── operations-realtime/
│   │   │       ├── orders/
│   │   │       └── products/
│   │   ├── prisma/
│   │   │   └── schema.prisma   # 598 linhas — 15 models
│   │   ├── test/               # Testes backend
│   │   ├── scripts/
│   │   └── dist/               # Build output
│   └── web/                    # Next.js 16 frontend (@partner/web)
│       ├── app/                # App Router
│       ├── components/         # Por dominio: auth, dashboard, marketing, pdv, operations, etc.
│       ├── hooks/
│       ├── lib/                # api.ts (1315 linhas), validation, utils
│       ├── providers/
│       ├── public/
│       ├── scripts/
│       ├── test/
│       └── e2e/                # Playwright E2E
├── packages/
│   └── types/
│       └── src/
│           └── contracts.ts    # 465 linhas — contratos compartilhados
├── infra/
│   ├── docker/
│   │   ├── docker-compose.yml  # Postgres 16 + Redis 7
│   │   ├── docker-compose.observability.yml
│   │   └── observability/      # Grafana, Loki, Tempo, Prometheus, Alertmanager, Alloy, Blackbox
│   ├── oracle/                 # Deploy Oracle Cloud
│   │   ├── docker/
│   │   ├── nginx/
│   │   └── ops/
│   └── scripts/
├── tests/
│   └── load/k6/               # Load tests com k6
├── docs/                       # Documentacao extensa
│   ├── agents/
│   ├── architecture/
│   ├── case-studies/
│   ├── email/
│   ├── frontend/
│   ├── operations/
│   ├── product/
│   ├── release/
│   ├── security/
│   └── testing/
├── scripts/                    # Scripts de automacao do repo
├── .github/
│   ├── workflows/
│   │   ├── ci.yml              # CI completa: lint, typecheck, tests, E2E, security, k6 latency gate
│   │   ├── sonarqube.yml       # SonarQube scan
│   │   └── ci-release-proposal.yml
│   └── actions/setup-node-workspace/
├── .local-tools/sonarqube-26.3.0.120487/  # SonarQube local
├── .secrets/
├── logs/
└── .interface-design/
```

---

## 2. Stack Tecnolog

| Camada        | Tecnologia                                                 | Versao      |
| ------------- | ---------------------------------------------------------- | ----------- |
| Frontend      | Next.js 16 (Turbopack) + React 19 + TypeScript             | 5.9.3       |
| Backend       | NestJS + TypeScript                                        | 5.9.3       |
| Database      | Neon PostgreSQL (serverless)                               | Prisma ORM  |
| Cache         | Redis (ioredis)                                            | 7-alpine    |
| Realtime      | Socket.IO + Redis adapter                                  | -           |
| Auth          | JWT + cookies HTTP-only + CSRF sessionStorage              | Argon2      |
| Monorepo      | Turborepo + npm workspaces                                 | turbo 2.5.6 |
| Styles        | Tailwind CSS + Framer Motion v12                           | -           |
| Tests         | Jest (backend) + Vitest/Playwright (frontend)              | -           |
| Load          | k6                                                         | -           |
| CI            | GitHub Actions                                             | Node 22     |
| Deploy        | Railway (web)                                              | -           |
| Observability | Grafana + Loki + Tempo + Prometheus + Alertmanager + Alloy | -           |
| Quality       | SonarQube 26.3.0                                           | -           |
| Lint          | ESLint 9 + Prettier 3                                      | -           |
| Hooks         | Husky + lint-staged                                        | -           |

---

## 3. Modulos do Sistema

| Modulo              | Caminho                                     | Linhas               | Descricao                                                                      |
| ------------------- | ------------------------------------------- | -------------------- | ------------------------------------------------------------------------------ |
| Auth                | `apps/api/src/modules/auth/`                | 2433 (service)       | Login, registro, JWT, refresh, email verification, password reset, demo access |
| Operations          | `apps/api/src/modules/operations/`          | 1607+1451 (services) | Comanda, mesa, cash session, kitchen                                           |
| Products            | `apps/api/src/modules/products/`            | 772                  | CRUD produtos, combos, import                                                  |
| Orders              | `apps/api/src/modules/orders/`              | 726                  | Pedidos, historico                                                             |
| Finance             | `apps/api/src/modules/finance/`             | 540+558              | KPIs, relatorios, analytics                                                    |
| Employees           | `apps/api/src/modules/employees/`           | -                    | Folha, ranking, metas                                                          |
| Admin PIN           | `apps/api/src/modules/admin-pin/`           | -                    | PIN 4 digitos, rate limit                                                      |
| Monitoring          | `apps/api/src/modules/monitoring/`          | -                    | Audit log                                                                      |
| Mailer              | `apps/api/src/modules/mailer/`              | -                    | Templates de email                                                             |
| Geocoding           | `apps/api/src/modules/geocoding/`           | -                    | Endereco, coordenadas                                                          |
| Consent             | `apps/api/src/modules/consent/`             | -                    | LGPD, cookies                                                                  |
| Operations Realtime | `apps/api/src/modules/operations-realtime/` | -                    | Socket.IO events                                                               |

---

## 4. Arquivos Mais Criticos (por tamanho)

### Backend (>500 linhas)

| Arquivo                         | Linhas | Risco                             |
| ------------------------------- | ------ | --------------------------------- |
| `auth.service.ts`               | 2433   | **CRITICO** — God service         |
| `comanda.service.ts`            | 1607   | **ALTO** — Complexidade cognitiva |
| `operations-helpers.service.ts` | 1451   | **ALTO** — God helper             |
| `products.service.ts`           | 772    | Medio                             |
| `orders.service.ts`             | 726    | Medio                             |
| `finance-analytics.util.ts`     | 558    | Medio                             |
| `finance.service.ts`            | 540    | Medio                             |
| `cash-session.service.ts`       | 495    | Medio                             |

### Frontend (>500 linhas)

| Arquivo                             | Linhas | Risco    |
| ----------------------------------- | ------ | -------- |
| `commercial-calendar.tsx`           | 833    | **ALTO** |
| `salao-environment.tsx`             | 797    | **ALTO** |
| `dashboard-shell.tsx`               | 780    | **ALTO** |
| `pdv-salao-unified.tsx`             | 763    | **ALTO** |
| `staff-mobile-shell.tsx`            | 740    | Medio    |
| `owner-mobile-shell.tsx`            | 740    | Medio    |
| `desk-command-center-prototype.tsx` | 730    | Medio    |
| `landing-page.tsx`                  | 722    | Medio    |
| `pdv-comanda-modal.tsx`             | 639    | Medio    |
| `caixa-panel.tsx`                   | 585    | Medio    |
| `product-form.tsx`                  | 579    | Medio    |
| `pdv-board.tsx`                     | 570    | Medio    |
| `mobile-comanda-list.tsx`           | 563    | Medio    |
| `register-form.tsx`                 | 541    | Medio    |
| `order-form.tsx`                    | 528    | Medio    |

### Testes

| Arquivo                                     | Linhas | Tipo               |
| ------------------------------------------- | ------ | ------------------ |
| `use-operations-realtime.test.ts`           | 2048   | Frontend hook test |
| `products.service.spec.ts`                  | 1251   | Backend unit       |
| `auth.service.coverage-boost.spec.ts`       | 988    | Backend unit       |
| `finance.service.spec.ts`                   | 912    | Backend unit       |
| `validation.test.ts`                        | 802    | Frontend util      |
| `operations-helpers.branches.spec.ts`       | 786    | Backend branch     |
| `orders.service.spec.ts`                    | 738    | Backend unit       |
| `auth.service.session-and-recovery.spec.ts` | 677    | Backend session    |
| `auth.service.spec.ts`                      | 662    | Backend unit       |

**Total de arquivos de teste (source): 122**

---

## 5. Schema do Banco (15 Models)

| Model              | Campos Chave                                            | Relacionamentos                                          |
| ------------------ | ------------------------------------------------------- | -------------------------------------------------------- |
| User               | id, email, passwordHash, adminPinHash, role             | Workspace members, sessions, products, orders, employees |
| Session            | id, tokenHash, expiresAt, revokedAt                     | User, Employee, WorkspaceOwner, DemoAccessGrant          |
| DemoAccessGrant    | id, userId, sessionId, dayKey, expiresAt                | User, Session                                            |
| PasswordResetToken | id, userId, tokenHash, expiresAt                        | User                                                     |
| OneTimeCode        | id, userId, email, purpose, codeHash                    | User                                                     |
| ConsentDocument    | id, key, version, kind, required                        | UserConsents                                             |
| UserConsent        | id, userId, documentId, acceptedAt                      | User, Document                                           |
| CookiePreference   | id, userId, analytics, marketing                        | User                                                     |
| AuditLog           | id, actorUserId, event, resource, severity              | User                                                     |
| Product            | id, userId, name, category, unitPrice, stock            | User, OrderItems, ComandaItems, Combos                   |
| ProductComboItem   | id, comboProductId, componentProductId                  | Product (self-ref)                                       |
| Employee           | id, userId, employeeCode, salarioBase, percentualVendas | User, Orders, CashSessions, Comandas                     |
| CashSession        | id, companyOwnerId, businessDate, status                | User, Employee, Movements, Comandas                      |
| CashMovement       | id, cashSessionId, type, amount                         | CashSession, User, Employee                              |
| CashClosure        | id, companyOwnerId, businessDate, status                | User                                                     |
| Mesa               | id, companyOwnerId, label, capacity                     | User, Comandas                                           |
| Comanda            | id, companyOwnerId, status, totalAmount                 | User, CashSession, Mesa, Employee, Items                 |
| ComandaItem        | id, comandaId, productId, quantity, unitPrice           | Comanda, Product                                         |
| ComandaAssignment  | id, comandaId, employeeId, assignedByUserId             | User, Comanda, Employee                                  |
| Order              | id, userId, comandaId, totalRevenue, totalProfit        | User, Comanda, Employee, Items                           |
| OrderItem          | id, orderId, productId, quantity, unitPrice             | Order, Product                                           |

---

## 6. Integracoes Externas

| Integracao             | Uso                                       | Config                                            |
| ---------------------- | ----------------------------------------- | ------------------------------------------------- |
| Neon PostgreSQL        | Database principal                        | DATABASE_URL, DIRECT_URL                          |
| Redis (local/Oracle)   | Cache + rate limit + Socket.IO            | REDIS_URL                                         |
| Railway                | Deploy do web                             | `railway up --service imperial-desk-web`          |
| OpenTelemetry          | Tracing (importado em operations-helpers) | @opentelemetry/api                                |
| Grafana Faro           | Frontend observability                    | `apps/web/lib/observability/faro.ts` (456 linhas) |
| MapLibre / OpenFreeMap | Mapa de vendas                            | NEXT_PUBLIC_MAP_STYLE_URL                         |
| Gemini (Google AI)     | Insights de vendas                        | Cache 900s                                        |

---

## 7. CI/CD Pipeline

### Jobs (ci.yml):

1. **quality** — Lint + Typecheck (10 min)
2. **backend-tests** — Jest com coverage (15 min)
3. **frontend-unit** — Vitest unit tests (12 min)
4. **frontend-e2e** — Playwright Chromium (20 min)
5. **security** — repo:scan-public + dependency-review + security:audit-runtime (8 min)
6. **performance-latency-gate** — k6 load test com Postgres+Redis services (20 min)
7. **build** — Build all workspaces (20 min) — depende de todos os anteriores

### SonarQube (sonarqube.yml):

- Trigger: push/PR/main
- Roda API + web coverage
- Usa SonarSource/sonarqube-scan-action v7.1.0

---

## 8. Observability Stack

| Componente   | Path                                       | Funcao                          |
| ------------ | ------------------------------------------ | ------------------------------- |
| Grafana      | `infra/docker/observability/grafana/`      | Dashboards                      |
| Loki         | `infra/docker/observability/loki/`         | Log aggregation                 |
| Tempo        | `infra/docker/observability/tempo/`        | Distributed tracing             |
| Prometheus   | `infra/docker/observability/prometheus/`   | Metrics                         |
| Alertmanager | `infra/docker/observability/alertmanager/` | Alertas                         |
| Alloy        | `infra/docker/observability/alloy/`        | Coleta de dados (Grafana Alloy) |
| Blackbox     | `infra/docker/observability/blackbox/`     | Probe externo                   |

---

## 9. Papéis de Usuario

| Role  | Acesso                                           |
| ----- | ------------------------------------------------ |
| OWNER | Tudo — todas as secoes, configuracoes, admin PIN |
| STAFF | Apenas `sales`, `pdv`, `calendario`              |

---

## 10. Regras de Negocio Criticas

1. **Workspace isolation** — toda query filtra por `companyOwnerId`
2. **Admin PIN** — 4 digitos, rate limit Redis (3 tentativas / 5 min → lock 5 min)
3. **CPF/CNPJ** — validacao algoritmica real
4. **Cache invalidation** — mutacoes devem invalidar cache correspondente
5. **Decimal precision** — `Decimal(10,2)` para monetario, `Decimal(12,2)` para caixa
