import { spawn } from 'node:child_process'
import { createWriteStream, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import net from 'node:net'

const ROOT = process.cwd()
const API_PORT = 4000
const WEB_PORT = 3000
const API_BASE_URL = `http://localhost:${API_PORT}/api/v1`
const APP_BASE_URL = `http://localhost:${WEB_PORT}`
const options = parseCliOptions(process.argv.slice(2))
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-')
const REPORT_DIR = resolve(options.reportDir || `.cache/performance/local-suite/${RUN_ID}`)
const LOG_DIR = resolve(REPORT_DIR, 'logs')

mkdirSync(LOG_DIR, { recursive: true })

async function main() {
  const startedProcesses = []

  try {
    await assertPortsAvailable([
      { name: 'api', port: API_PORT },
      { name: 'web', port: WEB_PORT },
    ])
    await prepareLocalBackend()
    await buildApplications()

    const apiProcess = startLoggedProcess({
      args: ['--workspace', '@partner/api', 'run', 'start'],
      env: { PORT: String(API_PORT) },
      name: 'api',
    })
    startedProcesses.push(apiProcess)
    await waitForApiHealth()

    const webProcess = startLoggedProcess({
      args: ['--workspace', '@partner/web', 'run', 'start'],
      env: {
        NEXT_PUBLIC_API_URL: `http://localhost:${API_PORT}`,
        NODE_OPTIONS: '--max-old-space-size=1024',
        PORT: String(WEB_PORT),
      },
      name: 'web',
    })
    startedProcesses.push(webProcess)
    await waitForHttpOk(`${APP_BASE_URL}/`, 'web')

    await runPerformanceSmokes()
    console.log(`[perf-suite] ok report_dir=${REPORT_DIR}`)
  } finally {
    await stopProcesses(startedProcesses)
  }
}

async function prepareLocalBackend() {
  if (options.skipPrepare) {
    console.log('[perf-suite] skip prepare')
    return
  }

  await assertDockerAvailable()
  await runNpm(['run', 'local:backend:prepare'], { name: 'prepare' })
}

async function assertDockerAvailable() {
  try {
    await runCommand('docker', ['info'], {
      env: process.env,
      name: 'docker-info',
      stdio: 'ignore',
    })
  } catch {
    throw new Error('Docker Desktop/Linux engine nao esta disponivel. Abra o Docker Desktop e rode novamente.')
  }
}

async function buildApplications() {
  if (options.skipBuild) {
    console.log('[perf-suite] skip build')
    return
  }

  await runNpm(['--workspace', '@partner/api', 'run', 'build:verify'], { name: 'api-build' })
  await runNpm(['--workspace', '@partner/web', 'run', 'build'], {
    env: { NEXT_PUBLIC_API_URL: `http://localhost:${API_PORT}` },
    name: 'web-build',
  })
}

async function runPerformanceSmokes() {
  if (!options.mobileOnly) {
    await runNpm(
      [
        'run',
        'smoke:operations:performance',
        '--',
        ...strictArgs(),
        '--report',
        resolve(REPORT_DIR, 'operations-rest.md'),
      ],
      {
        env: { DESK_API_BASE_URL: API_BASE_URL },
        name: 'operations-rest-smoke',
      },
    )
  }

  if (!options.restOnly) {
    await runNpm(
      [
        'run',
        'smoke:operations:mobile',
        '--',
        ...strictArgs(),
        '--report',
        resolve(REPORT_DIR, 'operations-mobile.md'),
      ],
      {
        env: {
          DESK_SMOKE_API_BASE_URL: API_BASE_URL,
          DESK_SMOKE_APP_BASE_URL: APP_BASE_URL,
          DESK_SMOKE_EVENT_TIMEOUT_MS: '30000',
        },
        name: 'operations-mobile-smoke',
      },
    )
  }
}

function strictArgs() {
  return options.strict ? ['--strict'] : []
}

function startLoggedProcess({ args, env = {}, name }) {
  const stdout = createWriteStream(resolve(LOG_DIR, `${name}.out.log`), { flags: 'w' })
  const stderr = createWriteStream(resolve(LOG_DIR, `${name}.err.log`), { flags: 'w' })
  const command = resolveSpawnCommand(npmCommand(), args)
  const child = spawn(command.file, command.args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.stdout.pipe(stdout)
  child.stderr.pipe(stderr)
  child.on('exit', (code) => {
    console.log(`[perf-suite] ${name} exited code=${code}`)
  })

  return { child, name, stderr, stdout }
}

async function runNpm(args, { env = {}, name }) {
  console.log(`[perf-suite] ${name}: npm ${args.join(' ')}`)
  await runCommand(npmCommand(), args, {
    env: { ...process.env, ...env },
    name,
  })
}

function runCommand(command, args, { env, name, stdio = 'inherit' }) {
  return new Promise((resolvePromise, reject) => {
    const executable = resolveSpawnCommand(command, args)
    const child = spawn(executable.file, executable.args, {
      cwd: ROOT,
      env,
      stdio,
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise()
        return
      }

      reject(new Error(`${name} failed with exit code ${code}`))
    })
  })
}

async function assertPortsAvailable(ports) {
  const busyPorts = []

  for (const entry of ports) {
    if (await isPortBusy(entry.port)) {
      busyPorts.push(`${entry.name}:${entry.port}`)
    }
  }

  if (busyPorts.length > 0) {
    throw new Error(`Portas ocupadas antes do smoke: ${busyPorts.join(', ')}. Pare os processos antes de continuar.`)
  }
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

async function waitForApiHealth() {
  await waitFor(async () => {
    const response = await fetch(`${API_BASE_URL}/health`)
    if (!response.ok) {
      throw new Error(`health ${response.status}`)
    }

    const payload = await response.json()
    if (payload?.status !== 'ok' || payload.dbHealthy !== true || payload.redisHealthy !== true) {
      throw new Error(`health incompleto: ${JSON.stringify(payload)}`)
    }
  }, 'api health')
}

async function waitForHttpOk(url, label) {
  await waitFor(async () => {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`${label} ${response.status}`)
    }
  }, label)
}

