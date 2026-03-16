# Desenvolvimento Local

## Objetivo

Deixar o projeto rodando localmente com:

- `apps/api` em NestJS
- `apps/web` em Next.js
- PostgreSQL para auth, consentimento e dados do portal

## Variaveis de ambiente

1. Copie `.env.example` para `.env`.
2. Ajuste `DATABASE_URL` e `DIRECT_URL` para seu PostgreSQL local.
3. Se quiser envio real de confirmacao e redefinicao de senha, configure o bloco SMTP.
4. Se quiser ativar o consultor executivo com IA, configure `GEMINI_API_KEY`.

Exemplo:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/partner_portal
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/partner_portal
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
COOKIE_SECRET=change-me
CSRF_SECRET=change-me
PASSWORD_RESET_TTL_MINUTES=30
EMAIL_VERIFICATION_TTL_MINUTES=15
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

Exemplo de SMTP:

```env
SMTP_HOST=smtp.seuprovedor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USER=seu-usuario
SMTP_PASS=sua-senha-ou-app-password
SMTP_FROM_NAME=Partner Portal
SMTP_FROM_EMAIL=no-reply@suaempresa.com
```

## Banco de dados

Opcoes:

- usar Docker com `npm run db:up`
- usar um PostgreSQL instalado localmente

Se o ambiente nao tiver Docker, basta apontar `DATABASE_URL` e `DIRECT_URL` para um PostgreSQL existente.

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
- sem SMTP configurado, o backend registra os codigos de confirmacao e redefinicao no log em desenvolvimento
- sem `GEMINI_API_KEY`, o card de inteligencia de mercado fica indisponivel no dashboard
- o backend usa a raiz `.env` como fonte principal de configuracao local
