import { getRedisUrlKeys, hasRedisUrl } from '../common/utils/redis-url.util'

type EnvShape = Record<string, string | undefined>

const BOOLEAN_KEYS = [
  'ENABLE_API_DOCS',
  'PORTFOLIO_EMAIL_FALLBACK',
  'COOKIE_SECURE',
  'REGISTRATION_GEOCODING_STRICT',
  'OTEL_DIAGNOSTICS',
  'TELEGRAM_BOT_ENABLED',
  'SENTRY_ENABLED',
  'SENTRY_ENABLE_LOGS',
  'SENTRY_SEND_DEFAULT_PII',
] as const
const URL_KEYS = ['DATABASE_URL', 'DIRECT_URL', 'APP_URL', 'NEXT_PUBLIC_APP_URL'] as const
const OPTIONAL_URL_KEYS = ['RAILWAY_SERVICE_IMPERIAL_DESK_WEB_URL'] as const
const OPTIONAL_TELEGRAM_URL_KEYS = ['TELEGRAM_WEBHOOK_URL'] as const
const OPTIONAL_OBSERVABILITY_URL_KEYS = [
  'OTEL_EXPORTER_OTLP_ENDPOINT',
  'OTEL_EXPORTER_OTLP_TRACES_ENDPOINT',
  'OTEL_EXPORTER_OTLP_METRICS_ENDPOINT',
  'OTEL_EXPORTER_OTLP_LOGS_ENDPOINT',
  'SENTRY_DSN',
] as const
const POSITIVE_NUMBER_KEYS = [
  'REGISTRATION_GEOCODING_TIMEOUT_MS',
  'REGISTRATION_VERIFICATION_DISPATCH_TIMEOUT_MS',
  'OTEL_METRICS_EXPORT_INTERVAL_MS',
]
const SAMPLE_RATE_KEYS = [
  'OTEL_TRACES_SAMPLE_RATE',
  'SENTRY_TRACES_SAMPLE_RATE',
  'SENTRY_PROFILE_SESSION_SAMPLE_RATE',
] as const
const REDIS_URL_CANDIDATE_KEYS = getRedisUrlKeys()
const PRODUCTION_DEFAULT_SECRET_VALUES: Record<string, string[]> = {
  COOKIE_SECRET: ['change-me', 'replace-with-a-long-random-cookie-secret'],
  CSRF_SECRET: ['change-me', 'replace-with-a-long-random-csrf-secret'],
  ENCRYPTION_KEY: ['change-me', 'replace-with-a-32-char-encryption-key'],
  POSTGRES_PASSWORD: ['desk_imperial_change_me', 'change_me_in_prod'],
  REDIS_PASSWORD: ['desk_imperial_redis_change_me', 'change_me_in_prod'],
  DEMO_STAFF_PASSWORD: ['123456'],
}
const DEFAULT_DATABASE_PASSWORD_VALUES = ['desk_imperial_change_me', 'change_me_in_prod']
const DEFAULT_REDIS_PASSWORD_VALUES = ['desk_imperial_redis_change_me', 'change_me_in_prod']

export function validateEnvironment(config: EnvShape) {
  const env = { ...config }
  const issues: string[] = []
  const nodeEnv = env.NODE_ENV ?? 'development'

  validateNodeEnvironment(nodeEnv, issues)
  validateRequiredDatabaseUrl(env, issues)
  validateUrlGroup(env, URL_KEYS, issues)
  validateUrlGroup(env, REDIS_URL_CANDIDATE_KEYS, issues)
  validateUrlGroup(env, OPTIONAL_URL_KEYS, issues, isValidOriginLikeValue)
  validateUrlGroup(env, OPTIONAL_TELEGRAM_URL_KEYS, issues)
  validateUrlGroup(env, OPTIONAL_OBSERVABILITY_URL_KEYS, issues)
  validateBooleanGroup(env, BOOLEAN_KEYS, issues)
  validatePositiveNumberGroup(env, POSITIVE_NUMBER_KEYS, issues)
  validateSampleRateGroup(env, SAMPLE_RATE_KEYS, issues)
  validateCookieSameSite(env, nodeEnv, issues)
  validatePort(env.PORT, issues)
  validateTrustProxy(env.TRUST_PROXY, issues)
  validateSentryProfileLifecycle(env.SENTRY_PROFILE_LIFECYCLE, issues)

  validateSecretLength(env.COOKIE_SECRET, 16, 'COOKIE_SECRET', issues)
  validateSecretLength(env.CSRF_SECRET, 32, 'CSRF_SECRET', issues)
  validateSecretLength(env.ENCRYPTION_KEY, 32, 'ENCRYPTION_KEY', issues)
  validateSecretLength(env.TELEGRAM_WEBHOOK_SECRET, 24, 'TELEGRAM_WEBHOOK_SECRET', issues)
  validateProductionRequirements(env, nodeEnv, issues)

  if (issues.length > 0) {
    throw new Error(`Configuração inválida da API:\n- ${issues.join('\n- ')}`)
  }

  return env
}

