import { buildOperationsLiveSnapshot } from '../src/modules/operations/operations-live-snapshot.builder'

describe('buildOperationsLiveSnapshot', () => {
  it('inclui comandas abertas fora da data de negócio no snapshot live', async () => {
    const oldOpenComanda = {
      id: 'comanda-old-open',
      companyOwnerId: 'owner-1',
      cashSessionId: null,
      mesaId: null,
      currentEmployeeId: 'employee-1',
      tableLabel: 'Mesa 4',
      customerName: 'Cliente antigo',
      customerDocument: null,
      participantCount: 2,
      status: 'OPEN',
      subtotalAmount: 32,
      discountAmount: 0,
      serviceFeeAmount: 0,
      totalAmount: 32,
      notes: null,
      openedAt: new Date('2026-05-04T23:10:00.000Z'),
      closedAt: null,
      items: [],
      payments: [],
    }

    const prisma = {
      employee: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'employee-1', employeeCode: 'E01', displayName: 'Marina', active: true }]),
      },
      cashSession: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      cashClosure: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      mesa: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      comanda: {
        findMany: jest.fn().mockResolvedValueOnce([oldOpenComanda]).mockResolvedValueOnce([]),
      },
    }

    const cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    }

    const snapshot = await buildOperationsLiveSnapshot({
      prisma: prisma as never,
      cache: cache as never,
      workspaceOwnerUserId: 'owner-1',
      businessDate: new Date('2026-05-05T00:00:00.000Z'),
      options: {
        compactMode: false,
        includeCashMovements: false,
      },
    })

    expect(prisma.comanda.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          companyOwnerId: 'owner-1',
          status: expect.objectContaining({ in: expect.arrayContaining(['OPEN', 'IN_PREPARATION', 'READY']) }),
        }),
      }),
    )
    expect(prisma.comanda.findMany.mock.calls[0]?.[0]?.where).not.toHaveProperty('openedAt')
    expect(snapshot.employees[0]?.comandas).toHaveLength(1)
    expect(snapshot.employees[0]?.comandas[0]?.id).toBe('comanda-old-open')
  })
})
