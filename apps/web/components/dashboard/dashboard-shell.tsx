'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowUpRight,
  Box,
  Boxes,
  ChartColumnIncreasing,
  Clock,
  FileCheck2,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  ShieldCheck,
  ShoppingCart,
  Tags,
  TimerReset,
  UserRound,
} from 'lucide-react'
import type {
  FinanceSummaryResponse,
  OrderRecord,
  OrdersResponse,
  ProductImportResponse,
  ProductRecord,
  ProductsResponse,
} from '@contracts/contracts'
import {
  ApiError,
  type AuthUser,
  type CookiePreferencePayload,
  type CookiePreferences,
  archiveEmployee,
  archiveProduct,
  cancelOrder,
  createEmployee,
  createOrder,
  createProduct,
  fetchConsentOverview,
  fetchCurrentUser,
  fetchEmployees,
  fetchFinanceSummary,
  fetchOrders,
  fetchProducts,
  importProducts,
  logout,
  restoreEmployee,
  restoreProduct,
  updateProfile,
  updateCookiePreferences,
  updateProduct,
} from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import { formatAccountStatus } from '@/lib/dashboard-format'
import { downloadPortfolioCsv, downloadProductTemplateCsv } from '@/lib/portfolio-csv'
import type { OrderFormValues, ProductFormValues, ProfileFormValues } from '@/lib/validation'
import { BrandMark } from '@/components/shared/brand-mark'
import { Button } from '@/components/shared/button'
import { CheckboxField } from '@/components/shared/checkbox-field'
import { SpotlightButton } from '@/components/shared/spotlight-button'
import { AccountProfileCard } from '@/components/dashboard/account-profile-card'
import { DashboardSectionHeading } from '@/components/dashboard/dashboard-section-heading'
import {
  DashboardSidebar,
  type DashboardSidebarItem,
} from '@/components/dashboard/dashboard-sidebar'
import { EmployeeManagementCard } from '@/components/dashboard/employee-management-card'
import { EmployeeRankingCard } from '@/components/dashboard/employee-ranking-card'
import { FinanceChart } from '@/components/dashboard/finance-chart'
import { MarketIntelligenceCard } from '@/components/dashboard/market-intelligence-card'
import { MetricCard } from '@/components/dashboard/metric-card'
import { PillarsExecutiveCard } from '@/components/dashboard/pillars-executive-card'
import { OrderCard } from '@/components/dashboard/order-card'
import { OrderForm } from '@/components/dashboard/order-form'
import { ProductCard } from '@/components/dashboard/product-card'
import { ProductForm } from '@/components/dashboard/product-form'
import { ProductImportCard } from '@/components/dashboard/product-import-card'
import { ProductSearchField } from '@/components/dashboard/product-search-field'
import { SalesMapCard } from '@/components/dashboard/sales-map-card'
import { SalesPerformanceCard } from '@/components/dashboard/sales-performance-card'
import { ActivityTimeline } from '@/components/dashboard/activity-timeline'
import { useActivityTimeline } from '@/hooks/use-activity-timeline'
import { FinanceOverviewTotal } from '@/components/dashboard/finance-overview-total'
import { FinanceChannelsPanel } from '@/components/dashboard/finance-channels-panel'
import { FinanceCategoriesSidebar } from '@/components/dashboard/finance-categories-sidebar'
import { EmployeePayrollCard } from '@/components/dashboard/employee-payroll-card'
import { PdvBoard } from '@/components/pdv/pdv-board'
import { CommercialCalendar } from '@/components/calendar/commercial-calendar'

type DashboardSectionId =
  | 'overview'
  | 'sales'
  | 'portfolio'
  | 'compliance'
  | 'pdv'
  | 'calendario'

const dashboardNavigation: DashboardSidebarItem<DashboardSectionId>[] = [
  { id: 'overview', label: 'Dashboard', description: 'Visão executiva', icon: LayoutDashboard },
  { id: 'sales', label: 'Operação', description: 'Pedidos e vendas', icon: ShoppingCart },
  { id: 'pdv', label: 'PDV / Comandas', description: 'Kanban em tempo real', icon: Tags },
  { id: 'calendario', label: 'Calendário', description: 'Atividades comerciais', icon: TimerReset },
  { id: 'portfolio', label: 'Portfólio', description: 'Produtos e margem', icon: Boxes },
  { id: 'compliance', label: 'Conformidade', description: 'LGPD e cookies', icon: ShieldCheck },
]

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
  compliance: {
    badge: 'Ambiente de conformidade',
    title: 'Consentimento, cookies e governança em um espaço dedicado.',
    description:
      'Esse módulo deixa a camada de LGPD e segurança visível sem misturar com os blocos operacionais do dia a dia.',
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
}

