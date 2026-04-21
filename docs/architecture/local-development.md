# Desenvolvimento Local

## Objetivo

Deixar o projeto rodando localmente com:

- `apps/api` em NestJS
- `apps/web` em Next.js
- PostgreSQL para auth, consentimento e dados do portal

## Variáveis de ambiente

1. Copie `.env.example` para `.env`.
2. Ajuste `DATABASE_URL` e `DIRECT_URL` para seu PostgreSQL local.
3. Ajuste `REDIS_PASSWORD` e mantenha `REDIS_URL` com a mesma senha quando usar o Docker local padrão.
4. Se quiser envio real de confirmação, redefinição e alertas de segurança, configure o bloco de email.
5. Se quiser ativar o consultor executivo com IA, configure `GEMINI_API_KEY`.

Estratégia de ambiente:

- `.env.example` na raiz é a fonte de documentação do projeto.
- `apps/api/.env` é apenas um arquivo local da API e não deve ser versionado.
- `apps/web/.env.local` é apenas um arquivo local do frontend e não deve ser versionado.
- Sempre que uma variável for compartilhada entre web e API, a referência canônica deve continuar documentada no `.env.example`.

Exemplo:

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
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

Exemplo com Brevo:

```env
EMAIL_PROVIDER=brevo
BREVO_API_URL=https://api.brevo.com/v3/smtp/email
BREVO_API_KEY=<sua-api-key-da-brevo>
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

- se a AwesomeAPI devolver `429`, o backend reutiliza o último cache válido e, se necessário, uma estimativa de contingência
- se você tiver acesso a uma chave da AwesomeAPI, preencha `EXCHANGE_RATES_API_KEY` para reduzir limites do modo público
- o projeto agora usa a API HTTPS da Brevo como fluxo oficial de email
- a chave configurada em `BREVO_API_KEY` precisa ser uma API key válida do painel `Brevo API > API Keys`
- `EMAIL_FROM_EMAIL` deve existir como sender validado na Brevo
- `LOGIN_ALERT_EMAILS_ENABLED=true` envia alerta quando um novo dispositivo entra na conta
- `FAILED_LOGIN_ALERTS_ENABLED=true` envia aviso quando a conta atinge o limite de tentativas suspeitas configurado
- `PORTFOLIO_EMAIL_FALLBACK=true` mostra um código de apoio na verificação de email quando o provedor falha e você quer manter o portfolio utilizável
- para envio publico, valide o sender e o dominio na Brevo antes de desligar o fallback do portfolio

## Banco de dados

Opções:

- usar Docker com `npm run db:up`
- usar um PostgreSQL instalado localmente

Se o ambiente não tiver Docker, basta apontar `DATABASE_URL` e `DIRECT_URL` para um PostgreSQL existente.

## Comandos principais

```powershell
npm run local:backend:prepare
```

Esse fluxo faz:

1. sobe Postgres e Redis locais
2. espera os containers ficarem saudáveis
3. gera o Prisma Client
4. aplica migrations com `migrate deploy`
5. executa seed
6. normaliza o demo local com `repair-demo`

Importante:

- rode `local:backend:prepare` com a API local parada
- em Windows, o `prisma generate` pode falhar se `http://localhost:4000` já estiver usando o Prisma Client
- se você só precisa reidratar os dados demo com a API já ligada, use:

```powershell
npm run local:backend:sync-demo
```

Depois:

```powershell
npm --workspace @partner/api run dev
npm --workspace @partner/web run dev
```

## Smoke local de fresh-start

Para validar o bootstrap local do zero lógico:

```powershell
npm run smoke:local:bootstrap
```

Esse smoke:

1. exige a porta `4000` livre
2. roda `local:backend:prepare`
3. sobe a API local em modo dev
4. valida `GET /api/v1/health`
5. valida demo login `OWNER`
6. valida demo login `STAFF` com `VD-001`

Logs da API usados no smoke:

- `artifacts/server-logs/api-smoke.out.log`
- `artifacts/server-logs/api-smoke.err.log`

## Observações

- a migration inicial já está versionada em `apps/api/prisma/migrations/202603142300_init`
- o seed prepara documentos legais, usuario demo, equipe demo com login STAFF e produtos base
- sem PostgreSQL ativo, o front continua compilando, mas login/cadastro não concluem o fluxo real
- sem API transacional da Brevo configurada, o backend registra os códigos de confirmação e redefinição no log em desenvolvimento
- a API da Brevo é o caminho principal em produção
- para melhorar entregabilidade, use dominio verificado e autentique SPF, DKIM e DMARC no dominio
- sem `GEMINI_API_KEY`, o card de inteligencia de mercado fica indisponivel no dashboard
- o backend usa a raiz `.env` como fonte principal de configuração local
