import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DesignLabPortfolioPage from './page'

const mockUseDashboardQueries = vi.fn()

vi.mock('@/components/dashboard/hooks/useDashboardQueries', () => ({
  useDashboardQueries: () => mockUseDashboardQueries(),
  useDashboardSessionQuery: () => mockUseDashboardQueries().sessionQuery,
}))

vi.mock('@/components/dashboard/environments/portfolio-environment', () => ({
  PortfolioEnvironment: () => <div>Portfolio real</div>,
}))

describe('DesignLabPortfolioPage', () => {
  it('bloqueia o portfolio cedo quando nao ha sessao', () => {
    mockUseDashboardQueries.mockReturnValue({
      sessionQuery: {
        data: { user: null },
        isLoading: false,
      },
    })

    render(<DesignLabPortfolioPage />)

    expect(screen.getByRole('heading', { name: 'Portfolio de produtos' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Prévia travada do portfólio' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Entrar para liberar portfólio/i })).toBeInTheDocument()
    expect(screen.queryByText('Portfolio real')).not.toBeInTheDocument()
  })

  it('monta o ambiente real quando ha sessao', () => {
    mockUseDashboardQueries.mockReturnValue({
      sessionQuery: {
        data: { user: { id: 'user-1', role: 'OWNER' } },
        isLoading: false,
      },
    })

    render(<DesignLabPortfolioPage />)

    expect(screen.getByText('Portfolio real')).toBeInTheDocument()
  })
})
