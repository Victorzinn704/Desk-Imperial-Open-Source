# Desk Imperial — Contexto para Claude Code

## Identidade do Projeto
**Desk Imperial** é uma plataforma SaaS B2B de gestão comercial para pequenos e médios negócios brasileiros. Portal único com PDV, financeiro, calendário comercial, portfólio de produtos, folha de pagamento e operações em tempo real.

- **Domínio web:** app.deskimperial.online
- **Domínio API:** api.deskimperial.online
- **GitHub:** https://github.com/Victorzinn704/nextjs-boilerplate
- **Railway project:** 14d830a4-8f92-460a-8152-15987c91efd8
- **Railway serviço web:** imperial-desk-web (ID: 96df3669-4696-4bf1-865f-a2e886f5dc04)

---

## Stack Técnica

### Frontend (`apps/web`)
- **Next.js 16** (Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS** — tema imperial: `--bg: #000000`, `--accent: #9b8460` (dourado), `--text-primary`, `--text-soft`
- **Framer Motion v12** — animações: `whileInView`, `useSpring`, `useMotionValue`, `viewport: { once: false }`
- **@hello-pangea/dnd** — drag-and-drop do kanban PDV
- **react-big-calendar** — calendário comercial com DnD
- **canvas-confetti** — confete no click da landing
- **lucide-react** — ícones (Crown no BrandMark, não ShieldCheck)
- **zod** — validação de formulários

### Backend (`apps/api`)
- **NestJS** + **TypeScript**
- **Prisma ORM** → **Neon PostgreSQL** (serverless)
- **ioredis** → **Redis** (cache + rate limiting + Socket.IO adapter)
- **Socket.IO** — operações em tempo real (`/operations-realtime`)
- **JWT** — auth com cookies HTTP-only + CSRF sessionStorage

### Infra
- **Turborepo** — monorepo (`apps/api`, `apps/web`, `packages/types`)
- **Railway** — deploy via `railway up --service imperial-desk-web`
- **Deploy:** `railway up --service imperial-desk-web` (sempre usar isso para force-deploy)

---

## Arquitetura de Cache (Redis)

| Dado | Chave | TTL |
|---|---|---|
| Finance summary | `finance:summary:{userId}` | 120s |
| Products list | `products:list:{userId}` | 300s |
| Employees list | `employees:list:{userId}` | 600s |
| Orders summary | `orders:summary:{userId}` | 90s |
| Gemini insights | `gemini:insight:{userId}:{currency}:{focus}` | 900s |
| Rate limiting | `ratelimit:{prefix}:{key}` | dinâmico |

**Regra:** Sempre invalidar cache nas mutações (create/update/delete). CacheService é global e tem `graceful degradation` (sem Redis = sem cache, sistema continua funcionando).

---

## Módulos do Sistema

| Módulo | Descrição |
|---|---|
| **PDV / Comandas** | Kanban 4 colunas (Aberta→Em Preparo→Pronta→Fechada), DnD, CPF/CNPJ |
| **Financeiro** | KPIs, sparklines, categorias, top produtos/clientes/vendedores |
| **Calendário Comercial** | react-big-calendar, eventos/promoções/jogos com impacto em vendas |
| **Folha de Pagamento** | salarioBase + percentualVendas no PostgreSQL (migrado de localStorage) |
| **Gestão de Equipe** | Ranking de vendedores, metas, histórico |
| **Admin PIN** | Proteção 4 dígitos, rate limit via Redis |
| **Portfólio** | Produtos, caixas, unidades, margem |
| **Operações RT** | Socket.IO + Redis adapter, eventos de comanda/caixa |

---

## Convenções de Código

### Frontend
- Componentes em `apps/web/components/` separados por domínio (`marketing/`, `dashboard/`, `pdv/`, `auth/`)
- Contratos de API em `apps/web/lib/api.ts` e `packages/types/src/contracts.ts`
- Validação com Zod em `apps/web/lib/validation.ts`
- `sessionStorage`: CSRF token + Admin PIN token
- `localStorage`: apenas sidebar collapse state + cookie consent (payroll foi migrado)
- **NUNCA** usar `overflow: hidden` em section pai de `whileInView` — quebra IntersectionObserver

### Backend
- Services injetam `CacheService` e `PrismaService`
- DTOs com class-validator decorators
- Auth guard em todos os endpoints privados
- Workspaces isolados por `companyOwnerId` (nunca vazar dados entre workspaces)

### CSS / Animações
- Cards do stack: `.stackcard` com chumbo `#32363b`
- Animação "emergir da galáxia": `blur(28px)→0 + scale(0.72→1)` no `whileInView`
- Carpet/tapete: `scaleX: 0→1` com `transformOrigin` (clip-path é instável no Framer Motion)
- `once: false` em todos os viewports para animação bidirecional

---

## Fluxo de Deploy

```bash
# 1. Commit e push
git add <arquivos>
git commit -m "tipo(escopo): descrição"
git push origin main

# 2. Deploy Railway
railway up --service imperial-desk-web
```

---

## Papéis de Usuário

| Role | Acesso |
|---|---|
| `OWNER` | Tudo — todas as seções, configurações, admin PIN |
| `STAFF` | Apenas `sales`, `pdv`, `calendario` |

---

## Regras de Negócio Críticas

1. **Workspace isolation** — toda query filtra por `companyOwnerId`. Nunca expor dados de outro tenant.
2. **Admin PIN** — operações sensíveis (preço manual, cancelamento) exigem PIN de 4 dígitos. Rate limit via Redis (3 tentativas / 5 min → lock 5 min).
3. **CPF/CNPJ** — sempre validar com algoritmo real (não só length check). Funções em `apps/web/lib/validation.ts`.
4. **Cache invalidation** — qualquer mutação deve chamar `invalidate*Cache(userId)` correspondente.
5. **Decimal precision** — valores monetários usam `Prisma Decimal` (10,2) no banco, `number` no frontend após conversão.