export function DashboardShell() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isRouting, startTransition] = useTransition()
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null)
  const [activeSection, setActiveSection] = useState<DashboardSectionId>('overview')
  const [isTimelineOpen, setIsTimelineOpen] = useState(false)
  const [lastImport, setLastImport] = useState<ProductImportResponse | null>(null)
  const [countdownNow, setCountdownNow] = useState(() => Date.now())
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const sessionQuery = useQuery({ queryKey: ['auth', 'me'], queryFn: fetchCurrentUser, retry: false })
  const consentQuery = useQuery({
    queryKey: ['consent', 'me'],
    queryFn: fetchConsentOverview,
    enabled: Boolean(sessionQuery.data?.user.userId),
    retry: false,
  })
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    enabled: Boolean(sessionQuery.data?.user.userId),
  })
  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
    enabled: Boolean(sessionQuery.data?.user.userId),
  })
  const employeesQuery = useQuery({
    queryKey: ['employees'],
    queryFn: fetchEmployees,
    enabled: Boolean(sessionQuery.data?.user.userId),
  })
  const financeQuery = useQuery({
    queryKey: ['finance', 'summary'],
    queryFn: fetchFinanceSummary,
    enabled: Boolean(sessionQuery.data?.user.userId),
  })
  const evaluationAccess = sessionQuery.data?.user.evaluationAccess ?? null

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

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await queryClient.cancelQueries()
      queryClient.clear()
      startTransition(() => router.push('/login'))
    },
  })

  const preferenceMutation = useMutation({
    mutationFn: updateCookiePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consent', 'me'] })
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (payload) => {
      queryClient.setQueryData(['auth', 'me'], payload)
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
    },
  })

  const createProductMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => invalidateCatalog(queryClient),
  })
  const updateProductMutation = useMutation({
    mutationFn: ({ productId, values }: { productId: string; values: Parameters<typeof updateProduct>[1] }) =>
      updateProduct(productId, values),
    onSuccess: () => {
      setEditingProduct(null)
      invalidateCatalog(queryClient)
    },
  })
  const archiveProductMutation = useMutation({
    mutationFn: archiveProduct,
    onSuccess: () => {
      setEditingProduct(null)
      invalidateCatalog(queryClient)
    },
  })
  const restoreProductMutation = useMutation({
    mutationFn: restoreProduct,
    onSuccess: () => invalidateCatalog(queryClient),
  })
  const importProductsMutation = useMutation({
    mutationFn: importProducts,
    onSuccess: (payload) => {
      setLastImport(payload)
      invalidateCatalog(queryClient)
    },
  })
  const createOrderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => invalidateOrders(queryClient),
  })
  const cancelOrderMutation = useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => invalidateOrders(queryClient),
  })
  const createEmployeeMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      invalidateEmployees(queryClient)
    },
  })
  const archiveEmployeeMutation = useMutation({
    mutationFn: archiveEmployee,
    onSuccess: () => {
      invalidateEmployees(queryClient)
    },
  })
  const restoreEmployeeMutation = useMutation({
    mutationFn: restoreEmployee,
    onSuccess: () => {
      invalidateEmployees(queryClient)
    },
  })

  const isUnauthorized = sessionQuery.error instanceof ApiError && sessionQuery.error.status === 401
  const sessionError =
    sessionQuery.error instanceof ApiError
      ? sessionQuery.error.message
      : 'Conecte a API e autentique a sessão para ver o painel.'

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

  const productsError = productsQuery.error instanceof ApiError ? productsQuery.error.message : null
  const ordersError = ordersQuery.error instanceof ApiError ? ordersQuery.error.message : null
  const employeesError = employeesQuery.error instanceof ApiError ? employeesQuery.error.message : null
  const financeError = financeQuery.error instanceof ApiError ? financeQuery.error.message : null
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
  const profileMutationError = updateProfileMutation.error instanceof ApiError ? updateProfileMutation.error.message : null

  const handleProductSubmit = (values: ProductFormValues) => {
    const payload: Parameters<typeof createProduct>[0] = {
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
    updateProfileMutation.mutate(values)
  }

  const handleSectionNavigate = (sectionId: DashboardSectionId) => {
    setActiveSection(sectionId)
    if (sectionId !== 'portfolio') {
      setEditingProduct(null)
    }
  }
  const displayCurrency = finance?.displayCurrency ?? user.preferredCurrency

  const signals = [
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
    dashboardNavigation.find((item) => item.id === activeSection) ?? dashboardNavigation[0]
  const activeHero = sectionHeroCopy[activeSection]

  return (
    <main className="min-h-screen bg-[var(--bg)] px-4 py-6 text-[var(--text-primary)] sm:px-6">
      <div
        className="mx-auto max-w-[1600px] xl:grid xl:gap-6"
        style={{ gridTemplateColumns: sidebarCollapsed ? '72px minmax(0,1fr)' : '260px minmax(0,1fr)' }}
      >
        <DashboardSidebar
          activeSection={activeSection}
          companyName={user.companyName}
          email={user.email}
          items={dashboardNavigation}
          onNavigate={handleSectionNavigate}
          onCollapseChange={setSidebarCollapsed}
          status={user.status}
          userName={user.fullName}
        />

        <div className="mt-6 space-y-6 xl:mt-0">
          <header className="imperial-card p-6 md:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(52,242,127,0.16)] bg-[rgba(52,242,127,0.08)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#8fffb9]">
                  <span className="size-2 rounded-full bg-[#36f57c]" />
                  {activeHero.badge}
                </div>
                <p className="mt-4 text-sm text-[var(--text-soft)]">
                  Início / Painel operacional / {activeNavigation.label}
                </p>
                <h1 className="mt-4 max-w-4xl text-4xl font-semibold text-white sm:text-5xl">
                  {activeHero.title}
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-soft)]">
                  {activeHero.description}
                </p>
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
            activeSection,
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
            finance,
            financeError,
            financeQueryIsLoading: financeQuery.isLoading,
            handleProfileSubmit,
            handleProductSubmit,
            importMutationError,
            importProductsMutation,
            lastImport,
            legalAcceptances,
            orderMutationError,
            orders,
            ordersError,
            ordersTotals: ordersQuery.data?.totals,
            preferenceMutation,
            productMutationError,
            products,
            productsError,
            productsTotals: productsQuery.data?.totals,
            profileMutationError,
            restoreProductMutation,
            restoreEmployeeMutation,
            archiveProductMutation,
            archiveEmployeeMutation,
            updateProductMutation,
            updateProfileMutation,
            setEditingProduct,
            cancelOrderMutation,
            user,
            signals,
          })}
        </div>
      </div>

      {isTimelineOpen && <ActivityTimeline />}
    </main>
  )
}

