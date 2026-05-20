import { mkdirSync } from 'node:fs'
import path from 'node:path'

const LOCALSTORAGE_FLAG = '--localstorage-file'
const NODE_OPTIONS_TOKEN_PATTERN = /(?:[^\s"']+|"[^"]*"|'[^']*')+/g
const NO_LOCAL_STORAGE_PATH = Symbol('NO_LOCAL_STORAGE_PATH')
const WRAPPING_QUOTES = ['"', "'"]

function isWrappedBy(value, quote) {
  if (!value.startsWith(quote)) {
    return false
  }

  return value.endsWith(quote)
}

function stripWrappingQuotes(value) {
  const quote = WRAPPING_QUOTES.find((candidate) => isWrappedBy(value, candidate))

  if (quote) {
    return value.slice(1, -1)
  }

  return value
}

function tokenizeNodeOptions(rawValue) {
  return rawValue.match(NODE_OPTIONS_TOKEN_PATTERN) ?? []
}

function normalizeOptionToken(token) {
  return stripWrappingQuotes(token.trim())
}

function isLocalStorageFlag(normalizedToken) {
  return normalizedToken === LOCALSTORAGE_FLAG
}

function readAssignedLocalStorageValue(normalizedToken) {
  if (!normalizedToken.startsWith(`${LOCALSTORAGE_FLAG}=`)) {
    return null
  }

  return normalizedToken.slice(LOCALSTORAGE_FLAG.length + 1).trim()
}

function normalizeLocalStoragePathCandidate(value) {
  const normalizedValue = stripWrappingQuotes(value)

  if (normalizedValue.length === 0) {
    return null
  }

  return normalizedValue
}

function canUseSeparatedLocalStorageValue(normalizedValue) {
  const localStoragePath = normalizeLocalStoragePathCandidate(normalizedValue)

  if (!localStoragePath) {
    return false
  }

  return !localStoragePath.startsWith('-')
}

function shouldConsumeInvalidSeparatedValue(normalizedValue) {
  if (normalizedValue.length === 0) {
    return false
  }

  return !normalizedValue.startsWith('-')
}

function readSeparatedLocalStorageToken(tokens, index) {
  const nextToken = tokens[index + 1]

  if (!nextToken) {
    return { valid: false, consumeNext: false }
  }

  const normalizedValue = normalizeOptionToken(nextToken)

  return {
    valid: canUseSeparatedLocalStorageValue(normalizedValue),
    consumeNext: shouldConsumeInvalidSeparatedValue(normalizedValue),
    token: nextToken,
  }
}

function resolveSeparatedLocalStorageToken(tokens, index, token, normalizedToken) {
  if (!isLocalStorageFlag(normalizedToken)) {
    return null
  }

  const next = readSeparatedLocalStorageToken(tokens, index)

  if (next.valid) {
    return {
      tokens: [token, next.token],
      hasValidLocalStorageFlag: true,
      removedInvalidLocalStorageFlag: false,
      skipNext: true,
    }
  }

  return {
    tokens: [],
    hasValidLocalStorageFlag: false,
    removedInvalidLocalStorageFlag: true,
    skipNext: next.consumeNext,
  }
}

function resolveAssignedLocalStorageToken(token, normalizedToken) {
  const localStorageValue = readAssignedLocalStorageValue(normalizedToken)

  if (localStorageValue === null) {
    return null
  }

  const localStoragePath = normalizeLocalStoragePathCandidate(localStorageValue)

  if (!localStoragePath) {
    return {
      tokens: [],
      hasValidLocalStorageFlag: false,
      removedInvalidLocalStorageFlag: true,
      skipNext: false,
    }
  }

  return {
    tokens: [token],
    hasValidLocalStorageFlag: true,
    removedInvalidLocalStorageFlag: false,
    skipNext: false,
  }
}

function resolveNodeOptionToken(tokens, index) {
  const token = tokens[index]
  const normalizedToken = normalizeOptionToken(token)

  return (
    resolveSeparatedLocalStorageToken(tokens, index, token, normalizedToken) ??
    resolveAssignedLocalStorageToken(token, normalizedToken) ?? {
      tokens: [token],
      hasValidLocalStorageFlag: false,
      removedInvalidLocalStorageFlag: false,
      skipNext: false,
    }
  )
}

function collectSanitizedNodeOptions(tokens) {
  const sanitizedTokens = []
  let hasValidLocalStorageFlag = false
  let removedInvalidLocalStorageFlag = false

  for (let index = 0; index < tokens.length; index += 1) {
    const result = resolveNodeOptionToken(tokens, index)

    sanitizedTokens.push(...result.tokens)
    hasValidLocalStorageFlag ||= result.hasValidLocalStorageFlag
    removedInvalidLocalStorageFlag ||= result.removedInvalidLocalStorageFlag

    if (result.skipNext) {
      index += 1
    }
  }

  return {
    hasValidLocalStorageFlag,
    removedInvalidLocalStorageFlag,
    sanitizedTokens,
  }
}

function shouldAppendFallbackLocalStorage(scan) {
  if (!scan.removedInvalidLocalStorageFlag) {
    return false
  }

  return !scan.hasValidLocalStorageFlag
}

function buildFallbackLocalStorageToken() {
  const localStorageDir = path.join(process.cwd(), '.cache')
  const localStorageFile = path.join(localStorageDir, 'node-localstorage')
  mkdirSync(localStorageDir, { recursive: true })

  if (localStorageFile.includes(' ')) {
    return `${LOCALSTORAGE_FLAG}="${localStorageFile}"`
  }

  return `${LOCALSTORAGE_FLAG}=${localStorageFile}`
}

export function sanitizeNodeOptions(rawValue) {
  if (!rawValue) {
    return rawValue
  }

  const scan = collectSanitizedNodeOptions(tokenizeNodeOptions(rawValue))

  if (shouldAppendFallbackLocalStorage(scan)) {
    scan.sanitizedTokens.push(buildFallbackLocalStorageToken())
  }

  return scan.sanitizedTokens.join(' ').trim()
}

function readSeparatedLocalStoragePath(tokens, index) {
  const nextToken = tokens[index + 1]

  if (!nextToken) {
    return null
  }

  return normalizeLocalStoragePathCandidate(normalizeOptionToken(nextToken))
}

function readLocalStoragePathAt(tokens, index) {
  const normalizedToken = normalizeOptionToken(tokens[index])

  if (isLocalStorageFlag(normalizedToken)) {
    return readSeparatedLocalStoragePath(tokens, index)
  }

  const localStorageValue = readAssignedLocalStorageValue(normalizedToken)

  if (localStorageValue === null) {
    return NO_LOCAL_STORAGE_PATH
  }

  return normalizeLocalStoragePathCandidate(localStorageValue)
}

export function extractLocalStoragePath(rawValue) {
  if (!rawValue) {
    return null
  }

  const tokens = tokenizeNodeOptions(rawValue)

  for (let index = 0; index < tokens.length; index += 1) {
    const localStoragePath = readLocalStoragePathAt(tokens, index)

    if (localStoragePath !== NO_LOCAL_STORAGE_PATH) {
      return localStoragePath
    }
  }

  return null
}
