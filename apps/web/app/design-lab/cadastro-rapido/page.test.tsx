import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DesignLabCadastroRapidoPage from './page'

const mockUseDashboardQueries = vi.fn()

vi.mock('@/components/dashboard/hooks/useDashboardQueries', () => ({
  useDashboardQueries: () => mockUseDashboardQueries(),
}))

describe('DesignLabCadastroRapidoPage', () => {
  it('bloqueia o cadastro rapido quando nao ha sessao', () => {
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

  it('mostra a superficie operacional quando ha sessao', () => {
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
  })
})