type EnvironmentRenderProps = {
  activeSection: DashboardSectionId
  archiveEmployeeMutation: {
    isPending: boolean
    mutate: (employeeId: string) => void
  }
  archiveProductMutation: {
    isPending: boolean
    mutate: (productId: string) => void
  }
  cancelOrderMutation: {
    isPending: boolean
    mutate: (orderId: string) => void
  }
  consentQueryIsLoading: boolean
  cookiePreferences: CookiePreferences
  createOrderMutation: {
    isPending: boolean
    mutate: (values: OrderFormValues) => void
  }
  createEmployeeMutation: {
    isPending: boolean
    mutate: (values: { employeeCode: string; displayName: string }) => void
  }
  createProductMutation: {
    isPending: boolean
  }
  documentTitles: Map<string, string>
  employeeMutationError?: ApiError
  employees: Array<{
    id: string
    employeeCode: string
    displayName: string
    active: boolean
    createdAt: string
    updatedAt: string
  }>
  employeesError: string | null
  employeesTotals?: {
    totalEmployees: number
    activeEmployees: number
  }
  editingProduct: ProductRecord | null
  finance?: FinanceSummaryResponse
  financeError: string | null
  financeQueryIsLoading: boolean
  handleProfileSubmit: (values: ProfileFormValues) => void
  handleProductSubmit: (values: ProductFormValues) => void
  importMutationError: string | null
  importProductsMutation: {
    isPending: boolean
    mutate: (file: File) => void
  }
  lastImport: ProductImportResponse | null
  legalAcceptances: Array<{
    key: string
    acceptedAt: string
  }>
  orderMutationError?: ApiError
  orders: OrderRecord[]
  ordersError: string | null
  ordersTotals?: OrdersResponse['totals']
  preferenceMutation: {
    error: unknown
    isPending: boolean
    mutate: (payload: CookiePreferencePayload) => void
  }
  productMutationError?: ApiError
  products: ProductRecord[]
  productsError: string | null
  productsTotals?: ProductsResponse['totals']
  profileMutationError: string | null
  restoreProductMutation: {
    isPending: boolean
    mutate: (productId: string) => void
  }
  restoreEmployeeMutation: {
    isPending: boolean
    mutate: (employeeId: string) => void
  }
  setEditingProduct: (product: ProductRecord | null) => void
  signals: Array<{
    helper: string
    label: string
    value: string
  }>
  updateProductMutation: {
    isPending: boolean
  }
  updateProfileMutation: {
    isPending: boolean
  }
  user: AuthUser
}

