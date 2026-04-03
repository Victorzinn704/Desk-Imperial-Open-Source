import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { ProductRecord } from '@contracts/contracts'
import { PortfolioEnvironment } from './portfolio-environment'

const mockUseDashboardQueries = vi.fn()
const mockUseDashboardMutations = vi.fn()

vi.mock('@/components/dashboard/hooks/useDashboardQueries', () => ({
  useDashboardQueries: () => mockUseDashboardQueries(),
}))

vi.mock('@/components/dashboard/hooks/useDashboardMutations', () => ({
  useDashboardMutations: () => mockUseDashboardMutations(),
}))

function makeProduct(overrides: Partial<ProductRecord> = {}): ProductRecord {
  return {
    id: 'product-1',
    name: 'Pizza Imperial',
    brand: 'Casa',
    category: 'Pizzas',
    packagingClass: 'UN',
    measurementUnit: 'UN',
    measurementValue: 1,
    unitsPerPackage: 1,
    isCombo: false,
    comboDescription: null,
    comboItems: [],
    stockPackages: 0,
    stockLooseUnits: 15,
    description: 'Produto teste',
    currency: 'BRL',
    displayCurrency: 'BRL',
    unitCost: 20,
    unitPrice: 40,
    originalUnitCost: 20,
    originalUnitPrice: 40,
    stock: 15,
    lowStockThreshold: 3,
    isLowStock: false,
    requiresKitchen: true,
    active: true,
    createdAt: '2026-04-03T10:00:00.000Z',
    updatedAt: '2026-04-03T10:00:00.000Z',
    inventoryCostValue: 300,
    inventorySalesValue: 600,
    potentialProfit: 300,
    originalInventoryCostValue: 300,
    originalInventorySalesValue: 600,
    originalPotentialProfit: 300,
    stockBaseUnits: 15,
    marginPercent: 50,
    ...overrides,
  }
}

describe('PortfolioEnvironment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('abre o formulário em modo de edição e salva usando updateProductMutation', async () => {
    const user = userEvent.setup()
    const updateMutate = vi.fn((_payload, options?: { onSuccess?: () => void }) => {
      options?.onSuccess?.()
    })

    mockUseDashboardQueries.mockReturnValue({
      financeQuery: {
        data: {
          displayCurrency: 'BRL',
          totals: {
            lowStockItems: 0,
          },
          categoryBreakdown: [
            {
              category: 'Pizzas',
              products: 1,
              units: 15,
              inventoryCostValue: 300,
              inventorySalesValue: 600,
              potentialProfit: 300,
            },
          ],
        },
      },
      productsQuery: {
        data: {
          items: [makeProduct()],
          totals: {
            totalProducts: 1,
            activeProducts: 1,
            inactiveProducts: 0,
            stockUnits: 15,
            stockPackages: 0,
            stockLooseUnits: 15,
            stockBaseUnits: 15,
            inventoryCostValue: 300,
            inventorySalesValue: 600,
            potentialProfit: 300,
            averageMarginPercent: 50,
            categories: ['Pizzas'],
          },
        },
        error: null,
      },
    })

    mockUseDashboardMutations.mockReturnValue({
      createProductMutation: { isPending: false, error: null, mutate: vi.fn() },
      updateProductMutation: { isPending: false, error: null, mutate: updateMutate },
      archiveProductMutation: { isPending: false, error: null, mutate: vi.fn() },
      restoreProductMutation: { isPending: false, error: null, mutate: vi.fn() },
      deleteProductMutation: { isPending: false, error: null, mutate: vi.fn() },
    })

    render(<PortfolioEnvironment />)

    await user.click(screen.getByRole('button', { name: /editar/i }))

    expect(screen.getByText(/editar produto/i)).toBeInTheDocument()

    const nameInput = screen.getByLabelText(/^nome$/i)
    expect(nameInput).toHaveValue('Pizza Imperial')

    await user.clear(nameInput)
    await user.type(nameInput, 'Pizza Imperial Atualizada')
    await user.click(screen.getByRole('button', { name: /salvar alterações/i }))

    await waitFor(() => {
      expect(updateMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'product-1',
          values: expect.objectContaining({
            name: 'Pizza Imperial Atualizada',
          }),
        }),
        expect.any(Object),
      )
    })

    await waitFor(() => {
      expect(screen.getByText(/novo produto/i)).toBeInTheDocument()
    })
  })

  it('cria combo usando createProductMutation com componentes normalizados', async () => {
    const user = userEvent.setup()
    const createMutate = vi.fn()

    mockUseDashboardQueries.mockReturnValue({
      financeQuery: {
        data: {
          displayCurrency: 'BRL',
          totals: {
            lowStockItems: 0,
          },
          categoryBreakdown: [],
        },
      },
      productsQuery: {
        data: {
          items: [
            makeProduct({
              id: 'component-1',
              name: 'Refrigerante Lata',
              category: 'Bebidas',
              unitsPerPackage: 12,
            }),
          ],
          totals: {
            totalProducts: 1,
            activeProducts: 1,
            inactiveProducts: 0,
            stockUnits: 15,
            stockPackages: 0,
            stockLooseUnits: 15,
            stockBaseUnits: 15,
            inventoryCostValue: 300,
            inventorySalesValue: 600,
            potentialProfit: 300,
            averageMarginPercent: 50,
            categories: ['Bebidas'],
          },
        },
        error: null,
      },
    })

    mockUseDashboardMutations.mockReturnValue({
      createProductMutation: { isPending: false, error: null, mutate: createMutate },
      updateProductMutation: { isPending: false, error: null, mutate: vi.fn() },
      archiveProductMutation: { isPending: false, error: null, mutate: vi.fn() },
      restoreProductMutation: { isPending: false, error: null, mutate: vi.fn() },
      deleteProductMutation: { isPending: false, error: null, mutate: vi.fn() },
    })

    render(<PortfolioEnvironment />)

    await user.type(screen.getByLabelText(/^nome$/i), 'Combo Almoço Imperial')
    await user.type(screen.getByLabelText(/^categoria$/i), 'Combos')
    await user.selectOptions(screen.getByLabelText(/classe de cadastro/i), 'OTHER')
    await user.type(screen.getByLabelText(/classe personalizada/i), 'Combo promocional')
    await user.clear(screen.getByLabelText(/^custo unitário$/i))
    await user.type(screen.getByLabelText(/^custo unitário$/i), '25')
    await user.clear(screen.getByLabelText(/^preço unitário$/i))
    await user.type(screen.getByLabelText(/^preço unitário$/i), '39.9')

    await user.click(screen.getAllByRole('switch')[0])
    await user.type(screen.getByLabelText(/descrição do combo/i), '1 prato + 1 refri')
    await user.click(screen.getByRole('button', { name: /adicionar item/i }))
    await user.selectOptions(screen.getByLabelText(/componente 1/i), 'component-1')
    const comboUnitsInput = screen
      .getAllByLabelText(/unidades avulsas/i)
      .find((element) => (element as HTMLInputElement).name === 'comboItems.0.quantityUnits') as HTMLInputElement
    await user.clear(comboUnitsInput)
    await user.type(comboUnitsInput, '2')

    await user.click(screen.getByRole('button', { name: /cadastrar produto/i }))

    await waitFor(() => {
      expect(createMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Combo Almoço Imperial',
          category: 'Combos',
          packagingClass: 'Combo promocional',
          isCombo: true,
          comboDescription: '1 prato + 1 refri',
          comboItems: [
            expect.objectContaining({
              productId: 'component-1',
              quantityPackages: 0,
              quantityUnits: 2,
            }),
          ],
        }),
      )
    })
  })
})
