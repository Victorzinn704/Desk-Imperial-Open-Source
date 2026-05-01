import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DesignLabEquipePage from './page'

const mockUseDashboardQueries = vi.fn()

vi.mock('@/components/dashboard/hooks/useDashboardQueries', () => ({
  useDashboardQueries: () => mockUseDashboardQueries(),
}))

describe('DesignLabEquipePage', () => {
  it('bloqueia a equipe quando nao ha sessao', () => {
    mockUseDashboardQueries.mockReturnValue({
      sessionQuery: {
        data: { user: null },
        isLoading: false,
      },
      employeesQuery: { data: undefined },
      financeQuery: { data: undefined },
    })

    render(<DesignLabEquipePage />)

    expect(screen.getByRole('heading', { name: 'Equipe e desempenho' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Prévia travada da equipe' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Entrar para liberar equipe/i })).toBeInTheDocument()
    expect(screen.queryByText(/Sem colaboradores ativos no workspace/i)).not.toBeInTheDocument()
  })
})
