import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DesignLabSalaoPage from './page'

const mockUseDashboardQueries = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => '/design-lab/salao',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/components/dashboard/hooks/useDashboardQueries', () => ({
  useDashboardQueries: () => mockUseDashboardQueries(),
  useDashboardSessionQuery: () => mockUseDashboardQueries().sessionQuery,
}))

describe('DesignLabSalaoPage', () => {
  it('bloqueia o salão quando nao ha sessao', () => {
    mockUseDashboardQueries.mockReturnValue({
      sessionQuery: {
        data: { user: null },
        isLoading: false,
      },
    })

    render(<DesignLabSalaoPage />)

    expect(screen.getByRole('heading', { name: 'Salão' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Prévia travada do salão' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Entrar para liberar salão/i })).toBeInTheDocument()
    expect(screen.queryByText(/Leitura por setor/i)).not.toBeInTheDocument()
  })
})
