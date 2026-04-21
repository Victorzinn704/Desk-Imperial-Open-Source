import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DesignLabPdvPage from './page'

const mockUseDashboardSessionQuery = vi.fn()
const mockReplace = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => new URLSearchParams('tab=comandas'),
}))

vi.mock('@/components/dashboard/hooks/useDashboardQueries', () => ({
  useDashboardSessionQuery: () => mockUseDashboardSessionQuery(),
}))

vi.mock('@/components/dashboard/environments/pdv-environment', () => ({
  PdvEnvironment: () => <div>PDV real</div>,
}))

describe('DesignLabPdvPage', () => {
  it('bloqueia o PDV quando nao ha sessao', () => {
    mockUseDashboardSessionQuery.mockReturnValue({
      data: { user: null },
      isLoading: false,
    })

    render(<DesignLabPdvPage />)

    expect(screen.getByRole('link', { name: 'Comandas abertas' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'PDV / Comandas' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Prévia travada de PDV / Comandas' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Entrar para liberar PDV/i })).toBeInTheDocument()
    expect(screen.queryByText('PDV real')).not.toBeInTheDocument()
  })

  it('monta o ambiente real quando ha sessao', () => {
    mockUseDashboardSessionQuery.mockReturnValue({
      data: { user: { userId: 'user-1', role: 'OWNER' } },
      isLoading: false,
    })

    render(<DesignLabPdvPage />)

    expect(screen.getByText('PDV real')).toBeInTheDocument()
  })
})
