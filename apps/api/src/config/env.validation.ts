import { getRedisUrlKeys, hasRedisUrl } from '../common/utils/redis-url.util'

type EnvShape = Record<string, string | undefined>

const BOOLEAN_KEYS = [
  'ENABLE_SWAGGER',
  'SWAGGER_ALLOW_IN_PRODUCTION',
  'PORTFOLIO_EMAIL_FALLBACK',
  'COOKIE_SECURE',
  'REGISTRATION_GEOCODING_STRICT',
  'OTEL_DIAGNOSTICS',
] as const
const URL_KEYS = ['DATABASE_URL', 'DIRECT_URL', 'APP_URL', 'NEXT_PUBLIC_APP_URL'] as const
const OPTIONAL_URL_KEYS = ['RAILWAY_SERVICE_IMPERIAL_DESK_WEB_URL'] as const
const OPTIONAL_OBSERVABILITY_URL_KEYS = [
  'OTEL_EXPORTER_OTLP_ENDPOINT',
  'OTEL_EXPORTER_OTLP_TRACES_ENDPOINT',
  'OTEL_EXPORTER_OTLP_METRICS_ENDPOINT',
  'OTEL_EXPORTER_OTLP_LOGS_ENDPOINT',
] as const
const POSITIVE_NUMBER_KEYS = [
  'REGISTRATION_GEOCODING_TIMEOUT_MS',
  'REGISTRATION_VERIFICATION_DISPATCH_TIMEOUT_MS',
  'OTEL_METRICS_EXPORT_INTERVAL_MS',
]
const REDIS_URL_CANDIDATE_KEYS = getRedisUrlKeys()

export function validateEnvironment(config: EnvShape) {
  const env = { ...config }
  const issues: string[] = []
  const nodeEnv = env.NODE_ENV ?? 'development'

  validateNodeEnvironment(nodeEnv, issues)
  validateRequiredDatabaseUrl(env, issues)
  validateUrlGroup(env, URL_KEYS, issues)
  validateUrlGroup(env, REDIS_URL_CANDIDATE_KEYS, issues)
  validateUrlGroup(env, OPTIONAL_URL_KEYS, issues, isValidOriginLikeValue)
  validateUrlGroup(env, OPTIONAL_OBSERVABILITY_URL_KEYS, issues)
  validateBooleanGroup(env, BOOLEAN_KEYS, issues)
  validatePositiveNumberGroup(env, POSITIVE_NUMBER_KEYS, issues)
  validateCookieSameSite(env, nodeEnv, issues)
  validatePort(env.PORT, issues)
  validateTrustProxy(env.TRUST_PROXY, issues)

  validateSecretLength(env.COOKIE_SECRET, 16, 'COOKIE_SECRET', issues)
  validateSecretLength(env.CSRF_SECRET, 32, 'CSRF_SECRET', issues)
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

function validateProductionRequirements(env: EnvShape, nodeEnv: string, issues: string[]) {
  if (nodeEnv !== 'production') {
    return
  }

  validateRequiredSecret(env.COOKIE_SECRET, 'COOKIE_SECRET', issues)
  validateRequiredSecret(env.CSRF_SECRET, 'CSRF_SECRET', issues)

  if (!hasRedisUrl(env)) {
    issues.push(
      `Uma URL Redis é obrigatória em produção para cache e sincronização realtime entre instâncias (${REDIS_URL_CANDIDATE_KEYS.join(' | ')}).`,
    )
  }
}

function validateRequiredSecret(value: string | undefined, label: string, issues: string[]) {
  if (!value?.trim()) {
    issues.push(`${label} é obrigatório em produção.`)
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
