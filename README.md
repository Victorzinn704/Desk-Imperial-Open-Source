# DESK IMPERIAL

Portal empresarial full-stack em monorepo, com foco em UX/UI premium, autenticação segura, LGPD, auditoria e operação comercial.

## O que este projeto entrega

- landing page institucional em `Next.js`
- cadastro e login reais com sessão via cookie `HttpOnly`
- banner global de cookies
- dashboard autenticado com:
  - perfil da conta
  - produtos e portfólio
  - pedidos e vendas
  - financeiro e gráficos
  - leitura multi-moeda em BRL, USD e EUR
  - mapa de vendas por bairro, cidade e região
  - ranking de rendimento por funcionário e vendas vinculadas por ID
  - conformidade e consentimento
- importação CSV de produtos
- confirmação obrigatória de email antes do primeiro login
- recuperação de senha por código temporário e envio por email
- consultor executivo com Gemini Flash para leitura de mercado e previsão operacional
- API NestJS com Prisma, PostgreSQL e trilha de auditoria

## Stack

### Frontend

- `Next.js`
- `React`
- `TanStack Query`
- `React Hook Form`
- `Zod`
- `Framer Motion`
- `MapLibre GL JS`
- `Recharts`

### Backend

- `NestJS`
- `Prisma`
- `PostgreSQL`
- `argon2`
- `Brevo Email API`
- `Pino`

## Estrutura do repositório

```text
test1/
├─ apps/
│  ├─ api/
│  └─ web/
├─ docs/
├─ infra/
├─ packages/
├─ .env.example
├─ package.json
└─ turbo.json
```

## Fluxos principais

### Autenticação

- cadastro com aceite de termos e aviso de privacidade
- confirmação de email antes do primeiro acesso
- login com sessão segura
- logout com invalidação de sessão
- edição de perfil da conta
- recuperação de senha por código de verificação no email

### Dashboard

- visão executiva
- módulo de vendas
- módulo de portfólio
- módulo de conformidade
- roadmap de upgrades
- preferência de moeda com conversão em tempo real via AwesomeAPI
- mapa de vendas com geocodificação pública via Nominatim e visual moderno com MapLibre GL JS
- cadastro de funcionários com vínculo por ID em cada venda
- consultoria de mercado e previsão orientada por Gemini Flash

### Segurança

- cookies `HttpOnly`, `SameSite` e CSRF por header/cookie
- hash de senha com `argon2id`
- audit logs para eventos sensíveis
- sanitização defensiva de entradas
- importação CSV com validação e limites
- bloqueio de tentativas em login, verificação de email e redefinição de senha

## Como rodar localmente

### 1. Instale dependências

```powershell
npm ci
```

### 2. Configure o ambiente

Copie `.env.example` para `.env` e ajuste os valores necessários.

