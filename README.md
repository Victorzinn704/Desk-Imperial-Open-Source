# DESK IMPERIAL

Portal empresarial full-stack em monorepo, com foco em UX/UI premium, autenticacao segura, LGPD, auditoria e operacao comercial.

## O que este projeto entrega

- landing page institucional em `Next.js`
- cadastro e login reais com sessao via cookie `HttpOnly`
- banner global de cookies
- dashboard autenticado com:
  - perfil da conta
  - produtos e portfolio
  - pedidos e vendas
  - financeiro e graficos
  - leitura multi-moeda em BRL, USD e EUR
  - mapa de vendas por bairro, cidade e regiao
  - ranking de rendimento por funcionario e vendas vinculadas por ID
  - conformidade e consentimento
- importacao CSV de produtos
- confirmacao obrigatoria de email antes do primeiro login
- recuperacao de senha por codigo temporario e envio por email
- consultor executivo com Gemini Flash para leitura de mercado e previsao operacional
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
- `nodemailer`
- `Resend Email API`
- `Pino`

## Estrutura do repositorio

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

### Autenticacao

- cadastro com aceite de termos e aviso de privacidade
- confirmacao de email antes do primeiro acesso
- login com sessao segura
- logout com invalidacao de sessao
- edicao de perfil da conta
- recuperacao de senha por codigo de verificacao no email

### Dashboard

- visao executiva
- modulo de vendas
- modulo de portfolio
- modulo de conformidade
- roadmap de upgrades
- preferencia de moeda com conversao em tempo real via AwesomeAPI
- mapa de vendas com geocodificacao publica via Nominatim e visual moderno com MapLibre GL JS
- cadastro de funcionarios com vinculo por ID em cada venda
- consultoria de mercado e previsao orientada por Gemini Flash

### Seguranca

- cookies `HttpOnly`, `SameSite` e CSRF por header/cookie
- hash de senha com `argon2id`
- audit logs para eventos sensiveis
- sanitizacao defensiva de entradas
- importacao CSV com validacao e limites
- bloqueio de tentativas em login, verificacao de email e redefinicao de senha

## Como rodar localmente

### 1. Instale dependencias

```powershell
npm ci
```

### 2. Configure o ambiente

Copie `.env.example` para `.env` e ajuste os valores necessarios.

