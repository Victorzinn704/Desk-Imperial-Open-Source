'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowUpRight, Clock, LogOut, TimerReset } from 'lucide-react'
import { ApiError, fetchCurrentUser } from '@/lib/api'
import { useDashboardMutations } from '@/components/dashboard/hooks'
import { useMobileDetection } from '@/components/dashboard/hooks/useMobileDetection'
import { useDashboardNavigation } from '@/components/dashboard/hooks/useDashboardNavigation'
import { useDashboardScopedQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { useScrollMemory } from '@/components/dashboard/hooks/useScrollMemory'
import { useEvaluationCountdown } from '@/components/dashboard/hooks/useEvaluationCountdown'
import { useDashboardLogout } from '@/components/dashboard/hooks/useDashboardLogout'
import { formatCurrency } from '@/lib/currency'
import { BrandMark } from '@/components/shared/brand-mark'
import { VerifyEmailForm } from '@/components/auth/verify-email-form'
import { Button } from '@/components/shared/button'
import { SpotlightButton } from '@/components/shared/spotlight-button'
import { renderActiveEnvironment } from '@/components/dashboard/dashboard-environments'
import { useOperationsRealtime } from '@/components/operations/use-operations-realtime'
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar'
import { DashboardTopbar } from '@/components/dashboard/dashboard-topbar'
import {
  dashboardDefaultSection,
  dashboardDefaultSettingsSection,
  type DashboardQuickAction,
  type DashboardSectionId,
  type DashboardSettingsSectionId,
} from '@/components/dashboard/dashboard-navigation'
import { ActivityTimeline } from '@/components/dashboard/activity-timeline'

const StaffMobileShell = dynamic(() => import('@/components/staff-mobile').then((module) => module.StaffMobileShell), {
  ssr: false,
  loading: () => <MobileShellLoadingState label="Carregando operacional mobile..." />,
})

const OwnerMobileShell = dynamic(
  () => import('@/components/owner-mobile/owner-mobile-shell').then((module) => module.OwnerMobileShell),
  {
    ssr: false,
    loading: () => <MobileShellLoadingState label="Carregando painel mobile..." />,
  },
)

// ── Static hero copy per section ────────────────────────────────────────────────

const sectionHeroCopy: Record<DashboardSectionId, { badge: string; title: string; description: string }> = {
  overview: {
    badge: 'Ambiente executivo',
    title: 'Visão consolidada da empresa em um único ambiente.',
    description: 'Financeiro, indicadores e operação para leitura rápida.',
  },
  sales: {
    badge: 'Ambiente comercial',
    title: 'Pedidos e vendas em um módulo exclusivo da operação.',
    description: 'Registro de vendas, pedidos recentes e resultado realizado.',
  },
  portfolio: {
    badge: 'Ambiente de portfólio',
    title: 'Produtos, estoque e margem organizados em um fluxo próprio.',
    description: 'Cadastro, rentabilidade e estrutura que sustenta o caixa.',
  },
  pdv: {
    badge: 'Ponto de venda',
    title: 'Comandas e atendimento em tempo real.',
    description: 'Comandas, preparo e fechamento em tempo real.',
  },
  calendario: {
    badge: 'Agenda comercial',
    title: 'Planeje eventos, promoções e jogos no calendário.',
    description: 'Eventos, jogos, promoções e impacto previsto em vendas.',
  },
  payroll: {
    badge: 'Folha operacional',
    title: 'Salários, comissões e fechamento da equipe em um único fluxo.',
    description: 'Base salarial, comissão variável e fechamento da equipe.',
  },
  salao: {
    badge: 'Gestão do salão',
    title: 'Mesas, capacidade e planta baixa.',
    description: 'Organize mesas, capacidade e planta baixa do salão.',
  },
  map: {
    badge: 'Inteligência territorial',
    title: 'Mapa de vendas — território de guerra.',
    description: 'Concentração geográfica das vendas por cidade e estado.',
  },
  settings: {
    badge: 'Conta e governança',
    title: 'Configurações, segurança e conformidade em uma única central.',
    description: 'Conta, preferências, sessão e consentimento no mesmo lugar.',
  },
}

type DashboardSignal = {
  label: string
  value: string
  helper: string
}

type DashboardCurrency = Parameters<typeof formatCurrency>[1]

type ActiveNavigationSummary = {
  id: string
  label: string
  description: string
  icon: typeof Clock
}

const settingsNavigationFallback: ActiveNavigationSummary = {
  id: 'settings',
  label: 'Conta e preferências',
  description: 'Conta, segurança e conformidade',
  icon: Clock,
}

export function getSessionErrorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Conecte a API e autentique a sessão para ver o painel.'
}