Variáveis mais importantes:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/liberty
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/partner_portal
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/partner_portal
APP_URL=http://localhost:3000
COOKIE_SECRET=change-me
CSRF_SECRET=change-me
EXCHANGE_RATES_URL=https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BRL-USD,BRL-EUR,USD-EUR,EUR-USD
EXCHANGE_RATES_API_KEY=
EXCHANGE_RATES_CACHE_SECONDS=300
EXCHANGE_RATES_STALE_CACHE_SECONDS=21600
EXCHANGE_RATES_RATE_LIMIT_BACKOFF_SECONDS=600
EXCHANGE_RATES_FALLBACK_USD_BRL=5.5
EXCHANGE_RATES_FALLBACK_EUR_BRL=6.0
GEOCODING_URL=https://nominatim.openstreetmap.org/search
GEOCODING_CACHE_SECONDS=86400
GEOCODING_CONTACT_EMAIL=
EMAIL_VERIFICATION_TTL_MINUTES=15
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TIMEOUT_MS=15000
GEMINI_MAX_OUTPUT_TOKENS=768
GEMINI_THINKING_BUDGET=0
GEMINI_CACHE_SECONDS=900
```

Observação:
- as cotações em tempo real usam a AwesomeAPI pública e ficam em cache no backend
- se você tiver uma chave da AwesomeAPI, preencha `EXCHANGE_RATES_API_KEY` para aumentar o limite e reduzir `429`
- se a AwesomeAPI devolver `429` ou ficar indisponível, o backend usa o último cache válido e, em último caso, uma estimativa de contingência para não derrubar o dashboard
- a geocodificação do mapa usa Nominatim público, com cache e tolerância a falha no backend
- em bancos hospedados como Neon, use `DATABASE_URL` para a conexão pooled do app e `DIRECT_URL` para migrations e seed

Para envio real de email de confirmação, redefinição e alertas de segurança:

```env
EMAIL_PROVIDER=brevo
BREVO_API_URL=https://api.brevo.com/v3/smtp/email
BREVO_API_KEY=sua-api-key-da-brevo
EMAIL_FROM_NAME=DESK IMPERIAL
EMAIL_FROM_EMAIL=no-reply@send.seudominio.com.br
EMAIL_REPLY_TO=suporte@suaempresa.com
EMAIL_SUPPORT_ADDRESS=suporte@suaempresa.com
LOGIN_ALERT_EMAILS_ENABLED=false
FAILED_LOGIN_ALERTS_ENABLED=false
FAILED_LOGIN_ALERT_THRESHOLD=3
PORTFOLIO_EMAIL_FALLBACK=false
```

Observação:
- `EMAIL_PROVIDER` aceita `brevo`, `auto` ou `log`
- o fluxo público de email usa a API HTTPS da Brevo; não dependemos mais de Gmail Brevo nem de Resend
- a chave da Brevo precisa ser uma `API key` real do painel `Brevo API > API Keys`
- o remetente configurado em `EMAIL_FROM_EMAIL` precisa existir como sender válido no Brevo
- se o domínio de envio ainda não estiver validado, a Brevo vai rejeitar o remetente e o cadastro cai no modo de apoio do portfólio
- `PORTFOLIO_EMAIL_FALLBACK=true` libera um código de apoio no fluxo de confirmação de email quando o provedor falha, evitando travar o cadastro público do portfólio
- em desenvolvimento, se o email não estiver configurado, o backend registra o código de confirmação/redefinição no log
- para cair menos em spam, prefira remetente com domínio próprio e domínio verificado no provedor
- configure SPF, DKIM e DMARC no domínio antes de divulgar o link publicamente
- se quiser receber alerta a cada novo login, ative `LOGIN_ALERT_EMAILS_ENABLED=true`
- se quiser receber alerta de tentativa suspeita, ative `FAILED_LOGIN_ALERTS_ENABLED=true`
- `FAILED_LOGIN_ALERT_THRESHOLD` define em qual tentativa o aviso é disparado
- a chave `GEMINI_API_KEY` deve ficar apenas no backend; nunca use `NEXT_PUBLIC_` para isso

### 3. Suba o banco

```powershell
npm run db:up
```

### 4. Gere o client Prisma e aplique migrations

```powershell
npm --workspace @partner/api run prisma:generate
npm --workspace @partner/api run prisma:migrate:dev
```

### 5. Rode o seed

```powershell
npm run seed
```

### 6. Inicie a aplicação

Em terminais separados:

```powershell
npm --workspace @partner/api run dev
npm --workspace @partner/web run dev
```

## Scripts úteis

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run db:up`
- `npm run db:down`
- `npm run db:studio`

## Conta demo para avaliação

- email: `demo@partnerportal.com`
- senha: `Demo@123`

Observações:

- a conta demo existe para avaliação rápida do produto
- cada dispositivo/IP tem até `20 minutos por dia` no modo demo
- o recrutador também pode criar a própria conta em `/cadastro`
- em deploy público, trate a demo como ambiente de showcase e não como conta operacional

## Rotas principais

- `/`
- `/login`
- `/cadastro`
- `/verificar-email`
- `/recuperar-senha`
- `/redefinir-senha`
- `/dashboard`

API local:

- `http://localhost:4000/api`

Swagger:

- `http://localhost:4000/docs`
- disponível em desenvolvimento por padrão

## Publicação no GitHub

Este repositório já está preparado para versionamento público ou privado com:

- `README` alinhado ao estado atual
- workflow de CI
- `LICENSE`
- `SECURITY.md`
- `CONTRIBUTING.md`

Antes de publicar:

1. confirme que nenhum `.env` real está versionado
2. revise screenshots e nome do projeto, se quiser personalizar a vitrine
3. configure secrets no provedor de deploy para banco, cookie, CSRF e Brevo

## Documentação complementar

- `docs/architecture/overview.md`
- `docs/architecture/local-development.md`
- `docs/security/deploy-checklist.md`
- `docs/security/brevo-domain-setup.md`
- `docs/security/security-baseline.md`
- `docs/security/observability-and-logs.md`
