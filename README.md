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
- `Brevo Email API`
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

Observacao:
- as cotacoes em tempo real usam a AwesomeAPI publica e ficam em cache no backend
- se voce tiver uma chave da AwesomeAPI, preencha `EXCHANGE_RATES_API_KEY` para aumentar o limite e reduzir `429`
- se a AwesomeAPI devolver `429` ou ficar indisponivel, o backend usa o ultimo cache valido e, em ultimo caso, uma estimativa de contingencia para nao derrubar o dashboard
- a geocodificacao do mapa usa Nominatim publico, com cache e tolerancia a falha no backend
- em bancos hospedados como Neon, use `DATABASE_URL` para a conexao pooled do app e `DIRECT_URL` para migrations e seed

Para envio real de email de confirmacao, redefinicao e alertas de seguranca:

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

Observacao:
- `EMAIL_PROVIDER` aceita `brevo`, `auto` ou `log`
- o fluxo publico de email usa a API HTTPS da Brevo; nao dependemos mais de Gmail SMTP nem de Resend
- a chave da Brevo precisa ser uma `API key` real do painel `SMTP & API > API Keys`
- o remetente configurado em `EMAIL_FROM_EMAIL` precisa existir como sender valido no Brevo
- se o dominio de envio ainda nao estiver validado, a Brevo vai rejeitar o remetente e o cadastro cai no modo de apoio do portfolio
- `PORTFOLIO_EMAIL_FALLBACK=true` libera um codigo de apoio no fluxo de confirmacao de email quando o provedor falha, evitando travar o cadastro publico do portfolio
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
- `docs/security/brevo-domain-setup.md`
- `docs/security/security-baseline.md`
- `docs/security/observability-and-logs.md`
