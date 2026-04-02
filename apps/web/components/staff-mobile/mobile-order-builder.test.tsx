import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ProductRecord } from '@contracts/contracts'
import { MobileOrderBuilder } from './mobile-order-builder'

function buildProduct(partial: Partial<ProductRecord> & { id: string; name: string; category: string }): ProductRecord {
  return {
    id: partial.id,
    name: partial.name,
    brand: null,
    category: partial.category,
    packagingClass: 'UNIT',
    measurementUnit: 'un',
    measurementValue: 1,
    unitsPerPackage: 1,
    stockPackages: 20,
    stockLooseUnits: 0,
    description: null,
    currency: 'BRL',
    displayCurrency: 'BRL',
    unitCost: 5,
    unitPrice: partial.unitPrice ?? 12,
    originalUnitCost: 5,
    originalUnitPrice: partial.unitPrice ?? 12,
    stock: 20,
    lowStockThreshold: null,
    isLowStock: false,
    requiresKitchen: false,
    active: true,
    createdAt: '2026-04-02T12:00:00.000Z',
    updatedAt: '2026-04-02T12:00:00.000Z',
    inventoryCostValue: 100,
    inventorySalesValue: 240,
    potentialProfit: 140,
    originalInventoryCostValue: 100,
    originalInventorySalesValue: 240,
    originalPotentialProfit: 140,
    stockBaseUnits: 20,
    marginPercent: 140,
    isCombo: false,
    comboDescription: null,
    comboItems: [],
  }
}

describe('MobileOrderBuilder', () => {
  it('mostra categorias primeiro e só abre a lista da classe escolhida', async () => {
    const user = userEvent.setup()

    render(
      <MobileOrderBuilder
        mesaLabel="7"
        mode="new"
        produtos={[
          buildProduct({ id: 'prod-1', name: 'Espresso', category: 'Bebidas' }),
          buildProduct({ id: 'prod-2', name: 'Brownie', category: 'Sobremesas' }),
        ]}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByText(/Escolha uma categoria/i)).toBeInTheDocument()
    expect(screen.queryByText('Espresso')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Bebidas/i }))

    expect(await screen.findByText('Espresso')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Categorias/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Sobremesas/i })).not.toBeInTheDocument()
  })
})
