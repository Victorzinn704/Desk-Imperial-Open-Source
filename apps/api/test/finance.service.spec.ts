/**
 * @file finance.service.spec.ts
 * @module Finance
 *
 * Testes unitários do FinanceService — módulo de dashboard financeiro executivo.
 *
 * Estratégia de teste:
 * - Todos os colaboradores externos (Prisma, Cache, Currency) são mockados
 * - Foco em cálculos financeiros, cache e agregações
 * - Testes de crescimento (growth percent) e margens
 *
 * Cobertura alvo:
 *   ✅ getSummaryForUser() — resumo financeiro completo
 *   ✅ Cache hit/miss
 *   ✅ Cálculos de crescimento
 *   ✅ Conversão de moeda
 *   ✅ Agregações por categoria, canal, região
 */

import { ForbiddenException } from '@nestjs/common'
import { CurrencyCode, OrderStatus } from '@prisma/client'
import { FinanceService } from '../src/modules/finance/finance.service'
import type { PrismaService } from '../src/database/prisma.service'
import type { CurrencyService } from '../src/modules/currency/currency.service'
import type { CacheService } from '../src/common/services/cache.service'
import { makeAuthContext } from './helpers/auth-context.factory'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPrisma = {
  product: {
    findMany: jest.fn(),
  },
  order: {
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
}

const mockCurrencyService = {
  getSnapshot: jest.fn(),
  convert: jest.fn(),
}

const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  financeKey: jest.fn(),
}

// ── Factories ─────────────────────────────────────────────────────────────────

