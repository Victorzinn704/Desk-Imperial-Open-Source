type EnvShape = Record<string, string | undefined>

const BOOLEAN_KEYS = ['ENABLE_SWAGGER', 'SWAGGER_ALLOW_IN_PRODUCTION', 'PORTFOLIO_EMAIL_FALLBACK'] as const
const URL_KEYS = ['DATABASE_URL', 'DIRECT_URL', 'REDIS_URL', 'APP_URL', 'NEXT_PUBLIC_APP_URL'] as const
const OPTIONAL_URL_KEYS = ['RAILWAY_SERVICE_IMPERIAL_DESK_WEB_URL'] as const

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

  for (const key of OPTIONAL_URL_KEYS) {
    const value = env[key]
    if (!value) {
      continue
    }

    if (!isValidOriginLikeValue(value)) {
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

    if (!env.REDIS_URL?.trim()) {
      issues.push('REDIS_URL é obrigatório em produção para garantir cache e sincronização realtime entre instâncias.')
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
