import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DesignLabCalendarioPage from './page'

const mockUseDashboardQueries = vi.fn()

vi.mock('@/components/dashboard/hooks/useDashboardQueries', () => ({
  useDashboardQueries: () => mockUseDashboardQueries(),
  useDashboardSessionQuery: () => mockUseDashboardQueries().sessionQuery,
}))

describe('DesignLabCalendarioPage', () => {
  it('bloqueia a agenda cedo quando nao ha sessao', () => {
    mockUseDashboardQueries.mockReturnValue({
      sessionQuery: {
        data: { user: null },
        isLoading: false,
      },
    })

    render(<DesignLabCalendarioPage />)

    expect(screen.getByRole('heading', { name: 'Calendario comercial' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Prévia travada da agenda' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Entrar para liberar calendário/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Nova atividade/i })).not.toBeInTheDocument()
  })
})
