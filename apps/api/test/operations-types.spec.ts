import {
  buildEmployeeOperationsRecord,
  toCashMovementRecord,
  toClosureRecord,
  toComandaRecord,
  toMesaRecord,
} from '../src/modules/operations/operations.types'

// ── Record builders ──────────────────────────────────────────────────────────

describe('toMesaRecord', () => {
  const baseMesa = {
    id: 'mesa-1',
    label: 'Mesa 1',
    capacity: 4,
    section: 'salao',
    positionX: 10,
    positionY: 20,
    active: true,
    reservedUntil: null,
  }

  it('returns livre when no open comandas', () => {
    const record = toMesaRecord(baseMesa, null)
    expect(record.status).toBe('livre')
    expect(record.comandaId).toBeNull()
    expect(record.currentEmployeeId).toBeNull()
  })

  it('returns ocupada when has open comanda', () => {
    const comanda = { id: 'com-1', currentEmployeeId: 'emp-1' }
    const record = toMesaRecord(baseMesa, comanda)
    expect(record.status).toBe('ocupada')
    expect(record.comandaId).toBe('com-1')
    expect(record.currentEmployeeId).toBe('emp-1')
  })

  it('returns reservada when reservedUntil is in the future', () => {
    const futureDate = new Date(Date.now() + 3600000)
    const mesa = { ...baseMesa, reservedUntil: futureDate }
    const record = toMesaRecord(mesa, null)
    expect(record.status).toBe('reservada')
  })

  it('returns livre when reservation expired', () => {
    const pastDate = new Date(Date.now() - 3600000)
    const mesa = { ...baseMesa, reservedUntil: pastDate }
    const record = toMesaRecord(mesa, null)
    expect(record.status).toBe('livre')
  })

  it('maps all fields correctly', () => {
    const record = toMesaRecord(baseMesa, null)
    expect(record.id).toBe('mesa-1')
    expect(record.label).toBe('Mesa 1')
    expect(record.capacity).toBe(4)
    expect(record.section).toBe('salao')
    expect(record.positionX).toBe(10)
    expect(record.positionY).toBe(20)
    expect(record.active).toBe(true)
  })
})

describe('toComandaRecord', () => {
  it('maps comanda with items', () => {
    const comanda = {
      id: 'com-1',
      companyOwnerId: 'owner-1',
      cashSessionId: 'cs-1',
      mesaId: 'mesa-1',
      currentEmployeeId: 'emp-1',
      tableLabel: 'Mesa 1',
      customerName: 'Joao',
      customerDocument: '52998224725',
      participantCount: 2,
      status: 'OPEN' as const,
      subtotalAmount: { toNumber: () => 50 },
      discountAmount: { toNumber: () => 5 },
      serviceFeeAmount: { toNumber: () => 0 },
      totalAmount: { toNumber: () => 45 },
      notes: null,
      openedAt: new Date('2026-03-26T00:00:00Z'),
      closedAt: null,
      payments: [
        {
          id: 'pay-1',
          method: 'PIX',
          amount: { toNumber: () => 20 },
          note: null,
          status: 'CONFIRMED',
          paidAt: new Date('2026-03-26T00:10:00Z'),
        },
      ],
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Cerveja',
          quantity: 2,
          unitPrice: { toNumber: () => 10 },
          totalAmount: { toNumber: () => 20 },
          notes: null,
        },
      ],
    }

    const record = toComandaRecord(comanda as any)
    expect(record.id).toBe('com-1')
    expect(record.subtotalAmount).toBe(50)
    expect(record.discountAmount).toBe(5)
    expect(record.totalAmount).toBe(45)
    expect(record.paidAmount).toBe(20)
    expect(record.remainingAmount).toBe(25)
    expect(record.paymentStatus).toBe('PARTIAL')
    expect(record.payments).toHaveLength(1)
    expect(record.items).toHaveLength(1)
    const firstItem = record.items[0]
    expect(firstItem).toBeDefined()
    expect(firstItem?.productName).toBe('Cerveja')
    expect(firstItem?.quantity).toBe(2)
  })

  it('handles null numeric values', () => {
    const comanda = {
      id: 'com-2',
      companyOwnerId: 'owner-1',
      cashSessionId: null,
      mesaId: null,
      currentEmployeeId: null,
      tableLabel: 'Balcão',
      customerName: null,
      customerDocument: null,
      participantCount: 1,
      status: 'OPEN' as const,
      subtotalAmount: { toNumber: () => 0 },
      discountAmount: { toNumber: () => 0 },
      serviceFeeAmount: { toNumber: () => 0 },
      totalAmount: { toNumber: () => 0 },
      notes: null,
      openedAt: new Date(),
      closedAt: null,
      items: [],
    }

    const record = toComandaRecord(comanda as any)
    expect(record.subtotalAmount).toBe(0)
    expect(record.customerName).toBeNull()
    expect(record.items).toHaveLength(0)
  })
})

