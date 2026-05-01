# Desk Imperial

[![CI main](https://github.com/Victorzinn704/Desk-Imperial-Open-Source/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Victorzinn704/Desk-Imperial-Open-Source/actions/workflows/ci.yml?query=branch%3Amain)
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
| **PDV / Comandas**            | Kanban 4 colunas, CPF/CNPJ, desconto e acréscimo por comanda                                   |
| **Tempo real**                | Toda a equipe vê o mesmo estado ao vivo via Socket.IO, sem recarregar                           |
| **Financeiro**                | Receita, custo, margem, top produtos e top vendedores por período                               |
| **Folha de pagamento**        | Salário fixo + comissão sobre vendas calculada por funcionário                                  |
| **Mapa de vendas**            | Pedidos plotados por bairro e região com geocodificação real                                    |
| **Calendário comercial**      | Planeje eventos e correlacione com as vendas do período                                         |
| **Mobile — dono**             | Painel executivo otimizado para celular                                                         |
| **Mobile — funcionário**      | PDV e atendimento completo pelo celular                                                         |
| **Admin PIN**                 | Senha de 4 dígitos com bloqueio anti-força-bruta para ações sensíveis                           |
| **Cadastro inteligente**      | Barcode, Open Food Facts, Gemini e heurísticas de catálogo para acelerar cadastro de produtos   |
| **Telegram e notificações**   | Vínculo do bot oficial, preferências por workspace e usuário, entregas operacionais filtradas   |
| **Observabilidade e erros**   | OpenTelemetry, Grafana Faro e Sentry integrados ao ciclo de operação                            |
| **Export CSV**                | Baixe pedidos para Excel ou Google Planilhas                                                    |
| **Insight IA**                | Resumo executivo gerado pelo Gemini com cache e controle de uso                                 |
| **LGPD**                      | Consentimento de cookies, versionamento de documentos legais, dados isolados por negócio        |

---

## Stack

| Camada             | Tecnologia                                   |
| ------------------ | -------------------------------------------- |
| Backend            | NestJS 11 + TypeScript                       |
| Frontend           | Next.js 16 + React 19                        |
| Banco de dados     | PostgreSQL 16 + Prisma ORM                   |
| Cache / Rate limit | Redis                                        |
| Tempo real         | Socket.IO                                    |
| Autenticação       | Cookies HttpOnly + CSRF duplo                |
| Monorepo           | Turborepo + npm workspaces                   |
| Deploy             | Oracle Cloud (web/api/redis) + PostgreSQL self-hosted em Ampere |
| Testes backend     | Jest + 53+ arquivos de spec                  |
| Testes frontend    | Vitest + Playwright                          |
| Load tests         | K6                                           |

---

## Quick start

### Pré-requisitos

- Node.js 22+
- Docker (para banco e Redis local)

### 1. Clone e instale

```bash
git clone https://github.com/Victorzinn704/Desk-Imperial-Open-Source.git desk-imperial
cd desk-imperial
npm ci
```

### 2. Configure o ambiente

```bash
cp .env.example .env
```

Variáveis mínimas para rodar localmente:

```env
DATABASE_URL=postgresql://desk_imperial:desk_imperial_change_me@localhost:5432/partner_portal
DIRECT_URL=postgresql://desk_imperial:desk_imperial_change_me@localhost:5432/partner_portal
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
COOKIE_SECRET=troque-por-um-cookie-secret-longo-e-aleatorio
CSRF_SECRET=troque-por-um-csrf-secret-longo-e-aleatorio
ENCRYPTION_KEY=troque-por-uma-chave-de-32-caracteres-ou-mais
```

Integrações externas (Brevo, Gemini, AwesomeAPI) são **opcionais** em desenvolvimento.  
Veja [docs/architecture/local-development.md](./docs/architecture/local-development.md) para o guia completo.

### 3. Suba o banco e o Redis

```bash
npm run db:up
```

Opcional (observabilidade OSS local):

```bash
npm run obs:up
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
| Frontend     | http://localhost:3000               |
| API          | http://localhost:4000/api/v1       |
| Health check | http://localhost:4000/api/v1/health |
| Swagger      | http://localhost:4000/api/v1/docs  |

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

# Cobertura local padrão do frontend
npm --workspace @partner/web run test:coverage

# Cobertura local usada pelo SonarQube
npm --workspace @partner/api run test -- --coverage --ci --forceExit --coverageReporters=json-summary --coverageReporters=lcov --coverageReporters=text-summary
npm --workspace @partner/web run test:coverage:sonar

# Fluxos críticos (E2E)
npm run test:e2e:critical

# Carga crítica com metas de latência (K6)
npm run test:load:critical

# Gate de latência para CI (K6)
npm run test:load:ci
```

> Para `test:load:critical`, instale o CLI do k6 no ambiente (local/runner) antes da execução.

**O que está coberto:**

- Testes unitários, de integração e E2E cobrindo auth, operations, orders, finance, notifications e segurança
- Testes E2E com Playwright no frontend
- Load tests com K6 (health, login web/API e cenário crítico com metas p95/p99)
- CI com 6 estágios: `quality → backend → frontend unit → frontend e2e → security → build`
- Workflow opcional de SonarQube pronto para auditoria estática contínua quando `SONAR_HOST_URL` e `SONAR_TOKEN` forem configurados
- Scan local oficial já validado com Quality Gate verde e backlog por sprint em `docs/release/sonarqube-auditoria-e-sprints-2026-04-03.md`

---

## Arquitetura

```
desk-imperial/
├── apps/
│   ├── api/          # NestJS — auth, operação, produtos, pedidos, finanças, notificações e realtime
│   └── web/          # Next.js — dashboard, owner mobile, staff mobile e superfícies operacionais
├── packages/
│   ├── api-contract/ # Contrato OpenAPI versionado
│   └── types/        # Contratos compartilhados API ↔ frontend
├── docs/             # 70+ arquivos de documentação técnica
├── infra/            # Docker Compose + scripts de deploy
└── tests/load/k6/    # Load tests
```

**Módulos principais da API:**

`auth` · `admin-pin` · `consent` · `currency` · `employees` · `finance` · `geocoding` · `health` · `intelligence-platform` · `market-intelligence` · `monitoring` · `notifications` · `operations` · `operations-realtime` · `orders` · `products`

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

| Área                                   | Link                                                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Índice completo                        | [docs/INDEX.md](./docs/INDEX.md)                                                                     |
| O produto e para quem é                | [docs/product/overview.md](./docs/product/overview.md)                                               |
| Requisitos funcionais e não-funcionais | [docs/product/requirements.md](./docs/product/requirements.md)                                       |
| Fluxos principais do usuário           | [docs/product/user-flows.md](./docs/product/user-flows.md)                                           |
| Riscos e limitações                    | [docs/product/risks-and-limitations.md](./docs/product/risks-and-limitations.md)                     |
| Arquitetura — visão geral              | [docs/architecture/overview.md](./docs/architecture/overview.md)                                     |
| Arquitetura — módulos                  | [docs/architecture/modules.md](./docs/architecture/modules.md)                                       |
| Arquitetura — banco de dados           | [docs/architecture/database.md](./docs/architecture/database.md)                                     |
| Arquitetura — tempo real               | [docs/architecture/realtime.md](./docs/architecture/realtime.md)                                     |
| Setup local                            | [docs/architecture/local-development.md](./docs/architecture/local-development.md)                   |
| Segurança                              | [docs/security/security-baseline.md](./docs/security/security-baseline.md)                           |
| Testes                                 | [docs/testing/testing-guide.md](./docs/testing/testing-guide.md)                                     |
| Telegram                               | [docs/operations/telegram-bot-rollout.md](./docs/operations/telegram-bot-rollout.md)                 |
| Performance do realtime                | [docs/operations/realtime-performance-runbook.md](./docs/operations/realtime-performance-runbook.md) |
| Waves em andamento                     | [docs/waves/realtime-recovery-plan-2026-05-01.md](./docs/waves/realtime-recovery-plan-2026-05-01.md) |
| Diagnósticos históricos de release     | [docs/release/](./docs/release/)                                                                     |
| Sobre o criador                        | [docs/CREATOR.md](./docs/CREATOR.md)                                                                 |
| Dicas para novos devs                  | [docs/GETTING-STARTED.md](./docs/GETTING-STARTED.md)                                                 |

---

## Limitações conhecidas

- Cobertura de testes frontend ainda parcial em relação à superfície total
- Observabilidade OSS em transição: OpenTelemetry (fase 1 no backend) e Faro (fase 2 no frontend) habilitáveis por env; stack completa de produção em implantação progressiva
- Projeto em evolução — funcional e rodando em produção, mas não finalizado 100%

Veja o detalhamento completo em [docs/product/risks-and-limitations.md](./docs/product/risks-and-limitations.md).

---

## Higiene do repositório

Scripts úteis para manter o projeto publicável, rastreável e sem surpresa entre o estado local e o remoto:

```bash
# procura riscos públicos óbvios antes de publicar no GitHub
npm run repo:scan-public

# mostra a diferença entre sua branch local, a working tree e a base remota
npm run repo:drift

# roda o gate de segurança usado no CI público
npm run security:audit-runtime
```

`npm run repo:drift` separa duas coisas que costumam confundir:

- **arquivos não commitados**: o que ainda está só no seu disco local
- **diferença da branch para `origin/main`**: tudo que mudou na sua branch em relação ao remoto, mesmo que já esteja commitado

---

## Contribuição

Leia [CONTRIBUTING.md](./CONTRIBUTING.md) para o fluxo completo.

Neste projeto, mudanças entram por **pull request revisado**.  
O repositório é aberto para colaboração, mas a direção do produto continua centralizada para preservar a identidade e a qualidade do Desk Imperial.

Checklist mínimo antes de abrir PR:

- [ ] `npm run lint` passa sem erros
- [ ] `npm run typecheck` passa
- [ ] Testes da área alterada passam
- [ ] `npm run build` passa

---

## Primeira contribuição

Se você quer contribuir pela primeira vez, este é o melhor caminho:

1. Leia [docs/GETTING-STARTED.md](./docs/GETTING-STARTED.md)
2. Escolha uma issue pequena de documentação, teste ou bug isolado
3. Confirme o escopo em uma issue antes de começar algo maior
4. Abra PR pequeno, focado e fácil de revisar

Boas primeiras contribuições para este repositório:

- correções de documentação desatualizada
- testes faltantes em fluxos já existentes
- melhorias de acessibilidade e feedback de UI
- correções pontuais de bugs com reprodução clara

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
