import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DesignLabPedidosPage from './page'

const mockUseDashboardSessionQuery = vi.fn()

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('tab=kanban'),
}))

vi.mock('@/components/dashboard/hooks/useDashboardQueries', () => ({
  useDashboardSessionQuery: () => mockUseDashboardSessionQuery(),
}))

vi.mock('@/components/dashboard/environments/pedidos-environment', () => ({
  PedidosEnvironment: () => <div>Pedidos real</div>,
}))

describe('DesignLabPedidosPage', () => {
  it('bloqueia pedidos quando nao ha sessao', () => {
    mockUseDashboardSessionQuery.mockReturnValue({
      data: { user: null },
      isLoading: false,
    })

    render(<DesignLabPedidosPage />)

    expect(screen.getByRole('link', { name: /Kanban/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pedidos' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Prévia travada de Pedidos' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Entrar para liberar pedidos/i })).toBeInTheDocument()
    expect(screen.queryByText('Pedidos real')).not.toBeInTheDocument()
  })

  it('monta o ambiente real quando ha sessao', () => {
    mockUseDashboardSessionQuery.mockReturnValue({
      data: { user: { userId: 'user-1', role: 'OWNER' } },
      isLoading: false,
    })

    render(<DesignLabPedidosPage />)

    expect(screen.getByText('Pedidos real')).toBeInTheDocument()
  })
})