async function waitFor(work, label, timeoutMs = 90_000) {
  const startedAt = Date.now()
  let lastError = null

  while (Date.now() - startedAt < timeoutMs) {
    try {
      await work()
      console.log(`[perf-suite] ${label} pronto`)
      return
    } catch (error) {
      lastError = error
      await sleep(1000)
    }
  }

  throw new Error(`Timeout aguardando ${label}: ${lastError instanceof Error ? lastError.message : String(lastError)}`)
}

async function stopProcesses(processes) {
  for (const processHandle of processes.toReversed()) {
    await stopProcess(processHandle)
  }
}

async function stopProcess({ child, name, stderr, stdout }) {
  try {
    if (child.pid) {
      await killChildTree(child.pid)
    }
  } finally {
    stdout.close()
    stderr.close()
    console.log(`[perf-suite] ${name} finalizado`)
  }
}

async function killChildTree(pid) {
  if (process.platform === 'win32') {
    await runCommand('taskkill', ['/pid', String(pid), '/t', '/f'], {
      env: process.env,
      name: `taskkill ${pid}`,
    }).catch(() => undefined)
    return
  }

  try {
    process.kill(pid, 'SIGTERM')
  } catch {
    // processo ja terminou
  }
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms))
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm'
}

function resolveSpawnCommand(command, args) {
  if (process.platform === 'win32' && command === npmCommand()) {
    return {
      args: ['/d', '/s', '/c', ['npm', ...args].map(quoteCmdArg).join(' ')],
      file: 'cmd.exe',
    }
  }

  return { args, file: command }
}

function quoteCmdArg(value) {
  return /^[A-Za-z0-9_:@%+=,.\\/~-]+$/.test(value) ? value : `"${value.replaceAll('"', '\\"')}"`
}

function parseCliOptions(argv) {
  const parsed = {
    mobileOnly: false,
    reportDir: '',
    restOnly: false,
    skipBuild: false,
    skipPrepare: false,
    strict: true,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--skip-prepare') parsed.skipPrepare = true
    if (arg === '--skip-build') parsed.skipBuild = true
    if (arg === '--rest-only') parsed.restOnly = true
    if (arg === '--mobile-only') parsed.mobileOnly = true
    if (arg === '--no-strict') parsed.strict = false
    if (arg === '--report-dir') {
      parsed.reportDir = argv[index + 1] ?? ''
      index += 1
    }
    if (arg.startsWith('--report-dir=')) {
      parsed.reportDir = arg.slice('--report-dir='.length)
    }
  }

  return parsed
}

main().catch((error) => {
  console.error(`[perf-suite] ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
