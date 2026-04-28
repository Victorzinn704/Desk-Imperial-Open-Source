import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import type { ProductRecord } from '@contracts/contracts'
import type * as ApiModule from '@/lib/api'
import { MobileOrderBuilder } from './mobile-order-builder'

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof ApiModule>('@/lib/api')
  return {
    ...actual,
    searchCatalogImages: vi.fn().mockResolvedValue([]),
  }
})

function makeProduct(overrides: Partial<ProductRecord>): ProductRecord {
  return {
    id: 'product-1',
    name: 'Produto',
    brand: null,
    category: 'Categoria',
    packagingClass: 'UNIT',
    measurementUnit: 'UN',
    measurementValue: 1,
    unitsPerPackage: 1,
    stockPackages: 10,
    stockLooseUnits: 0,
    description: null,
    currency: 'BRL',
    displayCurrency: 'BRL',
    unitCost: 5,
    unitPrice: 10,
    originalUnitCost: 5,
    originalUnitPrice: 10,
    stock: 10,
    lowStockThreshold: null,
    isLowStock: false,
    requiresKitchen: false,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    inventoryCostValue: 50,
    inventorySalesValue: 100,
    potentialProfit: 50,
    originalInventoryCostValue: 50,
    originalInventorySalesValue: 100,
    originalPotentialProfit: 50,
    stockBaseUnits: 10,
    marginPercent: 50,
    ...overrides,
  }
}

