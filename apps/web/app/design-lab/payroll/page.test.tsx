import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DesignLabPayrollPage from './page'

const mockUseDashboardQueries = vi.fn()

vi.mock('@/components/dashboard/hooks/useDashboardQueries', () => ({
  useDashboardQueries: () => mockUseDashboardQueries(),
}))

describe('DesignLabPayrollPage', () => {
  it('bloqueia a folha quando nao ha sessao', () => {
    mockUseDashboardQueries.mockReturnValue({
      sessionQuery: {
        data: { user: null },
        isLoading: false,
      },
      employeesQuery: { data: undefined },
      financeQuery: { data: undefined },
    })

    render(<DesignLabPayrollPage />)

    expect(screen.getByRole('heading', { name: 'Folha de pagamento' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Prévia travada da folha' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Entrar para liberar folha/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Marcar todos/i })).not.toBeInTheDocument()
  })
})