export function resolveActiveNavigation(
  activeSection: DashboardSectionId,
  navigationGroups: Array<{ items: ActiveNavigationSummary[] }>,
) {
  const fallbackNavigation = activeSection === 'settings' ? settingsNavigationFallback : navigationGroups[0]?.items[0]
  return (
    navigationGroups.flatMap((group) => group.items).find((item) => item.id === activeSection) ?? fallbackNavigation
  )
}

function buildStaffDashboardSignals(
  activeSection: DashboardSectionId,
  ordersCompleted: number,
  productsActive: number,
): DashboardSignal[] {
  const isSalesSection = activeSection === 'sales'
  const isPdvSection = activeSection === 'pdv'

  return [
    {
      label: isSalesSection ? 'Pedidos' : 'Operação',
      value: String(ordersCompleted),
      helper: isSalesSection ? 'operações concluídas no workspace' : 'painel sincronizado com trilha operacional',
    },
    {
      label: isPdvSection ? 'PDV vivo' : 'Portfólio',
      value: isPdvSection ? 'Ao vivo' : String(productsActive),
      helper: isPdvSection ? 'comandas e mesas em atualização contínua' : 'produtos ativos para venda',
    },
    { label: 'Perfil', value: 'Staff', helper: 'acesso operacional com auditoria' },
  ]
}

function getAccountSignalValue(
  activeSection: DashboardSectionId,
  companyName: string,
  legalAcceptancesCount: number,
  requiredDocumentCount: number,
) {
  if (activeSection !== 'settings') {
    return companyName
  }

  return requiredDocumentCount ? `${legalAcceptancesCount}/${requiredDocumentCount}` : '0/0'
}

function getAccountSignalHelper(activeSection: DashboardSectionId) {
  return activeSection === 'settings' ? 'aceites exigidos no sistema' : 'identidade principal do portal'
}

function buildOwnerDashboardSignals({
  activeNavigationLabel,
  activeSection,
  companyName,
  displayCurrency,
  finance,
  legalAcceptancesCount,
  requiredDocumentCount,
}: Readonly<{
  activeNavigationLabel: string
  activeSection: DashboardSectionId
  companyName: string
  displayCurrency: DashboardCurrency
  finance: ReturnType<typeof useDashboardScopedQueries>['financeQuery']['data']
  legalAcceptancesCount: number
  requiredDocumentCount: number
}>): DashboardSignal[] {
  const hasFinance = Boolean(finance)
  const financeTotals = finance?.totals

  return [
    {
      label: hasFinance ? 'Receita do mes' : 'Workspace',
      value: hasFinance
        ? formatCurrency(financeTotals?.currentMonthRevenue ?? 0, displayCurrency)
        : activeNavigationLabel,
      helper: hasFinance ? 'resultado bruto do período' : 'seção ativa do centro operacional',
    },
    {
      label: hasFinance ? 'Estoque baixo' : 'Status',
      value: hasFinance ? String(financeTotals?.lowStockItems ?? 0) : 'Ativo',
      helper: hasFinance ? 'itens para reposição rápida' : 'sessão segura e pronta para operar',
    },
    {
      label: activeSection === 'settings' ? 'Documentos' : 'Conta',
      value: getAccountSignalValue(activeSection, companyName, legalAcceptancesCount, requiredDocumentCount),
      helper: getAccountSignalHelper(activeSection),
    },
  ]
}

