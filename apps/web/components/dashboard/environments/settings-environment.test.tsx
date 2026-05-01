import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'
import { SettingsEnvironment } from './settings-environment'

const mockUseDashboardQueries = vi.fn()
const mockUseDashboardMutations = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock('@/components/dashboard/hooks/useDashboardQueries', () => ({
  useDashboardQueries: () => mockUseDashboardQueries(),
}))

vi.mock('@/components/dashboard/hooks/useDashboardMutations', () => ({
  useDashboardMutations: () => mockUseDashboardMutations(),
}))

describe('SettingsEnvironment', () => {
  it('mostra preview travado quando nao ha sessao', () => {
    mockUseDashboardQueries.mockReturnValue({
      sessionQuery: {
        data: { user: null },
        error: null,
      },
      consentQuery: {
        data: undefined,
        isLoading: false,
      },
    })

    mockUseDashboardMutations.mockReturnValue({
      logoutMutation: { isPending: false, mutate: vi.fn() },
      preferenceMutation: {},
      updateProfileMutation: { isPending: false, error: null, mutate: vi.fn() },
    })

    render(
      <SettingsEnvironment
        activeSettingsSection="account"
        onNavigateSection={vi.fn()}
        onSettingsSectionChange={vi.fn()}
        presentation="lab"
      />,
    )

    expect(screen.getByRole('heading', { name: 'Configuração do workspace' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Configuração bloqueada' })).toBeInTheDocument()
    expect(screen.getAllByText(/@Desk_Imperial_bot/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /Entrar para liberar config/i })).toBeInTheDocument()
  })

  it('nao vaza detalhes de localhost quando a api falha', () => {
    mockUseDashboardQueries.mockReturnValue({
      sessionQuery: {
        data: { user: null },
        error: new ApiError('localhost:4000 offline', 0),
      },
      consentQuery: {
        data: undefined,
        isLoading: false,
      },
    })

    mockUseDashboardMutations.mockReturnValue({
      logoutMutation: { isPending: false, mutate: vi.fn() },
      preferenceMutation: {},
      updateProfileMutation: { isPending: false, error: null, mutate: vi.fn() },
    })

    render(
      <SettingsEnvironment
        activeSettingsSection="account"
        onNavigateSection={vi.fn()}
        onSettingsSectionChange={vi.fn()}
        presentation="lab"
      />,
    )

    expect(
      screen.getAllByText('As configurações não estão disponíveis no momento. Tente novamente em instantes.'),
    ).not.toHaveLength(0)
    expect(screen.queryByText(/localhost:4000/i)).not.toBeInTheDocument()
  })
})
