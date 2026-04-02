import { validateEnvironment } from '../src/config/env.validation'

describe('validateEnvironment', () => {
  it('aceita configuracao valida em development', () => {
    const env = validateEnvironment({
      NODE_ENV: 'development',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/desk',
      DIRECT_URL: 'postgres://user:pass@localhost:5432/desk',
      APP_URL: 'https://app.example.com',
      NEXT_PUBLIC_APP_URL: 'https://app.example.com',
      ENABLE_SWAGGER: 'true',
      COOKIE_SECURE: 'false',
      COOKIE_SAME_SITE: 'lax',
      REGISTRATION_GEOCODING_TIMEOUT_MS: '5000',
      REGISTRATION_VERIFICATION_DISPATCH_TIMEOUT_MS: '1000',
      PORT: '3000',
      TRUST_PROXY: '1',
      COOKIE_SECRET: '1234567890123456',
      CSRF_SECRET: '12345678901234567890123456789012',
      RAILWAY_SERVICE_IMPERIAL_DESK_WEB_URL: 'desk.example.com',
    })

    expect(env.DATABASE_URL).toContain('postgres://')
  })

  it('acumula erros de validacao para campos invalidos', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'staging',
        DATABASE_URL: '',
        APP_URL: 'not-a-url',
        ENABLE_SWAGGER: 'yes',
        REGISTRATION_GEOCODING_TIMEOUT_MS: '0',
        COOKIE_SECRET: 'short',
        CSRF_SECRET: 'tiny',
        PORT: '70000',
        TRUST_PROXY: '-1',
      }),
    ).toThrow(
      expect.objectContaining({
        message: expect.stringContaining('Configuração inválida da API'),
      }),
    )
  })

  it('bloqueia same-site none sem secure fora de producao', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'development',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/desk',
        COOKIE_SAME_SITE: 'none',
        COOKIE_SECURE: 'false',
      }),
    ).toThrow(
      expect.objectContaining({ message: expect.stringContaining('COOKIE_SAME_SITE=none exige cookie secure') }),
    )
  })

  it('em producao exige segredos e redis valido', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/desk',
        COOKIE_SECRET: '1234567890123456',
        CSRF_SECRET: '12345678901234567890123456789012',
      }),
    ).toThrow(expect.objectContaining({ message: expect.stringContaining('Uma URL Redis é obrigatória em produção') }))

    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/desk',
        COOKIE_SECRET: '1234567890123456',
        CSRF_SECRET: '12345678901234567890123456789012',
        REDIS_URL: 'invalid-redis-url',
      }),
    ).toThrow(expect.objectContaining({ message: expect.stringContaining('REDIS_URL deve ser uma URL válida') }))
  })

  it('aceita producao com same-site none quando secure e redis estao corretos', () => {
    const env = validateEnvironment({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/desk',
      COOKIE_SECRET: '1234567890123456',
      CSRF_SECRET: '12345678901234567890123456789012',
      COOKIE_SAME_SITE: 'none',
      COOKIE_SECURE: 'true',
      REDIS_PRIVATE_URL: 'redis://localhost:6379',
    })

    expect(env.NODE_ENV).toBe('production')
  })
})
