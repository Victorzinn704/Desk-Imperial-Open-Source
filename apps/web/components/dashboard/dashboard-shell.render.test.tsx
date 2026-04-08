import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Bell, Clock } from 'lucide-react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const routerReplace = vi.fn()
const queryClientClear = vi.fn()
const navigateToSection = vi.fn()
const navigateToSettings = vi.fn()
const scrollIntoView = vi.fn()
const logout = vi.fn()
const useQueryMock = vi.fn()
let viewportWidth = 1600

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: routerReplace,
  }),
}))

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query')
  return {
    ...actual,
    useQuery: (...args: unknown[]) => useQueryMock(...args),
    useQueryClient: () => ({
      clear: queryClientClear,
    }),
  }
})

vi.mock('@/components/dashboard/hooks', () => ({
  useDashboardMutations: () => ({
    logoutMutation: {},
  }),
}))

vi.mock('@/components/dashboard/hooks/useMobileDetection', () => ({
  COMPACT_DESKTOP_BREAKPOINT: 1366,
  useMobileDetection: (breakpoint = 1024) => ({ isMobile: viewportWidth < breakpoint }),
}))

vi.mock('@/components/dashboard/hooks/useDashboardNavigation', () => ({
  useDashboardNavigation: () => ({
    activeSection: 'overview',
    activeSettingsSection: 'account',
    navigationGroups: [
      {
        items: [{ id: 'overview', label: 'Visão geral', description: 'Resumo do workspace', icon: Clock }],
      },
    ],
    quickActions: [
      {
        id: 'sales',
        label: 'Ir para vendas',
        description: 'Abrir ambiente comercial',
        icon: Bell,
        target: 'sales',
      },
    ],
    navigateToSection,
    navigateToSettings,
  }),
}))

vi.mock('@/components/dashboard/hooks/useDashboardQueries', () => ({
  useDashboardScopedQueries: () => ({
    consentQuery: {
      data: {
        legalAcceptances: [{ id: 'acc-1' }],
        documents: [{ id: 'doc-1', required: true }],
      },
    },
    productsQuery: { data: { totals: { activeProducts: 12 } } },
    ordersQuery: { data: { totals: { completedOrders: 8 } } },
    employeesQuery: { data: { items: [] } },
    financeQuery: {
      data: {
        displayCurrency: 'BRL',
        totals: {
          currentMonthRevenue: 12500,
          lowStockItems: 3,
        },
      },
    },
  }),
}))

vi.mock('@/components/dashboard/hooks/useScrollMemory', () => ({
  useScrollMemory: () => ({
    scrollRef: { current: null },
    onScroll: vi.fn(),
    scrollIntoView,
  }),
}))

vi.mock('@/components/dashboard/hooks/useEvaluationCountdown', () => ({
  useEvaluationCountdown: () => ({
    remainingSeconds: 0,
    isEvaluation: false,
  }),
}))

vi.mock('@/components/dashboard/hooks/useDashboardLogout', () => ({
  useDashboardLogout: () => ({
    logout,
    isPending: false,
    startTransition: (callback: () => void) => callback(),
  }),
}))

vi.mock('@/components/dashboard/dashboard-environments', () => ({
  renderActiveEnvironment: () => <section>Ambiente ativo do dashboard</section>,
}))

vi.mock('@/components/operations/use-operations-realtime', () => ({
  useOperationsRealtime: vi.fn(),
}))

vi.mock('@/components/dashboard/dashboard-sidebar', () => ({
  DashboardSidebar: ({ companyName }: { companyName: string }) => <aside>Sidebar {companyName}</aside>,
}))

vi.mock('@/components/dashboard/activity-timeline', () => ({
  ActivityTimeline: ({ onClose }: { onClose: () => void }) => (
    <button type="button" onClick={onClose}>
      Timeline stub
    </button>
  ),
}))

import { DashboardShell } from './dashboard-shell'

describe('DashboardShell render path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    viewportWidth = 1600
    useQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        user: {
          userId: 'owner-1',
          fullName: 'Pedro Alves',
          companyName: 'Desk Imperial',
          email: 'owner@deskimperial.com',
          emailVerified: true,
          preferredCurrency: 'BRL',
          role: 'OWNER',
          status: 'ACTIVE',
          evaluationAccess: null,
        },
      },
    })
  })

  it('renderiza o layout desktop com header, sidebar e timeline', async () => {
    const user = userEvent.setup()

    const { container } = render(<DashboardShell />)

    expect(screen.getByText(/sidebar desk imperial/i)).toBeInTheDocument()
    expect(screen.getByText(/visão consolidada da empresa/i)).toBeInTheDocument()
    expect(screen.getByText(/r\$ 12.500,00/i)).toBeInTheDocument()
    expect(screen.getByText(/ambiente ativo do dashboard/i)).toBeInTheDocument()
    expect(container.querySelector('.workspace-shell')?.getAttribute('style')).toContain('224px')

    await user.click(screen.getByRole('button', { name: /ir para vendas/i }))
    expect(navigateToSection).toHaveBeenCalledWith('sales')

    await user.click(screen.getByRole('button', { name: /atividades/i }))
    expect(screen.getByRole('button', { name: /timeline stub/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /timeline stub/i }))
    expect(screen.queryByRole('button', { name: /timeline stub/i })).not.toBeInTheDocument()
  })

  it('encolhe o shell em notebooks compactos sem entrar no modo mobile', () => {
    viewportWidth = 1365

    const { container } = render(<DashboardShell />)

    expect(screen.getByText(/sidebar desk imperial/i)).toBeInTheDocument()
    expect(screen.queryByText(/ambiente ativo do dashboard/i)).toBeInTheDocument()
    expect(container.querySelector('.workspace-shell')?.getAttribute('style')).toContain('64px')
  })
})
