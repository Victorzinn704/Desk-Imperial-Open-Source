# Checklist de Deploy Seguro

**Versao:** 1.1  
**Ultima atualizacao:** 2026-05-01

Use esta lista antes de publicar uma nova passada do Desk Imperial em ambiente publico.

O runtime canonico atual e:

- Oracle `vm-free-01`: `web`, `api`, `redis`, `nginx`, `certbot`
- Oracle `vm-free-02`: observabilidade, SonarQube, Metabase, builder
- Ampere da Lohana: PostgreSQL 17 + PgBouncer + backup
- malha privada por WireGuard entre esses hosts

---

## 1. Rotacione segredos expostos

Trate como comprometido qualquer segredo que tenha aparecido fora do runtime seguro.

Rotacione antes do proximo corte publico se tiver sido exposto:

- `DATABASE_URL` / credenciais do app
- `DIRECT_URL` / credenciais de migracao
- `REDIS_PASSWORD`
- `COOKIE_SECRET`
- `CSRF_SECRET`
- `ENCRYPTION_KEY`
- `BREVO_API_KEY`
- `GEMINI_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `SENTRY_AUTH_TOKEN`
- qualquer `secret key` de projeto externo compartilhada fora do host seguro

---

## 2. Valide a borda Oracle e a malha privada

Antes de publicar:

- confirmar que `app.deskimperial.online` e `api.deskimperial.online` apontam para a `vm-free-01`
- confirmar que somente `80` e `443` estao publicos na borda web/app
- confirmar que `5432`, `6432`, exporters, Metabase e SonarQube nao estao expostos na internet
- confirmar que a malha WireGuard entre `vm-free-01`, `vm-free-02` e a Ampere esta ativa
- confirmar que a API fala com o banco pelo endereco privado correto

Referencias internas:

- [infra/oracle/README.md](../../infra/oracle/README.md)
- [infra/oracle/db/README.md](../../infra/oracle/db/README.md)
- [infra/oracle/network/wireguard/README.md](../../infra/oracle/network/wireguard/README.md)

---

## 3. Segredos e variaveis por superficie

### So no runtime da API

- `DATABASE_URL`
- `DIRECT_URL`
- `REDIS_PASSWORD`
- `COOKIE_SECRET`
- `CSRF_SECRET`
- `ENCRYPTION_KEY`
- `BREVO_API_KEY`
- `GEMINI_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `SENTRY_DSN`

### Publicas no web

- `APP_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_MAP_STYLE_URL`
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_ENABLED`
- `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`
- `NEXT_PUBLIC_SENTRY_ENVIRONMENT`
- `NEXT_PUBLIC_SENTRY_RELEASE`

### So no server/edge do web

- `SENTRY_WEB_DSN`
- `SENTRY_WEB_ENABLED`
- `SENTRY_WEB_TRACES_SAMPLE_RATE`
- `SENTRY_WEB_ENVIRONMENT`
- `SENTRY_WEB_RELEASE`

### So no build do web

- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT_WEB`
- `SENTRY_RELEASE`

Regras:

- nao usar `NEXT_PUBLIC_*` para segredo
- nao commitar `.env`, `apps/api/.env` ou `apps/web/.env.local`
- manter `.env.example` e `infra/oracle/.env.example` como referencias de contrato, nunca como cofre

---

## 4. GitHub, CI e supply chain

Antes do deploy:

- revisar `git status`
- garantir que nenhum segredo entrou no diff
- manter `push protection` e `secret scanning` ativos
- manter `SENTRY_AUTH_TOKEN` apenas em `GitHub Secrets` quando usado no CI
- revisar se `quality.yml` e `ci.yml` continuam verdes no branch que vai subir

O baseline atual do repo depende de:

- lint/typecheck
- backend tests
- backend e2e smoke
- frontend unit
- frontend e2e
- security checks
- performance latency gate
- build

Referencias:

- [.github/workflows/ci.yml](../../.github/workflows/ci.yml)
- [.github/workflows/quality.yml](../../.github/workflows/quality.yml)

---

