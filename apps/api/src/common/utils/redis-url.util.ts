const REDIS_URL_KEYS = ['REDIS_URL', 'REDIS_PRIVATE_URL', 'REDIS_PUBLIC_URL'] as const

type EnvLike = Record<string, string | undefined>

export function resolveRedisUrl(env: EnvLike): string | null {
  for (const key of REDIS_URL_KEYS) {
    const value = env[key]?.trim()
    if (value) {
      return value
    }
  }

  return null
}

export function hasRedisUrl(env: EnvLike): boolean {
  return resolveRedisUrl(env) !== null
}

export function getRedisUrlKeys(): readonly string[] {
  return REDIS_URL_KEYS
}
