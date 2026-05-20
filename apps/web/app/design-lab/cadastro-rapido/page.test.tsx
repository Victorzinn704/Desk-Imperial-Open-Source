import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DesignLabCadastroRapidoPage from './page'

const mockUseDashboardQueries = vi.fn()
const mockUseDashboardMutations = vi.fn()

vi.mock('@/components/dashboard/hooks/useDashboardQueries', () => ({
  useDashboardQueries: () => mockUseDashboardQueries(),
}))

vi.mock('@/components/dashboard/hooks/useDashboardMutations', () => ({
  useDashboardMutations: () => mockUseDashboardMutations(),
}))

describe('DesignLabCadastroRapidoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('bloqueia o cadastro rapido quando nao ha sessao', () => {
    mockUseDashboardMutations.mockReturnValue({
      createProductMutation: {
        error: null,
        isPending: false,
        mutateAsync: vi.fn(),
      },
    })

    mockUseDashboardQueries.mockReturnValue({
      sessionQuery: {
        data: { user: null },
        isLoading: false,
      },
      productsQuery: {
        data: undefined,
      },
    })

    render(<DesignLabCadastroRapidoPage />)

    expect(screen.getByRole('heading', { name: 'Cadastro rápido' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Prévia travada do cadastro rápido' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Entrar para liberar cadastro/i })).toBeInTheDocument()
    expect(screen.getByText('QR/token')).toBeInTheDocument()
  })

  it('mostra a superficie operacional e cadastra produto usando a api atual', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({})

    mockUseDashboardMutations.mockReturnValue({
      createProductMutation: {
        error: null,
        isPending: false,
        mutateAsync,
      },
    })

    mockUseDashboardQueries.mockReturnValue({
      sessionQuery: {
        data: { user: { userId: 'user-1', role: 'OWNER' } },
        isLoading: false,
      },
      productsQuery: {
        data: {
          items: [],
          totals: {
            totalProducts: 0,
            activeProducts: 0,
            inactiveProducts: 0,
            stockUnits: 0,
            stockPackages: 0,
            stockLooseUnits: 0,
            stockBaseUnits: 0,
            inventoryCostValue: 0,
            inventorySalesValue: 0,
            potentialProfit: 0,
            averageMarginPercent: 0,
            categories: [],
          },
        },
        error: null,
        isFetching: false,
        isLoading: false,
      },
    })

    render(<DesignLabCadastroRapidoPage />)

    expect(screen.getByRole('heading', { name: 'Entrada rápida' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Aponte o leitor ou digite o EAN')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Produtos vindos da API' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cadastro direto no banco' })).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Aponte o leitor ou digite o EAN'), {
      target: { value: '7891234567890' },
    })
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Brahma 350ml' } })
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'Cervejas' } })
    fireEvent.change(screen.getByLabelText('Preço unitário'), { target: { value: '7.5' } })
    fireEvent.change(screen.getByLabelText('Estoque base'), { target: { value: '24' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar agora' }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Brahma 350ml',
          category: 'Cervejas',
          packagingClass: 'Cadastro rápido',
          barcode: '7891234567890',
          unitPrice: 7.5,
          stock: 24,
          measurementUnit: 'UN',
          unitsPerPackage: 1,
        }),
      )
    })
  })
})