function validateNodeEnvironment(nodeEnv: string, issues: string[]) {
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    issues.push('NODE_ENV deve ser development, test ou production.')
  }
}

function validateRequiredDatabaseUrl(env: EnvShape, issues: string[]) {
  if (!env.DATABASE_URL?.trim()) {
    issues.push('DATABASE_URL é obrigatório para iniciar a API.')
  }
}

function validateUrlGroup(
  env: EnvShape,
  keys: readonly string[],
  issues: string[],
  validator: (value: string) => boolean = isValidUrl,
) {
  for (const key of keys) {
    const value = env[key]
    if (value && !validator(value)) {
      issues.push(`${key} deve ser uma URL válida.`)
    }
  }
}

function validateBooleanGroup(env: EnvShape, keys: readonly string[], issues: string[]) {
  for (const key of keys) {
    const value = env[key]
    if (value !== undefined && !['true', 'false'].includes(value)) {
      issues.push(`${key} deve ser "true" ou "false".`)
    }
  }
}

function validatePositiveNumberGroup(env: EnvShape, keys: readonly string[], issues: string[]) {
  for (const key of keys) {
    const value = env[key]
    if (value !== undefined && !isPositiveNumber(value)) {
      issues.push(`${key} deve ser um numero positivo.`)
    }
  }
}

function validateSampleRateGroup(env: EnvShape, keys: readonly string[], issues: string[]) {
  for (const key of keys) {
    const value = env[key]
    if (value !== undefined && !isValidSampleRate(value)) {
      issues.push(`${key} deve ser um numero entre 0 e 1.`)
    }
  }
}

function validateCookieSameSite(env: EnvShape, nodeEnv: string, issues: string[]) {
  if (env.COOKIE_SAME_SITE === undefined) {
    return
  }

  const sameSite = env.COOKIE_SAME_SITE.trim().toLowerCase()
  if (!['lax', 'strict', 'none'].includes(sameSite)) {
    issues.push('COOKIE_SAME_SITE deve ser "lax", "strict" ou "none".')
  }

  const secureCookieEnabled = nodeEnv === 'production' || env.COOKIE_SECURE === 'true'
  if (sameSite === 'none' && !secureCookieEnabled) {
    issues.push('COOKIE_SAME_SITE=none exige cookie secure (COOKIE_SECURE=true) ou ambiente de produção.')
  }
}

function validatePort(portValue: string | undefined, issues: string[]) {
  if (portValue === undefined) {
    return
  }

  const port = Number(portValue)
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    issues.push('PORT deve ser um inteiro válido entre 1 e 65535.')
  }
}

function validateTrustProxy(trustProxyValue: string | undefined, issues: string[]) {
  if (trustProxyValue === undefined || trustProxyValue === 'true' || trustProxyValue === 'false') {
    return
  }

  const hops = Number(trustProxyValue)
  if (!Number.isInteger(hops) || hops < 0) {
    issues.push('TRUST_PROXY deve ser "true", "false" ou um inteiro não negativo.')
  }
}

function validateSentryProfileLifecycle(profileLifecycleValue: string | undefined, issues: string[]) {
  if (profileLifecycleValue !== undefined && profileLifecycleValue !== 'manual' && profileLifecycleValue !== 'trace') {
    issues.push('SENTRY_PROFILE_LIFECYCLE deve ser "manual" ou "trace".')
  }
}

