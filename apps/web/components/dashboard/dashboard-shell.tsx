'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowUpRight,
  Clock,
  LogOut,
  TimerReset,
} from 'lucide-react'
import type { ProductImportResponse, ProductRecord } from '@contracts/contracts'
import {
  ApiError,
  fetchOperationsLive,
} from '@/lib/api'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { useDashboardMutations } from '@/components/dashboard/hooks/useDashboardMutations'
import { formatCurrency } from '@/lib/currency'
import type { OrderFormValues, ProductFormValues, ProfileFormValues } from '@/lib/validation'
import { BrandMark } from '@/components/shared/brand-mark'
import { Button } from '@/components/shared/button'
import { SpotlightButton } from '@/components/shared/spotlight-button'
import { renderActiveEnvironment } from '@/components/dashboard/dashboard-environments'
import { useOperationsRealtime } from '@/components/operations/use-operations-realtime'
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar'
import {
  dashboardDefaultSection,
  dashboardDefaultSettingsSection,
  dashboardNavigationGroups,
  dashboardQuickActions,
  parseDashboardSectionParam,
  parseDashboardSettingsSectionParam,
  type DashboardQuickAction,
  type DashboardSectionId,
  type DashboardSettingsSectionId,
} from '@/components/dashboard/dashboard-navigation'
import { ActivityTimeline } from '@/components/dashboard/activity-timeline'
import { StaffMobileShell } from '@/components/staff-mobile'

const sectionHeroCopy: Record<
  DashboardSectionId,
  {
    badge: string
    title: string
    description: string
  }
