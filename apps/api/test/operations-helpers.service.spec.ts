import { KitchenItemStatus } from '@prisma/client'
import { CacheService } from '../src/common/services/cache.service'
import type { PrismaService } from '../src/database/prisma.service'
import { OperationsHelpersService } from '../src/modules/operations/operations-helpers.service'

const mockPrisma = {
  comandaItem: {
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
  comanda: {
    findMany: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  cashClosure: {
    findUnique: jest.fn(),
  },
  cashSession: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  employee: {
    findMany: jest.fn(),
  },
  mesa: {
    findMany: jest.fn(),
  },
}

const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
}

describe('OperationsHelpersService', () => {
  let service: OperationsHelpersService

  beforeEach(() => {
    jest.clearAllMocks()
    mockCache.get.mockResolvedValue(null)
    mockCache.set.mockResolvedValue(undefined)
    service = new OperationsHelpersService(mockPrisma as unknown as PrismaService, mockCache as unknown as CacheService)
  })

  describe('buildLiveSnapshot', () => {
    it('consulta todas as comandas do dia em onda única pelo openedAt para eliminar round-trip sequencial', async () => {
      const businessDate = new Date(2026, 2, 30)

      mockPrisma.employee.findMany.mockResolvedValue([])
      mockPrisma.cashSession.findMany.mockResolvedValue([
        {
          id: 'session-1',
          companyOwnerId: 'owner-1',
          employeeId: null,
          status: 'OPEN',
          businessDate,
          openingCashAmount: 100,
          countedCashAmount: null,
          expectedCashAmount: 100,
          differenceAmount: null,
          grossRevenueAmount: 0,
          realizedProfitAmount: 0,
          notes: null,
          openedAt: new Date('2026-03-30T10:00:00.000Z'),
          closedAt: null,
        },
      ])
      mockPrisma.comanda.findMany.mockResolvedValue([])
      mockPrisma.cashClosure.findUnique.mockResolvedValue(null)
      mockPrisma.mesa.findMany.mockResolvedValue([])

      const response = await service.buildLiveSnapshot('owner-1', businessDate, null, {
        includeCashMovements: false,
        compactMode: true,
      })

      expect(mockPrisma.cashSession.findMany).toHaveBeenCalledWith({
        where: {
          companyOwnerId: 'owner-1',
          businessDate,
        },
        select: {
          id: true,
        },
        orderBy: {
          openedAt: 'desc',
        },
      })
      // Uma única query pelo business date window — sem segunda onda sequencial
      expect(mockPrisma.comanda.findMany).toHaveBeenCalledTimes(1)
      expect(mockPrisma.comanda.findMany).toHaveBeenCalledWith({
        where: {
          companyOwnerId: 'owner-1',
          openedAt: {
            gte: new Date(2026, 2, 30, 0, 0, 0, 0),
            lt: new Date(2026, 2, 31, 0, 0, 0, 0),
          },
        },
        select: expect.objectContaining({
          id: true,
          status: true,
          totalAmount: true,
        }),
        orderBy: {
          openedAt: 'asc',
        },
      })
      expect(response.unassigned.cashSession).toBeNull()
      expect(mockCache.set).toHaveBeenCalledWith(
        'operations:live:owner-1:2026-03-30:compact:workspace:compact',
        response,
        20,
      )
    })
  })

  describe('buildKitchenView', () => {
    it('monta a fila da cozinha com query direta sem reconstruir snapshot completo', async () => {
      const snapshotSpy = jest.spyOn(service, 'buildLiveSnapshot')
      mockPrisma.comandaItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          comandaId: 'comanda-1',
          productName: 'Pizza',
          quantity: 2,
          notes: 'Sem cebola',
          kitchenStatus: KitchenItemStatus.QUEUED,
          kitchenQueuedAt: new Date('2026-03-30T12:00:00.000Z'),
          kitchenReadyAt: null,
          comanda: {
            tableLabel: '04',
            currentEmployeeId: 'emp-1',
            currentEmployee: { displayName: 'João' },
          },
        },
        {
          id: 'item-2',
          comandaId: 'comanda-2',
          productName: 'Suco',
          quantity: 1,
          notes: null,
          kitchenStatus: KitchenItemStatus.READY,
          kitchenQueuedAt: new Date('2026-03-30T12:05:00.000Z'),
          kitchenReadyAt: new Date('2026-03-30T12:10:00.000Z'),
          comanda: {
            tableLabel: 'Balcão',
            currentEmployeeId: null,
            currentEmployee: null,
          },
        },
      ])

      const response = await service.buildKitchenView('owner-1', new Date(2026, 2, 30))

      expect(snapshotSpy).not.toHaveBeenCalled()
      expect(mockPrisma.comandaItem.findMany).toHaveBeenCalled()
      expect(response.businessDate).toBe('2026-03-30')
      expect(response.statusCounts).toEqual({ queued: 1, inPreparation: 0, ready: 1 })
      expect(response.items).toEqual([
        {
          itemId: 'item-1',
          comandaId: 'comanda-1',
          mesaLabel: '04',
          employeeId: 'emp-1',
          employeeName: 'João',
          productName: 'Pizza',
          quantity: 2,
          notes: 'Sem cebola',
          kitchenStatus: 'QUEUED',
          kitchenQueuedAt: '2026-03-30T12:00:00.000Z',
          kitchenReadyAt: null,
        },
        {
          itemId: 'item-2',
          comandaId: 'comanda-2',
          mesaLabel: 'Balcão',
          employeeId: null,
          employeeName: 'Operacao de balcao',
          productName: 'Suco',
          quantity: 1,
          notes: null,
          kitchenStatus: 'READY',
          kitchenQueuedAt: '2026-03-30T12:05:00.000Z',
          kitchenReadyAt: '2026-03-30T12:10:00.000Z',
        },
      ])
      expect(mockCache.set).toHaveBeenCalledWith('operations:kitchen:owner-1:2026-03-30:workspace', response, 20)
    })
  })

  describe('buildSummaryView', () => {
    it('agrega KPIs e rankings com queries diretas sem snapshot completo', async () => {
      const snapshotSpy = jest.spyOn(service, 'buildLiveSnapshot')
      mockPrisma.cashClosure.findUnique.mockResolvedValue(null)
      mockPrisma.comanda.aggregate.mockResolvedValue({
        _sum: { totalAmount: 120 },
        _count: { _all: 2 },
      })
      mockPrisma.cashSession.count.mockResolvedValue(1)
      mockPrisma.comanda.groupBy.mockResolvedValue([
        { currentEmployeeId: 'emp-1', _sum: { totalAmount: 80 }, _count: { _all: 2 } },
        { currentEmployeeId: null, _sum: { totalAmount: 40 }, _count: { _all: 1 } },
      ])
      mockPrisma.comandaItem.groupBy.mockResolvedValue([
        { productName: 'Pizza', _sum: { quantity: 3, totalAmount: 75 } },
        { productName: 'Suco', _sum: { quantity: 2, totalAmount: 30 } },
      ])
      mockPrisma.employee.findMany.mockResolvedValue([{ id: 'emp-1', displayName: 'João' }])

      const response = await service.buildSummaryView('owner-1', new Date(2026, 2, 30))

      expect(snapshotSpy).not.toHaveBeenCalled()
      expect(mockPrisma.comanda.aggregate).toHaveBeenCalled()
      expect(mockPrisma.comanda.groupBy).toHaveBeenCalled()
      expect(mockPrisma.comandaItem.groupBy).toHaveBeenCalled()
      expect(response).toEqual({
        businessDate: '2026-03-30',
        companyOwnerId: 'owner-1',
        kpis: {
          receitaRealizada: 0,
          faturamentoAberto: 120,
          projecaoTotal: 120,
          lucroRealizado: 0,
          lucroEsperado: 120,
          caixaEsperado: 0,
          openComandasCount: 2,
          openSessionsCount: 1,
        },
        performers: [
          { nome: 'João', valor: 80, comandas: 2 },
          { nome: 'Operacao de balcao', valor: 40, comandas: 1 },
        ],
        topProducts: [
          { nome: 'Pizza', qtd: 3, valor: 75 },
          { nome: 'Suco', qtd: 2, valor: 30 },
        ],
      })
      expect(mockCache.set).toHaveBeenCalledWith('operations:summary:owner-1:2026-03-30:workspace', response, 20)
    })
  })
})
