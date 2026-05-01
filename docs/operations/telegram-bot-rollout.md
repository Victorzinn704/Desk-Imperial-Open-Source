# Telegram Bot Rollout

**Versao:** 1.1  
**Ultima atualizacao:** 2026-05-01

## Escopo

Este runbook cobre o bootstrap operacional do bot Telegram atual do Desk Imperial:

- ambiente e secrets
- webhook
- allowlist por workspace
- perfil publico do bot
- vinculo com portal
- preferencias de notificacao

O runtime atual do modulo e **outbound-first**, com onboarding e menu interativo no chat privado.

---

## 1. Variaveis obrigatorias

Na API:

```env
TELEGRAM_BOT_ENABLED=true
TELEGRAM_BOT_TOKEN=<token real do BotFather>
TELEGRAM_BOT_USERNAME=Desk_Imperial_bot
TELEGRAM_WEBHOOK_SECRET=<segredo aleatorio com 24+ caracteres>
TELEGRAM_WEBHOOK_URL=https://api.deskimperial.online/api/v1/notifications/telegram/webhook
TELEGRAM_ALLOWED_WORKSPACE_OWNER_IDS=<id1>,<id2>
```

Regras atuais:

- `TELEGRAM_BOT_ENABLED=true` sem token nao fecha
- `TELEGRAM_WEBHOOK_SECRET` precisa ter pelo menos 24 caracteres
- `TELEGRAM_ALLOWED_WORKSPACE_OWNER_IDS` aceita lista separada por virgula
- allowlist vazia significa bot liberado para qualquer workspace

---

## 2. Endpoints publicos atuais

Portal / sessao autenticada:

- `POST /api/v1/notifications/telegram/link-token`
- `GET /api/v1/notifications/telegram/status`
- `DELETE /api/v1/notifications/telegram/link`
- `GET /api/v1/notifications/telegram/preferences`
- `POST /api/v1/notifications/telegram/preferences`
- `GET /api/v1/notifications/preferences/workspace`
- `POST /api/v1/notifications/preferences/workspace`
- `GET /api/v1/notifications/preferences/me`
- `POST /api/v1/notifications/preferences/me`

Inbound:

- `POST /api/v1/notifications/telegram/webhook`
- `GET /api/v1/notifications/telegram/health`

O webhook exige o header:

- `x-telegram-bot-api-secret-token`

Sem esse header correto, a API responde `401`.

---

## 3. Migration e bootstrap

Antes de liberar o bot em producao:

```bash
npm --workspace @partner/api run prisma:migrate:deploy
```

Mesmo que o container valide migrations no bootstrap, o rollout continua mais seguro quando a migration e aplicada explicitamente antes.

---

## 4. Registro do webhook

Scripts oficiais do repo:

```bash
npm run telegram:webhook:set
npm run telegram:webhook:info
npm run telegram:webhook:delete
```