function validateProductionRequirements(env: EnvShape, nodeEnv: string, issues: string[]) {
  if (nodeEnv !== 'production') {
    return
  }

  validateRequiredSecret(env.COOKIE_SECRET, 'COOKIE_SECRET', issues)
  validateRequiredSecret(env.CSRF_SECRET, 'CSRF_SECRET', issues)
  validateRequiredSecret(env.ENCRYPTION_KEY, 'ENCRYPTION_KEY', issues)
  validateNoDefaultProductionSecrets(env, issues)
  validateConnectionUrlPassword(env.DATABASE_URL, 'DATABASE_URL', DEFAULT_DATABASE_PASSWORD_VALUES, issues)
  validateConnectionUrlPassword(env.DIRECT_URL, 'DIRECT_URL', DEFAULT_DATABASE_PASSWORD_VALUES, issues)

  for (const key of REDIS_URL_CANDIDATE_KEYS) {
    validateConnectionUrlPassword(env[key], key, DEFAULT_REDIS_PASSWORD_VALUES, issues)
  }

  if (!hasRedisUrl(env)) {
    issues.push(
      `Uma URL Redis é obrigatória em produção para cache e sincronização realtime entre instâncias (${REDIS_URL_CANDIDATE_KEYS.join(' | ')}).`,
    )
  }

  if (env.TELEGRAM_BOT_ENABLED === 'true') {
    if (!env.TELEGRAM_BOT_TOKEN?.trim()) {
      issues.push('TELEGRAM_BOT_TOKEN é obrigatório em produção quando TELEGRAM_BOT_ENABLED=true.')
    }
    if (!env.TELEGRAM_BOT_USERNAME?.trim()) {
      issues.push('TELEGRAM_BOT_USERNAME é obrigatório em produção quando TELEGRAM_BOT_ENABLED=true.')
    }
    if (!env.TELEGRAM_WEBHOOK_SECRET?.trim()) {
      issues.push('TELEGRAM_WEBHOOK_SECRET é obrigatório em produção quando TELEGRAM_BOT_ENABLED=true.')
    }
  }
}

function validateRequiredSecret(value: string | undefined, label: string, issues: string[]) {
  if (!value?.trim()) {
    issues.push(`${label} é obrigatório em produção.`)
  }
}

function validateNoDefaultProductionSecrets(env: EnvShape, issues: string[]) {
  for (const [key, invalidValues] of Object.entries(PRODUCTION_DEFAULT_SECRET_VALUES)) {
    const value = env[key]
    if (!value?.trim()) {
      continue
    }

    const normalized = value.trim().toLowerCase()
    const matchesDefault = invalidValues.some((candidate) => normalized === candidate.toLowerCase())
    if (matchesDefault) {
      issues.push(`${key} não pode usar valor de placeholder/default em produção.`)
    }
  }
}

function validateSecretLength(value: string | undefined, minLength: number, label: string, issues: string[]) {
  if (!value) {
    return
  }

  if (value.length < minLength) {
    issues.push(`${label} deve ter pelo menos ${minLength} caracteres.`)
  }
}

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value)
    return Boolean(parsed.protocol && parsed.host)
  } catch {
    return false
  }
}

function isValidOriginLikeValue(value: string) {
  return isValidUrl(value) || isValidUrl(`https://${value}`)
}

function isPositiveNumber(value: string) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) && numericValue > 0
}

function isValidSampleRate(value: string) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) && numericValue >= 0 && numericValue <= 1
}

function validateConnectionUrlPassword(
  value: string | undefined,
  label: string,
  invalidPasswords: string[],
  issues: string[],
) {
  if (!value?.trim()) {
    return
  }

  try {
    const parsed = new URL(value)
    const normalizedPassword = parsed.password.trim().toLowerCase()
    if (!normalizedPassword) {
      return
    }

    const matchesDefault = invalidPasswords.some((candidate) => normalizedPassword === candidate.toLowerCase())
    if (matchesDefault) {
      issues.push(`${label} não pode usar senha de placeholder/default em produção.`)
    }
  } catch {
    // A própria URL já é validada em validateUrlGroup.
  }
}
