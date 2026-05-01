import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DesignLabIaPage from './page'

const mockUseDashboardQueries = vi.fn()

vi.mock('@/components/dashboard/hooks/useDashboardQueries', () => ({
  useDashboardQueries: () => mockUseDashboardQueries(),
  useDashboardSessionQuery: () => mockUseDashboardQueries().sessionQuery,
}))

describe('DesignLabIaPage', () => {
  it('bloqueia a IA quando nao ha sessao', () => {
    mockUseDashboardQueries.mockReturnValue({
      sessionQuery: {
        data: { user: null },
        isLoading: false,
      },
    })

    render(<DesignLabIaPage />)

    expect(screen.getByRole('heading', { name: 'Consultor IA' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Prévia travada do consultor' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Entrar para liberar IA/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Gerar consultoria/i })).not.toBeInTheDocument()
  })
})
