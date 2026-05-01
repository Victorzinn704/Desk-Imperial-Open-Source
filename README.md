# Desk Imperial

[![CI main](https://github.com/Victorzinn704/Desk-Imperial-Open-Source/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Victorzinn704/Desk-Imperial-Open-Source/actions/workflows/ci.yml?query=branch%3Amain)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-22%2B-brightgreen)](https://nodejs.org)
[![Open Source](https://img.shields.io/badge/open%20source-yes-blue)](./LICENSE)

**Sistema gratuito de gestao para pequenos e medios comerciantes brasileiros.**

PDV ao vivo, controle financeiro, folha de pagamento automatica, mapa de vendas, trilhas mobile e documentacao tecnica real de operacao no mesmo projeto.

> Feito para tirar o comerciante brasileiro da planilha.  
> Codigo aberto. Licenca MIT. Construido e mantido por uma pessoa so.

> **Nota sobre este repositorio aberto**
>
> O Desk Imperial hoje evolui em waves. Este mirror publico recebe documentacao e syncs de codigo por etapas. Por isso, alguns documentos abaixo podem refletir o estado operacional mais novo do projeto antes do sync completo de toda a arvore de codigo para o mirror aberto.

---

## Demonstracao rapida

Quer ver o sistema antes de instalar?

Acesse **[app.deskimperial.online](https://app.deskimperial.online)** com a conta demo.

Veja [docs/DEMO.md](./docs/DEMO.md) para instrucoes de acesso.

---

## O que e

O Desk Imperial resolve dois problemas que costumam ficar separados:

**Operacao ao vivo**: abrir comanda, acompanhar pedidos, controlar caixa, ver o salao em tempo real e coordenar cozinha e atendimento sem recarregar a tela.

**Gestao do negocio**: financeiro por periodo, folha automatica, ranking de vendedores, mapa de pedidos, eventos comerciais, trilhas de auditoria e observabilidade.

Tudo no mesmo sistema. Sem planilha. Sem mensalidade.

**Para quem e:**

- dono de restaurante, lanchonete, bar ou comercio com atendimento
- funcionario que precisa de PDV e atendimento no celular
- desenvolvedor que quer contribuir, estudar ou usar como base

---

## Funcionalidades

| Modulo                      | O que faz                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------ |
| **PDV / Comandas**          | Kanban operacional, CPF/CNPJ, desconto, acrescimo e fechamento de comanda            |
| **Tempo real**              | Atualizacao de operacao ao vivo via Socket.IO com reconciliacao e trilha de recovery |
| **Financeiro**              | Receita, custo, margem, top produtos e top vendedores por periodo                    |
| **Folha de pagamento**      | Salario fixo + comissao por funcionario                                              |
| **Mapa de vendas**          | Pedidos plotados por bairro e regiao com geocodificacao                              |
| **Mobile - dono**           | Painel executivo otimizado para celular                                              |
| **Mobile - funcionario**    | PDV e atendimento completos no celular                                               |
| **Admin PIN**               | Challenge de 4 digitos com bloqueio anti-forca-bruta para acoes sensiveis            |
| **Notificacoes / Telegram** | Canal empresarial de notificacoes e comandos com rollout documentado                 |
| **IA / Gemini**             | Resumo executivo e trilhas de cadastro inteligente documentadas no mainline          |
| **Observabilidade**         | OpenTelemetry, Faro e Sentry em waves de rollout                                     |
| **LGPD**                    | Consentimento, versionamento legal e dados isolados por negocio                      |

---

## Stack

| Camada             | Tecnologia                                        |
| ------------------ | ------------------------------------------------- |
| Backend            | NestJS 11 + TypeScript                            |
| Frontend           | Next.js 16 + React 19                             |
| Banco de dados     | PostgreSQL 16 + Prisma ORM                        |
| Cache / Rate limit | Redis                                             |
| Tempo real         | Socket.IO                                         |
| Autenticacao       | Cookies HttpOnly + CSRF duplo                     |
| Monorepo           | Turborepo + npm workspaces                        |
| Deploy             | Docker Compose + Oracle Cloud (producao atual)    |
| Monitoramento      | OpenTelemetry + Faro + Sentry em rollout por wave |
| Testes backend     | Jest                                              |
| Testes frontend    | Vitest + Playwright                               |
| Load tests         | K6                                                |

---

## Quick start

### Pre-requisitos

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

Variaveis minimas para rodar localmente:

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

Integracoes externas como Brevo, Gemini, AwesomeAPI e Sentry sao opcionais em desenvolvimento.  
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
# Terminal 1 - API
npm --workspace @partner/api run dev

# Terminal 2 - Frontend
npm --workspace @partner/web run dev
```

| Servico      | URL                              |
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

# Fluxos criticos (E2E)
npm run test:e2e:critical

# Carga critica com metas de latencia (K6)
npm run test:load:critical

# Gate de latencia para CI (K6)
npm run test:load:ci
```

> Para `test:load:critical`, instale o CLI do k6 no ambiente antes da execucao.

**Cobertura do pipeline publico**

- lint e typecheck no monorepo
- testes de backend
- testes unitarios do frontend
- baseline E2E do frontend
- checks de seguranca do repositorio publico
- gate de latencia com K6
- build final das workspaces

---

## Arquitetura

```text
desk-imperial/
├── apps/
│   ├── api/          # NestJS
│   └── web/          # Next.js
├── packages/
│   └── types/        # Contratos compartilhados API <-> frontend
├── docs/             # Documentacao tecnica, rollout e waves
├── infra/            # Docker Compose + scripts de deploy
└── tests/load/k6/    # Load tests
```

**Dominios principais**

`auth` · `admin-pin` · `operations` · `operations-realtime` · `orders` · `products` · `finance` · `employees` · `consent` · `currency` · `geocoding` · `mailer` · `market-intelligence` · `monitoring`

Veja [docs/architecture/modules.md](./docs/architecture/modules.md) para a responsabilidade de cada dominio documentado no mirror aberto.

---

## Seguranca

- Cookies HttpOnly + CSRF token duplo nas mutacoes
- Rate limit por dominio em Redis
- Isolamento por workspace
- Audit log de eventos sensiveis
- Admin PIN com challenge efemero e bloqueio por tentativas
- Trilha documentada de testes de seguranca e superficie publicada

Para reportar uma vulnerabilidade, leia [SECURITY.md](./SECURITY.md).

---

## Documentacao

| Area                                   | Link                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Indice completo                        | [docs/INDEX.md](./docs/INDEX.md)                                                                                   |
| Guia de documentacao                   | [docs/README.md](./docs/README.md)                                                                                 |
| O produto e para quem e                | [docs/product/overview.md](./docs/product/overview.md)                                                             |
| Requisitos funcionais e nao-funcionais | [docs/product/requirements.md](./docs/product/requirements.md)                                                     |
| Riscos e limitacoes                    | [docs/product/risks-and-limitations.md](./docs/product/risks-and-limitations.md)                                   |
| Arquitetura - modulos                  | [docs/architecture/modules.md](./docs/architecture/modules.md)                                                     |
| Arquitetura - tempo real               | [docs/architecture/realtime.md](./docs/architecture/realtime.md)                                                   |
| Setup local                            | [docs/architecture/local-development.md](./docs/architecture/local-development.md)                                 |
| Rollout Telegram                       | [docs/operations/telegram-bot-rollout.md](./docs/operations/telegram-bot-rollout.md)                               |
| Rollout Sentry                         | [docs/operations/sentry-rollout-2026-05-01.md](./docs/operations/sentry-rollout-2026-05-01.md)                     |
| Workflow de testes de seguranca        | [docs/security/security-testing-workflow-2026-04-30.md](./docs/security/security-testing-workflow-2026-04-30.md)   |
| Realtime Wave 0                        | [docs/waves/realtime-wave-0-inventory-2026-05-01.md](./docs/waves/realtime-wave-0-inventory-2026-05-01.md)         |
| Realtime Recovery Plan                 | [docs/waves/realtime-recovery-plan-2026-05-01.md](./docs/waves/realtime-recovery-plan-2026-05-01.md)               |
| Checklist de validacao realtime        | [docs/waves/realtime-validation-checklist-2026-05-01.md](./docs/waves/realtime-validation-checklist-2026-05-01.md) |

---

## Limitacoes conhecidas

- O mirror aberto e atualizado por waves; alguns syncs de codigo chegam depois da documentacao
- Importacao CSV de produtos segue desativada no fluxo publico atual
- Cobertura de testes frontend ainda e parcial diante da superficie total
- Observabilidade e realtime continuam em refinamento ativo
- Projeto funcional e em producao, mas ainda em evolucao pesada

Veja o detalhamento completo em [docs/product/risks-and-limitations.md](./docs/product/risks-and-limitations.md).

---

## Contribuicao

Leia [CONTRIBUTING.md](./CONTRIBUTING.md) para o fluxo completo.

Checklist minimo antes de abrir PR:

- [ ] `npm run lint` passa sem erros
- [ ] `npm run typecheck` passa
- [ ] testes da area alterada passam
- [ ] `npm run build` passa
