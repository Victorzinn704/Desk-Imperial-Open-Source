import { render, screen } from '@testing-library/react'
import { Bell, Clock } from 'lucide-react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const routerReplace = vi.fn()
const queryClientClear = vi.fn()
const navigateToSection = vi.fn()
const navigateToSettings = vi.fn()
const navigateToTab = vi.fn()
const scrollIntoView = vi.fn()
const logout = vi.fn()
const useQueryMock = vi.fn()
let viewportWidth = 1600

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: routerReplace,
  }),
}))

vi.mock('next-themes', () => ({
  useTheme: () => ({
    resolvedTheme: 'light',
    setTheme: vi.fn(),
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
    activeDisplaySection: 'overview',
    activeSettingsSection: 'account',
    activeTab: 'principal',
    navigationGroups: [
      {
        id: 'sections',
        label: 'Seções',
        items: [
          { id: 'overview', label: 'Overview', description: 'Resumo do workspace', icon: Clock },
          { id: 'pdv', label: 'PDV · Comandas', description: 'Comandas', icon: Bell },
        ],
      },
    ],
    sectionTabs: [
      { id: 'principal', code: 'B1', label: 'Principal Desk Imperial', description: 'Visão principal' },
      { id: 'layout', code: 'B2', label: 'Layout padrão refinado', description: 'KPIs' },
      { id: 'meta', code: 'B3', label: 'KPI hero com meta', description: 'Meta' },
      { id: 'operacional', code: 'B4', label: 'Denso operacional', description: 'Operação' },
      { id: 'editorial', code: 'B5', label: 'Editorial diário', description: 'Agenda' },
    ],
    navigateToSection,
    navigateToSettings,
    navigateToTab,
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

  it('renderiza o layout desktop com navegação superior e sem sidebar', () => {
    const { container } = render(<DashboardShell />)

    expect(screen.queryByText(/sidebar desk imperial/i)).not.toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /seções principais/i })).toBeInTheDocument()
    expect(screen.getAllByText(/overview/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/principal desk imperial/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/ambiente ativo do dashboard/i)).toBeInTheDocument()
    expect(container.querySelector('aside')).not.toBeInTheDocument()
  })

  it('expõe hrefs explícitos para seção e subseção ativa', () => {
    render(<DashboardShell />)

    expect(screen.getByRole('link', { name: /overview/i })).toHaveAttribute(
      'href',
      '/dashboard?view=overview&tab=principal',
    )
    expect(screen.getByRole('link', { name: /principal desk imperial/i })).toHaveAttribute(
      'href',
      '/dashboard?view=overview&tab=principal',
    )
    expect(screen.getByRole('link', { name: /pdv · comandas/i })).toHaveAttribute(
      'href',
      '/dashboard?view=pdv&tab=grid',
    )
  })

  it('mantém top navigation em notebooks compactos sem entrar no modo mobile', () => {
    viewportWidth = 1365

    const { container } = render(<DashboardShell />)

    expect(screen.queryByText(/sidebar desk imperial/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/ambiente ativo do dashboard/i)).toBeInTheDocument()
    expect(container.querySelector('.wireframe-header__bar--compact')).toBeInTheDocument()
  })
})
