# Mapa do Repositório — Desk Imperial (2026-04-26)

## 1. Stack Confirmada (lida dos package.json)

| Camada | Tecnologia | Versão | Evidência |
|---|---|---|---|
| Backend framework | NestJS | 11.x | `apps/api/package.json` |
| ORM | Prisma | 6.19.3 | `apps/api/package.json` |
| Cache | Redis (ioredis) | 5.x | `apps/api/package.json` |
| Realtime | Socket.IO | 4.x | `apps/api/package.json` |
| Validação | Zod + class-validator | 4.x / 0.14.x | `apps/api/package.json` |
| Observabilidade | OpenTelemetry + Pino | auto-instr 0.72 / pino 10.x | `apps/api/package.json` |
| Frontend framework | Next.js | 16.x | `apps/web/package.json` |
| UI | React | 19.x | `apps/web/package.json` |
| Estilização | Tailwind CSS | 4.x | `apps/web/package.json` |
| Server state | TanStack React Query | 5.x | `apps/web/package.json` |
| Charts | Recharts + ApexCharts | 3.x / 5.x | `apps/web/package.json` |
| Grid | AG Grid | 35.x | `apps/web/package.json` |
| DnD | @hello-pangea/dnd | 18.x | `apps/web/package.json` |
| E2E | Playwright | 1.58.x | `apps/web/package.json` |
| Testes unitários | Vitest + Jest | 4.x / 30.x | ambos package.json |
| Monorepo | npm workspaces + Turborepo | npm 11.8 / turbo 2.x | `package.json` + `turbo.json` |
| CI | GitHub Actions | — | `.github/workflows/ci.yml` |
| Autenticação | Cookie HttpOnly + Argon2 | — | `apps/api/src/modules/auth/` |
| Observabilidade prod | Grafana Faro (web) + OTel (api) | — | `faro.ts` + `otel.util.ts` |

## 2. Estrutura do Monorepo

```text
desk-imperial/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/        # Domínio organizado por módulo NestJS
│   │   │   │   ├── auth/       # Login, registro, sessão, recuperação, e-mail, rate-limit
│   │   │   │   ├── operations/ # PDV, comandas, cozinha, mesas, caixa, realtime
│   │   │   │   ├── orders/     # Pedidos e cancelamento
│   │   │   │   ├── products/   # Catálogo de produtos
│   │   │   │   ├── finance/    # Financeiro, BI, relatórios
│   │   │   │   ├── employees/  # Funcionários/vendedores
│   │   │   │   ├── consent/    # LGPD — versionamento de consentimento
│   │   │   │   ├── mailer/     # Envio de e-mail transacional
│   │   │   │   ├── monitoring/ # Audit trail, health
│   │   │   │   ├── currency/   # Configuração de moeda
│   │   │   │   ├── geocoding/  # Geolocalização
│   │   │   │   ├── admin-pin/  # PIN admin para ações críticas
│   │   │   │   ├── market-intelligence/ # Inteligência de mercado
│   │   │   │   └── health/     # Health checks
│   │   │   ├── common/         # Filtros, pipes, utils, OTel, OpenAPI
│   │   │   ├── cache/          # CacheService com Redis (fail-open)
│   │   │   ├── config/         # Configuração centralizada
│   │   │   ├── database/       # Prisma service
│   │   │   └── observability/   # Faro + tracing
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # 22 modelos
│   │   │   ├── migrations/     # Migrations versionadas
│   │   │   └── seed*.ts        # Seeds e backfill
│   │   └── test/               # Testes Jest (unitários + integração)
│   │
│   └── web/                    # Next.js frontend
│       ├── app/                # App Router (Next.js 16)
│       │   ├── page.tsx         # Landing
│       │   ├── login/          # Login
│       │   ├── cadastro/       # Cadastro
│       │   ├── dashboard/      # Dashboard principal (protegido)
│       │   ├── financeiro/     # Financeiro
│       │   ├── cozinha/        # Cozinha (KDS)
│       │   ├── design-lab/     # Design system / Lab
│       │   ├── lite/           # PWA mobile (owner + staff)
│       │   ├── api/            # API routes (Next.js)
│       │   └── ai/ia/          # AI features
│       ├── components/         # Componentes React
│       │   ├── dashboard/      # Ambientes do dashboard (pedidos, overview, etc.)
│       │   ├── pdv/            # PDV, comanda, mesas
│       │   ├── staff-mobile/   # Shell mobile para staff
│       │   ├── owner-mobile/   # Shell mobile para owner
│       │   ├── operations/     # Realtime, grid, mutações otimistas
│       │   ├── auth/           # Formulários de auth
│       │   ├── marketing/      # Landing page
│       │   └── shared/         # Componentes compartilhados
│       ├── hooks/              # Custom hooks
│       ├── lib/                # Lógica de negócio do frontend
│       │   ├── api.ts          # Cliente HTTP + interceptors
│       │   ├── operations/     # Realtime, patching, query, adapters
│       │   └── validation.ts   # Validação Zod frontend
│       ├── providers/          # React providers (QueryProvider)
│       └── e2e/                # Playwright E2E
│
├── packages/
│   └── types/                  # Tipos compartilhados (DTOs, contracts)
│       └── src/contracts.ts    # 571 linhas de contratos
│
├── infra/
│   ├── docker/                 # Stack local (postgres, redis, etc.)
│   │   ├── docker-compose.yml
│   │   └── observability/      # OTel Collector, Alertmanager
│   └── oracle/                 # Runtime Oracle (produção)
│       └── ops/                # Alloy, Loki, Tempo, Prometheus, Grafana
│
├── docs/                       # Documentação (arquitetura, runbooks, ADRs)
├── scripts/                    # Scripts de qualidade, guardrails, drift
├── tests/                      # Testes de carga (k6)
└── review_audit/               # Artefatos desta auditoria
```