Eles leem:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_URL`
- `TELEGRAM_WEBHOOK_SECRET`

### Registrar

```bash
TELEGRAM_BOT_TOKEN=... \
TELEGRAM_WEBHOOK_URL=https://api.deskimperial.online/api/v1/notifications/telegram/webhook \
TELEGRAM_WEBHOOK_SECRET=... \
npm run telegram:webhook:set
```

Opcoes relevantes do script:

- `--drop-pending`
- `--max-connections`
- `--updates=message,callback_query`

### Inspecionar

```bash
TELEGRAM_BOT_TOKEN=... npm run telegram:webhook:info
```

### Remover

```bash
TELEGRAM_BOT_TOKEN=... npm run telegram:webhook:delete
```

---

## 5. Sincronizacao do perfil do bot

O repo tambem expõe o sync de perfil:

```bash
npm run telegram:profile:sync
```

Esse script sincroniza:

- nome
- descricao longa
- descricao curta
- comandos
- menu button
- foto de perfil

Ele usa por padrao:

- imagem em `apps/web/public/icons/icon-512.png`

Comandos sincronizados hoje:

- `/start`
- `/menu`
- `/vendas`
- `/caixa`
- `/relatorio`
- `/equipe`
- `/alertas`
- `/status`
- `/portal`
- `/desvincular`

---

## 6. Fluxo de vinculo no portal

### 6.1 Portal -> token

Usuario autenticado chama:

```text
POST /api/v1/notifications/telegram/link-token
```

Resposta atual:

- token temporario
- deeplink do bot
- expiracao
- username do bot

### 6.2 Telegram -> `/start <token>`

No bot:

1. usuario abre o deeplink
2. bot recebe `/start <token>`
3. backend valida token
4. backend cria ou substitui o vinculo `telegramAccount`
5. backend grava audit log
6. bot responde com onboarding + menu interativo

Estados de rejeicao do token:

- `invalid`
- `expired`
- `already_used`
- `workspace_disabled`

---

## 7. Preferencias de notificacao

Hoje existem duas camadas:

### Workspace

- `GET/POST /api/v1/notifications/preferences/workspace`
- `GET/POST /api/v1/notifications/telegram/preferences`

Eventos suportados hoje no workspace:

- `operations.comanda.status_changed`
- `operations.kitchen_item.status_changed`

Canal atual:

- `TELEGRAM`

### Usuario

- `GET/POST /api/v1/notifications/preferences/me`

Eventos suportados hoje por usuario:

- `operations.comanda.status_changed`
- `operations.kitchen_item.status_changed`

Canais de usuario atuais:

- `WEB_TOAST`
- `MOBILE_TOAST`

---

## 8. Comportamento do bot em runtime

Estado atual relevante:

- aceita apenas chat privado
- deduplica updates
- aplica rate limit por chat
- responde com cards interativos via inline keyboard
- usa comandos e callbacks, nao apenas texto livre
- bloqueio do usuario no Telegram e tratado como erro conhecido de entrega

O bot hoje resolve fluxos como:

- onboarding
- status do vinculo
- portal
- vendas
- caixa
- relatorio
- equipe
- alertas
- desvincular

---

## 9. Smoke operacional

### 9.1 API

```bash
curl -fsS https://api.deskimperial.online/api/v1/health
curl -fsS https://api.deskimperial.online/api/v1/notifications/telegram/health
```

### 9.2 Health esperado

Quando o bot estiver habilitado e configurado:

- `status=enabled`
- `expectedWebhookUrl` igual a `actualWebhookUrl`
- `pendingUpdateCount` sem crescimento anormal

### 9.3 Fluxo manual

1. gerar `link-token` no portal
2. abrir o deeplink do bot
3. validar `/start <token>`
4. validar menu interativo
5. testar `/status`
6. testar `/vendas`
7. testar `/desvincular`

Se o workspace for owner, testar tambem:

- `/caixa`
- `/relatorio`
- `/equipe`
- `/alertas`

---

## 10. Sequencia recomendada de rollout

1. subir API com `TELEGRAM_BOT_ENABLED=false`
2. aplicar migration
3. preencher token, username, webhook secret e webhook URL
4. preencher allowlist inicial de workspace(s)
5. registrar webhook
6. sincronizar perfil do bot
7. ativar `TELEGRAM_BOT_ENABLED=true`
8. validar health
9. testar vinculo com workspace allowlistado
10. ampliar allowlist ou liberar geral

---

## 11. Falhas comuns

### `TELEGRAM_BOT_TOKEN ausente`

- health fica desabilitado
- webhook script falha imediatamente
- sync de perfil falha imediatamente

### `TELEGRAM_WEBHOOK_SECRET` curto

- o setup e rejeitado
- minimo atual: 24 caracteres

### webhook em URL errada

- `actualWebhookUrl` diverge de `expectedWebhookUrl`
- corrigir com `npm run telegram:webhook:set`

### workspace sem acesso

- revisar `TELEGRAM_ALLOWED_WORKSPACE_OWNER_IDS`
- revisar o `workspaceOwnerUserId` real do owner

### bot responde no chat, mas o portal diz desvinculado

- revisar status da conta em `telegramAccount`
- revisar se o link foi revogado e recriado em outro chat

### perfil do bot sem foto/descricao/comandos

- rodar `npm run telegram:profile:sync`
- verificar `TELEGRAM_BOT_TOKEN`

---

## 12. Guardrails

- nao expor `TELEGRAM_BOT_TOKEN` ou `TELEGRAM_WEBHOOK_SECRET` em arquivo versionado
- nao confiar em webhook sem validar `x-telegram-bot-api-secret-token`
- nao abrir o bot para grupos; o fluxo atual e privado
- ao alterar comandos ou onboarding, validar tambem o sync de perfil e o menu interativo