function renderActiveEnvironment(props: EnvironmentRenderProps) {
  switch (props.activeSection) {
    case 'sales':
      return <SalesEnvironment {...props} />
    case 'portfolio':
      return <PortfolioEnvironment {...props} />
    case 'compliance':
      return <ComplianceEnvironment {...props} />
    case 'pdv':
      return <PdvEnvironment products={props.products} />
    case 'calendario':
      return <CalendarioEnvironment />
    case 'overview':
    default:
      return <OverviewEnvironment {...props} />
  }
}

function CalendarioEnvironment() {
  return (
    <section className="space-y-6">
      <DashboardSectionHeading
        description="Arraste eventos para trocar datas, redimensione para ajustar duração. Clique em um dia para criar nova atividade."
        eyebrow="Agenda comercial"
        icon={TimerReset}
        title="Calendário de Atividades"
      />
      <CommercialCalendar />
    </section>
  )
}

function PdvEnvironment({ products }: Readonly<{ products: EnvironmentRenderProps['products'] }>) {
  const boardProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    unitPrice: p.unitPrice,
    currency: String(p.currency),
  }))

  return (
    <section className="space-y-6">
      <DashboardSectionHeading
        description="Gerencie comandas abertas, em preparo e prontas. Arraste entre colunas para atualizar o status em tempo real."
        eyebrow="Kanban de comandas"
        icon={Tags}
        title="PDV — Ponto de Venda"
      />
      <PdvBoard products={boardProducts} />
    </section>
  )
}

