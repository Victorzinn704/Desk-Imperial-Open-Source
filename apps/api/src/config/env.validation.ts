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

  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    issues.push('NODE_ENV deve ser development, test ou production.')
  }

  if (!env.DATABASE_URL?.trim()) {
    issues.push('DATABASE_URL é obrigatório para iniciar a API.')
  }

  for (const key of URL_KEYS) {
    const value = env[key]
    if (!value) {
      continue
    }

    if (!isValidUrl(value)) {
      issues.push(`${key} deve ser uma URL válida.`)
    }
  }

  for (const key of REDIS_URL_CANDIDATE_KEYS) {
    const value = env[key]
    if (!value) {
      continue
    }

    if (!isValidUrl(value)) {
      issues.push(`${key} deve ser uma URL válida.`)
    }
  }

  for (const key of OPTIONAL_URL_KEYS) {
    const value = env[key]
    if (!value) {
      continue
    }

    if (!isValidOriginLikeValue(value)) {
      issues.push(`${key} deve ser uma URL válida.`)
    }
  }

  for (const key of OPTIONAL_OBSERVABILITY_URL_KEYS) {
    const value = env[key]
    if (!value) {
      continue
    }

    if (!isValidUrl(value)) {
      issues.push(`${key} deve ser uma URL válida.`)
    }
  }

  for (const key of BOOLEAN_KEYS) {
    const value = env[key]
    if (value === undefined) {
      continue
    }

    if (!['true', 'false'].includes(value)) {
      issues.push(`${key} deve ser "true" ou "false".`)
    }
  }

  for (const key of POSITIVE_NUMBER_KEYS) {
    const value = env[key]
    if (value === undefined) {
      continue
    }

    const numericValue = Number(value)
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      issues.push(`${key} deve ser um numero positivo.`)
    }
  }

  if (env.COOKIE_SAME_SITE !== undefined) {
    const sameSite = env.COOKIE_SAME_SITE.trim().toLowerCase()
    if (!['lax', 'strict', 'none'].includes(sameSite)) {
      issues.push('COOKIE_SAME_SITE deve ser "lax", "strict" ou "none".')
    }

    const secureCookieEnabled = nodeEnv === 'production' || env.COOKIE_SECURE === 'true'
    if (sameSite === 'none' && !secureCookieEnabled) {
      issues.push('COOKIE_SAME_SITE=none exige cookie secure (COOKIE_SECURE=true) ou ambiente de produção.')
    }
  }

  if (env.PORT !== undefined) {
    const port = Number(env.PORT)
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      issues.push('PORT deve ser um inteiro válido entre 1 e 65535.')
    }
  }

  if (env.TRUST_PROXY !== undefined && env.TRUST_PROXY !== 'true' && env.TRUST_PROXY !== 'false') {
    const hops = Number(env.TRUST_PROXY)
    if (!Number.isInteger(hops) || hops < 0) {
      issues.push('TRUST_PROXY deve ser "true", "false" ou um inteiro não negativo.')
    }
  }

  validateSecretLength(env.COOKIE_SECRET, 16, 'COOKIE_SECRET', issues)
  validateSecretLength(env.CSRF_SECRET, 32, 'CSRF_SECRET', issues)

  if (nodeEnv === 'production') {
    if (!env.COOKIE_SECRET?.trim()) {
      issues.push('COOKIE_SECRET é obrigatório em produção.')
    }

    if (!env.CSRF_SECRET?.trim()) {
      issues.push('CSRF_SECRET é obrigatório em produção.')
    }

    if (!hasRedisUrl(env)) {
      issues.push(
        `Uma URL Redis é obrigatória em produção para cache e sincronização realtime entre instâncias (${REDIS_URL_CANDIDATE_KEYS.join(' | ')}).`,
      )
    }
  }

  if (issues.length > 0) {
    throw new Error(`Configuração inválida da API:\n- ${issues.join('\n- ')}`)
  }

  return env
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
