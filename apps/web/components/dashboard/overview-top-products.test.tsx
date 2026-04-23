import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { FinanceSummaryResponse, ProductRecord } from '@contracts/contracts'
import { OverviewTopProducts } from './overview-top-products'

function makeFinanceSummary(): FinanceSummaryResponse {
  return {
    displayCurrency: 'BRL',
    ratesUpdatedAt: null,
    ratesSource: 'fallback',
    ratesNotice: null,
    totals: {
      activeProducts: 2,
      inventoryUnits: 12,
      inventoryCostValue: 100,
      inventorySalesValue: 220,
      potentialProfit: 120,
      realizedRevenue: 0,
      realizedCost: 0,
      realizedProfit: 0,
      completedOrders: 0,
      currentMonthRevenue: 0,
      currentMonthProfit: 0,
      previousMonthRevenue: 0,
      previousMonthProfit: 0,
      revenueGrowthPercent: 0,
      profitGrowthPercent: 0,
      averageMarginPercent: 0,
      averageMarkupPercent: 0,
      lowStockItems: 0,
    },
    categoryBreakdown: [],
    topProducts: [
      {
        id: 'prod-1',
        name: 'Deher Garrafa',
        category: 'Bebidas',
        stock: 42,
        currency: 'BRL',
        displayCurrency: 'BRL',
        originalInventorySalesValue: 1050,
        originalPotentialProfit: 420,
        inventoryCostValue: 630,
        inventorySalesValue: 1050,
        potentialProfit: 420,
        marginPercent: 40,
      },
      {
        id: 'prod-2',
        name: 'Gin Dose',
        category: 'Destilados',
        stock: 64,
        currency: 'BRL',
        displayCurrency: 'BRL',
        originalInventorySalesValue: 896,
        originalPotentialProfit: 384,
        inventoryCostValue: 512,
        inventorySalesValue: 896,
        potentialProfit: 384,
        marginPercent: 42.9,
      },
    ],
    recentOrders: [],
    revenueTimeline: [],
    salesByChannel: [],
    topCustomers: [],
    topEmployees: [],
    salesMap: [],
    topRegions: [],
    categoryTopProducts: {},
  }
}

function makeProducts(): ProductRecord[] {
  return [
    {
      id: 'prod-1',
      name: 'Deher Garrafa',
      barcode: '7890000000001',
      brand: 'Deher',
      category: 'Bebidas',
      packagingClass: 'bottle',
      measurementUnit: 'ML',
      measurementValue: 1000,
      unitsPerPackage: 1,
      isCombo: false,
      comboDescription: null,
      comboItems: [],
      stockPackages: 42,
      stockLooseUnits: 0,
      description: null,
      quantityLabel: '1L',
      servingSize: null,
      imageUrl: null,
      catalogSource: 'manual',
      currency: 'BRL',
      displayCurrency: 'BRL',
      unitCost: 15,
      unitPrice: 25,
      originalUnitCost: 15,
      originalUnitPrice: 25,
      stock: 42,
      lowStockThreshold: 6,
      isLowStock: false,
      requiresKitchen: false,
      active: true,
      createdAt: '2026-04-22T00:00:00.000Z',
      updatedAt: '2026-04-22T00:00:00.000Z',
      inventoryCostValue: 630,
      inventorySalesValue: 1050,
      potentialProfit: 420,
      originalInventoryCostValue: 630,
      originalInventorySalesValue: 1050,
      originalPotentialProfit: 420,
      stockBaseUnits: 42,
      marginPercent: 40,
    },
    {
      id: 'prod-2',
      name: 'Gin Dose',
      barcode: '7890000000002',
      brand: 'Tanqueray',
      category: 'Destilados',
      packagingClass: 'unit',
      measurementUnit: 'UN',
      measurementValue: 1,
      unitsPerPackage: 1,
      isCombo: false,
      comboDescription: null,
      comboItems: [],
      stockPackages: 64,
      stockLooseUnits: 0,
      description: null,
      quantityLabel: '1 dose',
      servingSize: null,
      imageUrl: null,
      catalogSource: 'manual',
      currency: 'BRL',
      displayCurrency: 'BRL',
      unitCost: 8,
      unitPrice: 14,
      originalUnitCost: 8,
      originalUnitPrice: 14,
      stock: 64,
      lowStockThreshold: 8,
      isLowStock: false,
      requiresKitchen: false,
      active: true,
      createdAt: '2026-04-22T00:00:00.000Z',
      updatedAt: '2026-04-22T00:00:00.000Z',
      inventoryCostValue: 512,
      inventorySalesValue: 896,
      potentialProfit: 384,
      originalInventoryCostValue: 512,
      originalInventorySalesValue: 896,
      originalPotentialProfit: 384,
      stockBaseUnits: 64,
      marginPercent: 42.9,
    },
  ]
}

describe('OverviewTopProducts', () => {
  it('renderiza a variante lab como lista densa, sem pilha de cards altos', () => {
    render(<OverviewTopProducts finance={makeFinanceSummary()} products={makeProducts()} surface="lab" />)

    expect(screen.getByRole('heading', { name: 'Top produtos' })).toBeInTheDocument()
    expect(screen.getByTestId('overview-top-products-list')).toBeInTheDocument()
    expect(screen.getByText('Deher Garrafa')).toBeInTheDocument()
    expect(screen.getByText('Gin Dose')).toBeInTheDocument()
    expect(screen.getByText('margem 40.0%')).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes('Deher ·'))).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes('Tanqueray ·'))).toBeInTheDocument()
  })

  it('usa a base do próprio financeiro quando o catálogo de produtos ainda não chegou', () => {
    const finance = makeFinanceSummary()
    finance.topProducts[0] = {
      ...finance.topProducts[0],
      brand: 'Deher',
      packagingClass: 'Garrafa',
      quantityLabel: '1L',
      catalogSource: 'manual',
    }

    render(<OverviewTopProducts finance={finance} surface="lab" />)

    expect(screen.getByText((content) => content.includes('Deher ·'))).toBeInTheDocument()
  })
})
