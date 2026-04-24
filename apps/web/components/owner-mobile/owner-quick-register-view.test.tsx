import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OwnerQuickRegisterView } from './owner-quick-register-view'

const mockCreateProductMutation = {
  error: null,
  isPending: false,
  mutateAsync: vi.fn(),
  reset: vi.fn(),
}
const enqueueMock = vi.fn()
const drainQueueMock = vi.fn()
const listQueueMock = vi.fn()

vi.mock('@/lib/api', () => ({
  fetchProducts: vi.fn(),
  lookupBarcodeCatalog: vi.fn(),
  searchCatalogImages: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('@/components/dashboard/hooks/useDashboardMutations', () => ({
  useDashboardMutations: () => ({
    createProductMutation: mockCreateProductMutation,
    queryClient: {
      invalidateQueries: vi.fn(),
    },
  }),
}))

vi.mock('@/components/shared/use-offline-queue', () => ({
  useOfflineQueue: () => ({
    enqueue: enqueueMock,
    drainQueue: drainQueueMock,
    listQueue: listQueueMock,
  }),
}))

describe('OwnerQuickRegisterView', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const api = await import('@/lib/api')
    vi.mocked(api.fetchProducts).mockResolvedValue({
      displayCurrency: 'BRL',
      ratesUpdatedAt: null,
      ratesSource: 'fallback',
      ratesNotice: null,
      items: [
        {
          id: 'p-1',
          name: 'Guaraná Lata',
          barcode: '7894900011517',
          brand: 'Antárctica',
          category: 'Bebidas',
          packagingClass: 'Lata 350ml',
          measurementUnit: 'UN',
          measurementValue: 1,
          unitsPerPackage: 1,
          isCombo: false,
          comboDescription: null,
          comboItems: [],
          stockPackages: 0,
          stockLooseUnits: 12,
          description: null,
          currency: 'BRL',
          displayCurrency: 'BRL',
          unitCost: 3,
          unitPrice: 5.5,
          originalUnitCost: 3,
          originalUnitPrice: 5.5,
          stock: 12,
          lowStockThreshold: null,
          isLowStock: false,
          requiresKitchen: false,
          active: true,
          createdAt: '2026-04-21T12:00:00.000Z',
          updatedAt: '2026-04-21T12:00:00.000Z',
          inventoryCostValue: 36,
          inventorySalesValue: 66,
          potentialProfit: 30,
          originalInventoryCostValue: 36,
          originalInventorySalesValue: 66,
          originalPotentialProfit: 30,
          stockBaseUnits: 12,
          marginPercent: 45,
        },
      ],
      totals: {
        totalProducts: 1,
        activeProducts: 1,
        inactiveProducts: 0,
        stockUnits: 12,
        stockPackages: 0,
        stockLooseUnits: 12,
        stockBaseUnits: 12,
        inventoryCostValue: 36,
        inventorySalesValue: 66,
        potentialProfit: 30,
        averageMarginPercent: 45,
        categories: ['Bebidas'],
      },
    })
    vi.mocked(api.lookupBarcodeCatalog).mockResolvedValue({
      barcode: '7891234567890',
      name: 'Brahma Lata',
      description: 'Cerveja lager',
      brand: 'Brahma',
      category: 'Cervejas',
      quantityLabel: '350ml',
      measurementUnit: 'ML',
      measurementValue: 350,
      packagingClass: 'Lata 350ml',
      servingSize: '269ml',
      imageUrl: 'https://images.example/brahma.jpg',
      source: 'open_food_facts',
    })
    enqueueMock.mockResolvedValue('offline-product-1')
    drainQueueMock.mockResolvedValue({
      expiredCount: 0,
      processedCount: 0,
      failedCount: 0,
    })
    listQueueMock.mockResolvedValue([])
  })

  function renderView() {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    return render(
      <QueryClientProvider client={queryClient}>
        <OwnerQuickRegisterView companyName="Desk Imperial" displayName="Wilson Owner" onBack={() => undefined} />
      </QueryClientProvider>,
    )
  }

  it('mostra alerta quando o barcode já existe no catálogo', async () => {
    renderView()

    fireEvent.change(screen.getByPlaceholderText('Aponte o leitor ou digite o EAN'), {
      target: { value: '7894900011517' },
    })

    expect(await screen.findByText('EAN já cadastrado no catálogo')).toBeInTheDocument()
    expect(screen.getAllByText('Guaraná Lata').length).toBeGreaterThan(0)
  })

  it('cadastra produto novo com barcode válido', async () => {
    mockCreateProductMutation.mutateAsync.mockResolvedValue({})
    renderView()

    fireEvent.change(screen.getByPlaceholderText('Aponte o leitor ou digite o EAN'), {
      target: { value: '7891234567890' },
    })
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Brahma 350ml' } })
    fireEvent.change(screen.getByLabelText('Marca'), { target: { value: 'Brahma' } })
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'Cervejas' } })
    fireEvent.change(screen.getByLabelText('Venda'), { target: { value: '7.5' } })
    fireEvent.change(screen.getByLabelText('Estoque'), { target: { value: '24' } })
    fireEvent.click(screen.getByRole('button', { name: /Cadastrar produto/i }))

    await waitFor(() => {
      expect(mockCreateProductMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Brahma 350ml',
          brand: 'Brahma',
          category: 'Cervejas',
          packagingClass: 'Cadastro rápido móvel',
          measurementUnit: 'UN',
          unitsPerPackage: 1,
          barcode: '7891234567890',
          unitPrice: 7.5,
          stock: 24,
        }),
      )
    })
  })

  it('preenche nome, marca e categoria ao consultar o EAN', async () => {
    const api = await import('@/lib/api')
    renderView()

    fireEvent.change(screen.getByPlaceholderText('Aponte o leitor ou digite o EAN'), {
      target: { value: '7891234567890' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Buscar dados do EAN/i }))

    await waitFor(() => {
      expect(vi.mocked(api.lookupBarcodeCatalog).mock.calls[0]?.[0]).toBe('7891234567890')
    })

    await waitFor(() => {
      expect(screen.getByLabelText('Nome')).toHaveValue('Brahma Lata')
      expect(screen.getByLabelText('Marca')).toHaveValue('Brahma')
      expect(screen.getByLabelText('Categoria')).toHaveValue('Cervejas')
    })

    expect(screen.getByText('Lata 350ml')).toBeInTheDocument()
    expect(screen.getByText('Medida 350ml')).toBeInTheDocument()
  })

  it('usa a embalagem e a medida do lookup ao salvar o produto', async () => {
    mockCreateProductMutation.mutateAsync.mockResolvedValue({})
    renderView()

    fireEvent.change(screen.getByPlaceholderText('Aponte o leitor ou digite o EAN'), {
      target: { value: '7891234567890' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Buscar dados do EAN/i }))

    await waitFor(() => {
      expect(screen.getByLabelText('Nome')).toHaveValue('Brahma Lata')
    })

    fireEvent.change(screen.getByLabelText('Venda'), { target: { value: '7.5' } })
    fireEvent.change(screen.getByLabelText('Estoque'), { target: { value: '24' } })
    fireEvent.click(screen.getByRole('button', { name: /Cadastrar produto/i }))

    await waitFor(() => {
      expect(mockCreateProductMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          barcode: '7891234567890',
          packagingClass: 'Lata 350ml',
          measurementUnit: 'ML',
          measurementValue: 350,
          description: 'Cerveja lager',
          quantityLabel: '350ml',
          servingSize: '269ml',
          imageUrl: 'https://images.example/brahma.jpg',
          catalogSource: 'open_food_facts',
        }),
      )
    })
  })

  it('coloca o produto na fila offline quando a API cai durante o cadastro', async () => {
    const api = await import('@/lib/api')
    mockCreateProductMutation.mutateAsync.mockRejectedValue(new api.ApiError('offline', 0))
    renderView()

    fireEvent.change(screen.getByPlaceholderText('Aponte o leitor ou digite o EAN'), {
      target: { value: '7891234567890' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Buscar dados do EAN/i }))

    await waitFor(() => {
      expect(screen.getByLabelText('Nome')).toHaveValue('Brahma Lata')
    })

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Brahma 350ml' } })
    fireEvent.change(screen.getByLabelText('Marca'), { target: { value: 'Brahma' } })
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'Cervejas' } })
    fireEvent.change(screen.getByLabelText('Venda'), { target: { value: '7.5' } })
    fireEvent.change(screen.getByLabelText('Estoque'), { target: { value: '24' } })
    fireEvent.click(screen.getByRole('button', { name: /Cadastrar produto/i }))

    await waitFor(() => {
      expect(enqueueMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'owner.create-product',
          payload: expect.objectContaining({
            name: 'Brahma 350ml',
            brand: 'Brahma',
            category: 'Cervejas',
            barcode: '7891234567890',
            quantityLabel: '350ml',
            servingSize: '269ml',
            imageUrl: 'https://images.example/brahma.jpg',
            catalogSource: 'open_food_facts',
            unitPrice: 7.5,
            stock: 24,
          }),
        }),
      )
    })
  })

  it('abre o scanner por câmera e mostra fallback quando o navegador não suporta BarcodeDetector', async () => {
    renderView()

    fireEvent.click(screen.getByRole('button', { name: /Escanear câmera/i }))

    expect(await screen.findByRole('dialog', { name: /Ler código pela câmera/i })).toBeInTheDocument()
    expect(screen.getAllByText(/Este navegador ainda não oferece leitura nativa por câmera/i).length).toBeGreaterThan(0)
  })
})