## 3. Fluxos Críticos End-to-End

### 3.1 Login
```
User → /login (SSR) → POST /api/auth/login → auth-login.service.ts
  → valida credenciais (Argon2) → cria sessão (cookie HttpOnly)
  → registra audit trail → redirect /dashboard
```

### 3.2 Cadastro + Consentimento LGPD
```
User → /cadastro → POST /api/auth/register → auth-registration.service.ts
  → cria usuário + workspace → registra consentimento (consent.service.ts)
  → envia e-mail de verificação (mailer) → retorna DTO
```

### 3.3 Venda/Comanda (fluxo PDV)
```
Staff → PDV Shell → seleciona produtos → Abre comanda
  → POST /api/operations/comanda → comanda.service.ts
  → cria OrderItems → debita estoque → publica WebSocket (realtime)
  → Cozinha (KDS) recebe em tempo real → staff confirma entrega
```

### 3.4 Financeiro
```
Owner → Dashboard / Financeiro → GET /api/finance/*
  → finance.service.ts → agrega vendas, custos, margem
  → cache Redis → retorna payload
```

### 3.5 Mobile PWA (Owner)
```
Owner → /lite → owner-mobile-shell.tsx → owner-today-view
  → usaTanStack Query + Socket.IO para dados em tempo real
  → offline queue (staff) → sincroniza quando online
```

## 4. Módulos Backend (NestJS)

| Módulo | Controllers | Services principais | Linhas (aprox.) |
|---|---|---|---|
| Auth | auth.controller.ts | auth.service.ts, auth-session.service.ts, auth-registration.service.ts, auth-login.service.ts, auth-password.service.ts, auth-rate-limit.service.ts, auth-email-verification.service.ts | ~3,500 |
| Operations | operations.controller.ts | operations.service.ts, comanda.service.ts, cash-session.service.ts, operations-helpers.service.ts, +15 utils files | ~7,000 |
| Orders | (dentro de operations) | orders.service.ts | ~800 |
| Products | (implícito) | products.service.ts | ~600 |
| Finance | (implícito) | finance.service.ts | ~600 |
| Consent | consent/ | — | ~200 |
| Mailer | mailer/ | — | ~200 |
| Monitoring | monitoring/ | audit-log.service.ts | ~300 |

## 5. Frontend — Superfícies Principais

