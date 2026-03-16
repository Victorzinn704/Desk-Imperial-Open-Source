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
  FileCheck2,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
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
import { OrderCard } from '@/components/dashboard/order-card'
import { OrderForm } from '@/components/dashboard/order-form'
import { ProductCard } from '@/components/dashboard/product-card'
import { ProductForm } from '@/components/dashboard/product-form'
import { ProductImportCard } from '@/components/dashboard/product-import-card'
import { ProductSearchField } from '@/components/dashboard/product-search-field'
import { SalesMapCard } from '@/components/dashboard/sales-map-card'

type DashboardSectionId =
  | 'overview'
  | 'sales'
  | 'portfolio'
  | 'compliance'
  | 'roadmap'

const dashboardNavigation: DashboardSidebarItem<DashboardSectionId>[] = [
  { id: 'overview', label: 'Dashboard', description: 'Visao executiva', icon: LayoutDashboard },
  { id: 'sales', label: 'Operacao', description: 'Pedidos e vendas', icon: ShoppingCart },
  { id: 'portfolio', label: 'Portfolio', description: 'Produtos e margem', icon: Boxes },
  { id: 'compliance', label: 'Conformidade', description: 'LGPD e cookies', icon: ShieldCheck },
  { id: 'roadmap', label: 'Recursos PRO', description: 'Proximos upgrades', icon: Sparkles },
]

const nextMilestones = [
  'Filtros por periodo, canal e status no dashboard.',
  'Pedidos multi-itens e alertas de estoque baixo.',
  'Observabilidade externa e trilha visual de auditoria.',
]

const managerRecommendations = [
  'Separar perfis por permissao de acesso.',
  'Mostrar timeline de atividade por usuario.',
  'Exibir alertas de margem ruim e cancelamento alto.',
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
    title: 'Visao consolidada da empresa em um unico ambiente.',
    description:
      'A camada principal cruza financeiro, indicadores, operacao e seguranca para uma leitura rapida e mais estrategica.',
  },
  sales: {
    badge: 'Ambiente comercial',
    title: 'Pedidos e vendas em um modulo exclusivo da operacao.',
    description:
      'Esse ambiente concentra o registro de vendas, leitura dos pedidos mais recentes e o pulso do resultado realizado.',
  },
  portfolio: {
    badge: 'Ambiente de portfolio',
    title: 'Produtos, estoque e margem organizados em um fluxo proprio.',
    description:
      'Aqui o foco sai da visao geral e entra no cadastro, na rentabilidade e na estrutura que sustenta o caixa.',
  },
  compliance: {
    badge: 'Ambiente de conformidade',
    title: 'Consentimento, cookies e governanca em um espaco dedicado.',
    description:
      'Esse modulo deixa a camada de LGPD e seguranca visivel sem misturar com os blocos operacionais do dia a dia.',
  },
  roadmap: {
    badge: 'Ambiente de evolucao',
    title: 'Proximos upgrades e linha do tempo do produto.',
    description:
      'A navegacao final abre um ambiente proprio para o roadmap, ajudando a manter prioridades e proxima fase bem claras.',
  },
}

