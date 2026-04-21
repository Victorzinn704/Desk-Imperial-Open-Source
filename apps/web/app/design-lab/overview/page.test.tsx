import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DesignLabOverviewPage from './page'

const mockUseDashboardSessionQuery = vi.fn()

vi.mock('@/components/dashboard/hooks/useDashboardQueries', () => ({
  useDashboardSessionQuery: () => mockUseDashboardSessionQuery(),
}))

vi.mock('@/components/dashboard/environments/overview-environment', () => ({
  DesignLabOverviewEnvironment: () => <div>Overview real</div>,
}))

describe('DesignLabOverviewPage', () => {
  it('bloqueia o overview quando nao ha sessao', () => {
    mockUseDashboardSessionQuery.mockReturnValue({
      data: { user: null },
      isLoading: false,
    })

    render(<DesignLabOverviewPage />)

    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Prévia travada de Overview' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Entrar para liberar overview/i })).toBeInTheDocument()
    expect(screen.queryByText('Overview real')).not.toBeInTheDocument()
  })

  it('monta o ambiente real quando ha sessao', () => {
    mockUseDashboardSessionQuery.mockReturnValue({
      data: { user: { userId: 'user-1', role: 'OWNER' } },
      isLoading: false,
    })

    render(<DesignLabOverviewPage />)

    expect(screen.getByText('Overview real')).toBeInTheDocument()
  })
})