> = {
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
  const [isRouting, startTransition] = useTransition()
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null)
  const [activeSection, setActiveSection] = useState<DashboardSectionId>(initialSection)
  const [activeSettingsSection, setActiveSettingsSection] = useState<DashboardSettingsSectionId>(initialSettingsSection)
  const [isTimelineOpen, setIsTimelineOpen] = useState(false)
  const [lastImport, setLastImport] = useState<ProductImportResponse | null>(null)
  const [countdownNow, setCountdownNow] = useState(() => Date.now())
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const workspaceScrollRef = useRef<HTMLDivElement | null>(null)
  const sectionScrollMemory = useRef<Partial<Record<DashboardSectionId, number>>>({})

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    setActiveSection(initialSection)
  }, [initialSection])

  useEffect(() => {
    setActiveSettingsSection(initialSettingsSection)
  }, [initialSettingsSection])

  const { sessionQuery, consentQuery, productsQuery, ordersQuery, employeesQuery, financeQuery } = useDashboardQueries()
  const operationsQuery = useQuery({
    queryKey: ['operations', 'live'],
    queryFn: () => fetchOperationsLive(),
    enabled: Boolean(sessionQuery.data?.user.userId),
    refetchInterval: 15_000,
  })
  const evaluationAccess = sessionQuery.data?.user.evaluationAccess ?? null

  useOperationsRealtime(Boolean(sessionQuery.data?.user.userId), queryClient)

  useEffect(() => {
    if (!evaluationAccess) {
      return
    }

    const expirationTime = new Date(evaluationAccess.sessionExpiresAt).getTime()
    const intervalId = window.setInterval(() => {
      setCountdownNow(Date.now())
    }, 1000)
    const timeoutId = window.setTimeout(() => {
      queryClient.clear()
      startTransition(() => {
        router.replace('/login')
      })
    }, Math.max(0, expirationTime - Date.now()) + 150)

    return () => {
      window.clearInterval(intervalId)
      window.clearTimeout(timeoutId)
    }
  }, [evaluationAccess, queryClient, router, startTransition])

  const {
    logoutMutation: _logoutMutation,
    preferenceMutation,
    updateProfileMutation: profileMutation,
    createProductMutation,
    updateProductMutation: _updateProductMutation,
    archiveProductMutation: _archiveProductMutation,
    restoreProductMutation,
    importProductsMutation: _importProductsMutation,
    createOrderMutation,
    cancelOrderMutation,
    createEmployeeMutation,
    archiveEmployeeMutation,
    restoreEmployeeMutation,
  } = useDashboardMutations()

  // Wrappers com side-effects específicos do shell
  const logoutMutation = {
    isPending: _logoutMutation.isPending,
    mutate: () => _logoutMutation.mutate(undefined, {
      onSuccess: () => startTransition(() => router.push('/login')),
    }),
  }
  const updateProductMutation = {
    isPending: _updateProductMutation.isPending,
    error: _updateProductMutation.error,
    mutate: (payload: Parameters<typeof _updateProductMutation.mutate>[0]) =>
      _updateProductMutation.mutate(payload, { onSuccess: () => setEditingProduct(null) }),
  }
  const archiveProductMutation = {
    isPending: _archiveProductMutation.isPending,
    error: _archiveProductMutation.error,
    mutate: (id: string) =>
      _archiveProductMutation.mutate(id, { onSuccess: () => setEditingProduct(null) }),
  }
  const importProductsMutation = {
    isPending: _importProductsMutation.isPending,
    error: _importProductsMutation.error,
    mutate: (file: File) =>
      _importProductsMutation.mutate(file, { onSuccess: (payload) => setLastImport(payload) }),
  }

  const currentUser = sessionQuery.data?.user ?? null
  const isStaffUser = currentUser?.role === 'STAFF'
  const quickActions = isStaffUser ? [] : dashboardQuickActions
  const navigationGroups = useMemo(
    () =>
      isStaffUser
        ? dashboardNavigationGroups
            .map((group) => ({
              ...group,
              items: group.items.filter((item) => ['sales', 'pdv', 'calendario'].includes(item.id)),
            }))
            .filter((group) => group.items.length > 0)
        : dashboardNavigationGroups,
    [isStaffUser],
  )

  const isUnauthorized = sessionQuery.error instanceof ApiError && sessionQuery.error.status === 401
  const sessionError =
    sessionQuery.error instanceof ApiError
      ? sessionQuery.error.message
      : 'Conecte a API e autentique a sessão para ver o painel.'

  const allowedSections = useMemo(
    () =>
      new Set<DashboardSectionId>([
        ...navigationGroups.flatMap((group) => group.items.map((item) => item.id)),
        'settings',
      ]),
    [navigationGroups],
  )
  const resolvedActiveSection = allowedSections.has(activeSection)
    ? activeSection
    : (isStaffUser ? 'sales' : dashboardDefaultSection)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const syncFromLocation = () => {
      const params = new URLSearchParams(window.location.search)
      const sectionFromUrl = parseDashboardSectionParam(params.get('view'))
      const settingsSectionFromUrl = parseDashboardSettingsSectionParam(params.get('panel'))

      if (sectionFromUrl && allowedSections.has(sectionFromUrl)) {
        setActiveSection(sectionFromUrl)
      }

      if (settingsSectionFromUrl) {
        setActiveSettingsSection(settingsSectionFromUrl)
      }
    }

    syncFromLocation()
    window.addEventListener('popstate', syncFromLocation)
    return () => window.removeEventListener('popstate', syncFromLocation)
  }, [allowedSections])

  useEffect(() => {
    if (isMobile) {
      return
    }

    const container = workspaceScrollRef.current
    if (!container) {
      return
    }

    container.scrollTop = sectionScrollMemory.current[resolvedActiveSection] ?? 0
  }, [isMobile, resolvedActiveSection])

  if (sessionQuery.isLoading) {
    return <LoadingState />
  }

  if (!sessionQuery.data?.user || isUnauthorized) {
    return <UnauthorizedState message={sessionError} />
  }

  const user = sessionQuery.data.user

  const cookiePreferences = consentQuery.data?.cookiePreferences ?? user.cookiePreferences
  const legalAcceptances = consentQuery.data?.legalAcceptances ?? []
  const requiredDocumentCount = consentQuery.data?.documents.filter((document) => document.required).length ?? 0
  const documentTitles = new Map(consentQuery.data?.documents.map((document) => [document.key, document.title]) ?? [])
  const products = productsQuery.data?.items ?? []
  const orders = ordersQuery.data?.items ?? []
  const employees = employeesQuery.data?.items ?? []
  const finance = financeQuery.data
  const operations = operationsQuery.data

  const productsError = productsQuery.error instanceof ApiError ? productsQuery.error.message : null
  const ordersError = ordersQuery.error instanceof ApiError ? ordersQuery.error.message : null
  const employeesError = employeesQuery.error instanceof ApiError ? employeesQuery.error.message : null
  const financeError = financeQuery.error instanceof ApiError ? financeQuery.error.message : null
  const operationsError = operationsQuery.error instanceof ApiError ? operationsQuery.error.message : null
  const orderMutationError = [createOrderMutation.error, cancelOrderMutation.error].find((error) => error instanceof ApiError)
  const employeeMutationError = [
    createEmployeeMutation.error,
    archiveEmployeeMutation.error,
    restoreEmployeeMutation.error,
  ].find((error) => error instanceof ApiError)
  const productMutationError = [
    createProductMutation.error,
    updateProductMutation.error,
    archiveProductMutation.error,
    restoreProductMutation.error,
  ].find((error) => error instanceof ApiError)
  const importMutationError = importProductsMutation.error instanceof ApiError ? importProductsMutation.error.message : null

  const handleProductSubmit = (values: ProductFormValues) => {
    const payload = {
      name: values.name,
      brand: values.brand,
      category: values.category,
      packagingClass: values.packagingClass,
      measurementUnit: values.measurementUnit,
      measurementValue: values.measurementValue,
      unitsPerPackage: values.unitsPerPackage,
      description: values.description,
      unitCost: values.unitCost,
      unitPrice: values.unitPrice,
      currency: values.currency,
      stock: values.stock,
    }

    if (editingProduct) {
      updateProductMutation.mutate({ productId: editingProduct.id, values: payload })
      return
    }

    createProductMutation.mutate(payload)
  }

  const handleProfileSubmit = (values: ProfileFormValues) => {
    profileMutation.mutate(values)
  }

  const scrollWorkspaceTargetIntoView = (targetElement: HTMLElement) => {
    if (isMobile || !workspaceScrollRef.current) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    const container = workspaceScrollRef.current
    const top =
      targetElement.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop -
      24

    container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }

  const navigateWithinWorkspace = (
    sectionId: DashboardSectionId,
    settingsSectionId: DashboardSettingsSectionId = activeSettingsSection,
  ) => {
    setActiveSection(sectionId)
    if (sectionId === 'settings') {
      setActiveSettingsSection(settingsSectionId)
    }

    if (sectionId !== 'portfolio') {
      setEditingProduct(null)
    }

    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', buildDashboardUrl(sectionId, settingsSectionId))
    }
  }

  const handleSectionNavigate = (sectionId: DashboardSectionId) => {
    navigateWithinWorkspace(sectionId)
  }

  const handleSettingsSectionChange = (sectionId: DashboardSettingsSectionId) => {
    navigateWithinWorkspace('settings', sectionId)
  }

  const handleQuickAction = (action: DashboardQuickAction) => {
    navigateWithinWorkspace(action.target)

    if (typeof document === 'undefined') {
      return
    }

    window.setTimeout(() => {
      const targetElement = action.anchorId
        ? document.getElementById(action.anchorId)
        : document.getElementById('workspace-header')
      if (targetElement instanceof HTMLElement) {
        scrollWorkspaceTargetIntoView(targetElement)
      }
    }, 80)
  }
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
        {
          label: 'Perfil',
          value: 'Staff',
          helper: 'acesso operacional com auditoria',
        },
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
    navigationGroups.flatMap((group) => group.items).find((item) => item.id === resolvedActiveSection) ??
    (resolvedActiveSection === 'settings'
      ? {
          id: 'settings',
          label: 'Conta e preferências',
          description: 'Conta, segurança e conformidade',
          icon: Clock,
        }
      : navigationGroups[0]?.items[0])
  const activeHero = sectionHeroCopy[resolvedActiveSection]

  if (isStaffUser && isMobile && resolvedActiveSection !== 'settings') {
    return (
      <StaffMobileShell
        currentUser={currentUser}
        produtos={productsQuery.data?.items ?? []}
      />
    )
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground xl:h-screen xl:overflow-hidden">
      <div
        className="workspace-shell xl:grid xl:h-full"
        style={{ gridTemplateColumns: sidebarCollapsed ? '84px minmax(0,1fr)' : '288px minmax(0,1fr)' }}
      >
        <DashboardSidebar
          activeSection={resolvedActiveSection}
          companyName={user.companyName}
          email={user.email}
          groups={navigationGroups}
          onCollapseChange={setSidebarCollapsed}
          quickActions={quickActions}
          onNavigate={handleSectionNavigate}
          onOpenSettings={handleSettingsSectionChange}
          onQuickAction={handleQuickAction}
          onSignOut={() => logoutMutation.mutate()}
          role={user.role}
          status={user.status}
          userName={user.fullName}
        />

        <div
          ref={workspaceScrollRef}
          className="workspace-shell__main xl:h-screen xl:overflow-y-auto"
          onScroll={(event) => {
            if (isMobile) {
              return
            }

            sectionScrollMemory.current[resolvedActiveSection] = event.currentTarget.scrollTop
          }}
        >
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
                  <h1 className="mt-4 max-w-4xl text-4xl font-semibold text-white sm:text-5xl">
                    {activeHero.title}
                  </h1>
                  <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">
                    {activeHero.description}
                  </p>
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
                    <SpotlightButton loading={logoutMutation.isPending || isRouting} onClick={() => logoutMutation.mutate()}>
                      <LogOut className="size-4" />
                      Encerrar sessão
                    </SpotlightButton>
                  </div>
                </div>
              </div>
            </header>

            {user.evaluationAccess ? (
              <EvaluationModeBanner
                dailyLimitMinutes={user.evaluationAccess.dailyLimitMinutes}
                remainingSeconds={Math.max(
                  0,
                  Math.ceil(
                    (new Date(user.evaluationAccess.sessionExpiresAt).getTime() - countdownNow) / 1000,
                  ),
                )}
              />
            ) : null}

            {renderActiveEnvironment({
              activeSection: resolvedActiveSection,
              activeSettingsSection,
              archiveEmployeeMutation,
              archiveProductMutation,
              cancelOrderMutation,
              consentQueryIsLoading: consentQuery.isLoading,
              cookiePreferences,
              createOrderMutation,
              createProductMutation,
              createEmployeeMutation,
              documentTitles,
              editingProduct,
              employeeMutationError,
              employees,
              employeesError,
              employeesTotals: employeesQuery.data?.totals,
              employeesQueryIsLoading: employeesQuery.isLoading,
              finance,
              financeError,
              financeQueryIsLoading: financeQuery.isLoading,
              handleProductSubmit,
              importMutationError,
              importProductsMutation,
              lastImport,
              legalAcceptances,
              logoutMutationIsPending: logoutMutation.isPending || isRouting,
              onLogout: () => logoutMutation.mutate(),
              onNavigateSection: handleSectionNavigate,
              onProfileSubmit: handleProfileSubmit,
              onSettingsSectionChange: handleSettingsSectionChange,
              operations,
              operationsError,
              operationsQueryIsLoading: operationsQuery.isLoading,
              orderMutationError,
              orders,
              ordersError,
              ordersQueryIsLoading: ordersQuery.isLoading,
              ordersTotals: ordersQuery.data?.totals,
              preferenceMutation,
              productMutationError,
              products,
              productsError,
              productsTotals: productsQuery.data?.totals,
              profileMutationError: profileMutation.error instanceof ApiError ? profileMutation.error : undefined,
              profileMutationIsPending: profileMutation.isPending,
              restoreProductMutation,
              restoreEmployeeMutation,
              updateProductMutation,
              setEditingProduct,
              user,
            })}
          </div>
        </div>
      </div>

      {isTimelineOpen && <ActivityTimeline onClose={() => setIsTimelineOpen(false)} />}
    </main>
  )
}

