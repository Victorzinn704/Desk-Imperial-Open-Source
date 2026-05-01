# Desenvolvimento Local

**Versao:** 1.1  
**Ultima atualizacao:** 2026-05-01

## Objetivo

Rodar o projeto localmente com:

- `apps/api` em NestJS
- `apps/web` em Next.js
- PostgreSQL para dados transacionais
- Redis para cache, rate limit e realtime multi-instancia

---

## 1. Estrategia de ambiente

Arquivos e papeis:

- `.env.example` na raiz: fonte canônica de variaveis documentadas
- `.env` na raiz: ambiente local compartilhado
- `apps/api/.env`: override local especifico da API, nao versionado
- `apps/web/.env.local`: override local especifico do frontend, nao versionado

Regra pratica:

- se a variavel serve para documentar o projeto, ela precisa existir em `.env.example`
- se a variavel e segredo local ou override de maquina, ela fica em `.env`, `apps/api/.env` ou `apps/web/.env.local`

---

## 2. Variaveis minimas para subir local

O minimo util para fluxo local real e:

```env
DATABASE_URL=postgresql://desk_imperial:desk_imperial_change_me@localhost:5432/partner_portal
DIRECT_URL=postgresql://desk_imperial:desk_imperial_change_me@localhost:5432/partner_portal
REDIS_PASSWORD=desk_imperial_redis_change_me
REDIS_URL=redis://:desk_imperial_redis_change_me@localhost:6379
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
COOKIE_SECRET=replace-with-a-long-random-cookie-secret
CSRF_SECRET=replace-with-a-long-random-csrf-secret
ENCRYPTION_KEY=replace-with-a-32-char-encryption-key
DEMO_STAFF_PASSWORD=123456
PASSWORD_RESET_TTL_MINUTES=30
EMAIL_VERIFICATION_TTL_MINUTES=15
ENABLE_API_DOCS=false
```

Segredos que nao podem ficar em placeholder quando a API sobe de verdade:

- `COOKIE_SECRET`
- `CSRF_SECRET`
- `ENCRYPTION_KEY`

Em runtime atual, a API falha no bootstrap se `COOKIE_SECRET` ou `CSRF_SECRET` estiverem inseguros fora de teste.

---

## 3. Variaveis opcionais por trilha

### IA / catalogo

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TIMEOUT_MS=15000
```

Sem `GEMINI_API_KEY`, os fluxos assistidos continuam de pe, mas a parte inteligente fica indisponivel.

### Email / Brevo

```env
EMAIL_PROVIDER=brevo
BREVO_API_URL=https://api.brevo.com/v3/smtp/email
BREVO_API_KEY=
EMAIL_FROM_NAME=DESK IMPERIAL
EMAIL_FROM_EMAIL=no-reply@send.seudominio.com.br
EMAIL_REPLY_TO=suporte@suaempresa.com
EMAIL_SUPPORT_ADDRESS=suporte@suaempresa.com
LOGIN_ALERT_EMAILS_ENABLED=false
FAILED_LOGIN_ALERTS_ENABLED=false
FAILED_LOGIN_ALERT_THRESHOLD=3
PORTFOLIO_EMAIL_FALLBACK=false
```

### Telegram

```env
TELEGRAM_BOT_ENABLED=false
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=Desk_Imperial_bot
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_WEBHOOK_URL=
TELEGRAM_ALLOWED_WORKSPACE_OWNER_IDS=
```

### Sentry

API:

```env
SENTRY_DSN=
SENTRY_ENABLED=true
SENTRY_ENABLE_LOGS=false
SENTRY_SEND_DEFAULT_PII=false
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILE_SESSION_SAMPLE_RATE=0.02
SENTRY_PROFILE_LIFECYCLE=trace
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=
```

Web:

```env
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_SENTRY_ENABLED=true
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
NEXT_PUBLIC_SENTRY_RELEASE=
SENTRY_WEB_DSN=
SENTRY_WEB_ENABLED=true
SENTRY_WEB_TRACES_SAMPLE_RATE=0.1
SENTRY_WEB_ENVIRONMENT=development
SENTRY_AUTH_TOKEN=
```

`SENTRY_AUTH_TOKEN` so e necessario para upload de sourcemaps no build do web.

---

## 4. Banco e Redis

Voce pode usar:

- Docker local com `npm run db:up`
- PostgreSQL/Redis ja instalados na maquina

Se nao usar o compose local, aponte:

- `DATABASE_URL`
- `DIRECT_URL`
- `REDIS_URL`

O runtime atual usa `REDIS_URL` como chave principal; aliases gerenciados existem, mas o caminho documentado continua sendo `REDIS_URL`.

---

## 5. Bootstrap recomendado

### Preparar backend local

```powershell
npm run local:backend:prepare
```

Esse fluxo faz:

1. sobe Postgres e Redis locais
2. espera a infra ficar pronta
3. gera o Prisma Client
4. aplica migrations com `migrate deploy`
5. roda `seed`
6. roda `repair-demo`

Importante:

- rode com a API local parada
- o helper `scripts/prisma-generate-local.mjs` aborta se detectar API viva em `http://127.0.0.1:4000/api/health`
- em Windows, isso evita travar o `prisma generate` com query engine em uso

