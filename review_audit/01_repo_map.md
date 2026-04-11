# Mapa do Repositório — Desk Imperial

**Data:** 2026-04-10  
**Escopo revalidado:** código atual + configs + docs canônicas + execução técnica local

---

## 1. Leitura Executiva

O `desk-imperial` é um monorepo full-stack voltado a operação comercial de pequenos e médios comerciantes brasileiros. A forma geral do sistema é consistente: `apps/api` concentra a regra de negócio, `apps/web` concentra as superfícies de produto, `packages/types` compartilha contratos, e `infra/` materializa runtime local e operacional.

O principal problema estrutural não é falta de módulos; é responsabilidade demais concentrada em poucos arquivos e poucos corredores de integração:

- backend: `auth.service.ts`, `comanda.service.ts`, `operations-helpers.service.ts`
- frontend: `DashboardShell`, `use-operations-realtime`, landing pública
- plataforma: deploy/rollback, segredos locais e lacunas entre CI/documentação/runtime real

---

## 2. Inventário Técnico Revalidado

### Stack principal

| Camada | Tecnologia | Evidência |
| --- | --- | --- |
| Frontend | Next.js 16.1.7 + React 19 + TypeScript | `apps/web/package.json` |
| Backend | NestJS 11 + TypeScript | `apps/api/package.json` |
| ORM / Banco | Prisma 6.19.3 + PostgreSQL | `apps/api/package.json`, `apps/api/prisma/schema.prisma` |
| Cache / rate limit | Redis + `ioredis` | `apps/api/package.json`, `apps/api/src/common/services/cache.service.ts` |
| Realtime | Socket.IO + Redis adapter | `apps/api/package.json`, `apps/api/src/modules/operations-realtime.gateway.ts` |
| Observabilidade API | OpenTelemetry OTLP + Pino/NestJS-Pino | `apps/api/src/common/utils/otel.util.ts`, `apps/api/src/app.module.ts` |
| Observabilidade Web | Grafana Faro | `apps/web/lib/observability/faro.ts` |
| Testes backend | Jest | `apps/api/package.json` |
| Testes frontend | Vitest + Playwright | `apps/web/package.json` |
| Testes de carga | k6 | `package.json`, `tests/load/k6/` |
| Monorepo | npm workspaces + Turborepo | `package.json`, `turbo.json` |

### Medição de superfície

- `495` arquivos `ts/tsx` dentro de `apps/`, `packages/`, `infra/`, `scripts/` e `tests/`
- `76.384` linhas nesses arquivos
- `24` diretórios de migration Prisma versionados em `apps/api/prisma/migrations/`

---

## 3. Estrutura Macro do Repositório

```text
desk-imperial/
├── apps/
│   ├── api/                    # NestJS backend
│   └── web/                    # Next.js App Router
├── packages/
│   └── types/                  # contratos compartilhados
├── infra/
│   ├── docker/                 # compose local + observability OSS
│   ├── oracle/                 # runtime/orquestração Oracle
│   └── scripts/                # automações de deploy/túnel
├── docs/                       # arquitetura, produto, operação, segurança, release
├── tests/load/k6/              # carga/latência
├── scripts/                    # automações do monorepo
└── review_audit/               # artefatos desta auditoria
```

### Observação importante de drift documental

O código atual só confirma `packages/types` como pacote compartilhado ativo. O [README](C:/Users/Desktop/Documents/desk-imperial/README.md) ainda descreve `packages/config` e `packages/ui`, que não existem no estado atual do repositório.

---

## 4. Backend — Entry Points e Domínios

### Boot e composição

- Entry point: [apps/api/src/main.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/main.ts)
- Módulo raiz: [apps/api/src/app.module.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/app.module.ts)
- Prefixo global HTTP: `/api`
- Health endpoints:
  - `/api/health`
  - `/api/health/ready`
  - `/api/health/live`

### Módulos carregados

| Módulo | Evidência |
| --- | --- |
| `auth` | `apps/api/src/modules/auth/` |
| `admin-pin` | `apps/api/src/modules/admin-pin/` |
| `consent` | `apps/api/src/modules/consent/` |
| `currency` | `apps/api/src/modules/currency/` |
| `employees` | `apps/api/src/modules/employees/` |
| `finance` | `apps/api/src/modules/finance/` |
| `geocoding` | `apps/api/src/modules/geocoding/` |
| `health` | `apps/api/src/modules/health/` |
| `mailer` | `apps/api/src/modules/mailer/` |
| `market-intelligence` | `apps/api/src/modules/market-intelligence/` |
| `monitoring` | `apps/api/src/modules/monitoring/` |
| `operations` | `apps/api/src/modules/operations/` |
| `operations-realtime` | `apps/api/src/modules/operations-realtime/` |
| `orders` | `apps/api/src/modules/orders/` |
| `products` | `apps/api/src/modules/products/` |

