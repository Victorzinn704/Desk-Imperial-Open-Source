import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DesignLabCaixaPage from './page'

const mockUseDashboardQueries = vi.fn()
const mockUseQuery = vi.fn()

vi.mock('@/components/dashboard/hooks/useDashboardQueries', () => ({
  useDashboardQueries: () => mockUseDashboardQueries(),
  useDashboardSessionQuery: () => mockUseDashboardQueries().sessionQuery,
}))

vi.mock('@tanstack/react-query', () => ({
  keepPreviousData: Symbol('keepPreviousData'),
  useQuery: () => mockUseQuery(),
}))

describe('DesignLabCaixaPage', () => {
  it('bloqueia o caixa cedo quando nao ha sessao', () => {
    mockUseDashboardQueries.mockReturnValue({
      sessionQuery: {
        data: { user: null },
        isLoading: false,
      },
    })

    mockUseQuery.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: false,
    })

    render(<DesignLabCaixaPage />)

    expect(screen.getByRole('heading', { name: 'Caixa' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Prévia travada do caixa' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Entrar para liberar caixa/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Abrir caixa/i })).not.toBeInTheDocument()
  })
})
