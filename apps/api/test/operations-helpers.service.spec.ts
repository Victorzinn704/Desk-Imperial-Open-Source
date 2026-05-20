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
    it('consulta comandas abertas em onda única por status para eliminar round-trip sequencial e incluir abertas fora da data', async () => {
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
      // Query principal da lista operacional: comandas abertas globais por status.
      expect(mockPrisma.comanda.findMany).toHaveBeenNthCalledWith(1, {
        where: {
          companyOwnerId: 'owner-1',
          status: {
            in: ['OPEN', 'IN_PREPARATION', 'READY'],
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
      // Query mínima separada para ocupação real das mesas, independente da janela do dia.
      expect(mockPrisma.comanda.findMany).toHaveBeenNthCalledWith(2, {
        where: {
          companyOwnerId: 'owner-1',
          mesaId: {
            not: null,
          },
          status: {
            in: ['OPEN', 'IN_PREPARATION', 'READY'],
          },
        },
        select: {
          id: true,
          mesaId: true,
          currentEmployeeId: true,
          status: true,
        },
      })
      expect(response.unassigned.cashSession).toBeNull()
      expect(mockCache.set).toHaveBeenCalledWith(
        'operations:live:owner-1:2026-03-30:compact:workspace:compact',
        response,
        30,
      )
    })

    it('mantém a ocupação global das mesas mesmo quando o snapshot do staff é escopado por funcionário', async () => {
      const businessDate = new Date(2026, 2, 30)

      mockPrisma.employee.findMany.mockResolvedValue([
        {
          id: 'emp-1',
          employeeCode: 'E01',
          displayName: 'Marina',
          active: true,
        },
      ])
      mockPrisma.cashSession.findMany.mockResolvedValue([])
      mockPrisma.cashClosure.findUnique.mockResolvedValue(null)
      mockPrisma.mesa.findMany.mockResolvedValue([
        {
          id: 'mesa-1',
          label: 'Mesa 1',
          capacity: 4,
          section: null,
          positionX: null,
          positionY: null,
          active: true,
          reservedUntil: null,
        },
      ])
      mockPrisma.comanda.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
        {
          id: 'comanda-outra-equipe',
          mesaId: 'mesa-1',
          currentEmployeeId: 'emp-2',
          status: 'OPEN',
        },
      ])

      const response = await service.buildLiveSnapshot('owner-1', businessDate, 'emp-1', {
        compactMode: true,
      })

      expect(response.employees[0]?.comandas).toEqual([])
      expect(response.mesas[0]).toEqual(
        expect.objectContaining({
          id: 'mesa-1',
          status: 'ocupada',
          comandaId: 'comanda-outra-equipe',
          currentEmployeeId: 'emp-2',
        }),
      )
    })

    it('snapshot operacional do STAFF mostra comandas abertas globais e historico apenas do proprio atendimento', async () => {
      const businessDate = new Date(2026, 2, 30)
      const baseSnapshot = {
        businessDate: '2026-03-30',
        companyOwnerId: 'owner-1',
        closure: {
          status: 'OPEN',
          expectedCashAmount: 200,
          countedCashAmount: null,
          differenceAmount: null,
          grossRevenueAmount: 500,
          realizedProfitAmount: 120,
          openSessionsCount: 2,
          openComandasCount: 3,
        },
        employees: [
          {
            employeeId: 'emp-1',
            employeeCode: 'E01',
            displayName: 'Marina',
            active: true,
            cashSession: { id: 'cash-1' },
            comandas: [
              { id: 'own-open', currentEmployeeId: 'emp-1', status: 'OPEN', totalAmount: 30 },
              { id: 'own-closed', currentEmployeeId: 'emp-1', status: 'CLOSED', totalAmount: 90 },
            ],
          },
          {
            employeeId: 'emp-2',
            employeeCode: 'E02',
            displayName: 'Paulo',
            active: true,
            cashSession: { id: 'cash-2' },
            comandas: [
              { id: 'other-open', currentEmployeeId: 'emp-2', status: 'READY', totalAmount: 44 },
              { id: 'other-closed', currentEmployeeId: 'emp-2', status: 'CLOSED', totalAmount: 120 },
            ],
          },
        ],
        unassigned: {
          employeeId: null,
          employeeCode: null,
          displayName: 'Operacao de balcao',
          active: true,
          cashSession: { id: 'cash-owner' },
          comandas: [
            { id: 'owner-open', currentEmployeeId: null, status: 'IN_PREPARATION', totalAmount: 55 },
            { id: 'owner-closed', currentEmployeeId: null, status: 'CLOSED', totalAmount: 70 },
          ],
        },
        mesas: [],
      }
      const liveSpy = jest.spyOn(service, 'buildLiveSnapshot').mockResolvedValue(baseSnapshot as never)

      const response = await service.buildStaffOperationalSnapshot('owner-1', businessDate, 'emp-1', {
        compactMode: true,
      })

      expect(liveSpy).toHaveBeenCalledWith('owner-1', businessDate, null, {
        compactMode: true,
        includeCashMovements: false,
      })
      expect(response.closure).toBeNull()
      expect(response.employees[0]?.cashSession).toEqual({ id: 'cash-1' })
      expect(response.employees[1]?.cashSession).toBeNull()
      expect(response.employees[0]?.comandas.map((comanda) => comanda.id)).toEqual(['own-open', 'own-closed'])
      expect(response.employees[1]?.comandas.map((comanda) => comanda.id)).toEqual(['other-open'])
      expect(response.unassigned.comandas.map((comanda) => comanda.id)).toEqual(['owner-open'])
    })

    it('inclui comandas abertas antes da meia-noite no snapshot do dia seguinte porque o filtro principal usa status aberto', async () => {
      const today = new Date(2026, 2, 31)
      const overnightOpenComanda = {
        id: 'comanda-overnight',
        companyOwnerId: 'owner-1',
        cashSessionId: 'session-today',
        mesaId: null,
        currentEmployeeId: null,
        tableLabel: 'Mesa 7',
        customerName: 'Cliente madrugada',
        customerDocument: null,
        participantCount: 2,
        status: 'OPEN',
        subtotalAmount: 40,
        discountAmount: 0,
        serviceFeeAmount: 0,
        totalAmount: 40,
        notes: null,
        openedAt: new Date('2026-03-30T23:58:00.000Z'),
        closedAt: null,
      }

      mockPrisma.employee.findMany.mockResolvedValue([])
      mockPrisma.cashSession.findMany.mockResolvedValue([{ id: 'session-today' }])
      mockPrisma.cashClosure.findUnique.mockResolvedValue(null)
      mockPrisma.mesa.findMany.mockResolvedValue([])
      mockPrisma.comanda.findMany.mockResolvedValueOnce([overnightOpenComanda]).mockResolvedValueOnce([])

      const snapshot = await service.buildLiveSnapshot('owner-1', today, null, { compactMode: true })

      expect(mockPrisma.comanda.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: expect.objectContaining({
            companyOwnerId: 'owner-1',
            status: expect.objectContaining({
              in: ['OPEN', 'IN_PREPARATION', 'READY'],
            }),
          }),
        }),
      )
      const callArg = mockPrisma.comanda.findMany.mock.calls[0][0]
      expect(callArg.where).not.toHaveProperty('openedAt')
      expect(snapshot.unassigned.comandas[0]?.id).toBe('comanda-overnight')
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