function OverviewEnvironment({
  employeesTotals,
  finance,
  financeError,
  financeQueryIsLoading,
  handleProfileSubmit,
  ordersTotals,
  profileMutationError,
  productsTotals,
  signals,
  updateProfileMutation,
  user,
}: Readonly<
  Pick<
    EnvironmentRenderProps,
    | 'employeesTotals'
    | 'finance'
    | 'financeError'
    | 'financeQueryIsLoading'
    | 'handleProfileSubmit'
    | 'ordersTotals'
    | 'profileMutationError'
    | 'productsTotals'
    | 'signals'
    | 'updateProfileMutation'
    | 'user'
  >
>) {
  return (
    <section className="space-y-6">
      <DashboardSectionHeading
        description="Receita realizada, pedidos por canal e distribuição de categorias em um painel financeiro detalhado."
        eyebrow="Visão financeira"
        icon={LayoutDashboard}
        title="Dashboard financeiro da operação"
      />

      {(() => {
        const revenueTrend = finance?.revenueTimeline.map((t) => t.revenue) ?? []
        const profitTrend = finance?.revenueTimeline.map((t) => t.profit) ?? []
        const ordersTrend = finance?.revenueTimeline.map((t) => t.orders) ?? []
        return (
          <div className="grid gap-4 xl:grid-cols-5">
            <MetricCard
              color="#60a5fa"
              hint={user.fullName}
              icon={UserRound}
              label="Conta"
              value={user.companyName || 'Conta Demo'}
            />
            <MetricCard
              color="#36f57c"
              hint="Status da identidade no portal"
              icon={ShieldCheck}
              label="Status"
              value={formatAccountStatus(user.status)}
            />
            <MetricCard
              color="#a78bfa"
              hint="Produtos ativos com sessão autenticada"
              icon={Box}
              label="Portfólio"
              loading={financeQueryIsLoading}
              trend={revenueTrend}
              value={String(productsTotals?.activeProducts ?? 0)}
            />
            <MetricCard
              color="#fb923c"
              hint="Pedidos concluídos considerados no financeiro"
              icon={ShoppingCart}
              label="Pedidos"
              loading={financeQueryIsLoading}
              trend={ordersTrend}
              value={String(ordersTotals?.completedOrders ?? 0)}
            />
            <MetricCard
              color="#fbbf24"
              hint="Equipe apta a registrar vendas"
              icon={ShieldCheck}
              label="Equipe ativa"
              loading={financeQueryIsLoading}
              trend={profitTrend}
              value={String(employeesTotals?.activeEmployees ?? 0)}
            />
          </div>
        )
      })()}

      {finance ? (
        <>
          <FinanceOverviewTotal finance={finance} isLoading={financeQueryIsLoading} />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <FinanceChannelsPanel finance={finance} isLoading={financeQueryIsLoading} />
            <FinanceCategoriesSidebar finance={finance} isLoading={financeQueryIsLoading} />
          </div>
        </>
      ) : financeQueryIsLoading ? (
        <div className="imperial-card flex animate-pulse items-center justify-center p-16">
          <p className="text-sm text-[var(--text-soft)]">Carregando dados financeiros...</p>
        </div>
      ) : financeError ? (
        <div className="imperial-card p-8">
          <p className="text-sm text-[var(--danger)]">{financeError}</p>
        </div>
      ) : null}

      <SalesPerformanceCard finance={finance} isLoading={financeQueryIsLoading} />

      <MarketIntelligenceCard />

      <FinanceChart
        error={financeError}
        finance={finance}
        isLoading={financeQueryIsLoading}
        ordersTotals={ordersTotals}
      />

      <EmployeeRankingCard
        error={financeError}
        finance={finance}
        isLoading={financeQueryIsLoading}
      />

      <SalesMapCard
        error={financeError}
        finance={finance}
        isLoading={financeQueryIsLoading}
      />
    </section>
  )
}

function SalesEnvironment({
  archiveEmployeeMutation,
  cancelOrderMutation,
  createEmployeeMutation,
  createOrderMutation,
  employeeMutationError,
  employees,
  employeesError,
  employeesTotals,
  finance,
  orderMutationError,
  orders,
  ordersError,
  ordersTotals,
  products,
  restoreEmployeeMutation,
}: Readonly<
  Pick<
    EnvironmentRenderProps,
    | 'archiveEmployeeMutation'
    | 'cancelOrderMutation'
    | 'createEmployeeMutation'
    | 'createOrderMutation'
    | 'employeeMutationError'
    | 'employees'
    | 'employeesError'
    | 'employeesTotals'
    | 'finance'
    | 'orderMutationError'
    | 'orders'
    | 'ordersError'
    | 'ordersTotals'
    | 'products'
    | 'restoreEmployeeMutation'
  >
>) {
  return (
    <section className="space-y-6">
      <DashboardSectionHeading
        description="Pedidos concluídos alimentam o financeiro realizado. Aqui o operador registra vendas e acompanha o ritmo da operação."
        eyebrow="Gestão comercial"
        icon={ShoppingCart}
        title="Módulo de vendas e pedidos"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          hint="Pedidos concluídos"
          icon={ShoppingCart}
          label="Concluídos"
          value={String(ordersTotals?.completedOrders ?? 0)}
        />
        <MetricCard
          hint="Pedidos cancelados"
          icon={LockKeyhole}
          label="Cancelados"
          value={String(ordersTotals?.cancelledOrders ?? 0)}
        />
        <MetricCard
          hint="Unidades vendidas"
          icon={Tags}
          label="Itens vendidos"
          value={String(ordersTotals?.soldUnits ?? 0)}
        />
        <MetricCard
          hint="Funcionarios com vendas atribuidas"
          icon={UserRound}
          label="Equipe ativa"
          value={String(employeesTotals?.activeEmployees ?? 0)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_360px]">
        <div>
          <OrderForm
            employees={employees}
            loading={createOrderMutation.isPending}
            onSubmit={createOrderMutation.mutate}
            products={products.filter((product) => product.active)}
          />
        </div>

        <div className="space-y-4">
          <EmployeeManagementCard
            busy={
              createEmployeeMutation.isPending ||
              archiveEmployeeMutation.isPending ||
              restoreEmployeeMutation.isPending
            }
            employees={employees}
            error={employeeMutationError?.message ?? employeesError}
            loading={createEmployeeMutation.isPending}
            onArchive={archiveEmployeeMutation.mutate}
            onCreate={createEmployeeMutation.mutate}
            onRestore={restoreEmployeeMutation.mutate}
            totals={employeesTotals}
          />
          <EmployeePayrollCard employees={employees} finance={finance} />
        </div>
      </div>

      <article className="imperial-card p-7">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]">
            <ShoppingCart className="size-5" />
          </span>
          <div>
            <p className="text-sm text-[var(--text-soft)]">Vendas recentes</p>
            <h2 className="text-xl font-semibold text-white">Pedidos da operação</h2>
          </div>
        </div>

        {ordersError ? <p className="mt-4 text-sm text-[var(--danger)]">{ordersError}</p> : null}
        {orderMutationError ? (
          <p className="mt-4 text-sm text-[var(--danger)]">{orderMutationError.message}</p>
        ) : null}

        <div className="mt-6 space-y-4">
          {orders.length ? (
            orders.map((order) => (
              <OrderCard
                busy={createOrderMutation.isPending || cancelOrderMutation.isPending}
                key={order.id}
                onCancel={cancelOrderMutation.mutate}
                order={order}
              />
            ))
          ) : (
            <p className="imperial-card-soft px-4 py-3 text-sm text-[var(--text-soft)]">
              Nenhuma venda registrada ainda. Use o formulario acima para criar o primeiro pedido.
            </p>
          )}
        </div>
      </article>
    </section>
  )
}