## 5. Banco, migrations e BI

Antes do rollout:

- rodar `prisma migrate deploy`
- validar conectividade do `DATABASE_URL` e do `DIRECT_URL`
- confirmar que a API subiu no banco correto da Ampere
- validar o refresh do schema `bi` quando a passada alterar analytics relevantes
- nao usar dado real de cliente em ambiente publico de demostracao

Comandos e trilhas:

```bash
npm --workspace @partner/api run prisma:migrate:deploy
npm --workspace @partner/api run prisma:refresh:bi
```

No runtime Oracle, a API ja sobe aplicando migrations antes do processo principal. Ainda assim, o deploy nao deve assumir isso cegamente sem smoke.

---

## 6. Auth, sessao e Admin PIN

Validar em producao:

- cadastro
- verificacao de email
- login
- `/api/v1/auth/me`
- logout
- forgot-password
- reset-password
- update profile
- cookies `HttpOnly`, `SameSite`, `Secure`
- negative cache e revogacao de sessao sem efeito colateral visivel
- fluxo de Admin PIN (`GET/POST/DELETE /api/v1/admin/pin` e `POST /api/v1/admin/verify-pin`)

Tambem confirmar:

- sessao revogada derruba sockets realtime rastreados
- conta demo continua limitada e isolada

---

## 7. Realtime, mobile e notificacoes

Validar depois do deploy:

- owner conecta no namespace `/operations`
- staff conecta e nao recebe room financeira
- reconnect apos foreground/resume mobile
- `operations.error` tratado no cliente
- sem dupla conexao mobile
- Telegram webhook responde `200`
- preferencia de notificacao do workspace e do usuario salvam corretamente

Smoke minimo de notificacoes:

- gerar link token
- abrir bot com deeplink
- vincular conta
- alterar preferencia
- disparar um evento operacional observavel

---

## 8. Observabilidade e Sentry

Confirmar:

- `SENTRY_DSN` presente no runtime da API quando observabilidade estiver habilitada
- `NEXT_PUBLIC_SENTRY_DSN` presente no runtime do web quando observabilidade estiver habilitada
- `SENTRY_AUTH_TOKEN` presente apenas no build do web, nao no runtime final
- release/sourcemaps do web subiram com sucesso
- health da API e do app respondem
- alertas principais continuam operacionais

Smoke minimo:

```bash
npm --workspace @partner/web run smoke:sentry
curl -fsS https://api.deskimperial.online/api/v1/health
curl -fsS https://app.deskimperial.online/
```

Se houver warning de token ou sourcemap, tratar como problema de release, nao como detalhe cosmetico.

---

## 9. Validacao funcional final

Fluxos minimos antes do go live:

- abrir `/login`
- criar conta OWNER
- confirmar email
- fazer login
- abrir `/app/owner`
- cadastrar produto
- testar cadastro rapido com barcode
- gerar smart draft
- abrir caixa
- criar comanda
- adicionar item
- alterar status de cozinha
- registrar pagamento
- fechar comanda
- fechar caixa
- testar tela `/ai` se `GEMINI_API_KEY` estiver ativa
- testar integracao Telegram se `TELEGRAM_BOT_TOKEN` estiver ativo

---

## 10. Rollout e rollback

Sequencia segura:

1. branch verde em CI
2. build local ou builder Oracle validado
3. deploy controlado
4. health checks publicos
5. smoke de auth + operacao + realtime + notificacoes
6. so depois divulgar o link final

Se algo falhar:

- parar o rollout
- nao insistir em retry cego
- identificar se o problema esta em env, migration, realtime, webhook ou build
- voltar para o release anterior se a funcionalidade critica tiver quebrado

---

## Guardrails de evolucao

1. Nao documentar Neon como banco atual do projeto.
2. Nao tratar `SENTRY_AUTH_TOKEN` como segredo de runtime.
3. Nao aceitar deploy sem validar realtime, mobile e Telegram quando essas superficies forem afetadas.
4. Nao assumir que "health 200" basta; o deploy so fecha depois dos fluxos criticos passarem.
