import type { PrismaService } from '../src/database/prisma.service'
import type { AuthContext } from '../src/modules/auth/auth.types'
import type { AuditLogService } from '../src/modules/monitoring/audit-log.service'
import { NotificationPreferencesService } from '../src/modules/notifications/notification-preferences.service'

describe('NotificationPreferencesService', () => {
  const prisma = {
    notificationPreference: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    userNotificationPreference: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  }

  const auditLogService = {
    record: jest.fn(async () => {}),
  }

  const auth: AuthContext = {
    userId: 'owner-1',
    actorUserId: 'owner-1',
    sessionId: 'session-1',
    role: 'OWNER',
    workspaceOwnerUserId: 'owner-1',
    companyOwnerUserId: null,
    employeeId: null,
    employeeCode: null,
    email: 'owner@deskimperial.online',
    fullName: 'Owner',
    companyName: 'Desk Imperial',
    companyLocation: {
      streetLine1: null,
      streetNumber: null,
      addressComplement: null,
      district: null,
      city: null,
      state: null,
      postalCode: null,
      country: null,
      latitude: null,
      longitude: null,
      precision: 'city' as const,
    },
    workforce: {
      hasEmployees: true,
      employeeCount: 2,
    },
    emailVerified: true,
    preferredCurrency: 'BRL',
    status: 'ACTIVE',
    evaluationAccess: null,
    cookiePreferences: {
      necessary: true,
      analytics: false,
      marketing: false,
    },
  }

  let service: NotificationPreferencesService

  beforeEach(() => {
    jest.clearAllMocks()
    prisma.notificationPreference.findMany.mockResolvedValue([])
    prisma.notificationPreference.findUnique.mockResolvedValue(null)
    prisma.notificationPreference.upsert.mockResolvedValue(undefined)
    prisma.notificationPreference.deleteMany.mockResolvedValue({ count: 0 })
    prisma.userNotificationPreference.findMany.mockResolvedValue([])
    prisma.userNotificationPreference.findUnique.mockResolvedValue(null)
    prisma.userNotificationPreference.upsert.mockResolvedValue(undefined)
    prisma.userNotificationPreference.deleteMany.mockResolvedValue({ count: 0 })
    prisma.$transaction.mockImplementation(async (operations: unknown[]) => Promise.all(operations as Promise<unknown>[]))
    service = new NotificationPreferencesService(
      prisma as unknown as PrismaService,
      auditLogService as unknown as AuditLogService,
    )
  })

  it('returns defaults when workspace has no overrides', async () => {
    const result = await service.listForWorkspace(auth)

    expect(result.preferences).toEqual([
      expect.objectContaining({
        channel: 'TELEGRAM',
        eventType: 'operations.comanda.status_changed',
        enabled: true,
        inherited: true,
      }),
      expect.objectContaining({
        channel: 'TELEGRAM',
        eventType: 'operations.kitchen_item.status_changed',
        enabled: true,
        inherited: true,
      }),
    ])
  })

  it('applies stored overrides when present', async () => {
    prisma.notificationPreference.findMany.mockResolvedValueOnce([
      {
        channel: 'TELEGRAM',
        eventType: 'operations.kitchen_item.status_changed',
        enabled: false,
      },
    ])

    const result = await service.listForWorkspace(auth)

    expect(result.preferences).toEqual([
      expect.objectContaining({
        channel: 'TELEGRAM',
        eventType: 'operations.comanda.status_changed',
        enabled: true,
        inherited: true,
      }),
      expect.objectContaining({
        channel: 'TELEGRAM',
        eventType: 'operations.kitchen_item.status_changed',
        enabled: false,
        inherited: false,
      }),
    ])
  })

  it('upserts preferences and records audit log', async () => {
    prisma.notificationPreference.findMany.mockResolvedValueOnce([
      {
        channel: 'TELEGRAM',
        eventType: 'operations.comanda.status_changed',
        enabled: false,
      },
    ])

    const result = await service.updateForWorkspace(
      auth,
      {
        preferences: [
          {
            channel: 'TELEGRAM',
            eventType: 'operations.comanda.status_changed',
            enabled: false,
          },
          {
            channel: 'TELEGRAM',
            eventType: 'operations.kitchen_item.status_changed',
            enabled: true,
          },
        ],
      },
      {
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
        host: null,
        origin: null,
        referer: null,
      },
    )

    expect(prisma.notificationPreference.upsert).toHaveBeenCalledTimes(1)
    expect(prisma.notificationPreference.deleteMany).toHaveBeenCalledTimes(1)
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'notifications.preferences.updated' }),
    )
    expect(result.preferences).toEqual([
      expect.objectContaining({
        eventType: 'operations.comanda.status_changed',
        enabled: false,
      }),
      expect.objectContaining({
        eventType: 'operations.kitchen_item.status_changed',
        enabled: true,
        inherited: true,
      }),
    ])
  })

  it('returns user defaults when there are no user overrides', async () => {
    const result = await service.listForUser(auth)

    expect(result.preferences).toEqual(
      expect.arrayContaining([
      expect.objectContaining({
        channel: 'WEB_TOAST',
        eventType: 'operations.comanda.status_changed',
        enabled: true,
        inherited: true,
      }),
      expect.objectContaining({
        channel: 'MOBILE_TOAST',
        eventType: 'operations.kitchen_item.status_changed',
        enabled: true,
        inherited: true,
      }),
      ]),
    )
  })

  it('updates user preferences and removes override when restoring default', async () => {
    prisma.userNotificationPreference.findMany
      .mockResolvedValueOnce([
        {
          channel: 'WEB_TOAST',
          eventType: 'operations.comanda.status_changed',
          enabled: false,
        },
      ])
      .mockResolvedValueOnce([])

    const updated = await service.updateForUser(
      auth,
      {
        preferences: [
          {
            channel: 'WEB_TOAST',
            eventType: 'operations.comanda.status_changed',
            enabled: false,
          },
          {
            channel: 'MOBILE_TOAST',
            eventType: 'operations.kitchen_item.status_changed',
            enabled: true,
          },
        ],
      },
      {
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
        host: null,
        origin: null,
        referer: null,
      },
    )

    expect(prisma.userNotificationPreference.upsert).toHaveBeenCalledTimes(1)
    expect(prisma.userNotificationPreference.deleteMany).toHaveBeenCalledTimes(1)
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'notifications.user_preferences.updated' }),
    )
    expect(updated.preferences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          channel: 'WEB_TOAST',
          eventType: 'operations.comanda.status_changed',
          enabled: false,
          inherited: false,
        }),
      ]),
    )

    const restored = await service.updateForUser(
      auth,
      {
        preferences: [
          {
            channel: 'WEB_TOAST',
            eventType: 'operations.comanda.status_changed',
            enabled: true,
          },
        ],
      },
      {
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
        host: null,
        origin: null,
        referer: null,
      },
    )

    expect(prisma.userNotificationPreference.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: auth.userId,
        channel: 'WEB_TOAST',
        eventType: 'operations.comanda.status_changed',
      },
    })
    expect(restored.preferences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          channel: 'WEB_TOAST',
          eventType: 'operations.comanda.status_changed',
          enabled: true,
          inherited: true,
        }),
      ]),
    )
  })
})