function PortfolioEnvironment({
  archiveProductMutation,
  createProductMutation,
  editingProduct,
  finance,
  handleProductSubmit,
  importMutationError,
  importProductsMutation,
  lastImport,
  productMutationError,
  products,
  productsError,
  productsTotals,
  restoreProductMutation,
  setEditingProduct,
  updateProductMutation,
}: Readonly<
  Pick<
    EnvironmentRenderProps,
    | 'archiveProductMutation'
    | 'createProductMutation'
    | 'editingProduct'
    | 'finance'
    | 'handleProductSubmit'
    | 'importMutationError'
    | 'importProductsMutation'
    | 'lastImport'
    | 'productMutationError'
    | 'products'
    | 'productsError'
    | 'productsTotals'
    | 'restoreProductMutation'
    | 'setEditingProduct'
    | 'updateProductMutation'
  >
>) {
  const productBusy =
    createProductMutation.isPending ||
    updateProductMutation.isPending ||
    archiveProductMutation.isPending ||
    restoreProductMutation.isPending
  const [searchQuery, setSearchQuery] = useState('')
  const handleDownloadTemplate = () => {
    downloadProductTemplateCsv()
  }
  const handleDownloadPortfolio = () => {
    downloadPortfolioCsv(products)
  }
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase('pt-BR')
  const filteredProducts = normalizedSearch
    ? products.filter((product) =>
        [product.name, product.brand ?? '', product.category, product.packagingClass].some((value) => {
          const normalizedValue = value.toLocaleLowerCase('pt-BR')
          return normalizedValue.includes(normalizedSearch) || normalizedValue.startsWith(normalizedSearch)
        }),
      )
    : products

  return (
    <section className="space-y-6">
      <DashboardSectionHeading
        description="O portfólio alimenta estoque, potencial de lucro e o comportamento financeiro do painel."
        eyebrow="Estoque e margem"
        icon={Boxes}
        title="Módulo de portfólio e produtos"
      />

      <section className="imperial-card p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8fffb9]">
              Localize um produto
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              Busque por nome, inicial, marca ou classe de cadastro
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
              A barra abaixo filtra o portfólio em tempo real para voce achar qualquer item sem
              descer a tela inteira.
            </p>
            <div className="mt-5">
              <ProductSearchField
                onChange={setSearchQuery}
                onClear={() => setSearchQuery('')}
                value={searchQuery}
              />
            </div>
          </div>

          <div className="imperial-card-soft px-5 py-4 text-sm text-[var(--text-soft)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8fffb9]">
              Portfólio filtrado
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">{filteredProducts.length}</p>
            <p className="mt-2 leading-7">
              {productsTotals
                ? `${productsTotals.totalProducts} produto(s) no total e ${productsTotals.stockUnits} und disponiveis.`
                : 'Carregando produtos cadastrados...'}
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm text-[var(--text-soft)]">
          {filteredProducts.length === products.length
            ? 'Digite apenas o nome, a inicial, a marca ou o tipo da embalagem para localizar um item mais rápido.'
            : `${filteredProducts.length} item(ns) encontrado(s) para "${searchQuery}".`}
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="space-y-4">
          <ProductForm
            loading={createProductMutation.isPending || updateProductMutation.isPending}
            onCancelEdit={() => setEditingProduct(null)}
            onSubmit={handleProductSubmit}
            product={editingProduct}
          />

          <ProductImportCard
            error={importMutationError}
            hasProducts={products.length > 0}
            lastImport={lastImport}
            loading={importProductsMutation.isPending}
            onDownloadPortfolio={handleDownloadPortfolio}
            onDownloadTemplate={handleDownloadTemplate}
            onImport={importProductsMutation.mutate}
          />
        </div>

        <article className="imperial-card p-7">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]">
              <Tags className="size-5" />
            </span>
            <div>
              <p className="text-sm text-[var(--text-soft)]">Categorias</p>
              <h2 className="text-xl font-semibold text-white">Breakdown por carteira</h2>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {finance?.categoryBreakdown.length ? (
              finance.categoryBreakdown.map((item) => (
                <MiniCategoryCard
                  category={item.category}
                  key={item.category}
                  profit={formatCurrency(item.potentialProfit, finance.displayCurrency)}
                  subtitle={`${item.products} produto(s), ${item.units} unidade(s) e ${formatCurrency(item.inventorySalesValue, finance.displayCurrency)} em venda potencial`}
                />
              ))
            ) : (
              <p className="imperial-card-soft px-4 py-3 text-sm text-[var(--text-soft)]">
                Cadastre produtos para destravar a leitura por categoria.
              </p>
            )}
          </div>
        </article>
      </div>

      <section className="imperial-card p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8fffb9]">
              Portfólio
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white">
              Produtos cadastrados na operação
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-soft)]">
              Aqui ficam os itens que alimentam o financeiro potencial e as vendas futuras.
            </p>
          </div>

          <div className="imperial-card-stat px-4 py-3 text-sm text-[var(--text-soft)]">
            {productsTotals
              ? `${productsTotals.totalProducts} produto(s), ${productsTotals.activeProducts} ativo(s) e ${productsTotals.stockUnits} und disponiveis`
              : 'Carregando portfólio...'}
          </div>
        </div>

        {productsError ? <p className="mt-5 text-sm text-[var(--danger)]">{productsError}</p> : null}
        {productMutationError ? (
          <p className="mt-5 text-sm text-[var(--danger)]">{productMutationError.message}</p>
        ) : null}

        <div className="mt-8 space-y-4">
          {filteredProducts.length ? (
            filteredProducts.map((product) => (
              <ProductCard
                busy={productBusy}
                key={product.id}
                onArchive={archiveProductMutation.mutate}
                onEdit={setEditingProduct}
                onRestore={restoreProductMutation.mutate}
                product={product}
              />
            ))
          ) : (
            <div className="imperial-card-soft border-dashed px-5 py-12 text-center">
              <p className="text-lg font-semibold text-white">
                {products.length ? 'Nenhum produto bate com a sua busca.' : 'Nenhum produto cadastrado ainda.'}
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                {products.length
                  ? 'Tente outro nome, marca ou inicial para encontrar o item desejado.'
                  : 'Use o formulario acima para criar os primeiros itens do portfólio.'}
              </p>
            </div>
          )}
        </div>
      </section>
    </section>
  )
}