export function buildDashboardSignals({
  activeNavigationLabel,
  activeSection,
  companyName,
  displayCurrency,
  finance,
  isStaffUser,
  legalAcceptancesCount,
  ordersCompleted,
  productsActive,
  requiredDocumentCount,
}: Readonly<{
  activeNavigationLabel: string
  activeSection: DashboardSectionId
  companyName: string
  displayCurrency: DashboardCurrency
  finance: ReturnType<typeof useDashboardScopedQueries>['financeQuery']['data']
  isStaffUser: boolean
  legalAcceptancesCount: number
  ordersCompleted: number
  productsActive: number
  requiredDocumentCount: number
}>): DashboardSignal[] {
  if (isStaffUser) {
    return buildStaffDashboardSignals(activeSection, ordersCompleted, productsActive)
  }

  return buildOwnerDashboardSignals({
    activeNavigationLabel,
    activeSection,
    companyName,
    displayCurrency,
    finance,
    legalAcceptancesCount,
    requiredDocumentCount,
  })
}

export function DashboardWorkspaceHeader({
  activeHero,
  activeNavigationLabel,
  handleQuickAction,
  isLoggingOut,
  isTimelineOpen,
  logout,
  quickActions,
  setIsTimelineOpen,
  signals,
}: Readonly<{
  activeHero: (typeof sectionHeroCopy)[DashboardSectionId]
  activeNavigationLabel: string
  handleQuickAction: (action: DashboardQuickAction) => void
  isLoggingOut: boolean
  isTimelineOpen: boolean
  logout: () => void
  quickActions: DashboardQuickAction[]
  setIsTimelineOpen: (value: boolean) => void
  signals: DashboardSignal[]
}>) {
  return (
    <header
      className="rounded-xl border border-gray-200 bg-white dark:bg-white/[0.02] dark:border-white/5 p-6 md:p-8 shadow-sm dark:shadow-none"
      id="workspace-header"
    >
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            <span className="size-2 rounded-full bg-accent" />
            {activeHero.badge}
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-muted-foreground">
            Início / Painel operacional / {activeNavigationLabel}
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold text-gray-900 dark:text-[var(--text-primary)] sm:text-5xl">
            {activeHero.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-gray-600 dark:text-muted-foreground">
            {activeHero.description}
          </p>
        </div>

        <div className="flex flex-col gap-6 xl:max-w-[520px]">
          <div className="flex divide-x divide-gray-200 dark:divide-white/5">
            {signals.map((signal) => (
              <div className="flex-1 px-4 first:pl-0 last:pr-0" key={signal.label}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-muted-foreground">
                  {signal.label}
                </p>
                <p className="mt-3 text-2xl font-semibold text-gray-900 dark:text-[var(--text-primary)]">
                  {signal.value}
                </p>
                <p className="mt-2 text-xs leading-6 text-gray-500 dark:text-muted-foreground">{signal.helper}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  className="workspace-quick-action flex-1 sm:min-w-[150px] border-gray-200 bg-gray-50 dark:border-white/5 dark:bg-white/[0.02]"
                  key={action.id}
                  onClick={() => handleQuickAction(action)}
                  type="button"
                >
                  <span className="workspace-quick-action__icon border-gray-200 bg-white text-gray-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-[var(--text-primary)]">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-semibold text-gray-900 dark:text-[var(--text-primary)]">
                      {action.label}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/">
              <Button size="lg" variant="ghost">
                Ver site
                <ArrowUpRight className="size-4" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant={isTimelineOpen ? 'primary' : 'ghost'}
              onClick={() => setIsTimelineOpen(!isTimelineOpen)}
            >
              <Clock className="size-4" />
              Atividades
            </Button>
            <SpotlightButton loading={isLoggingOut} onClick={logout}>
              <LogOut className="size-4" />
              Encerrar sessão
            </SpotlightButton>
          </div>
        </div>
      </div>
    </header>
  )
}

// ── Main component ──────────────────────────────────────────────────────────────

type DashboardShellProps = {
  initialSection?: DashboardSectionId
  initialSettingsSection?: DashboardSettingsSectionId
}

export function DashboardShell({
  initialSection = dashboardDefaultSection,
  initialSettingsSection = dashboardDefaultSettingsSection,
}: Readonly<DashboardShellProps>) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isTimelineOpen, setIsTimelineOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // ── Hooks ─────────────────────────────────────────────────────────────────────

  const { isMobile } = useMobileDetection()

  const sessionQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
  const { logoutMutation: rawLogoutMutation } = useDashboardMutations()

  const currentUser = sessionQuery.data?.user ?? null
  const isStaffUser = currentUser?.role === 'STAFF'

  const {
    activeSection,
    activeSettingsSection,
    navigationGroups,
    quickActions,
    navigateToSection,
    navigateToSettings,
  } = useDashboardNavigation({ initialSection, initialSettingsSection, isStaffUser })

  const { consentQuery, productsQuery, ordersQuery, employeesQuery, financeQuery } = useDashboardScopedQueries({
    userId: currentUser?.userId,
    isOwner: currentUser?.role === 'OWNER',
    section: activeSection,
  })

  const { scrollRef, onScroll, scrollIntoView } = useScrollMemory(activeSection, isMobile)

  const { logout, isPending: isLoggingOut, startTransition } = useDashboardLogout(rawLogoutMutation)

  const evaluationAccess = sessionQuery.data?.user.evaluationAccess ?? null
  const { remainingSeconds, isEvaluation } = useEvaluationCountdown(evaluationAccess, () => {
    queryClient.clear()
    startTransition(() => router.replace('/login'))
  })

  useOperationsRealtime(Boolean(sessionQuery.data?.user.userId), queryClient)

  // ── Quick action handler (orchestrates navigation + scroll) ───────────────────

  const handleQuickAction = (action: DashboardQuickAction) => {
    navigateToSection(action.target)

    if (typeof document === 'undefined') return

    window.setTimeout(() => {
      const targetElement = action.anchorId
        ? document.getElementById(action.anchorId)
        : document.getElementById('workspace-header')
      if (targetElement instanceof HTMLElement) {
        scrollIntoView(targetElement)
      }
    }, 80)
  }

  // ── Early returns (loading, auth, verification) ───────────────────────────────

  if (sessionQuery.isLoading) {
    return <LoadingState />
  }

  const isUnauthorized = sessionQuery.error instanceof ApiError && sessionQuery.error.status === 401
  const sessionError = getSessionErrorMessage(sessionQuery.error)

  if (!sessionQuery.data?.user || isUnauthorized) {
    return <UnauthorizedState message={sessionError} />
  }

  const user = sessionQuery.data.user

  if (!user.emailVerified) {
    return <EmailVerificationLockState email={user.email} />
  }

  // ── Derived data ──────────────────────────────────────────────────────────────

  const legalAcceptances = consentQuery.data?.legalAcceptances ?? []
  const requiredDocumentCount = consentQuery.data?.documents.filter((document) => document.required).length ?? 0
  const employees = employeesQuery.data?.items ?? []
  const finance = financeQuery.data
  const displayCurrency = finance?.displayCurrency ?? user.preferredCurrency
  const activeNavigation = resolveActiveNavigation(activeSection, navigationGroups)
  const signals = buildDashboardSignals({
    activeNavigationLabel: activeNavigation.label,
    activeSection,
    companyName: user.companyName || 'Workspace',
    displayCurrency,
    finance,
    isStaffUser,
    legalAcceptancesCount: legalAcceptances.length,
    ordersCompleted: ordersQuery.data?.totals.completedOrders ?? 0,
    productsActive: productsQuery.data?.totals.activeProducts ?? 0,
    requiredDocumentCount,
  })
  const activeHero = sectionHeroCopy[activeSection]

  // ── Mobile shells ─────────────────────────────────────────────────────────────

  if (isStaffUser && isMobile && activeSection !== 'settings') {
    return <StaffMobileShell currentUser={currentUser} />
  }

  if (!isStaffUser && isMobile) {
    return <OwnerMobileShell currentUser={currentUser} />
  }

  // ── Desktop layout ────────────────────────────────────────────────────────────

  return (
    <main className="bg-background text-foreground h-screen overflow-hidden">
      <div
        className="workspace-shell xl:grid xl:h-full transition-all duration-300"
        style={{ gridTemplateColumns: sidebarCollapsed ? '84px minmax(0,1fr)' : '288px minmax(0,1fr)' }}
      >
        <DashboardSidebar
          activeSection={activeSection}
          companyName={user.companyName}
          email={user.email}
          groups={navigationGroups}
          onCollapseChange={setSidebarCollapsed}
          quickActions={quickActions}
          onNavigate={navigateToSection}
          onOpenSettings={navigateToSettings}
          onQuickAction={handleQuickAction}
          onSignOut={logout}
          role={user.role}
          status={user.status}
          userName={user.fullName}
        />

        <div
          ref={scrollRef}
          className="workspace-shell__main relative flex flex-col h-screen overflow-hidden overflow-y-auto"
          onScroll={onScroll}
        >
          <DashboardTopbar
            isMobileOpen={!sidebarCollapsed}
            onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            user={user}
          />

          <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-6 px-4 py-6 sm:px-6 xl:px-8 xl:py-8">
            <DashboardWorkspaceHeader
              activeHero={activeHero}
              activeNavigationLabel={activeNavigation.label}
              handleQuickAction={handleQuickAction}
              isLoggingOut={isLoggingOut}
              isTimelineOpen={isTimelineOpen}
              logout={logout}
              quickActions={quickActions}
              setIsTimelineOpen={setIsTimelineOpen}
              signals={signals}
            />

            {isEvaluation ? (
              <EvaluationModeBanner
                dailyLimitMinutes={user.evaluationAccess!.dailyLimitMinutes}
                remainingSeconds={remainingSeconds}
              />
            ) : null}

            {renderActiveEnvironment({
              activeSection,
              activeSettingsSection,
              employees,
              finance,
              onNavigateSection: navigateToSection,
              onSettingsSectionChange: navigateToSettings,
              user,
            })}
          </div>
        </div>
      </div>

      {isTimelineOpen && <ActivityTimeline onClose={() => setIsTimelineOpen(false)} />}
    </main>
  )
}

function MobileShellLoadingState({ label }: Readonly<{ label: string }>) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center text-sm text-[var(--text-soft)]">
      {label}
    </main>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <main className="min-h-screen bg-background text-foreground xl:h-screen xl:overflow-hidden">
      <div className="workspace-shell xl:grid xl:h-full" style={{ gridTemplateColumns: '288px minmax(0,1fr)' }}>
        <aside className="hidden xl:block xl:h-screen xl:overflow-hidden">
          <div className="workspace-sidebar flex h-full flex-col gap-4 px-4 py-5">
            <div className="skeleton-shimmer h-11 w-40 rounded-2xl" />
            <div className="skeleton-shimmer mt-2 h-16 rounded-2xl" />
            <div className="mt-2 flex-1 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div className="skeleton-shimmer h-12 rounded-[20px]" key={i} />
              ))}
            </div>
            <div className="skeleton-shimmer h-20 rounded-2xl" />
          </div>
        </aside>

        <div className="workspace-shell__main xl:h-screen xl:overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-6 px-4 py-6 sm:px-6 xl:px-8 xl:py-8">
            <div className="imperial-card p-6 md:p-8">
              <div className="skeleton-shimmer h-6 w-32 rounded-full" />
              <div className="skeleton-shimmer mt-4 h-4 w-48 rounded-full" />
              <div className="skeleton-shimmer mt-4 h-12 w-3/4 rounded-2xl" />
              <div className="skeleton-shimmer mt-4 h-4 w-full max-w-2xl rounded-full" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div className="imperial-card-stat p-5" key={i}>
                  <div className="skeleton-shimmer size-11 rounded-2xl" />
                  <div className="skeleton-shimmer mt-5 h-3 w-20 rounded-full" />
                  <div className="skeleton-shimmer mt-3 h-8 w-28 rounded-xl" />
                  <div className="skeleton-shimmer mt-2 h-3 w-16 rounded-full" />
                </div>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="imperial-card p-6">
                <div className="skeleton-shimmer h-4 w-32 rounded-full" />
                <div className="skeleton-shimmer mt-4 h-[260px] rounded-2xl" />
              </div>
              <div className="imperial-card p-6">
                <div className="skeleton-shimmer h-4 w-28 rounded-full" />
                <div className="mt-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div className="skeleton-shimmer h-10 rounded-xl" key={i} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function EvaluationModeBanner({
  dailyLimitMinutes,
  remainingSeconds,
}: Readonly<{
  dailyLimitMinutes: number
  remainingSeconds: number
}>) {
  const minutes = Math.floor(Math.max(0, remainingSeconds) / 60)
  const seconds = Math.max(0, remainingSeconds) % 60
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return (
    <section className="imperial-card-soft px-5 py-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(37,99,235,0.22)] bg-[rgba(37,99,235,0.14)] text-[var(--accent)]">
            <TimerReset className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Sessão temporária</p>
            <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
              Este acesso fica disponivel por ate {dailyLimitMinutes} minutos por dia neste dispositivo.
            </h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Quando o tempo acabar, o portal encerra a sessão e retorna para a tela de login.
            </p>
          </div>
        </div>

        <div className="imperial-card-stat px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tempo restante</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{formatted}</p>
        </div>
      </div>
    </section>
  )
}

