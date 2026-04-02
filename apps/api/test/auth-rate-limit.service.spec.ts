import { HttpException, HttpStatus } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import type { CacheService } from '../src/common/services/cache.service'
import { AuthRateLimitService } from '../src/modules/auth/auth-rate-limit.service'

describe('AuthRateLimitService', () => {
  const configValues: Record<string, string | undefined> = {}
  const configService = {
    get: jest.fn((key: string) => configValues[key]),
  }

  const cache = {
    get: jest.fn(),
    set: jest.fn(async () => {}),
    del: jest.fn(async () => {}),
  }

  let service: AuthRateLimitService
  const now = 1_700_000_000_000

  beforeEach(() => {
    jest.clearAllMocks()
    Object.keys(configValues).forEach((key) => {
      configValues[key] = undefined
    })
    service = new AuthRateLimitService(configService as unknown as ConfigService, cache as unknown as CacheService)
    jest.spyOn(Date, 'now').mockImplementation(() => now)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('monta chaves normalizadas por escopo e email', () => {
    expect(service.buildLoginKey('  USER@Example.COM ', '10.0.0.1')).toBe('login:10.0.0.1:user@example.com')
    expect(service.buildLoginKey('USER@Example.COM', null)).toBe('login:unknown:user@example.com')
    expect(service.buildPasswordResetEmailKey('  USER@Example.COM ')).toBe('password-reset:email:user@example.com')
    expect(service.buildEmailVerificationCodeEmailKey('A@B.COM')).toBe('email-verification-code:email:a@b.com')
  })

  it('permite requisicao quando nao ha entrada em cache', async () => {
    cache.get.mockResolvedValue(null)

    await expect(service.assertLoginAllowed('k-1')).resolves.toBeUndefined()
  })

  it('bloqueia requisicao quando lock ainda esta ativo', async () => {
    cache.get.mockResolvedValue({
      count: 5,
      firstAttemptAt: now - 10_000,
      lockedUntil: now + 1_500,
    })

    await expect(service.assertLoginAllowed('k-2')).rejects.toThrow(HttpException)

    try {
      await service.assertLoginAllowed('k-2')
    } catch (error) {
      const httpError = error as HttpException
      expect(httpError.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS)
      expect(String(httpError.message)).toContain('Muitas tentativas de acesso')
    }
  })

  it('limpa entrada quando janela de tentativas expirou', async () => {
    cache.get.mockResolvedValue({
      count: 2,
      firstAttemptAt: now - 901_000,
      lockedUntil: null,
    })

    await service.assertLoginAllowed('k-3')

    expect(cache.del).toHaveBeenCalledWith('ratelimit:auth:k-3')
  })

  it('cria entrada nova ao registrar falha sem historico', async () => {
    cache.get.mockResolvedValue(null)

    const result = await service.recordFailure('k-4')

    expect(result).toEqual({
      count: 1,
      firstAttemptAt: now,
      lockedUntil: null,
    })
    expect(cache.set).toHaveBeenCalledWith('ratelimit:auth:k-4', result, 900)
  })

  it('incrementa tentativa mantendo janela quando ainda nao atingiu lock', async () => {
    cache.get.mockResolvedValue({
      count: 1,
      firstAttemptAt: now - 10_000,
      lockedUntil: null,
    })

    const result = await service.recordFailure('k-5')

    expect(result.count).toBe(2)
    expect(result.lockedUntil).toBeNull()
    expect(cache.set).toHaveBeenCalledWith('ratelimit:auth:k-5', expect.objectContaining({ count: 2 }), 890)
  })

  it('aplica lock quando ultrapassa limite de tentativas', async () => {
    configValues.LOGIN_MAX_ATTEMPTS = '2'
    configValues.LOGIN_LOCK_MINUTES = '1'

    cache.get.mockResolvedValue({
      count: 1,
      firstAttemptAt: now - 1_000,
      lockedUntil: null,
    })

    const result = await service.recordFailure('k-6')

    expect(result.count).toBe(2)
    expect(result.lockedUntil).toBe(now + 60_000)
    expect(cache.set).toHaveBeenCalledWith(
      'ratelimit:auth:k-6',
      expect.objectContaining({ count: 2, lockedUntil: now + 60_000 }),
      60,
    )
  })

  it('reinicia contador quando historico existente ja expirou', async () => {
    cache.get.mockResolvedValue({
      count: 9,
      firstAttemptAt: now - 901_000,
      lockedUntil: null,
    })

    const result = await service.recordFailure('k-7')

    expect(result).toEqual({ count: 1, firstAttemptAt: now, lockedUntil: null })
  })

  it('usa defaults e loga aviso quando configuracoes invalidas', async () => {
    configValues.LOGIN_MAX_ATTEMPTS = '0'
    configValues.LOGIN_WINDOW_MINUTES = '-2'
    configValues.LOGIN_LOCK_MINUTES = 'abc'

    const warnSpy = jest.fn()
    ;(service as any).logger.warn = warnSpy
    cache.get.mockResolvedValue(null)

    await service.recordFailure('k-8')

    expect(warnSpy).toHaveBeenCalledTimes(3)
    expect(cache.set).toHaveBeenCalledWith('ratelimit:auth:k-8', expect.objectContaining({ count: 1 }), 900)
  })

  it('executa wrappers de assert e record para outros fluxos', async () => {
    cache.get.mockResolvedValue(null)

    await expect(service.assertPasswordResetAllowed('pw-1')).resolves.toBeUndefined()
    await expect(service.assertPasswordResetCodeAllowed('pwc-1')).resolves.toBeUndefined()
    await expect(service.assertEmailVerificationAllowed('ev-1')).resolves.toBeUndefined()
    await expect(service.assertEmailVerificationCodeAllowed('evc-1')).resolves.toBeUndefined()

    await expect(service.recordPasswordResetAttempt('rpw-1')).resolves.toEqual(expect.objectContaining({ count: 1 }))
    await expect(service.recordPasswordResetCodeAttempt('rpwc-1')).resolves.toEqual(
      expect.objectContaining({ count: 1 }),
    )
    await expect(service.recordEmailVerificationAttempt('rev-1')).resolves.toEqual(
      expect.objectContaining({ count: 1 }),
    )
    await expect(service.recordEmailVerificationCodeAttempt('revc-1')).resolves.toEqual(
      expect.objectContaining({ count: 1 }),
    )
  })

  it('limpa contador manualmente', async () => {
    await service.clear('cleanup-key')

    expect(cache.del).toHaveBeenCalledWith('ratelimit:auth:cleanup-key')
  })
})