function ComplianceEnvironment({
  consentQueryIsLoading,
  cookiePreferences,
  documentTitles,
  legalAcceptances,
  preferenceMutation,
}: Readonly<
  Pick<
    EnvironmentRenderProps,
    | 'consentQueryIsLoading'
    | 'cookiePreferences'
    | 'documentTitles'
    | 'legalAcceptances'
    | 'preferenceMutation'
  >
>) {
  return (
    <section className="space-y-6">
      <DashboardSectionHeading
        description="A camada de conformidade continua presente e visível, com consentimento e preferências do usuário."
        eyebrow="Segurança e LGPD"
        icon={ShieldCheck}
        title="Módulo de conformidade e consentimento"
      />

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="imperial-card p-7">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]">
              <FileCheck2 className="size-5" />
            </span>
            <div>
              <p className="text-sm text-[var(--text-soft)]">Consentimento</p>
              <h2 className="text-xl font-semibold text-white">Documentos aceitos</h2>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {legalAcceptances.length ? (
              legalAcceptances.map((acceptance) => (
                <MiniInfoCard
                  hint={`Aceito em ${new Date(acceptance.acceptedAt).toLocaleString('pt-BR')}`}
                  key={acceptance.key}
                  label={documentTitles.get(acceptance.key) ?? acceptance.key}
                  value="Aceito"
                />
              ))
            ) : (
              <p className="imperial-card-soft px-4 py-3 text-sm text-[var(--text-soft)]">
                Os documentos legais aparecerao aqui assim que houver consentimento registrado.
              </p>
            )}
          </div>
        </article>

        <article className="imperial-card p-7">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]">
              <ChartColumnIncreasing className="size-5" />
            </span>
            <div>
              <p className="text-sm text-[var(--text-soft)]">Preferências</p>
              <h2 className="text-xl font-semibold text-white">Gestão de cookies opcionais</h2>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <CheckboxField
              checked={cookiePreferences.analytics}
              description="Permite medir uso e desempenho da plataforma."
              disabled={preferenceMutation.isPending || consentQueryIsLoading}
              label="Cookies analíticos"
              onChange={(event) =>
                preferenceMutation.mutate({
                  analytics: event.currentTarget.checked,
                  marketing: cookiePreferences.marketing,
                })
              }
            />

            <CheckboxField
              checked={cookiePreferences.marketing}
              description="Mantem a base pronta para comunicação promocional controlada."
              disabled={preferenceMutation.isPending || consentQueryIsLoading}
              label="Cookies de marketing"
              onChange={(event) =>
                preferenceMutation.mutate({
                  analytics: cookiePreferences.analytics,
                  marketing: event.currentTarget.checked,
                })
              }
            />
          </div>

          {preferenceMutation.error instanceof ApiError ? (
            <p className="mt-4 text-sm text-[var(--danger)]">{preferenceMutation.error.message}</p>
          ) : null}
        </article>
      </div>
    </section>
  )
}

