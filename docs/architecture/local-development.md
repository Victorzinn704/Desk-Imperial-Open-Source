# Desenvolvimento Local

## Objetivo

Deixar o projeto rodando localmente com:

- `apps/api` em NestJS
- `apps/web` em Next.js
- PostgreSQL para auth, consentimento e dados do portal

## Variaveis de ambiente

1. Copie `.env.example` para `.env`.
2. Ajuste `DATABASE_URL` para seu PostgreSQL local.

Exemplo:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/partner_portal
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Banco de dados

Opcoes:

- usar Docker com `npm run db:up`
- usar um PostgreSQL instalado localmente

Se o ambiente nao tiver Docker, basta apontar a `DATABASE_URL` para um PostgreSQL existente.

## Comandos principais

```powershell
npm --workspace @partner/api run prisma:generate
npm --workspace @partner/api run prisma:migrate:dev
npm run seed
```

Depois:

```powershell
npm --workspace @partner/api run dev
npm --workspace @partner/web run dev
```

## Observacoes

- a migration inicial ja esta versionada em `apps/api/prisma/migrations/202603142300_init`
- o seed prepara documentos legais, usuario demo e produtos base
- sem PostgreSQL ativo, o front continua compilando, mas login/cadastro nao concluem o fluxo real
