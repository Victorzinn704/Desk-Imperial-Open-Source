import {
  buildEmployeeOperationsRecord,
  toCashSessionRecord,
  toClosureRecord,
  toComandaItemRecord,
  toRealtimeCashSessionRecord,
  toRealtimeComandaRecord,
} from '../src/modules/operations/operations.types'

describe('operations.types realtime and defaults', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-01T12:00:00.000Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('mapeia cash session completa com movimentos e campos opcionais', () => {
    const session = {
      id: 'cash-1',
      companyOwnerId: 'owner-1',
      employeeId: 'emp-1',
      status: 'OPEN',
      businessDate: new Date('2026-04-01T00:00:00.000Z'),
      openingCashAmount: { toNumber: () => 100 },
      countedCashAmount: null,
      expectedCashAmount: 140,
      differenceAmount: null,
      grossRevenueAmount: { toNumber: () => 200 },
      realizedProfitAmount: { toNumber: () => 80 },
      notes: 'turno manha',
      openedAt: new Date('2026-04-01T09:00:00.000Z'),
      closedAt: new Date('2026-04-01T18:00:00.000Z'),
      movements: [
        {
          id: 'm1',
          cashSessionId: 'cash-1',
          employeeId: 'emp-1',
          type: 'SUPPLY',
          amount: 40,
          note: 'reforco',
          createdAt: new Date('2026-04-01T10:00:00.000Z'),
        },
      ],
    }

    const result = toCashSessionRecord(session as any)

    expect(result.closedAt).toBe('2026-04-01T18:00:00.000Z')
    expect(result.openingCashAmount).toBe(100)
    expect(result.expectedCashAmount).toBe(140)
    expect(result.movements[0]).toEqual(
      expect.objectContaining({
        id: 'm1',
        amount: 40,
        note: 'reforco',
      }),
    )
  })

  it('mapeia item de comanda com datas de cozinha e valores numericos', () => {
    const item = {
      id: 'item-1',
      productId: 'prod-1',
      productName: 'Pizza',
      quantity: 2,
      unitPrice: 25,
      totalAmount: { toNumber: () => 50 },
      notes: null,
      kitchenStatus: 'QUEUED',
      kitchenQueuedAt: new Date('2026-04-01T12:05:00.000Z'),
      kitchenReadyAt: null,
    }

    const result = toComandaItemRecord(item as any)

    expect(result).toEqual(
      expect.objectContaining({
        unitPrice: 25,
        totalAmount: 50,
        kitchenQueuedAt: '2026-04-01T12:05:00.000Z',
        kitchenReadyAt: null,
      }),
    )
  })

  it('gera realtime cash session com defaults para campos ausentes', () => {
    const result = toRealtimeCashSessionRecord({
      id: 'cash-rt-1',
      status: 'OPEN',
      openingCashAmount: 100,
      countedCashAmount: null,
      expectedCashAmount: 140,
      differenceAmount: null,
      movements: [
        {
          type: 'SUPPLY',
          amount: 10,
        },
      ],
    } as any)

    expect(result.companyOwnerId).toBe('')
    expect(result.employeeId).toBeNull()
    expect(result.businessDate).toBe('2026-04-01T12:00:00.000Z')
    expect(result.openedAt).toBe('2026-04-01T12:00:00.000Z')
    expect(result.movements[0]).toEqual(
      expect.objectContaining({
        id: 'cash-rt-1-movement-1',
        cashSessionId: 'cash-rt-1',
        employeeId: null,
        note: null,
        createdAt: '2026-04-01T12:00:00.000Z',
      }),
    )
  })

  it('mantem ids e datas informados em realtime cash session', () => {
    const result = toRealtimeCashSessionRecord({
      id: 'cash-rt-2',
      status: 'CLOSED',
      openingCashAmount: { toNumber: () => 50 },
      countedCashAmount: { toNumber: () => 55 },
      expectedCashAmount: 52,
      differenceAmount: 3,
      movements: [
        {
          id: 'mov-custom',
          cashSessionId: 'cash-custom',
          employeeId: 'emp-custom',
          type: 'WITHDRAWAL',
          amount: { toNumber: () => 7 },
          note: 'saida',
          createdAt: new Date('2026-04-01T12:30:00.000Z'),
        },
      ],
      openedAt: new Date('2026-04-01T09:00:00.000Z'),
      closedAt: new Date('2026-04-01T18:00:00.000Z'),
    } as any)

    expect(result.movements[0]).toEqual(
      expect.objectContaining({
        id: 'mov-custom',
        cashSessionId: 'cash-custom',
        employeeId: 'emp-custom',
        amount: 7,
      }),
    )
    expect(result.closedAt).toBe('2026-04-01T18:00:00.000Z')
  })

  it('gera realtime comanda com defaults e status OPEN quando nao fechada', () => {
    const result = toRealtimeComandaRecord({
      id: 'com-rt-1',
      tableLabel: 'Mesa 1',
      currentEmployeeId: null,
      totalAmount: 80,
      closedAt: null,
      items: [],
    } as any)

    expect(result.status).toBe('OPEN')
    expect(result.participantCount).toBe(1)
    expect(result.items).toEqual([])
    expect(result.openedAt).toBe('2026-04-01T12:00:00.000Z')
  })

  it('gera realtime comanda com status CLOSED e defaults de item', () => {
    const result = toRealtimeComandaRecord({
      id: 'com-rt-2',
      tableLabel: 'Mesa 2',
      currentEmployeeId: 'emp-2',
      totalAmount: { toNumber: () => 120 },
      closedAt: new Date('2026-04-01T13:00:00.000Z'),
      items: [
        {
          quantity: 3,
        },
      ],
    } as any)

    expect(result.status).toBe('CLOSED')
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: 'com-rt-2-item-1',
        productName: 'Item',
        productId: null,
        unitPrice: 0,
        totalAmount: 0,
        notes: null,
        kitchenStatus: null,
      }),
    )
  })

  it('buildEmployeeOperationsRecord respeita fallbackDisplayName e active de employee', () => {
    const withoutEmployee = buildEmployeeOperationsRecord({
      employee: null,
      cashSession: null,
      comandas: [],
      fallbackDisplayName: 'Equipe operacional',
    } as any)

    expect(withoutEmployee.displayName).toBe('Equipe operacional')
    expect(withoutEmployee.active).toBe(true)

    const withEmployee = buildEmployeeOperationsRecord({
      employee: {
        id: 'emp-3',
        employeeCode: 'E003',
        displayName: 'Paula',
        active: false,
      },
      cashSession: {
        id: 'cash-3',
        companyOwnerId: 'owner-1',
        employeeId: 'emp-3',
        status: 'OPEN',
        businessDate: new Date('2026-04-01T00:00:00.000Z'),
        openingCashAmount: 10,
        countedCashAmount: null,
        expectedCashAmount: 10,
        differenceAmount: null,
        grossRevenueAmount: 0,
        realizedProfitAmount: 0,
        notes: null,
        openedAt: new Date('2026-04-01T09:00:00.000Z'),
        closedAt: null,
        movements: [],
      },
      comandas: [],
    } as any)

    expect(withEmployee.active).toBe(false)
    expect(withEmployee.cashSession?.id).toBe('cash-3')
  })

  it('toClosureRecord aceita numeros primitivos e nulos', () => {
    const result = toClosureRecord({
      status: 'OPEN',
      expectedCashAmount: 200,
      countedCashAmount: null,
      differenceAmount: null,
      grossRevenueAmount: 300,
      realizedProfitAmount: 120,
      openSessionsCount: 1,
      openComandasCount: 2,
    } as any)

    expect(result).toEqual({
      status: 'OPEN',
      expectedCashAmount: 200,
      countedCashAmount: null,
      differenceAmount: null,
      grossRevenueAmount: 300,
      realizedProfitAmount: 120,
      openSessionsCount: 1,
      openComandasCount: 2,
    })
  })
})
