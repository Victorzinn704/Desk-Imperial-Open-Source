import { parseArgs } from 'node:util'

const TELEGRAM_API_BASE = 'https://api.telegram.org'

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    action: { type: 'string', default: 'set' },
    token: { type: 'string' },
    url: { type: 'string' },
    secret: { type: 'string' },
    'drop-pending': { type: 'boolean', default: false },
    'max-connections': { type: 'string', default: '40' },
    updates: { type: 'string', default: 'message,callback_query' },
  },
  allowPositionals: false,
})

const action = values.action
if (!['set', 'info', 'delete'].includes(action)) {
  fail(`Acao invalida: ${action}. Use set, info ou delete.`)
}

const token = (values.token ?? process.env.TELEGRAM_BOT_TOKEN ?? '').trim()
if (!token) {
  fail('TELEGRAM_BOT_TOKEN ausente.')
}

if (action === 'set') {
  const webhookUrl = (values.url ?? process.env.TELEGRAM_WEBHOOK_URL ?? '').trim()
  const webhookSecret = (values.secret ?? process.env.TELEGRAM_WEBHOOK_SECRET ?? '').trim()
  if (!webhookUrl) {
    fail('TELEGRAM_WEBHOOK_URL ausente.')
  }
  if (webhookSecret.length < 24) {
    fail('TELEGRAM_WEBHOOK_SECRET deve ter pelo menos 24 caracteres.')
  }

  const maxConnections = Number(values['max-connections'])
  if (!Number.isInteger(maxConnections) || maxConnections <= 0) {
    fail('--max-connections deve ser um inteiro positivo.')
  }

  const allowedUpdates = values.updates
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  const payload = {
    url: webhookUrl,
    secret_token: webhookSecret,
    allowed_updates: allowedUpdates,
    max_connections: maxConnections,
    drop_pending_updates: Boolean(values['drop-pending']),
  }

  log(`Registrando webhook Telegram em ${webhookUrl}`)
  log(`allowed_updates=${allowedUpdates.join(', ') || '(vazio)'}`)
  log(`max_connections=${maxConnections}; drop_pending_updates=${payload.drop_pending_updates}`)

  const result = await telegramRequest(token, 'setWebhook', payload)
  ensureOk(result, 'Falha ao registrar webhook Telegram.')
  log(`Webhook registrado. Description: ${result.description ?? 'ok'}`)
  process.exit(0)
}

if (action === 'info') {
  const result = await telegramRequest(token, 'getWebhookInfo')
  ensureOk(result, 'Falha ao consultar webhook Telegram.')
  const info = result.result ?? {}
  log(`URL: ${info.url || '(nao configurada)'}`)
  log(`pending_update_count: ${info.pending_update_count ?? 0}`)
  log(`last_error_date: ${info.last_error_date ?? '(nenhum)'}`)
  log(`last_error_message: ${info.last_error_message ?? '(nenhum)'}`)
  log(`max_connections: ${info.max_connections ?? '(desconhecido)'}`)
  if (info.ip_address) {
    log(`ip_address: ${info.ip_address}`)
  }
  process.exit(0)
}

if (action === 'delete') {
  const payload = {
    drop_pending_updates: Boolean(values['drop-pending']),
  }

  log(`Removendo webhook Telegram. drop_pending_updates=${payload.drop_pending_updates}`)
  const result = await telegramRequest(token, 'deleteWebhook', payload)
  ensureOk(result, 'Falha ao remover webhook Telegram.')
  log(`Webhook removido. Description: ${result.description ?? 'ok'}`)
}

function ensureOk(result, message) {
  if (result?.ok) {
    return
  }

  const description =
    typeof result?.description === 'string'
      ? result.description
      : typeof result?.error_code === 'number'
        ? `error_code=${result.error_code}`
        : 'resposta invalida'
  fail(`${message} ${description}`)
}

async function telegramRequest(token, method, payload) {
  const url = `${TELEGRAM_API_BASE}/bot${token}/${method}`
  const requestInit =
    method === 'getWebhookInfo'
      ? { method: 'GET' }
      : {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        }

  const response = await fetch(url, requestInit)
  const text = await response.text()
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    fail(`Resposta nao JSON do Telegram (${response.status}): ${text.slice(0, 500)}`)
  }

  if (!response.ok) {
    const description = parsed?.description ?? text.slice(0, 500)
    fail(`Telegram respondeu HTTP ${response.status}: ${description}`)
  }

  return parsed
}

function log(message) {
  process.stdout.write(`${message}\n`)
}

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}
