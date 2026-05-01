'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useCallback, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { useTheme } from 'next-themes'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Moon, Sun } from 'lucide-react'
import { ApiError, fetchCurrentUser } from '@/lib/api'
import { useDashboardMutations } from '@/components/dashboard/hooks'
import { COMPACT_DESKTOP_BREAKPOINT, useMobileDetection } from '@/components/dashboard/hooks/useMobileDetection'
import { useDashboardNavigation } from '@/components/dashboard/hooks/useDashboardNavigation'
import { useDashboardScopedQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { useScrollMemory } from '@/components/dashboard/hooks/useScrollMemory'
import { useDashboardLogout } from '@/components/dashboard/hooks/useDashboardLogout'
import { BrandMark } from '@/components/shared/brand-mark'
import { VerifyEmailForm } from '@/components/auth/verify-email-form'
import { Button } from '@/components/shared/button'
import { renderActiveEnvironment } from '@/components/dashboard/dashboard-environments'
import { useOperationsRealtime } from '@/components/operations/use-operations-realtime'
import {
  buildDashboardHref,
  dashboardDefaultSection,
  dashboardDefaultSettingsSection,
  type DashboardNavigationGroup,
  type DashboardProductSectionId,
  type DashboardSectionId,
  type DashboardSectionTab,
  type DashboardSettingsSectionId,
  type DashboardTabId,
} from '@/components/dashboard/dashboard-navigation'
import type { PdvMesaIntent } from '@/components/pdv/pdv-navigation-intent'
import { formatCurrency } from '@/lib/currency'

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

// ── Section heading labels ──────────────────────────────────────────────────────

const sectionLabels: Record<DashboardProductSectionId | 'settings', { title: string; description: string; meta: string }> = {
  overview: {
    title: 'Overview',
    description: 'Visão geral da operação',
    meta: 'visão geral do negócio',
  },
  pdv: {
    title: 'PDV · Comandas',
    description: 'Comandas e atendimento em tempo real',
    meta: 'ponto de venda · cobrança · cozinha',
  },
  salao: {
    title: 'Salão',
    description: 'Mesas, capacidade e planta baixa',
    meta: 'mapa de mesas · ocupação · padrões',
  },
  financeiro: {
    title: 'Financeiro',
    description: 'Movimentação, fluxo de caixa e DRE',
    meta: 'receita · despesa · resultado',
  },
  pedidos: {
    title: 'Pedidos',
    description: 'Histórico, detalhe e fluxo por status',
    meta: 'histórico · detalhe · fluxo',
  },
  equipe: {
    title: 'Equipe',
    description: 'Funcionários, escala e folha de pagamento',
    meta: 'funcionários · escala · folha',
  },
  settings: {
    title: 'Configurações',
    description: 'Conta, segurança e preferências',
    meta: 'conta · segurança · sessão',
  },
}

type ActiveNavigationSummary = {
  id: string
  label: string
  description: string
}

const settingsNavigationFallback: ActiveNavigationSummary = {
  id: 'settings',
  label: 'Conta e preferências',
  description: 'Conta, segurança e conformidade',
}

type WireframeIntroFact = {
  label: string
  tone: 'accent' | 'success' | 'warning' | 'soft'
  value: string
}

function formatIntroPercent(value: number) {
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: Math.abs(value) < 10 ? 1 : 0,
    maximumFractionDigits: 1,
  }).format(value)}%`
}

function buildWireframeIntroFacts({
  activeDisplaySection,
  employeesCount,
  finance,
}: {
  activeDisplaySection: DashboardProductSectionId | 'settings'
  employeesCount: number
  finance: ReturnType<typeof useDashboardScopedQueries>['financeQuery']['data']
}): WireframeIntroFact[] {
  const totals = finance?.totals
  const displayCurrency = finance?.displayCurrency ?? 'BRL'

  switch (activeDisplaySection) {
    case 'overview':
      return [
        {
          label: 'receita do mês',
          tone: 'accent',
          value: formatCurrency(totals?.currentMonthRevenue ?? 0, displayCurrency),
        },
        {
          label: 'pedidos fechados',
          tone: 'soft',
          value: String(totals?.completedOrders ?? 0),
        },
        {
          label: 'margem média',
          tone: (totals?.averageMarginPercent ?? 0) >= 30 ? 'success' : 'warning',
          value: formatIntroPercent(totals?.averageMarginPercent ?? 0),
        },
      ]
    case 'equipe':
      return [
        {
          label: 'time ativo',
          tone: 'soft',
          value: `${employeesCount} pessoas`,
        },
      ]
    default:
      return []
  }
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

// ── Main component ──────────────────────────────────────────────────────────────

type DashboardShellProps = {
  basePath?: string
  initialSection?: DashboardSectionId
  initialSettingsSection?: DashboardSettingsSectionId
  initialTab?: DashboardTabId | null
}

export function DashboardShell({
  basePath = '/dashboard',
  initialSection = dashboardDefaultSection,
  initialSettingsSection = dashboardDefaultSettingsSection,
  initialTab = null,
}: Readonly<DashboardShellProps>) {
  const queryClient = useQueryClient()
  const { isMobile } = useMobileDetection()
  const { isMobile: isCompactDesktop } = useMobileDetection(COMPACT_DESKTOP_BREAKPOINT)
  const [pdvMesaIntent, setPdvMesaIntent] = useState<PdvMesaIntent | null>(null)

  // ── Hooks ─────────────────────────────────────────────────────────────────────

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
    activeDisplaySection,
    activeSettingsSection,
    activeTab,
    navigationGroups,
    sectionTabs,
    navigateToSection,
    navigateToSettings,
    navigateToTab,
  } = useDashboardNavigation({ basePath, initialSection, initialSettingsSection, initialTab, isStaffUser })

  const { consentQuery: _consentQuery, productsQuery: _productsQuery, ordersQuery: _ordersQuery, employeesQuery, financeQuery } = useDashboardScopedQueries({
    userId: currentUser?.userId,
    isOwner: currentUser?.role === 'OWNER',
    section: activeSection,
  })

  const { scrollRef, onScroll, scrollIntoView } = useScrollMemory(activeSection, isMobile)

  const { logout, isPending: _isLoggingOut } = useDashboardLogout(rawLogoutMutation)

  useOperationsRealtime(Boolean(sessionQuery.data?.user.userId), queryClient, {
    currentUserId: sessionQuery.data?.user.userId ?? null,
    notificationChannel: 'WEB_TOAST',
  })

  // ── Derived data ──────────────────────────────────────────────────────────────

  const employees = employeesQuery.data?.items ?? []
  const finance = financeQuery.data
  const introFacts = buildWireframeIntroFacts({
    activeDisplaySection,
    employeesCount: employees.length,
    finance,
  })

  const activeLabel = sectionLabels[activeDisplaySection]
  const activeTabSummary = sectionTabs.find((tab) => tab.id === activeTab) ?? sectionTabs[0]
  const activeTabLabel = activeTabSummary?.label
  const activeTabDescription = activeTabSummary?.description
  const activeTabIndex = Math.max(
    activeTabSummary ? sectionTabs.findIndex((tab) => tab.id === activeTabSummary.id) : 0,
    0,
  )
  const activeTabVersion =
    sectionTabs.length > 0
      ? `versão ${String(activeTabIndex + 1).padStart(2, '0')} de ${String(sectionTabs.length).padStart(2, '0')}`
      : null

  const consumePdvMesaIntent = useCallback(() => {
    setPdvMesaIntent(null)
  }, [])

  const openPdvFromMesa = useCallback(
    (intent: Omit<PdvMesaIntent, 'requestId'>) => {
      setPdvMesaIntent({
        ...intent,
        requestId: Date.now(),
      })
      navigateToSection('pdv')

      if (typeof document === 'undefined') {return}

      globalThis.setTimeout(() => {
        const targetElement = document.getElementById('workspace-header')
        if (targetElement instanceof HTMLElement) {
          scrollIntoView(targetElement)
        }
      }, 80)
    },
    [navigateToSection, scrollIntoView],
  )

  // ── Early returns (loading, auth, verification) ───────────────────────────────

  if (sessionQuery.isLoading) {
    return <LoadingState compact={isCompactDesktop} />
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

  // ── Mobile shells ─────────────────────────────────────────────────────────────

  if (isStaffUser && isMobile && activeSection !== 'settings') {
    return <StaffMobileShell currentUser={currentUser} />
  }

  if (!isStaffUser && isMobile) {
    return <OwnerMobileShell currentUser={currentUser} />
  }

  // ── Desktop layout ────────────────────────────────────────────────────────────

  return (
    <main className="wireframe-dashboard min-h-screen bg-[var(--bg)] text-[var(--text-primary)] lg:h-[100svh] lg:overflow-hidden">
      <div
        className="workspace-shell__main relative flex min-w-0 flex-col lg:h-[100svh] lg:min-h-0 lg:overflow-y-auto"
        ref={scrollRef}
        onScroll={onScroll}
      >
        <DashboardWireframeHeader
          activeDisplaySection={activeDisplaySection}
          activeSettingsSection={activeSettingsSection}
          activeTab={activeTab}
          basePath={basePath}
          compact={isCompactDesktop}
          navigationGroups={navigationGroups}
          sectionTabs={sectionTabs}
          user={user}
          onNavigate={navigateToSection}
          onNavigateSettings={navigateToSettings}
          onNavigateTab={navigateToTab}
          onSignOut={logout}
        />

        <div
          className={`mx-auto flex w-full max-w-[1880px] flex-col ${isCompactDesktop ? 'gap-4 px-3 py-4 sm:px-4 lg:px-4 lg:py-4 xl:px-5 xl:py-5' : 'gap-5 px-3 py-4 sm:px-4 lg:px-4 lg:py-5 xl:px-5 xl:py-6'}`}
        >
          <div className="wireframe-page-intro" id="workspace-header">
            <div className="wireframe-page-copy min-w-0">
              <h1 className="wireframe-title">{activeLabel.title}</h1>
              <p className="wireframe-page-lead">{activeTabLabel ?? activeLabel.description}</p>
              <p className="wireframe-page-note">{activeTabDescription ?? activeLabel.description}</p>
            </div>
            {introFacts.length > 0 ? (
              <div className="wireframe-intro-rail" aria-label="Resumo da seção">
                {introFacts.map((fact) => (
                  <div className="wireframe-intro-fact" key={fact.label}>
                    <span className="wireframe-intro-fact__label">{fact.label}</span>
                    <span className={`wireframe-intro-fact__value wireframe-intro-fact__value--${fact.tone}`}>{fact.value}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="wireframe-intro-meta">
              <span>{activeLabel.meta}</span>
              {activeTabVersion ? <span>{activeTabVersion}</span> : null}
            </div>
          </div>

          {renderActiveEnvironment({
            activeSection,
            activeSettingsSection,
            activeTab,
            employees,
            finance,
            onConsumePdvMesaIntent: consumePdvMesaIntent,
            onOpenPdvFromMesa: openPdvFromMesa,
            onNavigateSection: navigateToSection,
            onSettingsSectionChange: navigateToSettings,
            pdvMesaIntent,
            user,
          })}
        </div>
      </div>
    </main>
  )
}

function DashboardWireframeHeader({
  activeDisplaySection,
  activeSettingsSection,
  activeTab,
  basePath,
  compact,
  navigationGroups,
  onNavigate,
  onNavigateSettings,
  onNavigateTab,
  onSignOut,
  sectionTabs,
  user,
}: Readonly<{
  activeDisplaySection: DashboardProductSectionId | 'settings'
  activeSettingsSection: DashboardSettingsSectionId
  activeTab: DashboardTabId | null
  basePath: string
  compact: boolean
  navigationGroups: DashboardNavigationGroup[]
  onNavigate: (sectionId: DashboardSectionId, tabId?: DashboardTabId | null) => void
  onNavigateSettings: (sectionId: DashboardSettingsSectionId) => void
  onNavigateTab: (tabId: DashboardTabId) => void
  onSignOut: () => void
  sectionTabs: DashboardSectionTab[]
  user: {
    companyName: string | null
    email: string
    fullName: string
    role: string
  }
}>) {
  const primaryItems = navigationGroups.flatMap((group) => group.items)
  const activePrimaryId = activeDisplaySection === 'settings' ? null : activeDisplaySection
  const initials = getInitials(user.fullName)

  return (
    <header className="wireframe-header">
      <div className={`wireframe-header__bar ${compact ? 'wireframe-header__bar--compact' : ''}`}>
        <BrandMark
          href={buildDashboardHref('overview', activeSettingsSection, 'principal', basePath)}
          onClick={(event) => {
            if (!shouldHandleDashboardNav(event)) {return}
            event.preventDefault()
            onNavigate('overview', 'principal')
          }}
          presentation="wireframe"
          wordmark="always"
        />

        <div className="wireframe-header__actions">
          <WireframeThemeButton />
          <Link
            aria-label="Conta e configurações"
            className="wireframe-account-button"
            href={buildDashboardHref('settings', 'account', undefined, basePath)}
            title={`${user.fullName} · ${user.email}`}
            onClick={(event) => {
              if (!shouldHandleDashboardNav(event)) {return}
              event.preventDefault()
              onNavigateSettings('account')
            }}
          >
            <span className="wireframe-account-button__avatar">{initials}</span>
            <span>conta</span>
          </Link>
          <button className="wireframe-text-button" title="Sair" type="button" onClick={onSignOut}>
            sair
          </button>
        </div>
      </div>

      <div className="wireframe-header__nav-row">
        <nav aria-label="Seções principais" className="wireframe-primary-nav">
          {primaryItems.map((item) => {
            const active = activePrimaryId === item.id
            return (
              <Link
                aria-current={active ? 'page' : undefined}
                className={active ? 'wireframe-primary-nav__item wireframe-primary-nav__item--active' : 'wireframe-primary-nav__item'}
                href={buildDashboardHref(item.id, activeSettingsSection, undefined, basePath)}
                key={item.id}
                onClick={(event) => {
                  if (!shouldHandleDashboardNav(event)) {return}
                  event.preventDefault()
                  onNavigate(item.id)
                }}
              >
                <span className="wireframe-primary-nav__dot" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="wireframe-period">
          <span>ter · 07 abr · 14:32</span>
          <span>{compact ? user.role.slice(0, 1) : initials}</span>
        </div>
      </div>

      {sectionTabs.length > 0 ? (
        <div className="wireframe-subnav" aria-label="Subseções">
          {sectionTabs.map((tab) => {
            const active = activeTab === tab.id
            return (
              <Link
                aria-current={active ? 'true' : undefined}
                className={active ? 'wireframe-subnav__item wireframe-subnav__item--active' : 'wireframe-subnav__item'}
                href={buildDashboardHref(activeDisplaySection, activeSettingsSection, tab.id, basePath)}
                key={tab.id}
                title={tab.description}
                onClick={(event) => {
                  if (!shouldHandleDashboardNav(event)) {return}
                  event.preventDefault()
                  onNavigateTab(tab.id)
                }}
              >
                <span>{tab.code}</span>
                {tab.emoji ? <strong className="wireframe-subnav__emoji">{tab.emoji}</strong> : null}
                {tab.label}
              </Link>
            )
          })}
        </div>
      ) : null}
    </header>
  )
}

function shouldHandleDashboardNav(event: ReactMouseEvent<HTMLAnchorElement>) {
  if (event.defaultPrevented) {return false}
  if (event.button !== 0) {return false}
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {return false}
  const target = event.currentTarget.getAttribute('target')
  return !target || target === '_self'
}

function getInitials(name: string) {
  return (
    name
      ?.split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'U'
  )
}

function WireframeThemeButton() {
  const { resolvedTheme, setTheme } = useTheme()

  if (!resolvedTheme) {
    return <span aria-hidden="true" className="wireframe-theme-button" />
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      aria-label={isDark ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
      className="wireframe-theme-button"
      title={isDark ? 'Tema escuro ativo' : 'Tema claro ativo'}
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  )
}

function MobileShellLoadingState({ label }: Readonly<{ label: string }>) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-6 text-center text-sm text-[var(--text-soft)]">
      {label}
    </main>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function LoadingState({ compact = false }: Readonly<{ compact?: boolean }>) {
  return (
    <main className="wireframe-dashboard min-h-screen bg-[var(--bg)] text-[var(--text-primary)] lg:h-[100svh] lg:overflow-hidden">
      <div className="workspace-shell__main lg:h-[100svh] lg:overflow-y-auto">
        <div className="wireframe-header">
          <div className={`wireframe-header__bar ${compact ? 'wireframe-header__bar--compact' : ''}`}>
            <div className="skeleton-shimmer h-10 w-44 rounded-lg" />
            <div className="skeleton-shimmer h-9 w-36 rounded-full" />
          </div>
          <div className="wireframe-header__nav-row">
            <div className="skeleton-shimmer h-9 w-full max-w-3xl rounded-lg" />
            <div className="skeleton-shimmer h-8 w-24 rounded-lg" />
          </div>
          <div className="wireframe-subnav">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="skeleton-shimmer h-9 w-40 rounded-full" key={index} />
            ))}
          </div>
        </div>

        <div
          className={`mx-auto flex w-full max-w-[1880px] flex-col ${compact ? 'gap-4 px-3 py-4 sm:px-4 lg:px-4 lg:py-4 xl:px-5 xl:py-5' : 'gap-6 px-3 py-5 sm:px-4 lg:px-4 lg:py-5 xl:px-5 xl:py-6'}`}
        >
          <div className="wireframe-page-intro">
            <div>
              <div className="skeleton-shimmer h-8 w-40 rounded-xl" />
              <div className="skeleton-shimmer mt-2 h-4 w-64 rounded-full" />
            </div>
            <div className="skeleton-shimmer h-10 w-52 rounded-lg" />
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
    </main>
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
