import { BadRequestException, HttpException } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import type { PrismaService } from '../src/database/prisma.service'
import { DemoAccessService } from '../src/modules/auth/demo-access.service'

describe('DemoAccessService', () => {
  const configValues: Record<string, string | undefined> = {
    DEMO_ACCOUNT_EMAIL: 'demo@deskimperial.online',
    DEMO_DAILY_LIMIT_MINUTES: '20',
  }

  const prisma = {
    demoAccessGrant: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  }

  const configService = {
    get: jest.fn((key: string) => configValues[key]),
  }

  const service = new DemoAccessService(prisma as unknown as PrismaService, configService as unknown as ConfigService)

  beforeEach(() => {
    jest.clearAllMocks()
    configValues.DEMO_DAILY_LIMIT_MINUTES = '20'
  })

  it('identifica conta demo sem sensibilidade a caixa e espacos', () => {
    expect(service.isDemoAccount('  DEMO@deskimperial.online ')).toBe(true)
    expect(service.isDemoAccount('owner@empresa.com')).toBe(false)
  })

  it('retorna null para contas nao demo ao reservar janela', async () => {
    const result = await service.reserveWindow({
      email: 'owner@empresa.com',
      ipAddress: '127.0.0.1',
      userAgent: 'Jest',
      sessionTtlMs: 30 * 60 * 1000,
    })

    expect(result).toBeNull()
    expect(prisma.demoAccessGrant.findMany).not.toHaveBeenCalled()
  })

  it('falha quando nao ha IP valido para conta demo', async () => {
    await expect(
      service.reserveWindow({
        email: 'demo@deskimperial.online',
        ipAddress: '   ',
        userAgent: 'Jest',
        sessionTtlMs: 30 * 60 * 1000,
      }),
    ).rejects.toThrow(BadRequestException)
  })

  it('bloqueia quando o limite diario ja foi consumido', async () => {
    prisma.demoAccessGrant.findMany.mockResolvedValue([
      {
        startedAt: new Date('2026-04-01T10:00:00.000Z'),
        expiresAt: new Date('2026-04-01T10:20:00.000Z'),
        endedAt: null,
      },
    ])

    await expect(
      service.reserveWindow({
        email: 'demo@deskimperial.online',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest',
        sessionTtlMs: 60 * 60 * 1000,
      }),
    ).rejects.toThrow(HttpException)
  })

  it('reserva janela limitada ao menor valor entre ttl e saldo diario', async () => {
    prisma.demoAccessGrant.findMany.mockResolvedValue([
      {
        startedAt: new Date('2026-04-01T09:00:00.000Z'),
        expiresAt: new Date('2026-04-01T09:05:00.000Z'),
        endedAt: null,
      },
    ])

    const result = await service.reserveWindow({
      email: 'demo@deskimperial.online',
      ipAddress: '::ffff:192.168.0.2',
      userAgent: 'Mozilla Test Agent',
      sessionTtlMs: 5 * 60 * 1000,
    })

    expect(result).not.toBeNull()
    expect(result?.dailyLimitMinutes).toBe(20)
    expect(result?.remainingSeconds).toBe(300)
    expect(result?.ipHash).toHaveLength(64)
  })

  it('anexa grant da reserva no banco', async () => {
    prisma.demoAccessGrant.create.mockResolvedValue({})

    await service.attachGrant({
      userId: 'user-1',
      sessionId: 'session-1',
      reservation: {
        dailyLimitMinutes: 20,
        dayKey: '2026-04-01',
        expiresAt: new Date('2026-04-01T10:30:00.000Z'),
        ipHash: 'hash-1',
        remainingSeconds: 300,
      },
    })

    expect(prisma.demoAccessGrant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-1', sessionId: 'session-1', dayKey: '2026-04-01' }),
      }),
    )
  })

  it('encerra grant da sessao com clamp de horario', async () => {
    prisma.demoAccessGrant.findUnique.mockResolvedValue({
      sessionId: 'session-1',
      startedAt: new Date('2026-04-01T10:00:00.000Z'),
      expiresAt: new Date('2026-04-01T10:20:00.000Z'),
      endedAt: null,
    })

    await service.closeGrantForSession('session-1', new Date('2026-04-01T11:00:00.000Z'))

    expect(prisma.demoAccessGrant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId: 'session-1' },
        data: { endedAt: new Date('2026-04-01T10:20:00.000Z') },
      }),
    )
  })

  it('encerra todos os grants em aberto do usuario', async () => {
    prisma.demoAccessGrant.findMany.mockResolvedValue([{ sessionId: 's-1' }, { sessionId: 's-2' }])
    prisma.demoAccessGrant.findUnique
      .mockResolvedValueOnce({
        sessionId: 's-1',
        startedAt: new Date('2026-04-01T10:00:00.000Z'),
        expiresAt: new Date('2026-04-01T10:10:00.000Z'),
        endedAt: null,
      })
      .mockResolvedValueOnce({
        sessionId: 's-2',
        startedAt: new Date('2026-04-01T10:00:00.000Z'),
        expiresAt: new Date('2026-04-01T10:10:00.000Z'),
        endedAt: null,
      })

    await service.closeGrantsForUser('user-1', new Date('2026-04-01T10:05:00.000Z'))

    expect(prisma.demoAccessGrant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', endedAt: null } }),
    )
    expect(prisma.demoAccessGrant.update).toHaveBeenCalledTimes(2)
  })

  it('retorna evaluationAccess apenas para conta demo', () => {
    const demoAccess = service.buildEvaluationAccess('demo@deskimperial.online', new Date(Date.now() + 60_000))
    const normalAccess = service.buildEvaluationAccess('owner@empresa.com', new Date(Date.now() + 60_000))

    expect(demoAccess).not.toBeNull()
    expect(demoAccess?.dailyLimitMinutes).toBe(20)
    expect(typeof demoAccess?.remainingSeconds).toBe('number')
    expect(normalAccess).toBeNull()
  })

  it('mantem demo sem cronometro quando o limite diario esta desativado', async () => {
    configValues.DEMO_DAILY_LIMIT_MINUTES = '0'

    const reservation = await service.reserveWindow({
      email: 'demo@deskimperial.online',
      ipAddress: '   ',
      userAgent: 'Jest',
      sessionTtlMs: 30 * 60 * 1000,
    })
    const evaluationAccess = service.buildEvaluationAccess('demo@deskimperial.online', new Date(Date.now() + 60_000))

    expect(reservation).toBeNull()
    expect(evaluationAccess).toBeNull()
    expect(prisma.demoAccessGrant.findMany).not.toHaveBeenCalled()
  })
})