### Endpoints HTTP confirmados

Principais controllers confirmados por decorators:

- `auth/*`
- `admin/*`
- `employees/*`
- `products/*`
- `orders/*`
- `operations/*`
- `finance/*`
- `market-intelligence/insights`
- `consent/*`
- `geocoding/postal-code/lookup`
- `health`, `health/ready`, `health/live`

### Fluxos críticos de negócio confirmados no backend

1. Registro + consentimento + geocoding + verificação de email
2. Login + sessão por cookie + CSRF + rate limit
3. Operação ao vivo: caixa, comandas, cozinha, mesas, fechamento
4. Pedidos: criação, baixa de estoque, cancelamento e reversão
5. Financeiro: resumo executivo e indicadores (`summary` + `pillars`)
6. Produto/portfólio: CRUD e importação
7. Insight IA: `market-intelligence`

---

## 5. Frontend — Superfícies, Rotas e Composição

### Superfícies principais

| Superfície | Rotas | Observação |
| --- | --- | --- |
| Marketing | `/` | landing pública |
| Auth | `/login`, `/cadastro`, `/verificar-email`, `/recuperar-senha`, `/redefinir-senha` | fluxos de identidade |
| Dashboard | `/dashboard`, `/dashboard/configuracoes` | painel executivo principal |
| App móvel/operacional | `/app`, `/app/owner`, `/app/staff` | shells mobile owner/staff |
| IA | `/ai` | superfície dedicada |
| Design Lab | `/design-lab` | laboratório/protótipo |
| Rotas utilitárias | `/api/health`, `/api/postal-code/lookup` | rotas do próprio Next |

### Entry points relevantes

- Root layout: [apps/web/app/layout.tsx](C:/Users/Desktop/Documents/desk-imperial/apps/web/app/layout.tsx)
- Home pública: [apps/web/app/page.tsx](C:/Users/Desktop/Documents/desk-imperial/apps/web/app/page.tsx)
- Dashboard: [apps/web/app/dashboard/page.tsx](C:/Users/Desktop/Documents/desk-imperial/apps/web/app/dashboard/page.tsx)
- App router mobile: [apps/web/app/app/page.tsx](C:/Users/Desktop/Documents/desk-imperial/apps/web/app/app/page.tsx)

### Observações de arquitetura frontend

- há organização por domínio em `components/marketing`, `components/dashboard`, `components/pdv`, `components/operations`, `components/owner-mobile`, `components/staff-mobile`;
- `DashboardShell` e `use-operations-realtime` seguem como pontos centrais de coordenação;
- a home pública hoje é um ponto sensível porque depende de `next/dynamic(..., { ssr: false })` na rota raiz.

---

## 6. Dados, Contratos e Persistência

### Banco e schema

- Schema: [apps/api/prisma/schema.prisma](C:/Users/Desktop/Documents/desk-imperial/apps/api/prisma/schema.prisma)
- Migrations: `24` diretórios em `apps/api/prisma/migrations/`

### Entidades/dominios persistidos confirmados

- `User`, `Session`, `OneTimeCode`, `PasswordResetToken`
- `ConsentDocument`, `UserConsent`, `CookiePreference`
- `AuditLog`
- `Product`, `ProductComboItem`
- `Employee`
- `CashSession`, `CashMovement`, `CashClosure`
- `Mesa`, `Comanda`, `ComandaItem`, `ComandaAssignment`
- `Order`, `OrderItem`

### Contratos compartilhados

- pacote único: [packages/types](C:/Users/Desktop/Documents/desk-imperial/packages/types)
- ponto central: [packages/types/src/contracts.ts](C:/Users/Desktop/Documents/desk-imperial/packages/types/src/contracts.ts)

Risco arquitetural: o pacote compartilhado ainda ajuda alinhamento API ↔ web, mas já está largo o suficiente para virar gargalo sem organização por subdomínio.

---

## 7. Infra, Deploy e Operação

### Local

