import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { extractLocalStoragePath, sanitizeNodeOptions } from './lib/node-options-sanitizer.mjs'

const commandArgs = process.argv.slice(2)

if (commandArgs.length === 0) {
  console.error('[runner] Nenhum comando informado.')
  console.error('[runner] Uso: node scripts/run-with-sanitized-node-options.mjs <comando> [args...]')
  process.exit(1)
}

function normalizeNodeOptionEnv(envKey) {
  const rawNodeOptions = process.env[envKey] ?? ''
  const sanitizedNodeOptions = sanitizeNodeOptions(rawNodeOptions)

  if (rawNodeOptions !== sanitizedNodeOptions) {
    if (sanitizedNodeOptions.length > 0) {
      process.env[envKey] = sanitizedNodeOptions
    } else {
      delete process.env[envKey]
    }

    console.warn(`[runner] ${envKey} sanitizado para evitar localstorage-file invalido.`)
    return
  }

  if (rawNodeOptions.length === 0) {
    delete process.env[envKey]
  }
}

function ensureLocalStoragePathDirectory(envKey) {
  const localStoragePath = extractLocalStoragePath(process.env[envKey] ?? '')
  if (!localStoragePath) {
    return
  }

  const resolvedPath = path.isAbsolute(localStoragePath)
    ? localStoragePath
    : path.resolve(process.cwd(), localStoragePath)

  mkdirSync(path.dirname(resolvedPath), { recursive: true })
}

normalizeNodeOptionEnv('NODE_OPTIONS')
normalizeNodeOptionEnv('npm_config_node_options')
ensureLocalStoragePathDirectory('NODE_OPTIONS')
ensureLocalStoragePathDirectory('npm_config_node_options')

function resolveCommand(command) {
  const isPathLike = /[\\/]/.test(command) || /^[A-Za-z]:/.test(command)
  if (isPathLike) {
    return command
  }

  const localBin = path.join(process.cwd(), 'node_modules', '.bin')
  const candidates = process.platform === 'win32' ? [`${command}.cmd`, `${command}.exe`, command] : [command]

  for (const candidate of candidates) {
    const fullPath = path.join(localBin, candidate)
    if (existsSync(fullPath)) {
      return fullPath
    }
  }

  return command
}

const [command, ...args] = commandArgs
const resolvedCommand = resolveCommand(command)

function quoteForCmd(argument) {
  if (!/[\s"]/g.test(argument)) {
    return argument
  }

  return `"${argument.replace(/"/g, '\\"')}"`
}

const child =
  process.platform === 'win32'
    ? spawn(
        process.env.ComSpec || 'cmd.exe',
        ['/d', '/s', '/c', [resolvedCommand, ...args].map(quoteForCmd).join(' ')],
        {
          stdio: 'inherit',
          env: process.env,
        },
      )
    : spawn(resolvedCommand, args, {
        stdio: 'inherit',
        env: process.env,
      })

child.on('error', (error) => {
  console.error(`[runner] Falha ao iniciar comando: ${error.message}`)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 1)
})