function LoadingState() {
  return (
    <main className="min-h-screen bg-background text-foreground xl:h-screen xl:overflow-hidden">
      <div className="workspace-shell xl:grid xl:h-full" style={{ gridTemplateColumns: '288px minmax(0,1fr)' }}>
        {/* Sidebar skeleton */}
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

        {/* Main content skeleton */}
        <div className="workspace-shell__main xl:h-screen xl:overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-6 px-4 py-6 sm:px-6 xl:px-8 xl:py-8">
            {/* Header skeleton */}
            <div className="imperial-card p-6 md:p-8">
              <div className="skeleton-shimmer h-6 w-32 rounded-full" />
              <div className="skeleton-shimmer mt-4 h-4 w-48 rounded-full" />
              <div className="skeleton-shimmer mt-4 h-12 w-3/4 rounded-2xl" />
              <div className="skeleton-shimmer mt-4 h-4 w-full max-w-2xl rounded-full" />
            </div>

            {/* Metric cards skeleton */}
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

            {/* Chart area skeleton */}
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
  return (
    <section className="imperial-card-soft px-5 py-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(212,177,106,0.22)] bg-[rgba(212,177,106,0.14)] text-[var(--accent)]">
            <TimerReset className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Sessão temporária
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">
              Este acesso fica disponivel por ate {dailyLimitMinutes} minutos por dia neste dispositivo.
            </h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Quando o tempo acabar, o portal encerra a sessão e retorna para a tela de login.
            </p>
          </div>
        </div>

        <div className="imperial-card-stat px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Tempo restante
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatDuration(remainingSeconds)}</p>
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
            <Button size="lg" variant="secondary">Criar conta</Button>
          </Link>
        </div>
      </div>
    </main>
  )
}

function buildDashboardUrl(
  sectionId: DashboardSectionId,
  settingsSectionId: DashboardSettingsSectionId,
) {
  const params = new URLSearchParams()

  if (sectionId !== dashboardDefaultSection) {
    params.set('view', sectionId)
  }

  if (sectionId === 'settings') {
    params.set('panel', settingsSectionId)
  }

  const queryString = params.toString()
  return queryString ? `/dashboard?${queryString}` : '/dashboard'
}

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