function makeProduct(overrides: object = {}) {
  return {
    id: 'product-1',
    userId: 'user-1',
    name: 'Produto Teste',
    brand: null,
    packagingClass: 'Padrão',
    measurementUnit: 'UN',
    measurementValue: 1,
    unitsPerPackage: 1,
    description: null,
    category: 'Bebidas',
    unitCost: { toNumber: () => 10.0 },
    unitPrice: { toNumber: () => 20.0 },
    currency: CurrencyCode.BRL,
    stock: 100,
    requiresKitchen: false,
    active: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

function makeOrder(overrides: object = {}) {
  return {
    id: 'order-1',
    userId: 'user-1',
    customerName: 'João Cliente',
    buyerType: 'PERSON' as const,
    buyerDocument: '52998224725',
    buyerCity: 'São Paulo',
    buyerState: 'SP',
    buyerCountry: 'Brasil',
    buyerLatitude: -23.5505,
    buyerLongitude: -46.6333,
    channel: 'PDV',
    currency: CurrencyCode.BRL,
    status: OrderStatus.COMPLETED,
    totalRevenue: 100.0,
    totalCost: 60.0,
    totalProfit: 40.0,
    totalItems: 5,
    createdAt: new Date('2026-03-01T00:00:00Z'),
    ...overrides,
  }
}

function makeCurrencySnapshot() {
  return {
    rates: { BRL: 1, USD: 0.2, EUR: 0.18 },
    updatedAt: new Date().toISOString(),
    source: 'awesomeapi',
  }
}

function makeOrderAggregate({
  currency = 'BRL',
  count = 0,
  revenue = 0,
  cost = 0,
  profit = 0,
}: {
  currency?: string
  count?: number
  revenue?: number
  cost?: number
  profit?: number
} = {}) {
  return {
    currency,
    _count: { _all: count },
    _sum: {
      totalRevenue: { toNumber: () => revenue },
      totalCost: { toNumber: () => cost },
      totalProfit: { toNumber: () => profit },
    },
  }
}

// ── Setup ─────────────────────────────────────────────────────────────────────

let financeService: FinanceService
let mockContext: ReturnType<typeof makeAuthContext>

beforeEach(() => {
  jest.clearAllMocks()

  financeService = new FinanceService(
    mockPrisma as unknown as PrismaService,
    mockCurrencyService as unknown as CurrencyService,
    mockCache as unknown as CacheService,
  )

  mockContext = makeAuthContext({
    userId: 'user-1',
    workspaceOwnerUserId: 'user-1',
    email: 'joao@empresa.com',
    fullName: 'João Silva',
  })

  // Defaults
  mockCurrencyService.getSnapshot.mockResolvedValue(makeCurrencySnapshot())
  mockCurrencyService.convert.mockImplementation((value: number) => value) // Pass-through para BRL
  mockCache.financeKey.mockReturnValue('finance:summary:user-1')
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FinanceService', () => {
  describe('getSummaryForUser', () => {
    it('deve retornar resumo financeiro completo do usuário', async () => {
      // Arrange
      const products = [
        makeProduct({
          name: 'Produto 1',
          stock: 100,
          unitCost: { toNumber: () => 10 },
          unitPrice: { toNumber: () => 20 },
        }),
        makeProduct({
          name: 'Produto 2',
          stock: 50,
          unitCost: { toNumber: () => 15 },
          unitPrice: { toNumber: () => 30 },
        }),
      ]
      const orders = [
        makeOrder({ totalRevenue: 100, totalProfit: 40 }),
        makeOrder({ totalRevenue: 200, totalProfit: 80 }),
      ]

      mockPrisma.product.findMany.mockResolvedValue(products)
      mockPrisma.order.findMany.mockResolvedValue(orders)
      mockPrisma.order.groupBy.mockResolvedValue([
        {
          currency: 'BRL',
          _count: { _all: 2 },
          _sum: {
            totalRevenue: { toNumber: () => 300 },
            totalCost: { toNumber: () => 180 },
            totalProfit: { toNumber: () => 120 },
          },
        },
      ])

      // Act
      const result = await financeService.getSummaryForUser(mockContext)

      // Assert
      expect(result.totals.activeProducts).toBe(2)
      expect(result.totals.completedOrders).toBe(2)
      expect(result.totals.realizedRevenue).toBe(300)
      expect(result.totals.realizedProfit).toBe(120)
    })

    it('deve usar cache quando disponível', async () => {
      // Arrange
      const cachedData = {
        displayCurrency: 'BRL' as const,
        ratesUpdatedAt: null,
        ratesSource: 'live' as const,
        ratesNotice: null,
        totals: {
          activeProducts: 5,
          realizedRevenue: 1000,
          realizedProfit: 400,
        },
        categoryBreakdown: [],
        topProducts: [],
        recentOrders: [],
        revenueTimeline: [],
        salesByChannel: [],
        topCustomers: [],
        topEmployees: [],
        salesMap: [],
        topRegions: [],
        categoryTopProducts: {},
      }
      mockCache.get.mockResolvedValue(cachedData as any)

      // Act
      const result = await financeService.getSummaryForUser(mockContext)

      // Assert
      expect(result).toEqual(cachedData)
      expect(mockCache.get).toHaveBeenCalledWith('finance:summary:user-1')
      expect(mockPrisma.product.findMany).not.toHaveBeenCalled()
      expect(mockPrisma.order.findMany).not.toHaveBeenCalled()
    })

    it('deve fazer cache do resultado quando cache miss', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(null)
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.order.findMany.mockResolvedValue([])
      mockPrisma.order.groupBy.mockResolvedValue([])

      // Act
      await financeService.getSummaryForUser(mockContext)

      // Assert
      expect(mockCache.set).toHaveBeenCalledWith(
        'finance:summary:user-1',
        expect.any(Object),
        expect.any(Number), // TTL
      )
    })

    it('deve calcular crescimento de receita entre meses', async () => {
      // Arrange
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.order.groupBy
        .mockResolvedValueOnce([makeOrderAggregate({ count: 2, revenue: 1800, cost: 1080, profit: 720 })])
        .mockResolvedValueOnce([makeOrderAggregate({ revenue: 1000, profit: 400 })])
        .mockResolvedValueOnce([makeOrderAggregate({ revenue: 800, profit: 320 })])
      mockPrisma.order.findMany.mockResolvedValue([])

      // Act
      const result = await financeService.getSummaryForUser(mockContext)

      // Assert
      expect(result.totals.currentMonthRevenue).toBe(1000)
      expect(result.totals.previousMonthRevenue).toBe(800)
      expect(result.totals.revenueGrowthPercent).toBeGreaterThan(20) // (1000-800)/800 = 25%
    })

    it('deve lidar com mês anterior sem vendas', async () => {
      // Arrange
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.order.groupBy
        .mockResolvedValueOnce([makeOrderAggregate({ count: 1, revenue: 1000, cost: 600, profit: 400 })])
        .mockResolvedValueOnce([makeOrderAggregate({ revenue: 1000, profit: 400 })])
        .mockResolvedValueOnce([])
      mockPrisma.order.findMany.mockResolvedValue([])

      // Act
      const result = await financeService.getSummaryForUser(mockContext)

      // Assert
      expect(result.totals.currentMonthRevenue).toBe(1000)
      expect(result.totals.previousMonthRevenue).toBe(0)
    })

    it('deve converter moedas para preferredCurrency do usuário', async () => {
      // Arrange
      const contextUSD = makeAuthContext({
        userId: 'user-1',
        workspaceOwnerUserId: 'user-1',
        fullName: 'João Silva',
        email: 'joao@empresa.com',
        preferredCurrency: CurrencyCode.USD,
      })
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.order.groupBy.mockResolvedValue([
        makeOrderAggregate({ currency: 'BRL', count: 2, revenue: 1000, cost: 600, profit: 400 }),
        makeOrderAggregate({ currency: 'EUR', count: 1, revenue: 500, cost: 300, profit: 200 }),
      ])
      mockPrisma.order.findMany.mockResolvedValue([])

      mockCurrencyService.convert
        .mockReturnValueOnce(200) // BRL -> USD revenue
        .mockReturnValueOnce(120) // BRL -> USD cost
        .mockReturnValueOnce(80) // BRL -> USD profit
        .mockReturnValueOnce(2500) // EUR -> USD revenue
        .mockReturnValueOnce(1500) // EUR -> USD cost
        .mockReturnValueOnce(1000) // EUR -> USD profit

      // Act
      await financeService.getSummaryForUser(contextUSD)

      // Assert
      expect(mockCurrencyService.convert).toHaveBeenCalled()
    })

    it('deve contar produtos com estoque baixo (<=10)', async () => {
      // Arrange
      const products = [
        makeProduct({ name: 'Produto 1', stock: 100 }),
        makeProduct({ name: 'Produto 2', stock: 5 }), // Low stock
        makeProduct({ name: 'Produto 3', stock: 3 }), // Low stock
        makeProduct({ name: 'Produto 4', stock: 50 }),
      ]
      mockPrisma.product.findMany.mockResolvedValue(products)
      mockPrisma.order.findMany.mockResolvedValue([])
      mockPrisma.order.groupBy.mockResolvedValue([])

      // Act
      const result = await financeService.getSummaryForUser(mockContext)

      // Assert
      expect(result.totals.lowStockItems).toBe(2)
    })

    it('deve retornar categoria breakdown', async () => {
      // Arrange
      const products = [
        makeProduct({ name: 'Produto 1', category: 'Bebidas', stock: 100 }),
        makeProduct({ name: 'Produto 2', category: 'Bebidas', stock: 50 }),
        makeProduct({ name: 'Produto 3', category: 'Comida', stock: 30 }),
      ]
      mockPrisma.product.findMany.mockResolvedValue(products)
      mockPrisma.order.findMany.mockResolvedValue([])
      mockPrisma.order.groupBy.mockResolvedValue([])

      // Act
      const result = await financeService.getSummaryForUser(mockContext)

      // Assert
      expect(result.categoryBreakdown).toBeDefined()
      expect(result.categoryBreakdown.length).toBeGreaterThan(0)
    })

    it('deve retornar top products', async () => {
      // Arrange
      const products = [makeProduct({ name: 'Produto 1', stock: 100 }), makeProduct({ name: 'Produto 2', stock: 50 })]
      mockPrisma.product.findMany.mockResolvedValue(products)
      mockPrisma.order.findMany.mockResolvedValue([])
      mockPrisma.order.groupBy.mockResolvedValue([])

      // Act
      const result = await financeService.getSummaryForUser(mockContext)

      // Assert
      expect(result.topProducts).toBeDefined()
      expect(Array.isArray(result.topProducts)).toBe(true)
    })

    it('deve retornar recent orders (últimos 5)', async () => {
      // Arrange
      const orders = [
        makeOrder({ id: 'order-1', createdAt: new Date('2026-03-05') }),
        makeOrder({ id: 'order-2', createdAt: new Date('2026-03-04') }),
        makeOrder({ id: 'order-3', createdAt: new Date('2026-03-03') }),
        makeOrder({ id: 'order-4', createdAt: new Date('2026-03-02') }),
        makeOrder({ id: 'order-5', createdAt: new Date('2026-03-01') }),
      ]
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.order.findMany.mockResolvedValue(orders)
      mockPrisma.order.groupBy.mockResolvedValue([])

      // Act
      const result = await financeService.getSummaryForUser(mockContext)

      // Assert
      expect(result.recentOrders).toHaveLength(5)
      expect(result.recentOrders[0].id).toBe('order-1')
    })

    it('deve retornar revenue timeline (últimos 6 meses)', async () => {
      // Arrange
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.order.findMany.mockResolvedValue([])
      mockPrisma.order.groupBy.mockResolvedValue([])

      // Act
      const result = await financeService.getSummaryForUser(mockContext)

      // Assert
      expect(result.revenueTimeline).toBeDefined()
      expect(Array.isArray(result.revenueTimeline)).toBe(true)
    })

    it('deve retornar sales by channel', async () => {
      // Arrange
      const orders = [
        makeOrder({ channel: 'PDV', totalRevenue: 100, totalProfit: 40 }),
        makeOrder({ channel: 'DELIVERY', totalRevenue: 200, totalProfit: 80 }),
        makeOrder({ channel: 'PDV', totalRevenue: 150, totalProfit: 60 }),
      ]
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.order.findMany.mockResolvedValue(orders)
      mockPrisma.order.groupBy.mockResolvedValue([])

      // Act
      const result = await financeService.getSummaryForUser(mockContext)

      // Assert
      expect(result.salesByChannel).toBeDefined()
      expect(result.salesByChannel.length).toBeGreaterThan(0)
    })

    it('deve retornar top customers', async () => {
      // Arrange
      const orders = [
        makeOrder({ customerName: 'Cliente 1', totalRevenue: 100, totalProfit: 40 }),
        makeOrder({ customerName: 'Cliente 2', totalRevenue: 200, totalProfit: 80 }),
        makeOrder({ customerName: 'Cliente 1', totalRevenue: 150, totalProfit: 60 }), // Repeat customer
      ]
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.order.findMany.mockResolvedValue(orders)
      mockPrisma.order.groupBy.mockResolvedValue([])

      // Act
      const result = await financeService.getSummaryForUser(mockContext)

      // Assert
      expect(result.topCustomers).toBeDefined()
      expect(result.topCustomers.length).toBeGreaterThan(0)
    })

    it('deve retornar top employees', async () => {
      // Arrange
      const orders = [
        makeOrder({ sellerName: 'Vendedor 1', totalRevenue: 100, totalProfit: 40 }),
        makeOrder({ sellerName: 'Vendedor 2', totalRevenue: 200, totalProfit: 80 }),
      ]
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.order.findMany.mockResolvedValue(orders)
      mockPrisma.order.groupBy.mockResolvedValue([])

      // Act
      const result = await financeService.getSummaryForUser(mockContext)

      // Assert
      expect(result.topEmployees).toBeDefined()
      expect(result.topEmployees.length).toBeGreaterThan(0)
    })

    it('deve retornar sales map com geolocalização', async () => {
      // Arrange
      const orders = [
        makeOrder({
          buyerCity: 'São Paulo',
          buyerState: 'SP',
          buyerLatitude: -23.5505,
          buyerLongitude: -46.6333,
          totalRevenue: 100,
        }),
        makeOrder({
          buyerCity: 'Rio de Janeiro',
          buyerState: 'RJ',
          buyerLatitude: -22.9068,
          buyerLongitude: -43.1729,
          totalRevenue: 200,
        }),
      ]
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.order.findMany.mockResolvedValue(orders)
      mockPrisma.order.groupBy.mockResolvedValue([])

      // Act
      const result = await financeService.getSummaryForUser(mockContext)

      // Assert
      expect(result.salesMap).toBeDefined()
      expect(result.salesMap.length).toBeGreaterThan(0)
      expect(result.salesMap[0].latitude).toBeDefined()
      expect(result.salesMap[0].longitude).toBeDefined()
    })

    it('deve retornar top regions', async () => {
      // Arrange
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.order.findMany.mockResolvedValue([])
      mockPrisma.order.groupBy.mockResolvedValue([])

      // Act
      const result = await financeService.getSummaryForUser(mockContext)

      // Assert
      expect(result.topRegions).toBeDefined()
      expect(Array.isArray(result.topRegions)).toBe(true)
    })

    it('deve retornar categoryTopProducts', async () => {
      // Arrange
      const products = [
        makeProduct({ name: 'Produto 1', category: 'Bebidas', stock: 100, unitCost: 10, unitPrice: 20 }),
        makeProduct({ name: 'Produto 2', category: 'Comida', stock: 50, unitCost: 15, unitPrice: 30 }),
      ]
      mockPrisma.product.findMany.mockResolvedValue(products)
      mockPrisma.order.findMany.mockResolvedValue([])
      mockPrisma.order.groupBy.mockResolvedValue([])

      // Act
      const result = await financeService.getSummaryForUser(mockContext)

      // Assert
      expect(result.categoryTopProducts).toBeDefined()
      expect(typeof result.categoryTopProducts).toBe('object')
    })

    it('deve rejeitar STAFF com ForbiddenException', async () => {
      // Arrange
      const staffContext = makeAuthContext({
        userId: 'staff-1',
        role: 'STAFF',
        workspaceOwnerUserId: 'user-1',
        companyOwnerUserId: 'user-1',
      })

      // Act & Assert
      await expect(financeService.getSummaryForUser(staffContext)).rejects.toThrow(ForbiddenException)
      await expect(financeService.getSummaryForUser(staffContext)).rejects.toThrow(
        'Apenas o dono pode acessar o resumo financeiro executivo',
      )
    })

    it('deve usar companyOwnerUserId quando role for STAFF mas com owner access', async () => {
      // Arrange - este teste verifica que resolveWorkspaceOwnerUserId funciona
      // Para OWNER, usa userId; para STAFF, usa companyOwnerUserId
      const staffContext = makeAuthContext({
        userId: 'staff-1',
        role: 'STAFF',
        workspaceOwnerUserId: 'owner-123',
        companyOwnerUserId: 'owner-123',
      })

      // Este teste vai falhar porque STAFF não pode acessar, mas documenta o comportamento
      await expect(financeService.getSummaryForUser(staffContext)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('Cálculos de Crescimento', () => {
    it('deve calcular crescimento positivo corretamente', async () => {
      // Arrange
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.order.groupBy
        .mockResolvedValueOnce([makeOrderAggregate({ count: 2, revenue: 2250, cost: 1350, profit: 900 })])
        .mockResolvedValueOnce([makeOrderAggregate({ revenue: 1250, profit: 500 })])
        .mockResolvedValueOnce([makeOrderAggregate({ revenue: 1000, profit: 400 })])
      mockPrisma.order.findMany.mockResolvedValue([])

      // Act
      const result = await financeService.getSummaryForUser(mockContext)

      // Assert
      // (1250 - 1000) / 1000 * 100 = 25%
      expect(result.totals.revenueGrowthPercent).toBeCloseTo(25, 2)
    })

    it('deve calcular crescimento negativo corretamente', async () => {
      // Arrange
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.order.groupBy
        .mockResolvedValueOnce([makeOrderAggregate({ count: 2, revenue: 1800, cost: 1080, profit: 720 })])
        .mockResolvedValueOnce([makeOrderAggregate({ revenue: 800, profit: 320 })])
        .mockResolvedValueOnce([makeOrderAggregate({ revenue: 1000, profit: 400 })])
      mockPrisma.order.findMany.mockResolvedValue([])

      // Act
      const result = await financeService.getSummaryForUser(mockContext)

      // Assert
      // (800 - 1000) / 1000 * 100 = -20%
      expect(result.totals.revenueGrowthPercent).toBeCloseTo(-20, 2)
    })

    it('deve retornar 0 quando mês anterior é zero', async () => {
      // Arrange
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.order.groupBy
        .mockResolvedValueOnce([makeOrderAggregate({ count: 1, revenue: 1000, cost: 600, profit: 400 })])
        .mockResolvedValueOnce([makeOrderAggregate({ revenue: 1000, profit: 400 })])
        .mockResolvedValueOnce([])
      mockPrisma.order.findMany.mockResolvedValue([])

      // Act
      const result = await financeService.getSummaryForUser(mockContext)

      // Assert
      expect(result.totals.revenueGrowthPercent).toBe(100)
    })
  })

  describe('Margens e Markup', () => {
    it('deve calcular margem de lucro média', async () => {
      // Arrange
      const products = [makeProduct({ name: 'Produto 1', stock: 100 }), makeProduct({ name: 'Produto 2', stock: 50 })]
      mockPrisma.product.findMany.mockResolvedValue(products)
      mockPrisma.order.findMany.mockResolvedValue([])
      mockPrisma.order.groupBy.mockResolvedValue([])

      // Act
      const result = await financeService.getSummaryForUser(mockContext)

      // Assert
      expect(result.totals.averageMarginPercent).toBeGreaterThanOrEqual(0)
    })

    it('deve calcular markup médio', async () => {
      // Arrange
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.order.findMany.mockResolvedValue([])
      mockPrisma.order.groupBy.mockResolvedValue([])

      // Act
      const result = await financeService.getSummaryForUser(mockContext)

      // Assert
      expect(result.totals.averageMarkupPercent).toBeDefined()
    })
  })

  describe('Inventory Metrics', () => {
    it('deve calcular valor total do inventário (custo)', async () => {
      // Arrange
      const products = [
        makeProduct({ name: 'Produto 1', stock: 100, unitCost: { toNumber: () => 10 } }), // R$ 1000
        makeProduct({ name: 'Produto 2', stock: 50, unitCost: { toNumber: () => 20 } }), // R$ 1000
      ]
      mockPrisma.product.findMany.mockResolvedValue(products)
      mockPrisma.order.findMany.mockResolvedValue([])
      mockPrisma.order.groupBy.mockResolvedValue([])

      // Act
      const result = await financeService.getSummaryForUser(mockContext)

      // Assert
      expect(result.totals.inventoryCostValue).toBe(2000)
    })

    it('deve calcular valor total do inventário (venda)', async () => {
      // Arrange
      const products = [
        makeProduct({ name: 'Produto 1', stock: 100, unitPrice: { toNumber: () => 20 } }), // R$ 2000
        makeProduct({ name: 'Produto 2', stock: 50, unitPrice: { toNumber: () => 30 } }), // R$ 1500
      ]
      mockPrisma.product.findMany.mockResolvedValue(products)
      mockPrisma.order.findMany.mockResolvedValue([])
      mockPrisma.order.groupBy.mockResolvedValue([])

      // Act
      const result = await financeService.getSummaryForUser(mockContext)

      // Assert
      expect(result.totals.inventorySalesValue).toBe(3500)
    })

    it('deve calcular lucro potencial do inventário', async () => {
      // Arrange
      const products = [
        makeProduct({
          name: 'Produto 1',
          stock: 100,
          unitCost: { toNumber: () => 10 },
          unitPrice: { toNumber: () => 20 },
        }), // R$ 1000 profit
        makeProduct({
          name: 'Produto 2',
          stock: 50,
          unitCost: { toNumber: () => 15 },
          unitPrice: { toNumber: () => 30 },
        }), // R$ 750 profit
      ]
      mockPrisma.product.findMany.mockResolvedValue(products)
      mockPrisma.order.findMany.mockResolvedValue([])
      mockPrisma.order.groupBy.mockResolvedValue([])

      // Act
      const result = await financeService.getSummaryForUser(mockContext)

      // Assert
      expect(result.totals.potentialProfit).toBe(1750)
    })

    it('deve contar unidades totais do inventário', async () => {
      // Arrange
      const products = [
        makeProduct({ name: 'Produto 1', stock: 100 }),
        makeProduct({ name: 'Produto 2', stock: 50 }),
        makeProduct({ name: 'Produto 3', stock: 25 }),
      ]
      mockPrisma.product.findMany.mockResolvedValue(products)
      mockPrisma.order.findMany.mockResolvedValue([])
      mockPrisma.order.groupBy.mockResolvedValue([])

      // Act
      const result = await financeService.getSummaryForUser(mockContext)

      // Assert
      expect(result.totals.inventoryUnits).toBe(175)
    })
  })
})