describe('MobileOrderBuilder', () => {
  it('renders categories ordered with pt-BR locale semantics', () => {
    renderWithQueryClient(
      <MobileOrderBuilder
        mesaLabel="12"
        mode="new"
        produtos={[
          makeProduct({ id: '1', category: 'Zebra', name: 'Z item' }),
          makeProduct({ id: '2', category: 'Água', name: 'Á item' }),
          makeProduct({ id: '3', category: 'Bebidas', name: 'B item' }),
        ]}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    const categoryButtons = screen
      .getAllByRole('button')
      .filter((button) => ['Todos', 'Água', 'Bebidas', 'Zebra'].includes(button.textContent ?? ''))

    expect(categoryButtons.map((button) => button.textContent?.trim())).toEqual(['Todos', 'Água', 'Bebidas', 'Zebra'])
  })

  it('matches categories and names accent-insensitively when searching', () => {
    renderWithQueryClient(
      <MobileOrderBuilder
        mesaLabel="7"
        mode="new"
        produtos={[
          makeProduct({ id: '1', category: 'Água', name: 'Suco do dia' }),
          makeProduct({ id: '2', category: 'Água', name: 'Açaí especial' }),
        ]}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Água/i }))

    const searchInput = screen.getByPlaceholderText('Buscar em Água...')
    fireEvent.change(searchInput, { target: { value: 'agua' } })

    expect(screen.getByText('Suco do dia')).toBeInTheDocument()

    fireEvent.change(searchInput, { target: { value: 'acai' } })

    expect(screen.getByText('Açaí especial')).toBeInTheDocument()
  })

  it('navigates categories, updates cart quantities, and submits selected items', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    renderWithQueryClient(
      <MobileOrderBuilder
        mesaLabel="9"
        mode="add"
        produtos={[
          makeProduct({ id: '1', category: 'Petiscos', name: 'Coxinha' }),
          makeProduct({
            id: '2',
            category: 'Petiscos',
            name: 'Combo Imperial',
            isCombo: true,
            comboDescription: '2 salgados + 1 refri',
            comboItems: [
              {
                componentProductId: 'comp-1',
                componentProductName: 'Refrigerante',
                packagingClass: 'UNIT',
                measurementUnit: 'UN',
                measurementValue: 1,
                unitsPerPackage: 1,
                quantityPackages: 0,
                quantityUnits: 2,
                totalUnits: 2,
              },
            ],
          }),
          makeProduct({ id: '3', category: 'Sobremesas', name: 'Pudim' }),
          makeProduct({ id: '4', category: 'Oculto', name: 'Inativo', active: false }),
        ]}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.queryByText('Oculto')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /petiscos/i }))

    expect(screen.getByPlaceholderText('Buscar em Petiscos...')).toBeInTheDocument()
    expect(screen.getByText(/2 salgados \+ 1 refri/i)).toBeInTheDocument()
    expect(screen.getByText(/Refrigerante \(2 und\)/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /adicionar coxinha/i }))
    await user.click(screen.getByRole('button', { name: /adicionar coxinha/i }))
    await user.click(screen.getByRole('button', { name: /remover coxinha/i }))
    await user.click(screen.getByRole('button', { name: /adicionar combo imperial/i }))

    expect(screen.getByText('2 itens')).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes('20,00'))).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^todos$/i }))
    expect(screen.getByPlaceholderText('Buscar produto...')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /adicionar itens/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith([
        expect.objectContaining({ produtoId: '1', nome: 'Coxinha', quantidade: 1, precoUnitario: 10 }),
        expect.objectContaining({ produtoId: '2', nome: 'Combo Imperial', quantidade: 1, precoUnitario: 10 }),
      ])
    })
  })

  it('shows busy state, allows cancel, and handles empty active catalog', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onSubmit = vi.fn()

    const { rerender } = renderWithQueryClient(
      <MobileOrderBuilder
        busy
        mesaLabel="11"
        mode="new"
        produtos={[makeProduct({ id: 'inactive-1', active: false, category: 'Ocultos', name: 'Fora de linha' })]}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByText(/nenhum produto ativo no catálogo/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /abrir comanda/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)

    rerender(
      withQueryClient(
        <MobileOrderBuilder
          mesaLabel="11"
          mode="new"
          produtos={[makeProduct({ id: 'pet-1', category: 'Petiscos', name: 'Pastel' })]}
          onCancel={onCancel}
          onSubmit={onSubmit}
        />,
      ),
    )

    await user.click(screen.getByRole('button', { name: /petiscos/i }))
    await user.type(screen.getByPlaceholderText('Buscar em Petiscos...'), 'nao-existe')

    expect(screen.getByText(/nenhum produto encontrado/i)).toBeInTheDocument()
  })

  it('renders category icon paths and clears the cart when the last item is removed', async () => {
    const user = userEvent.setup()

    renderWithQueryClient(
      <MobileOrderBuilder
        mesaLabel="15"
        mode="new"
        produtos={[
          makeProduct({ id: 'beer-1', category: 'Cerveja', name: 'Pilsen' }),
          makeProduct({ id: 'wine-1', category: 'Vinho', name: 'Cabernet' }),
          makeProduct({ id: 'combo-1', category: 'Combo', name: 'Combo da Casa' }),
          makeProduct({ id: 'pizza-1', category: 'Pizza', name: 'Margherita' }),
        ]}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /cerveja/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /vinho/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^combo$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pizza/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /pizza/i }))
    await user.click(screen.getByRole('button', { name: /adicionar margherita/i }))
    expect(screen.getByRole('button', { name: /abrir comanda/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /remover margherita/i }))

    expect(screen.queryByRole('button', { name: /abrir comanda/i })).not.toBeInTheDocument()
  })

  it('renders owner summary strip and secondary action without breaking the base flow', async () => {
    const user = userEvent.setup()
    const onSecondaryAction = vi.fn()

    renderWithQueryClient(
      <MobileOrderBuilder
        mesaLabel="21"
        mode="new"
        produtos={[makeProduct({ id: 'beer-1', category: 'Cerveja', name: 'Pilsen' })]}
        secondaryAction={{ label: 'Cadastro rápido', onClick: onSecondaryAction }}
        summaryItems={[
          { label: 'Mesa', value: '21', tone: '#008cff' },
          { label: 'Livres', value: '4', tone: '#36f57c' },
          { label: 'Na fila', value: '2', tone: '#eab308' },
        ]}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText('Cadastro rápido')).toBeInTheDocument()
    expect(screen.getByText('Livres')).toBeInTheDocument()
    expect(screen.getByText('Na fila')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Cadastro rápido/i }))

    expect(onSecondaryAction).toHaveBeenCalledTimes(1)
  })

  it('só mostra o dock de abertura depois que o carrinho recebe itens', async () => {
    const user = userEvent.setup()

    renderWithQueryClient(
      <MobileOrderBuilder
        mesaLabel="30"
        mode="new"
        produtos={[makeProduct({ id: 'beer-1', category: 'Cerveja', name: 'Pilsen' })]}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: /abrir comanda/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /adicionar pilsen/i }))

    expect(screen.getByTestId('mobile-order-checkout-dock')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /abrir comanda/i })).toBeInTheDocument()
    expect(screen.getByText('Abrir')).toBeInTheDocument()
  })
})

function renderWithQueryClient(ui: React.ReactElement) {
  return render(withQueryClient(ui))
}

function withQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
}