Variaveis mais importantes:

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
EXCHANGE_RATES_CACHE_SECONDS=300
GEOCODING_URL=https://nominatim.openstreetmap.org/search
GEOCODING_CACHE_SECONDS=86400
GEOCODING_CONTACT_EMAIL=
EMAIL_VERIFICATION_TTL_MINUTES=15
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GEMINI_CACHE_SECONDS=900
```

Observacao:
- as cotacoes em tempo real usam a AwesomeAPI publica e ficam em cache no backend
- a geocodificacao do mapa usa Nominatim publico, com cache e tolerancia a falha no backend
- em bancos hospedados como Neon, use `DATABASE_URL` para a conexao pooled do app e `DIRECT_URL` para migrations e seed

Para envio real de email de confirmacao e redefinicao:

```env
EMAIL_PROVIDER=auto
RESEND_API_URL=https://api.resend.com/emails
RESEND_API_KEY=sua-api-key-da-resend
RESEND_FROM_EMAIL=onboarding@resend.dev
BREVO_API_URL=https://api.brevo.com/v3/smtp/email
BREVO_API_KEY=sua-api-key-da-brevo
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USER=seu-login-smtp
SMTP_PASS=sua-smtp-key
SMTP_FROM_NAME=DESK IMPERIAL
SMTP_FROM_EMAIL=no-reply@suaempresa.com
EMAIL_REPLY_TO=suporte@suaempresa.com
EMAIL_SUPPORT_ADDRESS=suporte@suaempresa.com
LOGIN_ALERT_EMAILS_ENABLED=false
FAILED_LOGIN_ALERTS_ENABLED=false
FAILED_LOGIN_ALERT_THRESHOLD=3
PORTFOLIO_EMAIL_FALLBACK=false
```

Exemplo com Gmail SMTP:

```env
EMAIL_PROVIDER=smtp
SMTP_SERVICE=gmail
SMTP_PORT=465
SMTP_SECURE=true
SMTP_REQUIRE_TLS=true
SMTP_IP_FAMILY=4
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
SMTP_FROM_NAME=DESK IMPERIAL
SMTP_FROM_EMAIL=seu-email@gmail.com
EMAIL_REPLY_TO=seu-email@gmail.com
EMAIL_SUPPORT_ADDRESS=seu-email@gmail.com
LOGIN_ALERT_EMAILS_ENABLED=true
FAILED_LOGIN_ALERTS_ENABLED=true
FAILED_LOGIN_ALERT_THRESHOLD=3
```

Observacao:
- `EMAIL_PROVIDER` aceita `auto`, `resend`, `brevo`, `smtp` ou `log`
- em producao, a API da Resend e o caminho principal de envio; Brevo API e SMTP ficam como fallback
- para testes iniciais, `onboarding@resend.dev` so envia para o proprio email da conta Resend; para liberar envio publico, verifique um dominio no provedor
- na Railway, SMTP outbound nao funciona em `Free`, `Trial` e `Hobby`, entao o caminho certo e usar `RESEND_API_KEY` ou `BREVO_API_KEY`
- `PORTFOLIO_EMAIL_FALLBACK=true` libera um codigo de apoio no fluxo de confirmacao de email quando o provedor falha, evitando travar o cadastro publico do portfolio
- para Gmail, use `senha de app`; a senha normal da conta nao deve ser usada
- `SMTP_IP_FAMILY=4` ajuda hosts como Railway a evitar tentativa de conexao por IPv6 quando o relay responde melhor em IPv4
- em desenvolvimento, se o email nao estiver configurado, o backend registra o codigo de confirmacao/redefinicao no log
- para cair menos em spam, prefira remetente com dominio proprio e dominio verificado no provedor
- configure SPF, DKIM e DMARC no dominio antes de divulgar o link publicamente
- se quiser receber alerta a cada novo login, ative `LOGIN_ALERT_EMAILS_ENABLED=true`
- se quiser receber alerta de tentativa suspeita, ative `FAILED_LOGIN_ALERTS_ENABLED=true`
- `FAILED_LOGIN_ALERT_THRESHOLD` define em qual tentativa o aviso e disparado
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

### 6. Inicie a aplicacao

Em terminais separados:

```powershell
npm --workspace @partner/api run dev
npm --workspace @partner/web run dev
```

## Scripts uteis

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run db:up`
- `npm run db:down`
- `npm run db:studio`

## Conta demo para avaliacao

- email: `demo@partnerportal.com`
- senha: `Demo@123`

Observacoes:

- a conta demo existe para avaliacao rapida do produto
- cada dispositivo/IP tem ate `20 minutos por dia` no modo demo
- o recrutador tambem pode criar a propria conta em `/cadastro`
- em deploy publico, trate a demo como ambiente de showcase e nao como conta operacional

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
- disponivel em desenvolvimento por padrao

## Publicacao no GitHub

Este repositorio ja esta preparado para versionamento publico ou privado com:

- `README` alinhado ao estado atual
- workflow de CI
- `LICENSE`
- `SECURITY.md`
- `CONTRIBUTING.md`

Antes de publicar:

1. confirme que nenhum `.env` real esta versionado
2. revise screenshots e nome do projeto, se quiser personalizar a vitrine
3. configure secrets no provedor de deploy para banco, cookie, CSRF e SMTP

## Documentacao complementar

- `docs/architecture/overview.md`
- `docs/architecture/local-development.md`
- `docs/security/deploy-checklist.md`
- `docs/security/resend-domain-setup.md`
- `docs/security/security-baseline.md`
- `docs/security/observability-and-logs.md`