describe('toCashMovementRecord', () => {
  it('maps movement correctly', () => {
    const movement = {
      id: 'mov-1',
      cashSessionId: 'cs-1',
      employeeId: 'emp-1',
      type: 'SUPPLY' as const,
      amount: { toNumber: () => 100 },
      note: 'Troco inicial',
      createdAt: new Date('2026-03-26T00:00:00Z'),
    }

    const record = toCashMovementRecord(movement as any)
    expect(record.id).toBe('mov-1')
    expect(record.amount).toBe(100)
    expect(record.type).toBe('SUPPLY')
    expect(record.note).toBe('Troco inicial')
  })
})

describe('buildEmployeeOperationsRecord', () => {
  const employee = { id: 'emp-1', employeeCode: 'E001', displayName: 'Maria', active: true }

  it('counts open and closed tables', () => {
    const comandas = [{ status: 'OPEN' }, { status: 'IN_PREPARATION' }, { status: 'CLOSED' }, { status: 'READY' }].map(
      (c, i) => ({
        id: `com-${i}`,
        companyOwnerId: 'owner-1',
        cashSessionId: null,
        mesaId: null,
        currentEmployeeId: 'emp-1',
        tableLabel: `T${i}`,
        customerName: null,
        customerDocument: null,
        participantCount: 1,
        status: c.status as any,
        subtotalAmount: { toNumber: () => 0 },
        discountAmount: { toNumber: () => 0 },
        serviceFeeAmount: { toNumber: () => 0 },
        totalAmount: { toNumber: () => 0 },
        notes: null,
        openedAt: new Date(),
        closedAt: null,
        items: [],
      }),
    )

    const record = buildEmployeeOperationsRecord({ employee, cashSession: null, comandas: comandas as any })
    expect(record.comandas.length).toBe(4)
    expect(record.comandas.filter((c) => c.status === 'OPEN').length).toBe(1)
  })

  it('uses default name when no employee', () => {
    const record = buildEmployeeOperationsRecord({ employee: null, cashSession: null, comandas: [] })
    expect(record.employeeId).toBeNull()
    expect(record.displayName).toBe('Operacao sem responsavel')
  })
})

describe('toClosureRecord', () => {
  it('returns null when closure is null', () => {
    expect(toClosureRecord(null)).toBeNull()
  })

  it('maps closure with numeric conversion', () => {
    const closure = {
      status: 'CLOSED' as const,
      expectedCashAmount: { toNumber: () => 500 },
      countedCashAmount: { toNumber: () => 498 },
      differenceAmount: { toNumber: () => -2 },
      grossRevenueAmount: { toNumber: () => 1000 },
      realizedProfitAmount: { toNumber: () => 300 },
      openSessionsCount: 0,
      openComandasCount: 0,
    }

    const record = toClosureRecord(closure as any)
    expect(record).not.toBeNull()
    expect(record!.expectedCashAmount).toBe(500)
    expect(record!.grossRevenueAmount).toBe(1000)
    expect(record!.realizedProfitAmount).toBe(300)
    expect(record!.differenceAmount).toBe(-2)
  })
})
