# DESK IMPERIAL

Portal empresarial full-stack de nível profissional, construído em monorepo com Next.js 15, NestJS, PostgreSQL e infraestrutura em nuvem com Cloudflare CDN, Redis e Neon serverless. Foco em segurança real, UX premium e arquitetura escalável.

**Acesso público:** [app.deskimperial.online](https://app.deskimperial.online)

---

## O que este projeto entrega

### Autenticação e Segurança
- Cadastro com confirmação obrigatória de email via OTP de 8 dígitos
- Login com sessão segura por cookie `HttpOnly` + `SameSite`
- Proteção CSRF com duplo token (cookie + header)
- Rate limiting de tentativas persistido em PostgreSQL — imune a multi-instância
- Admin PIN server-side com hash `argon2id`, token JWT de 10 minutos (HMAC-SHA256)
- Audit log de todos os eventos sensíveis do sistema
- Recuperação de senha por código temporário enviado por email
- Bloqueio progressivo por IP em login, verificação e redefinição

### Dashboard Executivo
- Visão financeira analítica com 10+ métricas em tempo real
- Gráfico de receita histórica com seleção de período
- Breakdown por categoria com navegação em abas — produtos, valores, venda em potencial e unidades
- Top produtos por categoria (top-5 real via DB)
- Canais de venda e distribuição de receita
- Tabela de pedidos recentes com status
- Mapa de vendas geográfico com Leaflet + CARTO tiles — renderização por bairro, cidade e região
- Ranking de funcionários por performance vinculada a pedidos reais
- Consultor de mercado com Gemini Flash para leitura analítica e previsão operacional

### Operação Comercial
- PDV (Ponto de Venda) com sistema de comandas em Kanban
- Gestão de portfólio com importação CSV validada e em lote
- Folha de pagamento com vínculo de funcionário por ID em cada venda
- Calendário comercial com Drag and Drop
- Export CSV de dados financeiros
- Conversão de moeda em tempo real (BRL, USD, EUR) via AwesomeAPI com cache e fallback

### Conformidade e LGPD
- Banner de consentimento de cookies
- Registro de aceite de termos e política de privacidade
- Gestão de preferências de consentimento por usuário

---

## Stack

### Frontend
| Tecnologia | Uso |
|---|---|
| `Next.js 15` | Framework principal com App Router |
| `React 19` | UI com Server e Client Components |
| `TanStack Query` | Cache e sincronização de estado servidor |
| `React Hook Form` + `Zod` | Formulários com validação tipada |
| `Framer Motion` | Animações e transições |
| `Recharts` | Gráficos financeiros e sparklines |
| `Leaflet` + CARTO | Mapa de vendas geográfico |

### Backend
| Tecnologia | Uso |
|---|---|
| `NestJS 11` | Framework modular com DI, Guards e Pipes |
| `Prisma 6` | ORM com migrations e tipagem completa |
| `PostgreSQL` (Neon) | Banco serverless com connection pooling |
| `Redis` | Cache de respostas pesadas (finance summary) |
| `argon2id` | Hash de senha e Admin PIN |
| `Brevo` | Email transacional (OTP, recovery, alertas) |
| `Pino` | Logging estruturado com slow query detection |
| `Gemini Flash` | IA aplicada para inteligência de mercado |

### Infraestrutura
| Tecnologia | Uso |
|---|---|
| `Railway` | Deploy de API e frontend em monorepo |
| `Neon` | PostgreSQL serverless com pooler ativo |
| `Redis` (Railway) | Cache em rede privada (zero egress cost) |
| `Cloudflare` | CDN global, proxy, DDoS, SSL/TLS, DNSSEC |
| `Turbo` | Build system do monorepo |

---

## Arquitetura

```
                        ┌─────────────────────────┐
                        │      Cloudflare CDN      │
                        │  DDoS · SSL · Cache      │
                        │  DNSSEC · Firewall       │
                        └────────────┬────────────┘
                                     │
               ┌─────────────────────┼─────────────────────┐
               │                     │                     │
        app.deskimperial      api.deskimperial        deskimperial
            .online               .online               .online
               │                     │                     │
    ┌──────────▼──────────┐ ┌────────▼────────┐  ┌────────▼──────┐
    │   Next.js 15        │ │   NestJS API    │  │  Landing Page │
    │   Railway           │ │   Railway       │  │               │
    └─────────────────────┘ └────────┬────────┘  └───────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
           ┌────────▼───────┐ ┌─────▼──────┐ ┌──────▼──────┐
           │  Neon Postgres │ │   Redis    │ │   Brevo     │
           │  + Pooler      │ │  (private) │ │   Email     │
           └────────────────┘ └────────────┘ └─────────────┘
```

---

## Segurança — Implementação Real

### Camada de Rede
- Cloudflare proxy em todo tráfego — IPs do servidor nunca expostos
- DDoS protection automático em toda requisição
- DNSSEC ativo — assinatura criptográfica de registros DNS
- HSTS com `max-age=63072000; includeSubDomains; preload`
- CSP configurado sem `unsafe-eval`

### Camada de Aplicação
- CSRF: token duplo (cookie `csrf-token` + header `X-CSRF-Token`)
- Cookies: `HttpOnly`, `SameSite=Lax`, `Secure` em produção
- Helmet com headers de segurança completos
- Rate limiting via tabela `AuthRateLimit` no PostgreSQL — compartilhado entre instâncias
- Global HTTP Exception Filter — erros 5xx logados com stack trace, 4xx silenciosos

### Admin PIN
- Hash `argon2id` armazenado no banco — PIN nunca trafega em plaintext após criação
- Verificação server-side com rate limit dedicado por usuário
- Emissão de JWT de curta duração (10 minutos) com HMAC-SHA256
- Verificação de assinatura com `timingSafeEqual` — imune a timing attack
- Token armazenado em `sessionStorage` — não persiste entre sessões do browser

### Senhas e OTP
- Hash com `argon2id` (vencedor PHC, recomendação OWASP)
- OTP de 8 dígitos gerado com `crypto.randomInt` — criptograficamente seguro
- TTL configurável por tipo de código (verificação, redefinição)

### Auditoria
- Modelo `AuditLog` com `resourceId`, `event`, `userId`, `ip`, `userAgent`
- Indexado por `[resourceId, event]` para queries eficientes
- Eventos rastreados: login, logout, alteração de senha, verificação de email, Admin PIN

---

## Performance

### Cache Redis
- Endpoint `/finance/summary` cacheado por 60 segundos por usuário
- Invalidação por evento: criação/edição de produto ou pedido limpa o cache
- Redis em rede privada Railway — zero custo de egress, latência < 1ms

### Banco de Dados
- Neon connection pooler ativo — cold start eliminado
- Indexes estratégicos: `[buyerCity, buyerState]`, `[buyerDocument]`, `[resourceId, event]`
- N+1 eliminado no finance service — 3 queries paralelas com `Promise.all` e filtros no DB
- Slow query logging no `PrismaService` — queries acima de 500ms logadas automaticamente

### CDN
- Cloudflare em frente ao frontend — assets servidos do edge global
- `Cache-Control: s-maxage=31536000` — assets imutáveis em cache por 1 ano
- Fontes, imagens e bundles JS não chegam ao Railway em visitas recorrentes

---

## Modelos de Banco

```
User              — conta, hash de senha, adminPinHash, perfil
Session           — sessão autenticada com TTL
AuthRateLimit     — rate limiting persistente por chave (IP, userId)
OneTimeCode       — OTP de verificação e redefinição com TTL
PasswordResetToken — token de redefinição de senha
Product           — portfólio com categoria, preço, custo, estoque
Order             — pedido com comprador, itens, status, geocodificação
OrderItem         — item de pedido com produto, quantidade e preço
Employee          — funcionário com vínculo de vendas
AuditLog          — trilha de auditoria de eventos sensíveis
ConsentDocument   — versão de termos/política para aceite
UserConsent       — registro de aceite por usuário e versão
CookiePreference  — preferências de cookies por usuário
DemoAccessGrant   — controle de acesso da conta demo por IP/dispositivo
```

---

## Estrutura do Repositório

```
desk-imperial/
├─ apps/
│  ├─ api/                          # NestJS — backend
│  │  ├─ src/
│  │  │  ├─ common/                 # filtros, guards, utils, pipes globais
│  │  │  ├─ database/               # PrismaService com monitoring
│  │  │  └─ modules/
│  │  │     ├─ admin-pin/           # PIN server-side, JWT, rate limit
│  │  │     ├─ auth/                # login, OTP, sessão, CSRF
│  │  │     ├─ finance/             # summary, breakdown, cache Redis
│  │  │     ├─ products/            # portfólio, importação CSV
│  │  │     ├─ orders/              # pedidos, PDV, comandas
│  │  │     ├─ employees/           # funcionários, folha, ranking
│  │  │     ├─ geocoding/           # geocodificação com cache
│  │  │     ├─ market-intelligence/ # Gemini Flash
│  │  │     ├─ currency/            # cotações com cache e fallback
│  │  │     └─ monitoring/          # health check
│  │  └─ prisma/
│  │     ├─ schema.prisma
│  │     └─ migrations/
│  └─ web/                          # Next.js 15 — frontend
│     ├─ app/
│     │  ├─ (marketing)/            # landing page
│     │  ├─ (auth)/                 # login, cadastro, recuperação
│     │  └─ dashboard/              # área autenticada
│     ├─ components/
│     │  ├─ dashboard/              # 28 componentes de UI
│     │  ├─ admin-pin/              # dialog e hook do PIN
│     │  └─ ui/                     # componentes base
│     └─ lib/                       # clients de API, utilitários
├─ packages/
│  └─ contracts/                    # tipos compartilhados API ↔ Web
├─ .env.example
├─ turbo.json
└─ package.json
```

---

## Como Rodar Localmente

### 1. Instale dependências

```bash
npm ci
```

### 2. Configure o ambiente

Copie `.env.example` para `.env` e preencha as variáveis.

Variáveis essenciais:

```env
# Banco
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/desk_imperial
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/desk_imperial

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
APP_URL=http://localhost:3000

# Segurança
COOKIE_SECRET=change-me-min-32-chars
CSRF_SECRET=change-me-min-32-chars
ADMIN_PIN_JWT_SECRET=change-me-min-64-chars

# Cache (opcional em desenvolvimento)
REDIS_URL=redis://localhost:6379

# Email
EMAIL_PROVIDER=log
BREVO_API_KEY=
EMAIL_FROM_NAME=DESK IMPERIAL
EMAIL_FROM_EMAIL=no-reply@seudominio.com

# IA
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

# Cotações
EXCHANGE_RATES_URL=https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BRL-USD,BRL-EUR,USD-EUR,EUR-USD
EXCHANGE_RATES_FALLBACK_USD_BRL=5.5
EXCHANGE_RATES_FALLBACK_EUR_BRL=6.0
```

> Em desenvolvimento sem Redis configurado, o cache é ignorado graciosamente — a aplicação funciona normalmente.

### 3. Suba o banco

```bash
npm run db:up
```

### 4. Aplique migrations e gere o client

```bash
npm --workspace @partner/api run prisma:migrate:dev
npm --workspace @partner/api run prisma:generate
```

### 5. Rode o seed

```bash
npm run seed
```

### 6. Inicie

```bash
# Em terminais separados
npm --workspace @partner/api run dev
npm --workspace @partner/web run dev
```

- Frontend: `http://localhost:3000`
- API: `http://localhost:4000`
- Swagger: `http://localhost:4000/docs`

---

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia api e web em paralelo |
| `npm run build` | Build de produção do monorepo |
| `npm run lint` | ESLint em todos os workspaces |
| `npm run typecheck` | TypeScript sem emitir arquivos |
| `npm run test` | Jest em todos os workspaces |
| `npm run db:up` | Sobe PostgreSQL local via Docker |
| `npm run db:down` | Para e remove o container |
| `npm run db:studio` | Abre Prisma Studio |

---

## Deploy em Produção

### Variáveis adicionais para produção

```env
NODE_ENV=production
ADMIN_PIN_JWT_SECRET=<64+ bytes hex — gerar com crypto.randomBytes(64).toString('hex')>
REDIS_URL=${{Redis.REDIS_PRIVATE_URL}}
DATABASE_URL=<neon-pooler-url com -pooler no hostname>
PORTFOLIO_EMAIL_FALLBACK=false
```

### Infraestrutura

| Serviço | Provider | Detalhe |
|---|---|---|
| API | Railway | NestJS compilado |
| Frontend | Railway | Next.js standalone |
| Banco | Neon | PostgreSQL serverless + pooler |
| Cache | Railway Redis | Rede privada, zero egress |
| CDN / Proxy | Cloudflare | SSL Completo, DNSSEC, DDoS |

---

## Conta Demo

| Campo | Valor |
|---|---|
| Email | `demo@partnerportal.com` |
| Senha | `Demo@123` |

> Cada IP/dispositivo tem 20 minutos de acesso demo por dia. Para avaliação completa, crie sua própria conta em `/cadastro`.

---

## Rotas

### Frontend

| Rota | Descrição |
|---|---|
| `/` | Landing page |
| `/login` | Autenticação |
| `/cadastro` | Criação de conta |
| `/verificar-email` | Confirmação por OTP |
| `/recuperar-senha` | Início do fluxo de recovery |
| `/redefinir-senha` | Nova senha com token |
| `/dashboard` | Área autenticada |
| `/dashboard/configuracoes` | Perfil e preferências |

### API

| Prefixo | Módulo |
|---|---|
| `/api/auth` | Autenticação, sessão, OTP |
| `/api/admin` | Admin PIN |
| `/api/finance` | Dashboard financeiro |
| `/api/products` | Portfólio |
| `/api/orders` | Pedidos |
| `/api/employees` | Funcionários |
| `/api/market-intelligence` | Gemini Flash |
| `/api/currency` | Cotações |
| `/api/monitoring` | Health check |

Swagger disponível em `/docs` em ambiente de desenvolvimento.

---

## Documentação Complementar

- `docs/architecture/overview.md`
- `docs/architecture/local-development.md`
- `docs/security/deploy-checklist.md`
- `docs/security/brevo-domain-setup.md`
- `docs/security/security-baseline.md`
- `docs/security/observability-and-logs.md`