export function DashboardShell() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isRouting, startTransition] = useTransition()
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null)
  const [activeSection, setActiveSection] = useState<DashboardSectionId>('overview')
  const [lastImport, setLastImport] = useState<ProductImportResponse | null>(null)
  const [countdownNow, setCountdownNow] = useState(() => Date.now())

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
      : 'Conecte a API e autentique a sessao para ver o painel.'

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
      helper: 'resultado bruto do periodo',
    },
    {
      label: 'Estoque baixo',
      value: String(finance?.totals.lowStockItems ?? 0),
      helper: 'itens para reposicao rapida',
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
      <div className="mx-auto max-w-[1600px] xl:grid xl:grid-cols-[320px_minmax(0,1fr)] xl:gap-6">
        <DashboardSidebar
          activeSection={activeSection}
          companyName={user.companyName}
          email={user.email}
          items={dashboardNavigation}
          onNavigate={handleSectionNavigate}
          status={user.status}
          userName={user.fullName}
        />

        <div className="mt-6 space-y-6 xl:mt-0">
          <header className="rounded-[34px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(135deg,rgba(18,22,27,0.94),rgba(11,14,18,0.98))] p-6 shadow-[var(--shadow-panel-strong)] md:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(52,242,127,0.16)] bg-[rgba(52,242,127,0.08)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#8fffb9]">
                  <span className="size-2 rounded-full bg-[#36f57c]" />
                  {activeHero.badge}
                </div>
                <p className="mt-4 text-sm text-[var(--text-soft)]">
                  Inicio / Painel operacional / {activeNavigation.label}
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
                <Button loading={logoutMutation.isPending || isRouting} onClick={() => logoutMutation.mutate()} size="lg" variant="secondary">
                  <LogOut className="size-4" />
                  Encerrar sessao
                </Button>
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
            managerRecommendations,
            nextMilestones,
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
  managerRecommendations: string[]
  nextMilestones: string[]
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
    case 'roadmap':
      return <RoadmapEnvironment {...props} />
    case 'overview':
    default:
      return <OverviewEnvironment {...props} />
  }
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
        description="A camada executiva concentra status da conta, sinais de operacao e analytics para leitura rapida do negocio."
        eyebrow="Visao executiva"
        icon={LayoutDashboard}
        title="Dashboard central da operacao"
      />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(135deg,rgba(14,18,23,0.96),rgba(9,11,15,0.98))] p-7 shadow-[var(--shadow-panel)]">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(52,242,127,0.16)] bg-[rgba(52,242,127,0.08)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#8fffb9]">
            <span className="size-2 rounded-full bg-[#36f57c]" />
            Centro de comando
          </div>
          <h2 className="mt-5 text-3xl font-semibold text-white">
            {user.companyName || 'Sua empresa'} sob leitura unificada.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-[var(--text-soft)]">
            A sessao autenticada cruza portfolio, pedidos reais, resultado financeiro e dados de
            consentimento em um painel unico.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <MiniInfoCard hint={user.email} label="Operador responsavel" value={user.fullName} />
            <MiniInfoCard
              hint="sincronizado com a base local"
              label="Ultima leitura"
              value={formatDateTime(new Date().toISOString())}
            />
          </div>
        </article>

        <AccountProfileCard
          error={profileMutationError}
          loading={updateProfileMutation.isPending}
          onSubmit={handleProfileSubmit}
          user={user}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <MetricCard
          hint={user.fullName}
          icon={UserRound}
          label="Conta"
          value={user.companyName || 'Conta Demo'}
        />
        <MetricCard
          hint="Status da identidade no portal"
          icon={ShieldCheck}
          label="Status"
          value={formatAccountStatus(user.status)}
        />
        <MetricCard
          hint="Produtos ativos com sessao autenticada"
          icon={Box}
          label="Portfolio"
          value={String(productsTotals?.activeProducts ?? 0)}
        />
        <MetricCard
          hint="Pedidos concluidos considerados no financeiro"
          icon={ShoppingCart}
          label="Pedidos"
          value={String(ordersTotals?.completedOrders ?? 0)}
        />
        <MetricCard
          hint="Equipe apta a registrar vendas"
          icon={ShieldCheck}
          label="Equipe ativa"
          value={String(employeesTotals?.activeEmployees ?? 0)}
        />
      </div>

      <article className="rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[var(--surface)] p-7 shadow-[var(--shadow-panel)]">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8fffb9]">
          Sinais da operacao
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {signals.map((signal) => (
            <MiniInfoCard
              hint={signal.helper}
              key={signal.label}
              label={signal.label}
              value={signal.value}
            />
          ))}
        </div>
      </article>

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
        description="Pedidos concluidos alimentam o financeiro realizado. Aqui o operador registra vendas e acompanha o ritmo da operacao."
        eyebrow="Gestao comercial"
        icon={ShoppingCart}
        title="Modulo de vendas e pedidos"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          hint="Pedidos concluidos"
          icon={ShoppingCart}
          label="Concluidos"
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

        <div>
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
        </div>
      </div>

      <article className="rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[var(--surface)] p-7 shadow-[var(--shadow-panel)]">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]">
            <ShoppingCart className="size-5" />
          </span>
          <div>
            <p className="text-sm text-[var(--text-soft)]">Vendas recentes</p>
            <h2 className="text-xl font-semibold text-white">Pedidos da operacao</h2>
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
            <p className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text-soft)]">
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
        description="O portfolio alimenta estoque, potencial de lucro e o comportamento financeiro do painel."
        eyebrow="Estoque e margem"
        icon={Boxes}
        title="Modulo de portfolio e produtos"
      />

      <section className="rounded-[34px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(135deg,rgba(12,15,20,0.96),rgba(16,20,28,0.94))] p-6 shadow-[var(--shadow-panel)]">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8fffb9]">
              Localize um produto
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              Busque por nome, inicial, marca ou classe de cadastro
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
              A barra abaixo filtra o portfolio em tempo real para voce achar qualquer item sem
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

          <div className="rounded-[26px] border border-[rgba(255,255,255,0.08)] bg-[rgba(7,10,14,0.7)] px-5 py-4 text-sm text-[var(--text-soft)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8fffb9]">
              Portfolio filtrado
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
            ? 'Digite apenas o nome, a inicial, a marca ou o tipo da embalagem para localizar um item mais rapido.'
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

        <article className="rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[var(--surface)] p-7 shadow-[var(--shadow-panel)]">
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
              <p className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text-soft)]">
                Cadastre produtos para destravar a leitura por categoria.
              </p>
            )}
          </div>
        </article>
      </div>

      <section className="rounded-[36px] border border-[rgba(255,255,255,0.08)] bg-[var(--surface)] p-8 shadow-[var(--shadow-panel)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8fffb9]">
              Portfolio
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white">
              Produtos cadastrados na operacao
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-soft)]">
              Aqui ficam os itens que alimentam o financeiro potencial e as vendas futuras.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text-soft)]">
            {productsTotals
              ? `${productsTotals.totalProducts} produto(s), ${productsTotals.activeProducts} ativo(s) e ${productsTotals.stockUnits} und disponiveis`
              : 'Carregando portfolio...'}
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
            <div className="rounded-[28px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] px-5 py-12 text-center">
              <p className="text-lg font-semibold text-white">
                {products.length ? 'Nenhum produto bate com a sua busca.' : 'Nenhum produto cadastrado ainda.'}
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                {products.length
                  ? 'Tente outro nome, marca ou inicial para encontrar o item desejado.'
                  : 'Use o formulario acima para criar os primeiros itens do portfolio.'}
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
        description="A camada de conformidade continua presente e visivel, com consentimento e preferencias do usuario."
        eyebrow="Seguranca e LGPD"
        icon={ShieldCheck}
        title="Modulo de conformidade e consentimento"
      />

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[var(--surface)] p-7 shadow-[var(--shadow-panel)]">
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
              <p className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text-soft)]">
                Os documentos legais aparecerao aqui assim que houver consentimento registrado.
              </p>
            )}
          </div>
        </article>

        <article className="rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[var(--surface)] p-7 shadow-[var(--shadow-panel)]">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]">
              <ChartColumnIncreasing className="size-5" />
            </span>
            <div>
              <p className="text-sm text-[var(--text-soft)]">Preferencias</p>
              <h2 className="text-xl font-semibold text-white">Gestao de cookies opcionais</h2>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <CheckboxField
              checked={cookiePreferences.analytics}
              description="Permite medir uso e desempenho da plataforma."
              disabled={preferenceMutation.isPending || consentQueryIsLoading}
              label="Cookies analiticos"
              onChange={(event) =>
                preferenceMutation.mutate({
                  analytics: event.currentTarget.checked,
                  marketing: cookiePreferences.marketing,
                })
              }
            />

            <CheckboxField
              checked={cookiePreferences.marketing}
              description="Mantem a base pronta para comunicacao promocional controlada."
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

