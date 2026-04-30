import type { ConfigService } from '@nestjs/config'
import type { CacheService } from '../src/common/services/cache.service'
import { TelegramAdapter } from '../src/modules/notifications/infra/telegram/telegram.adapter'
import { NotificationsService } from '../src/modules/notifications/notifications.service'
import type { AuditLogService } from '../src/modules/monitoring/audit-log.service'

describe('NotificationsService', () => {
  const configValues: Record<string, string | undefined> = {
    TELEGRAM_BOT_TOKEN: undefined,
    BREVO_API_KEY: undefined,
    OUTBOUND_WEBHOOK_ENABLED: undefined,
    ALERTMANAGER_WEBHOOK_URL: undefined,
  }

  const configService = {
    get: jest.fn((key: string) => configValues[key]),
  }

  const auditLogService = {
    record: jest.fn(async () => {}),
  }

  const cache = {
    get: jest.fn(),
    set: jest.fn(async () => {}),
  }

  function makeService() {
    const telegramAdapter = new TelegramAdapter(configService as unknown as ConfigService)
    return new NotificationsService(
      configService as unknown as ConfigService,
      auditLogService as unknown as AuditLogService,
      cache as unknown as CacheService,
      telegramAdapter,
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
    configService.get.mockClear()
    auditLogService.record.mockReset()
    auditLogService.record.mockResolvedValue(undefined)
    cache.get.mockReset()
    cache.set.mockReset()
    cache.get.mockResolvedValue(null)
    cache.set.mockResolvedValue(undefined)
    configValues.TELEGRAM_BOT_TOKEN = undefined
    configValues.BREVO_API_KEY = undefined
    configValues.OUTBOUND_WEBHOOK_ENABLED = undefined
    configValues.ALERTMANAGER_WEBHOOK_URL = undefined
  })

  it('descreve canais como desabilitados quando nenhuma integracao externa esta configurada', () => {
    const service = makeService()

    expect(service.getChannelCapabilities()).toEqual([
      expect.objectContaining({ channel: 'TELEGRAM', enabled: false }),
      expect.objectContaining({ channel: 'EMAIL', enabled: false }),
      expect.objectContaining({ channel: 'WEBHOOK', enabled: false }),
    ])
  })

  it('marca telegram e email como habilitados quando as credenciais existem', () => {
    configValues.TELEGRAM_BOT_TOKEN = 'telegram-token'
    configValues.BREVO_API_KEY = 'brevo-key'

    const service = makeService()

    expect(service.getChannelCapabilities()).toEqual([
      expect.objectContaining({ channel: 'TELEGRAM', enabled: true }),
      expect.objectContaining({ channel: 'EMAIL', enabled: true }),
      expect.objectContaining({ channel: 'WEBHOOK', enabled: false }),
    ])
  })

  it('suprime entrega quando nenhum canal outbound esta habilitado', async () => {
    cache.get.mockResolvedValueOnce(null)
    const service = makeService()

    const result = await service.queueDelivery({
      workspaceOwnerUserId: 'owner-1',
      actorUserId: 'owner-1',
      eventType: 'sales.daily_summary',
      recipientScope: 'WORKSPACE_OWNER',
      payload: { total: 10 },
      idempotencyKey: 'delivery-1',
    })

    expect(result.state).toBe('suppressed')
    expect(cache.set).not.toHaveBeenCalled()
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'notifications.delivery.suppressed' }),
    )
  })

  it('enfileira entrega com idempotencia quando o canal preferido esta habilitado', async () => {
    configValues.TELEGRAM_BOT_TOKEN = 'telegram-token'
    cache.get.mockResolvedValueOnce(null)
    const service = makeService()

    const result = await service.queueDelivery({
      workspaceOwnerUserId: 'owner-1',
      actorUserId: 'owner-1',
      eventType: 'inventory.low_stock',
      recipientScope: 'WORKSPACE_OWNER',
      payload: { lowStockItems: 2 },
      idempotencyKey: 'delivery-2',
      preferredChannels: ['TELEGRAM'],
    })

    expect(result.state).toBe('queued')
    expect(result.channels).toEqual(['TELEGRAM'])
    expect(cache.set).toHaveBeenCalled()
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'notifications.delivery.queued' }),
    )
  })

  it('suprime entrega duplicada quando a chave de idempotencia ja foi usada', async () => {
    configValues.TELEGRAM_BOT_TOKEN = 'telegram-token'
    cache.get.mockResolvedValueOnce({ queuedAt: '2026-04-29T20:00:00.000Z' })
    const service = makeService()

    const result = await service.queueDelivery({
      workspaceOwnerUserId: 'owner-1',
      actorUserId: 'owner-1',
      eventType: 'cash.closed',
      recipientScope: 'WORKSPACE_OWNER',
      payload: { amount: 100 },
      idempotencyKey: 'delivery-3',
      preferredChannels: ['TELEGRAM'],
    })

    expect(result.state).toBe('suppressed')
    expect(result.suppressedReason).toContain('idempotencia')
    expect(cache.set).not.toHaveBeenCalled()
  })
})
