# Overview de Arquitetura

## Escolha de stack

- frontend: Next.js + Tailwind CSS + shadcn/ui + TanStack Query + React Three Fiber
- backend: NestJS + Prisma + PostgreSQL
- monorepo: pnpm workspace + Turbo

## Motivacao

Esta composicao oferece:

- velocidade de desenvolvimento
- interface moderna e forte para portfolio
- backend organizado
- escalabilidade suficiente para crescer
- base consistente para seguranca e monitoramento

## Modulos iniciais do produto

- institucional
- autenticacao
- dashboard
- produtos
- financeiro
- consentimento
- monitoramento

## Decisao de fronteira

- `apps/web` nao concentra regra de negocio critica
- `apps/api` e a origem da verdade para auth, consentimentos, logs e dados de negocio
- `packages/ui` centraliza consistencia visual
- `packages/types` evita duplicacao de contratos
