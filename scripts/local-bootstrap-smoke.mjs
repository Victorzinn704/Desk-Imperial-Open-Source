import { mkdirSync, createWriteStream } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import net from 'node:net'

const ROOT = process.cwd()
const LOG_DIR = resolve(ROOT, 'artifacts', 'server-logs')
const API_STDOUT_LOG = resolve(LOG_DIR, 'api-smoke.out.log')
const API_STDERR_LOG = resolve(LOG_DIR, 'api-smoke.err.log')
const API_PORT = 4000
const API_BASE_URL = `http://127.0.0.1:${API_PORT}`

mkdirSync(LOG_DIR, { recursive: true })

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm'
}

function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options,
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise()
        return
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`))
    })
  })
}

function isPortBusy(port) {
  return new Promise((resolvePromise) => {
    const socket = new net.Socket()

    socket
      .once('connect', () => {
        socket.destroy()
        resolvePromise(true)
      })
      .once('error', () => {
        resolvePromise(false)
      })
      .setTimeout(1000, () => {
        socket.destroy()
        resolvePromise(false)
      })
      .connect(port, '127.0.0.1')
  })
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms))
}

async function waitForApi(timeoutMs = 60_000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/health`)
      if (response.ok) {
        const payload = await response.json()
        if (payload?.status === 'ok' && payload?.dbHealthy === true && payload?.redisHealthy === true) {
          return payload
        }
      }
    } catch {
      // polling
    }

    await sleep(1000)
  }

  throw new Error('Timeout aguardando a API local responder em /api/v1/health')
}

function extractCookieHeader(response) {
  const cookieEntries =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie')].filter(Boolean)

  return cookieEntries.map((entry) => entry.split(';', 1)[0]).join('; ')
}

async function loginDemo(payload) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/demo`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Falha no demo login (${response.status})`)
  }

  const cookieHeader = extractCookieHeader(response)
  if (!cookieHeader) {
    throw new Error('Demo login não retornou cookie de sessão')
  }

  const meResponse = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
    headers: {
      cookie: cookieHeader,
    },
  })

  if (!meResponse.ok) {
    throw new Error(`Falha ao consultar /auth/me após demo login (${meResponse.status})`)
  }

  return meResponse.json()
}

async function killChildTree(child) {
  if (!child?.pid) {
    return
  }

  if (process.platform === 'win32') {
    await run('taskkill', ['/pid', String(child.pid), '/t', '/f']).catch(() => undefined)
    return
  }

  child.kill('SIGTERM')
}

async function main() {
  const portBusy = await isPortBusy(API_PORT)
  if (portBusy) {
    throw new Error('A porta 4000 já está em uso. Pare a API local antes de rodar o smoke de bootstrap.')
  }

  console.log('[smoke] preparando backend local...')
  await run(npmCommand(), ['run', 'local:backend:prepare'])

  console.log('[smoke] compilando API para smoke...')
  await run(npmCommand(), ['--workspace', '@partner/api', 'run', 'build:verify'])

  console.log('[smoke] subindo API local compilada...')
  const stdout = createWriteStream(API_STDOUT_LOG, { flags: 'w' })
  const stderr = createWriteStream(API_STDERR_LOG, { flags: 'w' })
  const apiChild = spawn(npmCommand(), ['--workspace', '@partner/api', 'run', 'start'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  })

  apiChild.stdout.pipe(stdout)
  apiChild.stderr.pipe(stderr)

  try {
    const health = await waitForApi()
    console.log(`[smoke] health ok: db=${health.dbHealthy} redis=${health.redisHealthy}`)

    const ownerSession = await loginDemo({ loginMode: 'OWNER' })
    if (ownerSession?.user?.role !== 'OWNER') {
      throw new Error('Demo login OWNER retornou papel incorreto')
    }
    console.log('[smoke] demo OWNER ok')

    const staffSession = await loginDemo({ loginMode: 'STAFF', employeeCode: 'VD-001' })
    if (staffSession?.user?.role !== 'STAFF' || staffSession?.user?.employeeCode !== 'VD-001') {
      throw new Error('Demo login STAFF retornou sessão inválida')
    }
    console.log('[smoke] demo STAFF ok')

    console.log('[smoke] bootstrap local fechado com sucesso')
    console.log(`[smoke] logs: ${API_STDOUT_LOG}`)
  } finally {
    await killChildTree(apiChild)
    stdout.close()
    stderr.close()
  }
}

main().catch((error) => {
  console.error(`[smoke] ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
