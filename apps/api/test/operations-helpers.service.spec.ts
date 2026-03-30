import { KitchenItemStatus } from '@prisma/client'
import { CacheService } from '../src/common/services/cache.service'
import type { PrismaService } from '../src/database/prisma.service'
import { OperationsHelpersService } from '../src/modules/operations/operations-helpers.service'

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  comandaItem: {
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
  comanda: {
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  cashClosure: {
    findUnique: jest.fn(),
  },
  cashSession: {
    count: jest.fn(),
  },
  employee: {
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

  describe('buildKitchenView', () => {
    it('monta a fila da cozinha com query direta sem reconstruir snapshot completo', async () => {
      const snapshotSpy = jest.spyOn(service, 'buildLiveSnapshot')
      mockPrisma.user.findUnique.mockResolvedValue({ fullName: 'Owner Teste', companyName: 'Desk Imperial' })
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
          employeeName: 'Owner Teste',
          productName: 'Suco',
          quantity: 1,
          notes: null,
          kitchenStatus: 'READY',
          kitchenQueuedAt: '2026-03-30T12:05:00.000Z',
          kitchenReadyAt: '2026-03-30T12:10:00.000Z',
        },
      ])
      expect(mockCache.set).toHaveBeenCalledWith('operations:kitchen:owner-1:2026-03-30:workspace', response, 2)
    })
  })

  describe('buildSummaryView', () => {
    it('agrega KPIs e rankings com queries diretas sem snapshot completo', async () => {
      const snapshotSpy = jest.spyOn(service, 'buildLiveSnapshot')
      mockPrisma.user.findUnique.mockResolvedValue({ fullName: 'Owner Teste', companyName: 'Desk Imperial' })
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
          { nome: 'Owner Teste', valor: 40, comandas: 1 },
        ],
        topProducts: [
          { nome: 'Pizza', qtd: 3, valor: 75 },
          { nome: 'Suco', qtd: 2, valor: 30 },
        ],
      })
      expect(mockCache.set).toHaveBeenCalledWith('operations:summary:owner-1:2026-03-30:workspace', response, 2)
    })
  })
})
