import {
  getRedisUrlKeys,
  hasRedisUrl,
  resolveRedisUrl,
} from '../src/common/utils/redis-url.util'
import { extractRequestContext } from '../src/common/utils/request-context.util'
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  STRONG_PASSWORD_MESSAGE,
  STRONG_PASSWORD_REGEX,
} from '../src/common/constants/password'

describe('redis-url util', () => {
  it('resolve primeira URL de Redis disponivel por prioridade', () => {
    const env = {
      REDIS_URL: ' ',
      REDIS_PRIVATE_URL: ' redis://private:6379 ',
      REDIS_PUBLIC_URL: 'redis://public:6379',
    }

    expect(resolveRedisUrl(env)).toBe('redis://private:6379')
  })

  it('retorna null quando nenhuma URL existe', () => {
    expect(resolveRedisUrl({})).toBeNull()
    expect(hasRedisUrl({})).toBe(false)
  })

  it('exponibiliza chaves suportadas na ordem correta', () => {
    expect(getRedisUrlKeys()).toEqual(['REDIS_URL', 'REDIS_PRIVATE_URL', 'REDIS_PUBLIC_URL'])
  })
})

describe('request-context util', () => {
  function makeRequest(partial: Record<string, unknown>) {
    return {
      headers: {},
      ip: undefined,
      get: () => undefined,
      ...partial,
    } as any
  }

  it('normaliza ip local ::1 para 127.0.0.1', () => {
    const request = makeRequest({
      ip: '::1',
      get: (header: string) => {
        if (header === 'user-agent') return 'Jest'
        if (header === 'host') return 'localhost:3000'
        return undefined
      },
    })

    const ctx = extractRequestContext(request)

    expect(ctx.ipAddress).toBe('127.0.0.1')
    expect(ctx.userAgent).toBe('Jest')
    expect(ctx.host).toBe('localhost:3000')
  })

  it('usa primeiro valor de x-forwarded-for quando ip nativo nao existe', () => {
    const request = makeRequest({
      headers: { 'x-forwarded-for': '203.0.113.10, 198.51.100.7' },
      get: (header: string) => {
        if (header === 'origin') return 'http://localhost:3000'
        if (header === 'referer') return 'http://localhost:3000/dashboard'
        return undefined
      },
    })

    const ctx = extractRequestContext(request)

    expect(ctx.ipAddress).toBe('203.0.113.10')
    expect(ctx.origin).toBe('http://localhost:3000')
    expect(ctx.referer).toBe('http://localhost:3000/dashboard')
  })

  it('normaliza formato IPv6-mapeado e retorna null para ip vazio', () => {
    const requestWithMappedIpv6 = makeRequest({ ip: '::ffff:10.0.0.5' })
    const requestWithBlankIp = makeRequest({ ip: '   ' })

    expect(extractRequestContext(requestWithMappedIpv6).ipAddress).toBe('10.0.0.5')
    expect(extractRequestContext(requestWithBlankIp).ipAddress).toBeNull()
  })
})

describe('password constants', () => {
  it('mantem limites esperados de tamanho de senha', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(12)
    expect(PASSWORD_MAX_LENGTH).toBe(128)
  })

  it('valida regex de senha forte e mensagem associada', () => {
    expect('Aa123456!'.match(STRONG_PASSWORD_REGEX)).toBeTruthy()
    expect('fraca123'.match(STRONG_PASSWORD_REGEX)).toBeNull()
    expect(STRONG_PASSWORD_MESSAGE).toContain('caractere especial')
  })
})