function UnauthorizedState({ message }: Readonly<{ message: string }>) {
  return (
    <main className="min-h-screen bg-[var(--bg)] px-6 py-8 text-[var(--text-primary)]">
      <div className="imperial-card mx-auto max-w-4xl p-8 sm:p-10">
        <BrandMark />
        <p className="mt-12 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Acesso necessario</p>
        <h1 className="mt-4 text-4xl font-semibold text-[var(--text-primary)]">Sua sessão ainda não está ativa.</h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">{message}</p>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Link href="/login">
            <Button size="lg">Entrar</Button>
          </Link>
          <Link href="/cadastro">
            <Button size="lg" variant="secondary">
              Criar conta
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}

function EmailVerificationLockState({ email }: Readonly<{ email: string }>) {
  return (
    <main className="min-h-screen bg-[var(--bg)] px-6 py-8 text-[var(--text-primary)]">
      <div className="imperial-card mx-auto max-w-2xl p-8 sm:p-10">
        <BrandMark />
        <p className="mt-10 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Confirmacao obrigatoria
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-[var(--text-primary)]">
          Valide seu email para liberar o sistema
        </h1>
        <p className="mt-4 text-base leading-8 text-muted-foreground">
          Por seguranca, o painel so e liberado apos a confirmacao do codigo enviado para o email cadastrado.
        </p>

        <div className="mt-8 rounded-[24px] border border-[rgba(37,99,235,0.2)] bg-[rgba(37,99,235,0.06)] p-4 text-sm text-[var(--text-soft)]">
          Email em validacao: <span className="font-semibold text-[var(--text-primary)]">{email}</span>
        </div>

        <div className="mt-8">
          <VerifyEmailForm email={email} firstAccess={false} successRedirectTo="/dashboard" />
        </div>
      </div>
    </main>
  )
}