### Sincronizar apenas dados demo

```powershell
npm run local:backend:sync-demo
```

Use esse atalho quando:

- a infra ja esta pronta
- voce so quer reidratar o demo local

---

## 6. Subir API e web

Depois do bootstrap:

```powershell
npm --workspace @partner/api run dev
npm --workspace @partner/web run dev
```

Superficies locais principais:

- API health: `http://localhost:4000/api/v1/health`
- API docs: `http://localhost:4000/api/v1/docs` quando `ENABLE_API_DOCS=true`
- Web: `http://localhost:3000`

Existe tambem alias legado local em `/api/health`, mas a rota canônica atual continua sendo `/api/v1/health`.

---

## 7. Smoke local de fresh-start

Para validar bootstrap do zero logico:

```powershell
npm run smoke:local:bootstrap
```

O smoke faz:

1. exige porta `4000` livre
2. roda `local:backend:prepare`
3. compila a API com `build:verify`
4. sobe a API compilada
5. valida `GET /api/v1/health`
6. valida login demo `OWNER`
7. valida login demo `STAFF` com `VD-001`

Logs usados:

- `artifacts/server-logs/api-smoke.out.log`
- `artifacts/server-logs/api-smoke.err.log`

---

## 8. Observacoes operacionais

- o backend usa a raiz `.env` como fonte principal de configuracao local
- a geracao de OpenAPI em desenvolvimento e fail-open: se a doc quebrar, a API nao deve impedir o bootstrap local
- sem PostgreSQL ativo, o frontend compila, mas fluxos reais de login/cadastro/operacao nao fecham
- sem Redis ativo, partes de cache, rate limit e realtime multi-instancia degradam
- sem Brevo, verify-email e reset seguem para log/fallback conforme ambiente
- sem Gemini, a camada inteligente do cadastro fica indisponivel
- sem Sentry DSN, o app continua funcional; apenas nao envia eventos/traces

---

## 9. Problemas comuns

### `prisma generate` falha no Windows

Quase sempre significa API local ainda viva usando o query engine.

Faca:

1. pare a API
2. rode `npm run local:backend:prepare`
3. se for so demo, use `npm run local:backend:sync-demo`

### `GET /api/v1/health` falha no smoke

Verifique:

- Postgres local
- Redis local
- segredos minimos (`COOKIE_SECRET`, `CSRF_SECRET`)
- porta `4000` livre

### `next dev` pesa demais durante smoke automatizado

Para smoke browser automatizado do `apps/web`, prefira:

- `next build`
- `next start`
- porta isolada
- `NODE_OPTIONS=--max-old-space-size=1024`

Esse repo ja mostrou que `next dev` com Turbopack e Playwright pode ser pesado demais para smoke automatizado no host Windows.
