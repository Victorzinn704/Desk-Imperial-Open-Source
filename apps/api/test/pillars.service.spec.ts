import { ForbiddenException } from '@nestjs/common'
import { CurrencyCode } from '@prisma/client'
import type { PrismaService } from '../src/database/prisma.service'
import type { CurrencyService } from '../src/modules/currency/currency.service'
import type { CacheService } from '../src/common/services/cache.service'
import { PillarsService } from '../src/modules/finance/pillars.service'
import { makeOwnerAuthContext, makeStaffAuthContext } from './helpers/auth-context.factory'

describe('PillarsService', () => {
  const prisma = {
    order: {
      findMany: jest.fn(),
    },
  }

  const currencyService = {
    getSnapshot: jest.fn(async () => ({
      base: CurrencyCode.BRL,
      timestamp: new Date().toISOString(),
      rates: {},
    })),
    convert: jest.fn((amount: number) => amount),
  }

  const cacheService = {
    get: jest.fn(async () => null),
    set: jest.fn(async () => undefined),
    del: jest.fn(async () => undefined),
  }

  const service = new PillarsService(
    prisma as unknown as PrismaService,
    currencyService as unknown as CurrencyService,
    cacheService as unknown as CacheService,
  )

  function makeOrder(params: { createdAt: Date; revenue: number; profit: number; currency?: CurrencyCode }) {
    return {
      createdAt: params.createdAt,
      totalRevenue: params.revenue,
      totalProfit: params.profit,
      currency: params.currency ?? CurrencyCode.BRL,
    } as any
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 3, 1, 18, 0, 0))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('bloqueia acesso para STAFF', async () => {
    await expect(service.getPillarsForUser(makeStaffAuthContext())).rejects.toThrow(ForbiddenException)
  })

  it('calcula indicadores de semana, mes e evento com variacao percentual', async () => {
    const now = new Date(2026, 3, 1, 18, 0, 0)
    const currentWeekOrderEvent = makeOrder({
      createdAt: new Date(2026, 2, 29, 18, 30, 0),
      revenue: 100,
      profit: 30,
    })
    const currentWeekOrderNormal = makeOrder({
      createdAt: new Date(2026, 3, 1, 12, 0, 0),
      revenue: 200,
      profit: 70,
    })
    const previousWeekOrder = makeOrder({
      createdAt: new Date(2026, 2, 24, 12, 0, 0),
      revenue: 150,
      profit: 40,
    })
    const previousMonthOrder = makeOrder({
      createdAt: new Date(2026, 2, 15, 12, 0, 0),
      revenue: 80,
      profit: 20,
    })

    prisma.order.findMany
      .mockResolvedValueOnce([currentWeekOrderEvent, currentWeekOrderNormal])
      .mockResolvedValueOnce([previousWeekOrder])
      .mockResolvedValueOnce([currentWeekOrderEvent, currentWeekOrderNormal])
      .mockResolvedValueOnce([previousMonthOrder])

    const result = await service.getPillarsForUser(makeOwnerAuthContext({ preferredCurrency: CurrencyCode.BRL }))

    expect(result.weeklyRevenue.value).toBe(300)
    expect(result.weeklyRevenue.previousValue).toBe(150)
    expect(result.weeklyRevenue.changePercent).toBe(100)

    expect(result.monthlyRevenue.value).toBe(300)
    expect(result.monthlyRevenue.previousValue).toBe(80)
    expect(result.monthlyRevenue.changePercent).toBe(275)

    expect(result.profit.value).toBe(100)
    expect(result.eventRevenue.value).toBe(100)
    expect(result.normalRevenue.value).toBe(200)

    expect(result.weeklyRevenue.trend).toHaveLength(7)
    expect(result.monthlyRevenue.trend).toHaveLength(7)
    expect(result.profit.trend).toHaveLength(7)
    expect(result.eventRevenue.trend).toHaveLength(7)
    expect(result.normalRevenue.trend).toHaveLength(7)

    expect(currencyService.getSnapshot).toHaveBeenCalledTimes(1)
    expect(currencyService.convert).toHaveBeenCalled()
    expect(now.getFullYear()).toBe(2026)
  })

  it('mantem changePercent zero quando periodo anterior e vazio', async () => {
    const currentWeekOrder = makeOrder({
      createdAt: new Date(2026, 3, 1, 10, 0, 0),
      revenue: 50,
      profit: 15,
    })

    prisma.order.findMany
      .mockResolvedValueOnce([currentWeekOrder])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([currentWeekOrder])
      .mockResolvedValueOnce([])

    const result = await service.getPillarsForUser(makeOwnerAuthContext())

    expect(result.weeklyRevenue.previousValue).toBe(0)
    expect(result.weeklyRevenue.changePercent).toBe(0)
    expect(result.monthlyRevenue.previousValue).toBe(0)
    expect(result.monthlyRevenue.changePercent).toBe(0)
  })
})