function LoadingState() {
  return (
    <main className="min-h-screen bg-[var(--bg)] px-4 py-6 text-[var(--text-primary)] sm:px-6">
      <div className="mx-auto max-w-[1600px] xl:grid xl:gap-6" style={{ gridTemplateColumns: '260px minmax(0,1fr)' }}>
        {/* Sidebar skeleton */}
        <aside className="hidden xl:block">
          <div className="imperial-card flex h-[calc(100vh-3rem)] flex-col gap-4 p-5">
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
        <div className="mt-6 space-y-6 xl:mt-0">
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
            <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
              Quando o tempo acabar, o portal encerra a sessão e retorna para a tela de login.
            </p>
          </div>
        </div>

        <div className="imperial-card-stat px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
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
        <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-soft)]">{message}</p>

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

function MiniInfoCard({ hint, label, value }: Readonly<{ hint: string; label: string; value: string }>) {
  return (
    <div className="imperial-card-soft p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-3 text-xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">{hint}</p>
    </div>
  )
}

function MiniCategoryCard({ category, profit, subtitle }: Readonly<{ category: string; profit: string; subtitle: string }>) {
  return (
    <div className="imperial-card-soft p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-[var(--text-primary)]">{category}</p>
          <p className="mt-1 text-sm text-[var(--text-soft)]">{subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-[var(--text-primary)]">{profit}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">lucro potencial</p>
        </div>
      </div>
    </div>
  )
}

function invalidateCatalog(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['products'] })
  queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] })
}

function invalidateOrders(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['orders'] })
  queryClient.invalidateQueries({ queryKey: ['products'] })
  queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] })
}

function invalidateEmployees(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['employees'] })
  queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] })
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
