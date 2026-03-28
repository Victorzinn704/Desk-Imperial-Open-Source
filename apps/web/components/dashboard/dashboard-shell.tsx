'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowUpRight, Clock, LogOut, TimerReset } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { useDashboardQueries, useDashboardMutations } from '@/components/dashboard/hooks'
import { useMobileDetection } from '@/components/dashboard/hooks/useMobileDetection'
import { useDashboardNavigation } from '@/components/dashboard/hooks/useDashboardNavigation'
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
import {
  dashboardDefaultSection,
  dashboardDefaultSettingsSection,
  type DashboardQuickAction,
  type DashboardSectionId,
  type DashboardSettingsSectionId,
} from '@/components/dashboard/dashboard-navigation'
import { ActivityTimeline } from '@/components/dashboard/activity-timeline'
import { StaffMobileShell } from '@/components/staff-mobile'
import { OwnerMobileShell } from '@/components/owner-mobile/owner-mobile-shell'

// ── Static hero copy per section ────────────────────────────────────────────────

const sectionHeroCopy: Record<DashboardSectionId, { badge: string; title: string; description: string }> = {
  overview: {
    badge: 'Ambiente executivo',
    title: 'Visão consolidada da empresa em um único ambiente.',
    description:
      'A camada principal cruza financeiro, indicadores, operação e segurança para uma leitura rápida e mais estratégica.',
  },
  sales: {
    badge: 'Ambiente comercial',
    title: 'Pedidos e vendas em um módulo exclusivo da operação.',
    description:
      'Esse ambiente concentra o registro de vendas, leitura dos pedidos mais recentes e o pulso do resultado realizado.',
  },
  portfolio: {
    badge: 'Ambiente de portfólio',
    title: 'Produtos, estoque e margem organizados em um fluxo próprio.',
    description:
      'Aqui o foco sai da visão geral e entra no cadastro, na rentabilidade e na estrutura que sustenta o caixa.',
  },
  pdv: {
    badge: 'Ponto de venda',
    title: 'Comandas e atendimento em tempo real.',
    description:
      'Gerencie as comandas do salão em um kanban visual. Mova os pedidos entre Aberta, Em Preparo, Pronta e Fechada com drag-and-drop.',
  },
  calendario: {
    badge: 'Agenda comercial',
    title: 'Planeje eventos, promoções e jogos no calendário.',
    description:
      'Arraste atividades para mudar datas, redimensione para ajustar duração e acompanhe o impacto esperado em vendas de cada evento.',
  },
  payroll: {
    badge: 'Folha operacional',
    title: 'Salários, comissões e fechamento da equipe em um único fluxo.',
    description:
      'Acompanhe base salarial, comissão variável e leitura consolidada da folha com o mesmo padrão da operação comercial.',
  },
  salao: {
    badge: 'Gestão do salão',
    title: 'Mesas, capacidade e planta baixa.',
    description:
      'Cadastre e organize as mesas do salão, defina capacidade e seção, e posicione cada uma na planta baixa com drag-and-drop.',
  },
  map: {
    badge: 'Inteligência territorial',
    title: 'Mapa de vendas — território de guerra.',
    description:
      'Visualize a concentração geográfica da operação. Cada ponto representa um local de venda geocodificado automaticamente a partir do estado e cidade do pedido.',
  },
  settings: {
    badge: 'Conta e governança',
    title: 'Configurações, segurança e conformidade em uma única central.',
    description:
      'A camada administrativa agora reúne conta, preferências, sessão e consentimento sem quebrar a navegação operacional.',
  },
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

  const { sessionQuery, consentQuery, productsQuery, ordersQuery, employeesQuery, financeQuery } = useDashboardQueries()
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
  const sessionError =
    sessionQuery.error instanceof ApiError
      ? sessionQuery.error.message
      : 'Conecte a API e autentique a sessão para ver o painel.'

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

  const signals = isStaffUser
    ? [
        {
          label: 'Pedidos',
          value: String(ordersQuery.data?.totals.completedOrders ?? 0),
          helper: 'operações concluídas no workspace',
        },
        {
          label: 'Portfólio',
          value: String(productsQuery.data?.totals.activeProducts ?? 0),
          helper: 'produtos ativos para venda',
        },
        { label: 'Perfil', value: 'Staff', helper: 'acesso operacional com auditoria' },
      ]
    : [
        {
          label: 'Receita do mes',
          value: formatCurrency(finance?.totals.currentMonthRevenue ?? 0, displayCurrency),
          helper: 'resultado bruto do período',
        },
        {
          label: 'Estoque baixo',
          value: String(finance?.totals.lowStockItems ?? 0),
          helper: 'itens para reposição rápida',
        },
        {
          label: 'Documentos',
          value: requiredDocumentCount ? `${legalAcceptances.length}/${requiredDocumentCount}` : '0/0',
          helper: 'aceites exigidos no sistema',
        },
      ]

  const activeNavigation =
    navigationGroups.flatMap((group) => group.items).find((item) => item.id === activeSection) ??
    (activeSection === 'settings'
      ? { id: 'settings', label: 'Conta e preferências', description: 'Conta, segurança e conformidade', icon: Clock }
      : navigationGroups[0]?.items[0])
  const activeHero = sectionHeroCopy[activeSection]

  // ── Mobile shells ─────────────────────────────────────────────────────────────

  if (isStaffUser && isMobile && activeSection !== 'settings') {
    return <StaffMobileShell currentUser={currentUser} produtos={productsQuery.data?.items ?? []} />
  }

  if (!isStaffUser && isMobile) {
    return <OwnerMobileShell currentUser={currentUser} />
  }

  // ── Desktop layout ────────────────────────────────────────────────────────────

  return (
    <main className="bg-background text-foreground h-screen overflow-hidden">
      <div
        className="workspace-shell xl:grid xl:h-full"
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

        <div ref={scrollRef} className="workspace-shell__main h-screen overflow-y-auto" onScroll={onScroll}>
          <div className="mx-auto flex min-h-full w-full max-w-[1720px] flex-col gap-6 px-4 py-6 sm:px-6 xl:px-8 xl:py-8">
            <header className="imperial-card p-6 md:p-8" id="workspace-header">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,177,106,0.18)] bg-[rgba(212,177,106,0.08)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                    <span className="size-2 rounded-full bg-[var(--accent)]" />
                    {activeHero.badge}
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    Início / Painel operacional / {activeNavigation.label}
                  </p>
                  <h1 className="mt-4 max-w-4xl text-4xl font-semibold text-white sm:text-5xl">{activeHero.title}</h1>
                  <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">{activeHero.description}</p>
                </div>

                <div className="flex flex-col gap-4 xl:max-w-[520px]">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {signals.map((signal) => (
                      <div className="workspace-sidebar__surface px-4 py-4" key={signal.label}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {signal.label}
                        </p>
                        <p className="mt-3 text-lg font-semibold text-white">{signal.value}</p>
                        <p className="mt-2 text-xs leading-6 text-muted-foreground">{signal.helper}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    {quickActions.map((action) => {
                      const Icon = action.icon
                      return (
                        <button
                          className="workspace-quick-action flex-1 sm:min-w-[150px]"
                          key={action.id}
                          onClick={() => handleQuickAction(action)}
                          type="button"
                        >
                          <span className="workspace-quick-action__icon">
                            <Icon className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1 text-left">
                            <span className="block truncate text-sm font-semibold text-white">{action.label}</span>
                            <span className="block truncate text-xs text-muted-foreground">{action.description}</span>
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
          <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(212,177,106,0.22)] bg-[rgba(212,177,106,0.14)] text-[var(--accent)]">
            <TimerReset className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Sessão temporária</p>
            <h2 className="mt-2 text-lg font-semibold text-white">
              Este acesso fica disponivel por ate {dailyLimitMinutes} minutos por dia neste dispositivo.
            </h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Quando o tempo acabar, o portal encerra a sessão e retorna para a tela de login.
            </p>
          </div>
        </div>

        <div className="imperial-card-stat px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tempo restante</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatted}</p>
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
        <h1 className="mt-4 text-4xl font-semibold text-white">Sua sessão ainda não está ativa.</h1>
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
        <h1 className="mt-4 text-3xl font-semibold text-white">Valide seu email para liberar o sistema</h1>
        <p className="mt-4 text-base leading-8 text-muted-foreground">
          Por seguranca, o painel so e liberado apos a confirmacao do codigo enviado para o email cadastrado.
        </p>

        <div className="mt-8 rounded-[24px] border border-[rgba(212,177,106,0.2)] bg-[rgba(212,177,106,0.06)] p-4 text-sm text-[var(--text-soft)]">
          Email em validacao: <span className="font-semibold text-white">{email}</span>
        </div>

        <div className="mt-8">
          <VerifyEmailForm email={email} firstAccess={false} successRedirectTo="/dashboard" />
        </div>
      </div>
    </main>
  )
}
