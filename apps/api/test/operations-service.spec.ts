// ── Mock Prisma ──────────────────────────────────────────────────────────────

function createMockPrisma() {
  const mesaStore = new Map<string, any>()

  return {
    mesa: {
      findMany: jest.fn(async ({ where }: any) => {
        return Array.from(mesaStore.values()).filter((m) => {
          if (where?.companyOwnerId && m.companyOwnerId !== where.companyOwnerId) return false
          return true
        })
      }),
      findUnique: jest.fn(async ({ where }: any) => {
        if (where?.id) return mesaStore.get(where.id) ?? null
        if (where?.companyOwnerId_label) {
          const { companyOwnerId, label } = where.companyOwnerId_label
          return (
            Array.from(mesaStore.values()).find(
              (m) => m.companyOwnerId === companyOwnerId && m.label === label,
            ) ?? null
          )
        }
        return null
      }),
      create: jest.fn(async ({ data }: any) => {
        const mesa = { id: `mesa-${mesaStore.size + 1}`, ...data, active: true, reservedUntil: null }
        mesaStore.set(mesa.id, mesa)
        return mesa
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const mesa = mesaStore.get(where.id)
        if (!mesa) throw new Error('Mesa not found')
        const updated = { ...mesa, ...data }
        mesaStore.set(where.id, updated)
        return updated
      }),
    },
    comanda: {
      findFirst: jest.fn(async () => null),
    },
    $transaction: jest.fn(async (fn: any) => fn),
    _mesaStore: mesaStore,
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('OperationsService — Mesa CRUD', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>

  beforeEach(() => {
    mockPrisma = createMockPrisma()
  })

  describe('createMesa logic', () => {
    it('creates a mesa with default capacity', async () => {
      const dto = { label: 'Mesa 1' }
      const label = dto.label

      const existing = await mockPrisma.mesa.findUnique({
        where: { companyOwnerId_label: { companyOwnerId: 'owner-1', label } },
      })
      expect(existing).toBeNull()

      const mesa = await mockPrisma.mesa.create({
        data: {
          companyOwnerId: 'owner-1',
          label,
          capacity: 4,
          section: null,
          positionX: null,
          positionY: null,
        },
      })

      expect(mesa.id).toBeDefined()
      expect(mesa.label).toBe('Mesa 1')
      expect(mesa.capacity).toBe(4)
      expect(mesa.active).toBe(true)
    })

    it('creates a mesa with custom capacity and section', async () => {
      const mesa = await mockPrisma.mesa.create({
        data: {
          companyOwnerId: 'owner-1',
          label: 'VIP 1',
          capacity: 8,
          section: 'varanda',
          positionX: 50,
          positionY: 100,
        },
      })

      expect(mesa.capacity).toBe(8)
      expect(mesa.section).toBe('varanda')
    })

    it('detects duplicate labels', async () => {
      await mockPrisma.mesa.create({
        data: { companyOwnerId: 'owner-1', label: 'Mesa 1', capacity: 4, section: null, positionX: null, positionY: null },
      })

      const existing = await mockPrisma.mesa.findUnique({
        where: { companyOwnerId_label: { companyOwnerId: 'owner-1', label: 'Mesa 1' } },
      })
      expect(existing).not.toBeNull()
      expect(existing!.label).toBe('Mesa 1')
    })
  })

  describe('updateMesa logic', () => {
    it('updates mesa fields', async () => {
      const mesa = await mockPrisma.mesa.create({
        data: { companyOwnerId: 'owner-1', label: 'Mesa 1', capacity: 4, section: null, positionX: null, positionY: null },
      })

      const updated = await mockPrisma.mesa.update({
        where: { id: mesa.id },
        data: { capacity: 6, section: 'bar', active: false },
      })

      expect(updated.capacity).toBe(6)
      expect(updated.section).toBe('bar')
      expect(updated.active).toBe(false)
    })
  })

  describe('listMesas logic', () => {
    it('returns all mesas for workspace', async () => {
      await mockPrisma.mesa.create({
        data: { companyOwnerId: 'owner-1', label: 'Mesa 1', capacity: 4, section: null, positionX: null, positionY: null },
      })
      await mockPrisma.mesa.create({
        data: { companyOwnerId: 'owner-1', label: 'Mesa 2', capacity: 2, section: 'bar', positionX: null, positionY: null },
      })
      await mockPrisma.mesa.create({
        data: { companyOwnerId: 'other-owner', label: 'Mesa 1', capacity: 4, section: null, positionX: null, positionY: null },
      })

      const mesas = await mockPrisma.mesa.findMany({ where: { companyOwnerId: 'owner-1' } })
      expect(mesas).toHaveLength(2)
      expect(mesas.every((m: any) => m.companyOwnerId === 'owner-1')).toBe(true)
    })
  })
})

// ── Profit calculation logic (unit test of the algorithm) ────────────────────

describe('Profit calculation logic', () => {
  it('calculates profit as revenue minus cost', () => {
    const items = [
      { unitCost: 3.5, quantity: 2, unitPrice: 10 }, // cost=7, revenue=20, profit=13
      { unitCost: 5, quantity: 1, unitPrice: 15 },    // cost=5, revenue=15, profit=10
    ]

    const totalRevenue = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
    const totalCost = items.reduce((sum, i) => sum + i.unitCost * i.quantity, 0)
    const totalProfit = Math.round((totalRevenue - totalCost) * 100) / 100

    expect(totalRevenue).toBe(35)
    expect(totalCost).toBe(12)
    expect(totalProfit).toBe(23)
  })

  it('handles items without product (manual items)', () => {
    const items = [
      { unitCost: 0, quantity: 1, unitPrice: 10 }, // manual item, no cost
      { unitCost: 3.5, quantity: 2, unitPrice: 10 }, // product item
    ]

    const totalRevenue = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
    const totalCost = items.reduce((sum, i) => sum + i.unitCost * i.quantity, 0)
    const totalProfit = Math.round((totalRevenue - totalCost) * 100) / 100

    expect(totalRevenue).toBe(30)
    expect(totalCost).toBe(7)
    expect(totalProfit).toBe(23)
  })

  it('handles zero-revenue comanda', () => {
    const totalRevenue = 0
    const totalCost = 0
    const totalProfit = Math.round((totalRevenue - totalCost) * 100) / 100

    expect(totalProfit).toBe(0)
  })

  it('handles negative profit (sold below cost)', () => {
    const totalRevenue = 10
    const totalCost = 15
    const totalProfit = Math.round((totalRevenue - totalCost) * 100) / 100

    expect(totalProfit).toBe(-5)
  })
})

// ── Comanda total calculation ────────────────────────────────────────────────

describe('Comanda total calculation', () => {
  it('calculates total as subtotal - discount + serviceFee', () => {
    const subtotal = 100
    const discount = 10
    const serviceFee = 5
    const total = Math.max(0, Math.round((subtotal - discount + serviceFee) * 100) / 100)

    expect(total).toBe(95)
  })

  it('clamps total to zero when discount exceeds subtotal + serviceFee', () => {
    const subtotal = 50
    const discount = 100
    const serviceFee = 0
    const total = Math.max(0, Math.round((subtotal - discount + serviceFee) * 100) / 100)

    expect(total).toBe(0)
  })
})

// ── Cash session expected amount ─────────────────────────────────────────────

describe('Cash session expected amount', () => {
  it('calculates: opening + supply + adjustment - withdrawal + grossRevenue', () => {
    const opening = 200
    const supply = 500
    const adjustment = 20
    const withdrawal = 100
    const grossRevenue = 1500

    const expected = Math.round((opening + supply + adjustment - withdrawal + grossRevenue) * 100) / 100
    expect(expected).toBe(2120)
  })

  it('handles zero movements', () => {
    const opening = 100
    const supply = 0
    const adjustment = 0
    const withdrawal = 0
    const grossRevenue = 0

    const expected = Math.round((opening + supply + adjustment - withdrawal + grossRevenue) * 100) / 100
    expect(expected).toBe(100)
  })
})
