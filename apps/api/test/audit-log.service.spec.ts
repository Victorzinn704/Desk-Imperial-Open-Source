import { AuditSeverity } from '@prisma/client'
import type { PrismaService } from '../src/database/prisma.service'
import { AuditLogService } from '../src/modules/monitoring/audit-log.service'
import { makeOwnerAuthContext, makeStaffAuthContext } from './helpers/auth-context.factory'

describe('AuditLogService', () => {
  const prisma = {
    auditLog: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  }

  const service = new AuditLogService(prisma as unknown as PrismaService)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('mapeia ultimos logins com parser de user-agent conhecido e desconhecido', async () => {
    prisma.auditLog.findMany.mockResolvedValue([
      {
        id: 'log-1',
        createdAt: new Date('2026-04-01T10:00:00.000Z'),
        ipAddress: '127.0.0.1',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      {
        id: 'log-2',
        createdAt: new Date('2026-04-01T09:00:00.000Z'),
        ipAddress: null,
        userAgent: null,
      },
    ])

    const result = await service.getLastLoginsForUser('owner-1', 5)

    expect(result).toEqual([
      {
        id: 'log-1',
        browser: 'Chrome',
        os: 'Windows',
        ipAddress: '127.0.0.1',
        createdAt: '2026-04-01T10:00:00.000Z',
      },
      {
        id: 'log-2',
        browser: 'Navegador desconhecido',
        os: 'Sistema desconhecido',
        ipAddress: null,
        createdAt: '2026-04-01T09:00:00.000Z',
      },
    ])

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { actorUserId: 'owner-1', event: 'auth.login.succeeded' },
        take: 5,
      }),
    )
  })

  it('traz feed do OWNER com filtro de workspace (owner + staff)', async () => {
    prisma.auditLog.findMany.mockResolvedValue([
      {
        id: 'a1',
        event: 'operations.cash_session.opened',
        resource: 'cash_session',
        resourceId: 'cash-1',
        severity: AuditSeverity.INFO,
        actorUserId: 'owner-1',
        ipAddress: '127.0.0.1',
        createdAt: new Date('2026-04-01T11:00:00.000Z'),
        metadata: { foo: 'bar' },
        actor: {
          id: 'owner-1',
          fullName: 'Owner',
          role: 'OWNER',
        },
      },
    ])

    const auth = makeOwnerAuthContext({ userId: 'owner-1', workspaceOwnerUserId: 'owner-1' })
    const result = await service.getActivityFeedForAuth(auth, 10)

    expect(result).toEqual([
      {
        id: 'a1',
        event: 'operations.cash_session.opened',
        resource: 'cash_session',
        resourceId: 'cash-1',
        severity: AuditSeverity.INFO,
        actorUserId: 'owner-1',
        actorName: 'Owner',
        actorRole: 'OWNER',
        ipAddress: '127.0.0.1',
        createdAt: '2026-04-01T11:00:00.000Z',
        metadata: { foo: 'bar' },
      },
    ])

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { actorUserId: 'owner-1' },
            {
              actor: {
                companyOwnerId: 'owner-1',
              },
            },
          ],
        },
        take: 10,
      }),
    )
  })

  it('traz feed do STAFF restrito ao proprio actorUserId', async () => {
    prisma.auditLog.findMany.mockResolvedValue([])

    const auth = makeStaffAuthContext({ userId: 'staff-1', companyOwnerUserId: 'owner-1' })
    await service.getActivityFeedForAuth(auth, 20)

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { actorUserId: 'staff-1' },
        take: 20,
      }),
    )
  })

  it('record persiste log com severity default INFO', async () => {
    prisma.auditLog.create.mockResolvedValue({ id: 'created-1' })

    await service.record({
      actorUserId: 'owner-1',
      event: 'auth.login.succeeded',
      resource: 'auth',
      metadata: { channel: 'web' },
      ipAddress: '127.0.0.1',
      userAgent: 'Jest',
    })

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorUserId: 'owner-1',
          event: 'auth.login.succeeded',
          resource: 'auth',
          severity: AuditSeverity.INFO,
        }),
      }),
    )
  })

  it('record nao explode quando persistencia falha e faz log de warn/debug', async () => {
    prisma.auditLog.create.mockRejectedValue(new Error('db down'))
    const warnSpy = jest.fn()
    const debugSpy = jest.fn()
    ;(service as any).logger.warn = warnSpy
    ;(service as any).logger.debug = debugSpy

    await expect(
      service.record({
        event: 'operations.cash_session.closed',
        resource: 'cash_session',
      }),
    ).resolves.toBeUndefined()

    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(debugSpy).toHaveBeenCalledTimes(1)
  })
})