function RoadmapEnvironment({
  managerRecommendations,
  nextMilestones,
}: Readonly<Pick<EnvironmentRenderProps, 'managerRecommendations' | 'nextMilestones'>>) {
  return (
    <section className="space-y-6">
      <DashboardSectionHeading
        description="A linha do tempo agora fica dentro do proprio painel para deixar o roadmap mais tangivel."
        eyebrow="Linha do tempo"
        icon={Sparkles}
        title="Roadmap visual e proximos upgrades"
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <SurfaceListCard items={nextMilestones} title="Proximas entregas" />
        <SurfaceListCard items={managerRecommendations} title="Olhar de gerente de projeto" />
      </div>
    </section>
  )
}

function LoadingState() {
  return (
    <main className="min-h-screen bg-[var(--bg)] px-6 py-8 text-[var(--text-primary)]">
      <div className="mx-auto max-w-7xl rounded-[36px] border border-[var(--border)] bg-[var(--surface)] p-10 shadow-[var(--shadow-panel)]">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Dashboard</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">Carregando sessao autenticada...</h1>
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
    <section className="rounded-[28px] border border-[rgba(212,177,106,0.24)] bg-[linear-gradient(135deg,rgba(212,177,106,0.12),rgba(212,177,106,0.04))] px-5 py-4 shadow-[var(--shadow-panel)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(212,177,106,0.22)] bg-[rgba(212,177,106,0.14)] text-[var(--accent)]">
            <TimerReset className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Modo avaliacao por IP
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">
              Este dispositivo pode usar a conta demo por ate {dailyLimitMinutes} minutos por dia.
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
              Quando o tempo acabar, o portal encerra a avaliacao e retorna para a tela de login.
            </p>
          </div>
        </div>

        <div className="rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(11,14,18,0.68)] px-4 py-3 text-right">
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
      <div className="mx-auto max-w-4xl rounded-[36px] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-panel-strong)] sm:p-10">
        <BrandMark />
        <p className="mt-12 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Acesso necessario</p>
        <h1 className="mt-4 text-4xl font-semibold text-white">Sua sessao ainda nao esta ativa.</h1>
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
    <div className="rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-3 text-xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">{hint}</p>
    </div>
  )
}

function MiniCategoryCard({ category, profit, subtitle }: Readonly<{ category: string; profit: string; subtitle: string }>) {
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
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

function SurfaceListCard({ items, title }: Readonly<{ items: string[]; title: string }>) {
  return (
    <article className="rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[var(--surface)] p-7 shadow-[var(--shadow-panel)]">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8fffb9]">{title}</p>

      <div className="mt-6 space-y-4">
        {items.map((item, index) => (
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] p-4" key={item}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8fffb9]">etapa {index + 1}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{item}</p>
          </div>
        ))}
      </div>
    </article>
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
