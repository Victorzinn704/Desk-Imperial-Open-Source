import { BuyerType, CurrencyCode } from '@prisma/client'
import {
  buildCategoryCollections,
  buildRecentOrders,
  buildSalesByChannel,
  buildTopProducts,
  buildTopCustomers,
  calculateGrowthPercent,
} from '../src/modules/finance/finance-analytics.util'

const mockCurrencyService = {
  convert: jest.fn((value: number) => value),
}

const options = {
  currencyService: mockCurrencyService as any,
  displayCurrency: CurrencyCode.BRL,
  snapshot: {
    rates: { BRL: 1, USD: 0.2, EUR: 0.18 },
    updatedAt: new Date('2026-03-28T00:00:00Z').toISOString(),
    source: 'live' as const,
    notice: null,
  },
}

describe('finance-analytics.util', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calcula crescimento com base anterior zero', () => {
    expect(calculateGrowthPercent(0, 0)).toBe(0)
    expect(calculateGrowthPercent(120, 0)).toBe(100)
  })

  it('agrega vendas por canal ordenando por receita', () => {
    const result = buildSalesByChannel(
      [
        { channel: 'PDV', currency: CurrencyCode.BRL, _count: { _all: 1 }, _sum: { totalRevenue: 100, totalProfit: 40 } },
        { channel: 'Delivery', currency: CurrencyCode.BRL, _count: { _all: 1 }, _sum: { totalRevenue: 220, totalProfit: 80 } },
        { channel: 'PDV', currency: CurrencyCode.BRL, _count: { _all: 1 }, _sum: { totalRevenue: 150, totalProfit: 60 } },
      ],
      options,
    )

    expect(result).toEqual([
      { channel: 'PDV', orders: 2, revenue: 250, profit: 100 },
      { channel: 'Delivery', orders: 1, revenue: 220, profit: 80 },
    ])
  })

  it('agrega top customers por nome e documento', () => {
    const result = buildTopCustomers(
      [
        {
          customerName: 'Cliente 1',
          buyerType: BuyerType.PERSON,
          buyerDocument: '52998224725',
          currency: CurrencyCode.BRL,
          _count: { _all: 1 },
          _sum: { totalRevenue: 100, totalProfit: 40 },
        },
        {
          customerName: 'Cliente 1',
          buyerType: BuyerType.PERSON,
          buyerDocument: '52998224725',
          currency: CurrencyCode.BRL,
          _count: { _all: 1 },
          _sum: { totalRevenue: 150, totalProfit: 60 },
        },
      ],
      options,
    )

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      customerName: 'Cliente 1',
      orders: 2,
      revenue: 250,
      profit: 100,
    })
  })

  it('monta colecoes de categoria com top products por potencial', () => {
    const result = buildCategoryCollections([
      {
        id: 'p1',
        name: 'Produto 1',
        brand: null,
        category: 'Bebidas',
        barcode: null,
        packagingClass: 'Lata',
        quantityLabel: '350ml',
        imageUrl: null,
        catalogSource: 'manual',
        isCombo: false,
        stock: 10,
        currency: CurrencyCode.BRL,
        displayCurrency: CurrencyCode.BRL,
        originalInventorySalesValue: 200,
        originalPotentialProfit: 100,
        inventoryCostValue: 100,
        inventorySalesValue: 200,
        potentialProfit: 100,
        marginPercent: 50,
      },
      {
        id: 'p2',
        name: 'Produto 2',
        brand: null,
        category: 'Bebidas',
        barcode: null,
        packagingClass: 'Lata',
        quantityLabel: '350ml',
        imageUrl: null,
        catalogSource: 'manual',
        isCombo: false,
        stock: 5,
        currency: CurrencyCode.BRL,
        displayCurrency: CurrencyCode.BRL,
        originalInventorySalesValue: 160,
        originalPotentialProfit: 80,
        inventoryCostValue: 80,
        inventorySalesValue: 160,
        potentialProfit: 80,
        marginPercent: 50,
      },
    ] as any)

    expect(result.categoryBreakdown).toEqual([
      {
        category: 'Bebidas',
        products: 2,
        units: 15,
        inventoryCostValue: 180,
        inventorySalesValue: 360,
        potentialProfit: 180,
      },
    ])
    const bebidasTopProducts = result.categoryTopProducts.Bebidas
    expect(bebidasTopProducts).toBeDefined()
    expect(bebidasTopProducts?.[0]?.name).toBe('Produto 1')
  })

  it('propaga metadata de produto nos top products financeiros', () => {
    const result = buildTopProducts([
      {
        id: 'p1',
        name: 'Brahma 350ml',
        brand: 'Brahma',
        category: 'Bebidas',
        barcode: '7891149105069',
        packagingClass: 'Lata',
        quantityLabel: '350ml',
        imageUrl: null,
        catalogSource: 'manual',
        isCombo: false,
        stock: 10,
        currency: CurrencyCode.BRL,
        displayCurrency: CurrencyCode.BRL,
        originalInventorySalesValue: 200,
        originalPotentialProfit: 100,
        inventoryCostValue: 100,
        inventorySalesValue: 200,
        potentialProfit: 100,
        marginPercent: 50,
      },
    ])

    expect(result[0]).toMatchObject({
      brand: 'Brahma',
      barcode: '7891149105069',
      packagingClass: 'Lata',
      quantityLabel: '350ml',
      catalogSource: 'manual',
    })
  })

  it('mapeia recent orders mantendo valores originais e convertidos', () => {
    const result = buildRecentOrders(
      [
        {
          id: 'order-1',
          customerName: 'João',
          channel: 'PDV',
          currency: CurrencyCode.BRL,
          status: 'COMPLETED' as const,
          totalRevenue: { toNumber: () => 100 },
          totalProfit: { toNumber: () => 40 },
          totalItems: 3,
          createdAt: new Date('2026-03-28T10:00:00Z'),
        },
      ],
      options,
    )

    expect(result).toEqual([
      expect.objectContaining({
        id: 'order-1',
        totalRevenue: 100,
        totalProfit: 40,
        originalTotalRevenue: 100,
        originalTotalProfit: 40,
        createdAt: '2026-03-28T10:00:00.000Z',
      }),
    ])
  })
})
