import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const commandArgs = process.argv.slice(2)

if (commandArgs.length === 0) {
  console.error('[runner] Nenhum comando informado.')
  console.error('[runner] Uso: node scripts/run-with-sanitized-node-options.mjs <comando> [args...]')
  process.exit(1)
}

const LOCALSTORAGE_FLAG = '--localstorage-file'

function stripWrappingQuotes(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }

  return value
}

function sanitizeNodeOptions(rawValue) {
  if (!rawValue) {
    return rawValue
  }

  const tokens = rawValue.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? []
  const sanitizedTokens = []

  let hasValidLocalStorageFlag = false
  let removedInvalidLocalStorageFlag = false

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    const normalized = stripWrappingQuotes(token.trim())

    if (normalized === LOCALSTORAGE_FLAG) {
      const nextToken = tokens[index + 1]
      if (nextToken) {
        const nextNormalized = stripWrappingQuotes(nextToken.trim())

        if (
          nextNormalized.length > 0
          && nextNormalized !== '""'
          && nextNormalized !== "''"
          && !nextNormalized.startsWith('-')
        ) {
          hasValidLocalStorageFlag = true
          sanitizedTokens.push(token)
          sanitizedTokens.push(nextToken)
          index += 1
          continue
        }

        if (nextNormalized.length > 0 && !nextNormalized.startsWith('-')) {
          index += 1
        }
      }

      removedInvalidLocalStorageFlag = true
      continue
    }

    if (normalized.startsWith(`${LOCALSTORAGE_FLAG}=`)) {
      const rawLocalStorageValue = normalized.slice(LOCALSTORAGE_FLAG.length + 1).trim()
      if (rawLocalStorageValue === '' || rawLocalStorageValue === '""' || rawLocalStorageValue === "''") {
        removedInvalidLocalStorageFlag = true
        continue
      }

      hasValidLocalStorageFlag = true
      sanitizedTokens.push(token)
      continue
    }

    sanitizedTokens.push(token)
  }

  if (removedInvalidLocalStorageFlag && !hasValidLocalStorageFlag) {
    const localStorageDir = path.join(process.cwd(), '.cache')
    const localStorageFile = path.join(localStorageDir, 'node-localstorage')
    mkdirSync(localStorageDir, { recursive: true })

    const localStorageToken = localStorageFile.includes(' ')
      ? `${LOCALSTORAGE_FLAG}="${localStorageFile}"`
      : `${LOCALSTORAGE_FLAG}=${localStorageFile}`

    sanitizedTokens.push(localStorageToken)
  }

  return sanitizedTokens.join(' ').trim()
}

function extractLocalStoragePath(rawValue) {
  if (!rawValue) {
    return null
  }

  const tokens = rawValue.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? []

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    const normalized = stripWrappingQuotes(token.trim())

    if (normalized === LOCALSTORAGE_FLAG) {
      const nextToken = tokens[index + 1]
      if (!nextToken) {
        return null
      }

      const nextNormalized = stripWrappingQuotes(nextToken.trim())
      if (nextNormalized.length === 0 || nextNormalized === '""' || nextNormalized === "''") {
        return null
      }

      return nextNormalized
    }

    if (normalized.startsWith(`${LOCALSTORAGE_FLAG}=`)) {
      const rawLocalStorageValue = normalized.slice(LOCALSTORAGE_FLAG.length + 1).trim()
      const normalizedValue = stripWrappingQuotes(rawLocalStorageValue)
      if (normalizedValue.length === 0 || normalizedValue === '""' || normalizedValue === "''") {
        return null
      }

      return normalizedValue
    }
  }

  return null
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
  const candidates = process.platform === 'win32'
    ? [`${command}.cmd`, `${command}.exe`, command]
    : [command]

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

const child = process.platform === 'win32'
  ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', [resolvedCommand, ...args].map(quoteForCmd).join(' ')], {
      stdio: 'inherit',
      env: process.env,
    })
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
