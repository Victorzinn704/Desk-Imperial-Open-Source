import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ProductRecord } from '@contracts/contracts'
import { ProductCard } from './product-card'

function makeProduct(overrides: Partial<ProductRecord> = {}): ProductRecord {
  return {
    id: 'product-1',
    name: 'Combo Imperial',
    brand: 'Desk',
    category: 'Combos',
    packagingClass: 'Combo',
    measurementUnit: 'UN',
    measurementValue: 1,
    unitsPerPackage: 1,
    isCombo: true,
    comboDescription: 'Salgado + bebida',
    comboItems: [],
    stockPackages: 0,
    stockLooseUnits: 12,
    description: 'Produto teste',
    currency: 'BRL',
    displayCurrency: 'BRL',
    unitCost: 10,
    unitPrice: 20,
    originalUnitCost: 10,
    originalUnitPrice: 20,
    stock: 12,
    lowStockThreshold: 3,
    isLowStock: false,
    requiresKitchen: false,
    active: true,
    createdAt: '2026-04-03T10:00:00.000Z',
    updatedAt: '2026-04-03T10:00:00.000Z',
    inventoryCostValue: 120,
    inventorySalesValue: 240,
    potentialProfit: 120,
    originalInventoryCostValue: 120,
    originalInventorySalesValue: 240,
    originalPotentialProfit: 120,
    stockBaseUnits: 12,
    marginPercent: 50,
    ...overrides,
  }
}

describe('ProductCard', () => {
  it('mostra exclusão definitiva apenas quando o produto já está arquivado', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()

    render(
      <ProductCard
        busy={false}
        onArchive={vi.fn()}
        onDelete={onDelete}
        onEdit={vi.fn()}
        onRestore={vi.fn()}
        product={makeProduct({ active: false })}
      />,
    )

    expect(screen.getByRole('button', { name: /reativar/i })).toBeInTheDocument()
    const deleteButton = screen.getByRole('button', { name: /excluir/i })
    expect(deleteButton).toBeInTheDocument()

    await user.click(deleteButton)
    expect(onDelete).toHaveBeenCalledWith('product-1')
  })

  it('mantém apenas arquivar enquanto o produto segue ativo', () => {
    render(
      <ProductCard
        busy={false}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onRestore={vi.fn()}
        product={makeProduct({ active: true })}
      />,
    )

    expect(screen.getByRole('button', { name: /arquivar/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /excluir/i })).not.toBeInTheDocument()
  })
})
