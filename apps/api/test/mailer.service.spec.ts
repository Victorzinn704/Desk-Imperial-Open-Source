import { ServiceUnavailableException } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import { MailerService } from '../src/modules/mailer/mailer.service'

describe('MailerService', () => {
  const configValues: Record<string, string | undefined> = {
    APP_NAME: 'Desk Imperial',
    EMAIL_SUPPORT_ADDRESS: 'suporte@desk.com',
    EMAIL_FROM_EMAIL: 'noreply@desk.com',
    EMAIL_FROM_NAME: 'Desk Team',
    EMAIL_REPLY_TO: 'reply@desk.com',
    EMAIL_PROVIDER: 'auto',
    NODE_ENV: 'development',
    BREVO_API_KEY: undefined,
    BREVO_API_URL: 'https://api.brevo.com/v3/smtp/email',
  }

  const configService = {
    get: jest.fn((key: string) => configValues[key]),
  }

  const originalFetch = global.fetch
  let service: MailerService
  let loggerWarnSpy: jest.Mock
  let loggerErrorSpy: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    configValues.EMAIL_PROVIDER = 'auto'
    configValues.NODE_ENV = 'development'
    configValues.BREVO_API_KEY = undefined
    configValues.EMAIL_FROM_EMAIL = 'noreply@desk.com'
    configValues.EMAIL_REPLY_TO = 'reply@desk.com'
    service = new MailerService(configService as unknown as ConfigService)
    loggerWarnSpy = jest.fn()
    loggerErrorSpy = jest.fn()
    ;(service as any).logger.warn = loggerWarnSpy
    ;(service as any).logger.error = loggerErrorSpy
    ;(global as any).fetch = jest.fn()
  })

  afterAll(() => {
    ;(global as any).fetch = originalFetch
  })

  it('usa modo log quando EMAIL_PROVIDER=log', async () => {
    configValues.EMAIL_PROVIDER = 'log'

    const result = await service.sendEmailVerificationEmail({
      to: 'owner@empresa.com',
      fullName: 'Owner',
      code: '12345678',
      expiresInMinutes: 15,
    })

    expect(result.mode).toBe('log')
    expect(loggerWarnSpy).toHaveBeenCalledTimes(1)
    expect((global as any).fetch).not.toHaveBeenCalled()
  })

  it('usa fallback log em auto quando API key nao existe fora de producao', async () => {
    const result = await service.sendPasswordResetEmail({
      to: 'owner@empresa.com',
      fullName: 'Owner',
      code: '87654321',
      expiresInMinutes: 30,
    })

    expect(result.mode).toBe('log')
    expect(loggerWarnSpy).toHaveBeenCalledTimes(1)
  })

  it('falha em producao sem API key da Brevo', async () => {
    configValues.NODE_ENV = 'production'

    await expect(
      service.sendPasswordChangedEmail({
        to: 'owner@empresa.com',
        fullName: 'Owner',
        changedAt: new Date('2026-04-01T10:00:00.000Z'),
      }),
    ).rejects.toThrow(ServiceUnavailableException)
  })

  it('falha em modo brevo-api sem API key', async () => {
    configValues.EMAIL_PROVIDER = 'brevo-api'

    await expect(
      service.sendLoginAlertEmail({
        to: 'owner@empresa.com',
        fullName: 'Owner',
        occurredAt: new Date('2026-04-01T12:00:00.000Z'),
      }),
    ).rejects.toThrow(ServiceUnavailableException)
  })

  it('envia por Brevo quando configuracao esta valida', async () => {
    configValues.EMAIL_PROVIDER = 'brevo'
    configValues.BREVO_API_KEY = 'brevo-key'
    ;(global as any).fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ messageId: 'brevo-message-1' }),
    })

    const result = await service.sendFailedLoginAlertEmail({
      to: 'owner@empresa.com',
      fullName: 'Owner',
      occurredAt: new Date('2026-04-01T12:30:00.000Z'),
      attemptCount: 4,
      ipAddress: '127.0.0.1',
      userAgent: 'Jest',
      locationSummary: 'Sao Paulo',
    })

    expect(result.mode).toBe('brevo-api')
    expect(result.messageId).toBe('brevo-message-1')
    expect((global as any).fetch).toHaveBeenCalledTimes(1)
  })

  it('retorna erro explicativo quando Brevo responde 401 key not found', async () => {
    configValues.EMAIL_PROVIDER = 'brevo'
    configValues.BREVO_API_KEY = 'bad-key'
    ;(global as any).fetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Key not found',
    })

    await expect(
      service.sendFeedbackReceiptEmail({
        to: 'owner@empresa.com',
        fullName: 'Owner',
        subjectLine: 'Sugestao',
        ticketId: 'TCK-100',
        receivedAt: new Date('2026-04-01T13:00:00.000Z'),
      }),
    ).rejects.toThrow(ServiceUnavailableException)

    expect(loggerErrorSpy).toHaveBeenCalled()
  })

  it('retorna erro explicativo quando remetente nao esta validado', async () => {
    configValues.EMAIL_PROVIDER = 'brevo'
    configValues.BREVO_API_KEY = 'valid-key'
    ;(global as any).fetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'sender not verified',
    })

    await expect(
      service.sendEmailVerificationEmail({
        to: 'owner@empresa.com',
        fullName: 'Owner',
        code: '12345678',
        expiresInMinutes: 15,
      }),
    ).rejects.toThrow(ServiceUnavailableException)
  })

  it('retorna timeout quando fetch falha com erro de rede', async () => {
    configValues.EMAIL_PROVIDER = 'brevo'
    configValues.BREVO_API_KEY = 'valid-key'
    ;(global as any).fetch.mockRejectedValue(new Error('network-down'))

    await expect(
      service.sendPasswordResetEmail({
        to: 'owner@empresa.com',
        fullName: 'Owner',
        code: '99998888',
        expiresInMinutes: 30,
      }),
    ).rejects.toThrow(ServiceUnavailableException)
  })

  it('falha quando remetente nao esta configurado', async () => {
    configValues.EMAIL_PROVIDER = 'brevo'
    configValues.BREVO_API_KEY = 'valid-key'
    configValues.EMAIL_FROM_EMAIL = undefined

    await expect(
      service.sendLoginAlertEmail({
        to: 'owner@empresa.com',
        fullName: 'Owner',
        occurredAt: new Date('2026-04-01T11:00:00.000Z'),
      }),
    ).rejects.toThrow(ServiceUnavailableException)
  })
})