| Superfície | Componentes-chave | Tamanho (linhas) |
|---|---|---|
| Dashboard Shell | dashboard-shell.tsx (665) | Componente raiz protegido |
| Dashboard Environments | pedidos (1,520), overview (1,275), portfolio (1,243), salao (1,088), equipe (932), financeiro (799) | Componentes de ambiente |
| PDV | pdv-salao-unified.tsx (755), pdv-comanda-modal.tsx (702), pdv-board.tsx | PDV e mesas |
| Staff Mobile | staff-mobile-shell.tsx (832 test), mobile-comanda-list.tsx (693), mobile-order-builder.tsx (672), use-staff-mobile-shell-controller.ts (631) | Mobile staff |
| Owner Mobile | owner-mobile-shell.tsx (703 test) | Mobile owner |
| Realtime | operations-realtime-patching.ts (1,088), use-operations-realtime.ts | Socket.IO + tanstack-query |
| Auth | login-form.tsx, register-form.tsx (540) | Formulários |
| Marketing | landing-page.tsx (724) | Landing page pública |

## 6. Integrações Externas

| Serviço | Propósito | Localização |
|---|---|---|
| Redis | Cache, pub/sub Socket.IO, rate limiting | `apps/api/src/cache/` |
| PostgreSQL | Banco principal | Prisma schema |
| Nodemailer | E-mail transacional (verificação, recuperação) | `mailer/` |
| OpenTelemetry | Tracing, métricas, logs OTLP | `apps/api/src/common/observability/` |
| Grafana Faro | RUM / frontend observability | `apps/web/lib/observability/faro.ts` |
| Leaflet/Geocoding | Mapas e localização | `geocoding/`, `react-leaflet` |
| Socket.IO | Realtime (comandas, cozinha, PDV) | `operations-realtime/` |

## 7. Pipeline de Build/Deploy

```
GitHub Actions (.github/workflows/ci.yml)
  ├── Quality: lint + typecheck + openapi:check
  ├── Backend Tests: Jest (com PostgreSQL CI)
  ├── Frontend Tests: Vitest + Playwright
  ├── Security: npm audit + custom security checks
  ├── Load Tests: k6 latency gate
  └── Build: nest build + next build
```

**Deploy:** railway.json + Docker (infra/docker/) — Railway como plataforma.

## 8. Diagrama Textual de Fluxo

```
                         ┌─────────────────┐
                         │   Navegador       │
                         │ (Next.js 16 SSR)  │
                         └────────┬─────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
              ┌─────▼─────┐ ┌────▼────┐ ┌─────▼──────┐
              │  HTTP/API  │ │ Socket │ │ Grafana Faro│
              │ (TanStack) │ │  .IO   │ │   (RUM)     │
              └─────┬─────┘ └────┬────┘ └────────────┘
                    │             │
              ┌─────▼─────────────▼─────┐
              │     NestJS API           │
              │  ┌────────────────────┐  │
              │  │ Controllers        │  │
              │  │ (auth, operations, │  │
              │  │  products, finance)│  │
              │  └────────┬───────────┘  │
              │           │              │
              │  ┌────────▼───────────┐  │
              │  │ Services            │  │
              │  │ (regras de negócio) │  │
              │  └──┬──────────────┬──┘  │
              │     │              │     │
              └─────┼──────────────┼─────┘
                    │              │
          ┌─────────▼──┐    ┌─────▼─────┐
          │  PostgreSQL │    │   Redis    │
          │  (Prisma)   │    │ (cache +   │
          │             │    │  pub/sub)  │
          └─────────────┘    └───────────┘
                              │
                    ┌─────────▼──────────┐
                    │    OTel Collector  │
                    │  (traces, metrics, │
                    │   logs → Grafana)  │
                    └────────────────────┘
```

## 9. Hotspots Identificados

Baseado em tamanho de arquivo + complexidade ESLint + frequência de commit:

| Hotspot | Severidade | Motivo |
|---|---|---|
| `comanda.service.ts` (1,377 linhas) | Alto | Service inchado, maior que qualquer controller |
| `pedidos-environment.tsx` (1,520 linhas) | Alto | Ambiente de dashboard mais complexo, 25 warnings ESLint |
| `operations-realtime-patching.ts` (1,088 linhas) | Alto | Complexidade 90, funções enormes, 946 linhas de patching em tempo real |
| `operations-helpers.service.ts` (722 linhas) | Médio | Utilitário inchado com lógica de negócio diluída |
| `dashboard-shell.tsx` (665 linhas) | Médio | Hotspot de commit frequente (66), shell central |
| `auth.service.ts` (39 commits) | Médio | Muito modificado, várias responsabilidades (profile, session, cache invalidation) |