- Banco/Redis: [infra/docker/docker-compose.yml](C:/Users/Desktop/Documents/desk-imperial/infra/docker/docker-compose.yml)
- Observabilidade OSS: [infra/docker/docker-compose.observability.yml](C:/Users/Desktop/Documents/desk-imperial/infra/docker/docker-compose.observability.yml)

### Operação Oracle

- runtime e estratégia: `infra/oracle/`
- stack operacional/observability: `infra/oracle/ops/`
- scripts principais:
  - `infra/scripts/oracle-builder-deploy.ps1`
  - `infra/scripts/oracle-ops-tunnel.ps1`
  - `infra/scripts/railway-start.sh`

### CI atual revalidada

Jobs existentes em [ci.yml](C:/Users/Desktop/Documents/desk-imperial/.github/workflows/ci.yml):

1. `Quality (Lint + Typecheck)`
2. `Backend Tests`
3. `Frontend Unit Tests`
4. `Frontend E2E (Chromium Baseline)`
5. `Security Checks`
6. `Performance Latency Gate`

### Gap operacional relevante

O workflow atual não tem gate explícito de build full-stack / `next build`. Isso é importante porque a execução local desta auditoria confirmou falha de build no web.

---

## 8. Hotspots de Churn e Complexidade

### Hotspots por churn git (últimos 180 dias)

| Arquivo | Mudanças |
| --- | ---: |
| `apps/web/components/marketing/landing-page.tsx` | 74 |
| `apps/web/app/globals.css` | 66 |
| `apps/web/components/dashboard/dashboard-shell.tsx` | 62 |
| `apps/api/src/modules/auth/auth.service.ts` | 36 |
| `apps/web/lib/api.ts` | 29 |
| `apps/web/components/staff-mobile/staff-mobile-shell.tsx` | 28 |
| `apps/web/components/pdv/pdv-board.tsx` | 27 |
| `apps/web/components/dashboard/salao-environment.tsx` | 25 |
| `apps/web/components/owner-mobile/owner-mobile-shell.tsx` | 25 |
| `apps/web/components/operations/use-operations-realtime.ts` | 22 |

### Hotspots por tamanho de arquivo

| Arquivo | Linhas |
| --- | ---: |
| `apps/api/src/modules/auth/auth.service.ts` | 2152 |
| `apps/api/src/modules/operations/operations-helpers.service.ts` | 1338 |
| `apps/api/src/modules/operations/comanda.service.ts` | 1160 |
| `apps/web/components/operations/use-operations-realtime.ts` | 1019 |
| `apps/web/components/calendar/commercial-calendar.tsx` | 765 |
| `apps/web/components/dashboard/salao-environment.tsx` | 728 |
| `apps/web/components/pdv/pdv-salao-unified.tsx` | 715 |
| `apps/api/src/modules/products/products.service.ts` | 711 |
| `apps/web/components/dashboard/dashboard-shell.tsx` | 701 |
| `apps/web/components/owner-mobile/owner-mobile-shell.tsx` | 697 |

### Leitura dos hotspots

- `landing-page.tsx` e `app/page.tsx` merecem atenção imediata porque hoje acumulam churn alto e quebram build/E2E.
- `auth.service.ts`, `DashboardShell` e `use-operations-realtime.ts` são hotspots simultaneamente por churn e concentração de responsabilidade.
- `operations-helpers.service.ts` e `comanda.service.ts` seguem como núcleo operacional de alto risco por complexidade e impacto financeiro.

---

## 9. Ferramentas e Comandos Descobertos

### Monorepo

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:critical`
- `npm run build`
- `npm run repo:scan-public`
- `npm run security:audit-runtime`

### Backend

- `npm --workspace @partner/api run test`
- `npm --workspace @partner/api run test:e2e`
- `npm --workspace @partner/api run prisma:migrate:dev`
- `npm --workspace @partner/api run prisma:migrate:deploy`

### Frontend

- `npm --workspace @partner/web run test`
- `npm --workspace @partner/web run test:e2e`
- `npm --workspace @partner/web run test:e2e:critical`

### Carga

- `npm run test:load:critical`
- `npm run test:load:ci`

---

## 10. Conclusão do Mapa

O repositório está longe de ser desorganizado. Há domínios claros, setup técnico robusto e infraestrutura observável. O diagnóstico real é mais específico:

1. há boa forma macro;
2. há drift documental material;
3. há buracos relevantes entre CI e runtime real;
4. há concentração excessiva de responsabilidade em poucos arquivos críticos;
5. os principais riscos hoje estão em build/release safety, segredos/infra, integridade operacional e acoplamento entre domínios centrais.
