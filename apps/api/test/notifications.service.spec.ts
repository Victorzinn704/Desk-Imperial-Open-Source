import type { ConfigService } from '@nestjs/config'
import { TelegramAccountStatus } from '@prisma/client'
import type { CacheService } from '../src/common/services/cache.service'
import type { PrismaService } from '../src/database/prisma.service'
import { TelegramAdapter } from '../src/modules/notifications/infra/telegram/telegram.adapter'
import type { NotificationPreferencesService } from '../src/modules/notifications/notification-preferences.service'
import { NotificationsService } from '../src/modules/notifications/notifications.service'
import type { AuditLogService } from '../src/modules/monitoring/audit-log.service'
import type { OperationsRealtimeService } from '../src/modules/operations-realtime/operations-realtime.service'

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

  const prisma = {
    telegramAccount: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  }

  const operationsRealtimeService = {
    subscribeAll: jest.fn(() => jest.fn()),
  }

  const notificationPreferencesService = {
    resolveEffectivePreference: jest.fn(async (_workspaceOwnerUserId: string, channel: string, eventType: string) => ({
      channel,
      eventType,
      enabled: true,
      inherited: true,
    })),
  }

  function makeService() {
    const telegramAdapter = new TelegramAdapter(configService as unknown as ConfigService)
    jest.spyOn(telegramAdapter, 'sendTextMessage').mockResolvedValue(undefined as never)
    return new NotificationsService(
      configService as unknown as ConfigService,
      auditLogService as unknown as AuditLogService,
      cache as unknown as CacheService,
      prisma as unknown as PrismaService,
      operationsRealtimeService as unknown as OperationsRealtimeService,
      telegramAdapter,
      notificationPreferencesService as unknown as NotificationPreferencesService,
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
    prisma.telegramAccount.findMany.mockReset()
    prisma.telegramAccount.updateMany.mockReset()
    prisma.telegramAccount.findMany.mockResolvedValue([])
    prisma.telegramAccount.updateMany.mockResolvedValue({ count: 0 })
    operationsRealtimeService.subscribeAll.mockClear()
    notificationPreferencesService.resolveEffectivePreference.mockClear()
    configValues.TELEGRAM_BOT_TOKEN = undefined
    configValues.BREVO_API_KEY = undefined
    configValues.OUTBOUND_WEBHOOK_ENABLED = undefined
    configValues.ALERTMANAGER_WEBHOOK_URL = undefined
  })

  it('suprime envio quando o workspace desabilita o evento no canal', async () => {
    configValues.TELEGRAM_BOT_TOKEN = 'telegram-token'
    notificationPreferencesService.resolveEffectivePreference.mockResolvedValueOnce({
      channel: 'TELEGRAM',
      eventType: 'operations.comanda.status_changed',
      enabled: false,
      inherited: false,
    })

    const service = makeService()

    const result = await service.dispatchOperationsRealtimeNotification({
      id: 'evt-pref-off',
      event: 'comanda.updated',
      workspaceOwnerUserId: 'owner-1',
      workspaceChannel: 'workspace:owner-1',
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      createdAt: '2026-04-30T10:00:00.000Z',
      payload: {
        comandaId: 'com-123456',
        mesaLabel: 'Mesa 7',
        previousStatus: 'OPEN',
        status: 'READY',
        businessDate: '2026-04-30',
        employeeId: null,
        subtotal: 0,
        discountAmount: 0,
        serviceFeeAmount: 0,
        totalAmount: 0,
        totalItems: 0,
      },
    })

    expect(result).toEqual(
      expect.objectContaining({
        state: 'suppressed',
        suppressedReason: expect.stringContaining('desabilitou'),
      }),
    )
    expect(prisma.telegramAccount.findMany).not.toHaveBeenCalled()
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'notifications.delivery.suppressed' }),
    )
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

  it('envia telegram quando a comanda muda de status em realtime', async () => {
    configValues.TELEGRAM_BOT_TOKEN = 'telegram-token'
    cache.get.mockResolvedValueOnce(null)
    prisma.telegramAccount.findMany.mockResolvedValueOnce([
      {
        id: 'tg-1',
        telegramChatId: 123n,
      },
    ])

    const service = makeService()
    const telegramAdapter = (service as unknown as { telegramAdapter: TelegramAdapter }).telegramAdapter

    const result = await service.dispatchOperationsRealtimeNotification({
      id: 'evt-1',
      event: 'comanda.updated',
      workspaceOwnerUserId: 'owner-1',
      workspaceChannel: 'workspace:owner-1',
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      createdAt: '2026-04-30T10:00:00.000Z',
      payload: {
        comandaId: 'com-123456',
        mesaLabel: 'Mesa 7',
        previousStatus: 'OPEN',
        status: 'READY',
        businessDate: '2026-04-30',
        employeeId: null,
        subtotal: 0,
        discountAmount: 0,
        serviceFeeAmount: 0,
        totalAmount: 0,
        totalItems: 0,
      },
    })

    expect(result).toEqual(expect.objectContaining({ state: 'sent' }))
    expect(telegramAdapter.sendTextMessage).toHaveBeenCalledWith(
      123n,
      expect.stringContaining('Mesa 7'),
    )
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'notifications.delivery.sent' }),
    )
  })

  it('ignora update realtime sem mudança real de status', async () => {
    configValues.TELEGRAM_BOT_TOKEN = 'telegram-token'
    const service = makeService()

    const result = await service.dispatchOperationsRealtimeNotification({
      id: 'evt-2',
      event: 'comanda.updated',
      workspaceOwnerUserId: 'owner-1',
      workspaceChannel: 'workspace:owner-1',
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      createdAt: '2026-04-30T10:00:00.000Z',
      payload: {
        comandaId: 'com-123456',
        mesaLabel: 'Mesa 7',
        status: 'READY',
        businessDate: '2026-04-30',
        employeeId: null,
        subtotal: 0,
        discountAmount: 0,
        serviceFeeAmount: 0,
        totalAmount: 0,
        totalItems: 0,
      },
    })

    expect(result).toBeNull()
    expect(cache.set).not.toHaveBeenCalled()
    expect(prisma.telegramAccount.findMany).not.toHaveBeenCalled()
  })
})
