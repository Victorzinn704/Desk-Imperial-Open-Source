import { readFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import sharp from 'sharp'

const TELEGRAM_API_BASE = 'https://api.telegram.org'
const DEFAULT_PHOTO_PATH = resolve(process.cwd(), 'apps/web/public/icons/icon-512.png')

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    token: { type: 'string' },
    photo: { type: 'string' },
    name: { type: 'string', default: 'Desk Imperial' },
    description: {
      type: 'string',
      default:
        'Gestão operacional do Desk Imperial no Telegram. Consulte vendas, caixa, equipe, alertas e acompanhe a operação com atalhos rápidos.',
    },
    'short-description': {
      type: 'string',
      default: 'Operação, vendas e alertas do Desk Imperial.',
    },
  },
  allowPositionals: false,
})

const token = (values.token ?? process.env.TELEGRAM_BOT_TOKEN ?? '').trim()
if (!token) {
  fail('TELEGRAM_BOT_TOKEN ausente.')
}

const photoPath = resolve(values.photo ?? DEFAULT_PHOTO_PATH)
const commands = [
  { command: 'start', description: 'Vincular a conta ou iniciar o bot' },
  { command: 'menu', description: 'Abrir o painel rápido com atalhos' },
  { command: 'vendas', description: 'Resumo das vendas de hoje' },
  { command: 'caixa', description: 'Status do caixa atual' },
  { command: 'relatorio', description: 'Relatório financeiro do período' },
  { command: 'equipe', description: 'Visão rápida da equipe ativa' },
  { command: 'alertas', description: 'Canais e eventos operacionais ativos' },
  { command: 'status', description: 'Status do vínculo e do acesso' },
  { command: 'portal', description: 'Abrir o portal do Desk Imperial' },
  { command: 'desvincular', description: 'Remover este chat da conta' },
]

log(`Configurando perfil do bot com imagem ${basename(photoPath)}`)
await telegramJsonRequest(token, 'setMyName', { name: values.name })
await telegramJsonRequest(token, 'setMyDescription', { description: values.description })
await telegramJsonRequest(token, 'setMyShortDescription', { short_description: values['short-description'] })
await telegramJsonRequest(token, 'setMyCommands', { commands })
await telegramJsonRequest(token, 'setChatMenuButton', { menu_button: { type: 'commands' } })
await telegramMultipartRequest(token, 'setMyProfilePhoto', await buildProfilePhotoForm(photoPath))
log('Perfil do bot sincronizado com sucesso.')

async function buildProfilePhotoForm(photoFilePath) {
  const pngBuffer = await readFile(photoFilePath)
  const jpegBuffer = await sharp(pngBuffer).jpeg({ quality: 92 }).toBuffer()
  const form = new FormData()
  form.append('photo', JSON.stringify({ type: 'static', photo: 'attach://profile_photo' }))
  form.append('profile_photo', new Blob([jpegBuffer], { type: 'image/jpeg' }), 'desk-imperial-profile.jpg')
  return form
}

async function telegramJsonRequest(tokenValue, method, payload) {
  const response = await fetch(`${TELEGRAM_API_BASE}/bot${tokenValue}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  await ensureOk(response, method)
}

async function telegramMultipartRequest(tokenValue, method, form) {
  const response = await fetch(`${TELEGRAM_API_BASE}/bot${tokenValue}/${method}`, {
    method: 'POST',
    body: form,
  })
  await ensureOk(response, method)
}

async function ensureOk(response, method) {
  const text = await response.text()
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    fail(`${method}: resposta não JSON (${response.status}): ${text.slice(0, 500)}`)
  }

  if (!response.ok || !parsed?.ok) {
    fail(`${method}: ${parsed?.description ?? `HTTP ${response.status}`}`)
  }
}

function log(message) {
  process.stdout.write(`${message}\n`)
}

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}
