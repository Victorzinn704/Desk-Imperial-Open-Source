import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DesignLabFinanceiroPage from './page'

const mockUseDashboardSessionQuery = vi.fn()

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('tab=mapa'),
}))

vi.mock('@/components/dashboard/hooks/useDashboardQueries', () => ({
  useDashboardSessionQuery: () => mockUseDashboardSessionQuery(),
}))

vi.mock('@/components/dashboard/environments/financeiro-environment', () => ({
  FinanceiroEnvironment: () => <div>Financeiro real</div>,
}))

vi.mock('@/components/dashboard/environments/map-environment', () => ({
  MapEnvironment: () => <div>Mapa real</div>,
}))

describe('DesignLabFinanceiroPage', () => {
  it('bloqueia financeiro quando nao ha sessao', () => {
    mockUseDashboardSessionQuery.mockReturnValue({
      data: { user: null },
      isLoading: false,
    })

    render(<DesignLabFinanceiroPage />)

    expect(screen.getByRole('link', { name: 'Mapa territorial' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Financeiro' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Prévia travada de Financeiro' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Entrar para liberar financeiro/i })).toBeInTheDocument()
    expect(screen.queryByText('Mapa real')).not.toBeInTheDocument()
  })

  it('monta o ambiente real quando ha sessao', () => {
    mockUseDashboardSessionQuery.mockReturnValue({
      data: { user: { userId: 'user-1', role: 'OWNER' } },
      isLoading: false,
    })

    render(<DesignLabFinanceiroPage />)

    expect(screen.getByText('Mapa real')).toBeInTheDocument()
  })
})
