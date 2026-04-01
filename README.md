# Desk Imperial

[![CI](https://github.com/Victorzinn704/nextjs-boilerplate/actions/workflows/ci.yml/badge.svg)](https://github.com/Victorzinn704/nextjs-boilerplate/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-22%2B-brightgreen)](https://nodejs.org)
[![Open Source](https://img.shields.io/badge/open%20source-yes-blue)](./LICENSE)

**Sistema gratuito de gestão para pequenos e médios comerciantes brasileiros.**

PDV ao vivo, controle financeiro, folha de pagamento automática, mapa de vendas e muito mais — tudo no mesmo painel, sem pagar nada.

> Feito para tirar o comerciante brasileiro da planilha.  
> Código aberto. Licença MIT. Construído e mantido por uma pessoa só.

---

## Demonstração rápida

Quer ver o sistema antes de instalar?

Acesse **[app.deskimperial.online](https://app.deskimperial.online)** com a conta demo — sem cadastro, sem cartão.

Veja [docs/DEMO.md](./docs/DEMO.md) para instruções de acesso.

---

## O que é

O Desk Imperial resolve dois problemas que costumam ficar separados:

**Operação ao vivo** — abrir comanda, acompanhar pedidos, controlar caixa, ver o salão em tempo real, tudo atualizado para toda a equipe sem precisar recarregar nada.

**Gestão do negócio** — financeiro por período, folha de pagamento calculada automaticamente, ranking de vendedores, mapa de onde vêm os pedidos, calendário de eventos e promoções.

Tudo no mesmo sistema. Sem planilha. Sem pagar mensalidade.

**Para quem é:**

- Dono de restaurante, lanchonete, bar ou comércio com atendimento
- Funcionário que precisa de PDV e atendimento no celular
- Desenvolvedor que quer contribuir, estudar ou usar como base

---

## Funcionalidades

| Módulo                   | O que faz                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| **PDV / Comandas**       | Kanban 4 colunas, arrastar e soltar, CPF/CNPJ, desconto e acréscimo por comanda          |
| **Tempo real**           | Toda equipe vê o mesmo estado ao vivo via Socket.IO, sem recarregar                      |
| **Financeiro**           | Receita, custo, margem, top produtos e top vendedores por período                        |
| **Folha de pagamento**   | Salário fixo + comissão sobre vendas calculada por funcionário                           |
| **Mapa de vendas**       | Pedidos plotados por bairro e região com geocodificação real                             |
| **Calendário comercial** | Planeje eventos e correlacione com as vendas do período                                  |
| **Mobile — dono**        | Painel executivo otimizado para celular                                                  |
| **Mobile — funcionário** | PDV e atendimento completo pelo celular                                                  |
| **Admin PIN**            | Senha de 4 dígitos com bloqueio anti-força-bruta para ações sensíveis                    |
| **Export CSV**           | Baixe pedidos para Excel ou Google Planilhas                                             |
| **Insight IA**           | Resumo executivo gerado pelo Gemini com cache e controle de uso                          |
| **LGPD**                 | Consentimento de cookies, versionamento de documentos legais, dados isolados por negócio |

---

## Stack

| Camada             | Tecnologia                    |
| ------------------ | ----------------------------- |
| Backend            | NestJS 11 + TypeScript        |
| Frontend           | Next.js 16 + React 19         |
| Banco de dados     | PostgreSQL 16 + Prisma ORM    |
| Cache / Rate limit | Redis                         |
| Tempo real         | Socket.IO                     |
| Autenticação       | Cookies HttpOnly + CSRF duplo |
| Monorepo           | Turborepo + npm workspaces    |
| Deploy             | Railway                       |
| Testes backend     | Jest + 53+ arquivos de spec   |
| Testes frontend    | Vitest + Playwright           |
| Load tests         | K6                            |

---

## Quick start

### Pré-requisitos

- Node.js 22+
- Docker (para banco e Redis local)

### 1. Clone e instale

```bash
git clone https://github.com/Victorzinn704/nextjs-boilerplate.git desk-imperial
cd desk-imperial
npm ci
```

### 2. Configure o ambiente

```bash
cp .env.example .env
```

Variáveis mínimas para rodar localmente:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/partner_portal
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/partner_portal
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
COOKIE_SECRET=troque-por-string-longa-aleatoria
CSRF_SECRET=troque-por-outra-string-longa
ENCRYPTION_KEY=troque-por-chave-de-32-caracteres
```

Integrações externas (Brevo, Gemini, AwesomeAPI) são **opcionais** em desenvolvimento.  
Veja [docs/architecture/local-development.md](./docs/architecture/local-development.md) para o guia completo.

### 3. Suba o banco e o Redis

```bash
npm run db:up
```

### 4. Configure o banco

```bash
npm --workspace @partner/api run prisma:generate
npm --workspace @partner/api run prisma:migrate:dev
npm run seed
```

### 5. Rode o projeto

```bash
# Terminal 1 — API
npm --workspace @partner/api run dev

# Terminal 2 — Frontend
npm --workspace @partner/web run dev
```

| Serviço      | URL                              |
| ------------ | -------------------------------- |
| Frontend     | http://localhost:3000            |
| API          | http://localhost:4000/api        |
| Health check | http://localhost:4000/api/health |
| Swagger      | http://localhost:4000/docs       |

---

## Testes

```bash
# Lint + typecheck
npm run lint
npm run typecheck

# Todos os testes
npm run test

# Backend
npm --workspace @partner/api run test
npm --workspace @partner/api run test:e2e

# Frontend
npm --workspace @partner/web run test
npm --workspace @partner/web run test:e2e
```

**O que está coberto:**

- 53+ testes unitários e de integração no backend (todos os módulos críticos)
- Testes E2E com Playwright no frontend
- Load tests com K6 (login, health, página de entrada)
- CI com 6 estágios: `quality → backend → frontend unit → frontend e2e → security → build`

---

## Arquitetura

```
desk-imperial/
├── apps/
│   ├── api/          # NestJS — 16 módulos de domínio
│   └── web/          # Next.js — 10 domínios de componentes
├── packages/
│   ├── types/        # Contratos compartilhados API ↔ frontend
│   ├── config/       # ESLint e TypeScript compartilhados
│   └── ui/           # Componentes reutilizáveis
├── docs/             # 70+ arquivos de documentação técnica
├── infra/            # Docker Compose + scripts de deploy
└── tests/load/k6/    # Load tests
```

**Módulos da API (16):**

`auth` · `admin-pin` · `operations` · `operations-realtime` · `orders` · `products` · `finance` · `employees` · `users` · `consent` · `currency` · `geocoding` · `mailer` · `market-intelligence` · `monitoring` · `cache`

Veja [docs/architecture/modules.md](./docs/architecture/modules.md) para a responsabilidade de cada um.

---

## Segurança

- Cookies HttpOnly + CSRF token duplo (cookie + header) em todas as mutações
- Rate limit por domínio em Redis (login, reset de senha, PIN, verificação de e-mail)
- Isolamento por workspace — dados de cada negócio completamente separados
- Audit log de eventos sensíveis de autenticação e operação
- Admin PIN com challenge efêmero e bloqueio automático por tentativas

Para reportar uma vulnerabilidade, leia [SECURITY.md](./SECURITY.md).

---

## Documentação

| Área                                   | Link                                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------- |
| Índice completo                        | [docs/INDEX.md](./docs/INDEX.md)                                                   |
| O produto e para quem é                | [docs/product/overview.md](./docs/product/overview.md)                             |
| Requisitos funcionais e não-funcionais | [docs/product/requirements.md](./docs/product/requirements.md)                     |
| Fluxos principais do usuário           | [docs/product/user-flows.md](./docs/product/user-flows.md)                         |
| Riscos e limitações                    | [docs/product/risks-and-limitations.md](./docs/product/risks-and-limitations.md)   |
| Arquitetura — módulos                  | [docs/architecture/modules.md](./docs/architecture/modules.md)                     |
| Arquitetura — banco de dados           | [docs/architecture/database.md](./docs/architecture/database.md)                   |
| Arquitetura — tempo real               | [docs/architecture/realtime.md](./docs/architecture/realtime.md)                   |
| Setup local                            | [docs/architecture/local-development.md](./docs/architecture/local-development.md) |
| Segurança                              | [docs/security/security-baseline.md](./docs/security/security-baseline.md)         |
| Sobre o criador                        | [docs/CREATOR.md](./docs/CREATOR.md)                                               |
| Dicas para novos devs                  | [docs/GETTING-STARTED.md](./docs/GETTING-STARTED.md)                               |

---

## Limitações conhecidas

- Importação CSV de produtos está desativada (HTTP 410) — lógica existe, endpoint bloqueado
- Cobertura de testes frontend ainda parcial em relação à superfície total
- Sentry full-stack já integrado; faltam apenas calibração fina de amostragem/alertas por ambiente
- Projeto em evolução — funcional e rodando em produção, mas não finalizado 100%

Veja o detalhamento completo em [docs/product/risks-and-limitations.md](./docs/product/risks-and-limitations.md).

---

## Contribuição

Leia [CONTRIBUTING.md](./CONTRIBUTING.md) para o fluxo completo.

Checklist mínimo antes de abrir PR:

- [ ] `npm run lint` passa sem erros
- [ ] `npm run typecheck` passa
- [ ] Testes da área alterada passam
- [ ] `npm run build` passa

---

## Roadmap

Veja [ROADMAP.md](./ROADMAP.md) para o que está feito, o que está em andamento e o que vem a seguir.

---

## Quem fez

**João Victor de Moraes da Cruz** — estudante de Engenharia de Software.

Construído e mantido sozinho, com foco em segurança, lógica e produto real para quem precisa.  
Leia a história completa em [docs/CREATOR.md](./docs/CREATOR.md).

---

## Licença

MIT — use, modifique e distribua livremente. Veja [LICENSE](./LICENSE).
