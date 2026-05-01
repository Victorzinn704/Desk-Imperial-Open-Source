# Telegram Bot Rollout

## Escopo

Este runbook cobre o bootstrap operacional do bot Telegram v1 do Desk Imperial:

- migration Prisma em produção
- variáveis `TELEGRAM_BOT_*`
- allowlist `TELEGRAM_ALLOWED_WORKSPACE_OWNER_IDS`
- registro e inspeção do webhook

## Variáveis obrigatórias

No ambiente da API:

```env
TELEGRAM_BOT_ENABLED=true
TELEGRAM_BOT_TOKEN=<token real do BotFather>
TELEGRAM_BOT_USERNAME=DeskImperialBot
TELEGRAM_WEBHOOK_SECRET=<segredo aleatorio com 24+ caracteres>
TELEGRAM_WEBHOOK_URL=https://api.deskimperial.online/api/v1/notifications/telegram/webhook
TELEGRAM_ALLOWED_WORKSPACE_OWNER_IDS=<id1>,<id2>
```

Notas:

- `TELEGRAM_BOT_ENABLED=true` exige token, username e secret validos.
- `TELEGRAM_ALLOWED_WORKSPACE_OWNER_IDS` aceita lista separada por virgula.
- Se a allowlist estiver vazia, o canal fica aberto para qualquer workspace.

## Migration

No host da API:

```bash
npm --workspace @partner/api run prisma:migrate:deploy
```

O container da API tambem valida migrations no bootstrap. Ainda assim, rode o comando explicitamente em rollout.

## Registro do webhook

O repo expõe tres scripts:

```bash
npm run telegram:webhook:set
npm run telegram:webhook:info
npm run telegram:webhook:delete
```

Eles leem:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_URL`
- `TELEGRAM_WEBHOOK_SECRET`

Exemplo:

```bash
TELEGRAM_BOT_TOKEN=... \
TELEGRAM_WEBHOOK_URL=https://api.deskimperial.online/api/v1/notifications/telegram/webhook \
TELEGRAM_WEBHOOK_SECRET=... \
npm run telegram:webhook:set
```

Para inspecionar:

```bash
TELEGRAM_BOT_TOKEN=... npm run telegram:webhook:info
```

Para remover:

```bash
TELEGRAM_BOT_TOKEN=... npm run telegram:webhook:delete
```

## Smoke operacional

1. API:

```bash
curl -fsS https://api.deskimperial.online/api/v1/health
curl -fsS https://api.deskimperial.online/api/v1/notifications/telegram/health
```

2. Health esperado do Telegram quando habilitado:

- `status=enabled`
- `expectedWebhookUrl` igual a `actualWebhookUrl`
- `pendingUpdateCount` sem crescimento anormal

3. Fluxo manual:

- gerar `link-token` no portal
- abrir deeplink do bot
- validar `/start <token>`
- consultar `/ajuda`
- testar `/vendas`
- testar `/desvincular`

## Rollout por fases

1. subir API com `TELEGRAM_BOT_ENABLED=false`
2. aplicar migration
3. preencher token/secret/url/allowlist
4. registrar webhook
5. ativar `TELEGRAM_BOT_ENABLED=true`
6. smoke com workspace allowlistado
7. ampliar allowlist ou liberar geral

## Falhas comuns

### `TELEGRAM_BOT_TOKEN ausente`

- token nao foi preenchido no ambiente
- a health do Telegram fica `disabled`
- `npm run telegram:webhook:*` falha imediatamente

### `TELEGRAM_WEBHOOK_SECRET` curto

- o bootstrap da API falha em produção
- minimo: 24 caracteres

### webhook registrado em URL errada

- `actualWebhookUrl` diverge de `expectedWebhookUrl`
- corrigir com `npm run telegram:webhook:set`

### workspace sem acesso

- revisar `TELEGRAM_ALLOWED_WORKSPACE_OWNER_IDS`
- revisar se o usuario pertence ao workspace correto
