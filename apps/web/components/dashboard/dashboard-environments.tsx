'use client'

import { useState } from 'react'
import {
  Box,
  Boxes,
  Cog,
  LayoutDashboard,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  ShoppingCart,
  Tags,
  TimerReset,
  UserRound,
} from 'lucide-react'
import type {
  FinanceSummaryResponse,
  OperationsLiveResponse,
  OrderRecord,
  OrdersResponse,
  ProductImportResponse,
  ProductRecord,
  ProductsResponse,
} from '@contracts/contracts'
import { type ApiError, type AuthUser, type CookiePreferencePayload, type CookiePreferences } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import { formatAccountStatus } from '@/lib/dashboard-format'
import { downloadPortfolioCsv, downloadProductTemplateCsv } from '@/lib/portfolio-csv'
import type { OrderFormValues, ProductFormValues, ProfileFormValues } from '@/lib/validation'
import { CommercialCalendar } from '@/components/calendar/commercial-calendar'
import type {
  DashboardSectionId,
  DashboardSettingsSectionId,
} from '@/components/dashboard/dashboard-navigation'
import { DashboardSectionHeading } from '@/components/dashboard/dashboard-section-heading'
import { DashboardSettingsPanel } from '@/components/dashboard/dashboard-settings-panel'
import { EmployeeManagementCard } from '@/components/dashboard/employee-management-card'
import { EmployeePayrollCard } from '@/components/dashboard/employee-payroll-card'
import { EmployeeRankingCard } from '@/components/dashboard/employee-ranking-card'
import { FinanceCategoriesSidebar } from '@/components/dashboard/finance-categories-sidebar'
import { FinanceChannelsPanel } from '@/components/dashboard/finance-channels-panel'
import { FinanceChart } from '@/components/dashboard/finance-chart'
import { FinanceOverviewTotal } from '@/components/dashboard/finance-overview-total'
import { MapSection } from '@/components/dashboard/map-section'
import { MarketIntelligenceCard } from '@/components/dashboard/market-intelligence-card'
import { MetricCard } from '@/components/dashboard/metric-card'
import { OrderCard } from '@/components/dashboard/order-card'
import { OrderForm } from '@/components/dashboard/order-form'
import { ProductCard } from '@/components/dashboard/product-card'
import { ProductForm } from '@/components/dashboard/product-form'
import { ProductImportCard } from '@/components/dashboard/product-import-card'
import { ProductSearchField } from '@/components/dashboard/product-search-field'
import { SalesMapCard } from '@/components/dashboard/sales-map-card'
import { SalesPerformanceCard } from '@/components/dashboard/sales-performance-card'
import { OperationsExecutiveGrid, OperationsTimeline } from '@/components/operations'
import { PdvBoard } from '@/components/pdv/pdv-board'
import { buildOperationsViewModel } from '@/lib/operations'

export type EnvironmentRenderProps = {
  activeSection: DashboardSectionId
  activeSettingsSection: DashboardSettingsSectionId
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
    mutate: (payload: { values: OrderFormValues }) => void
  }
  createEmployeeMutation: {
    isPending: boolean
    mutate: (values: { employeeCode: string; displayName: string; temporaryPassword: string }) => void
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
    hasLogin: boolean
    createdAt: string
    updatedAt: string
  }>
  employeesError: string | null
  employeesQueryIsLoading: boolean
  employeesTotals?: {
    totalEmployees: number
    activeEmployees: number
  }
  editingProduct: ProductRecord | null
  finance?: FinanceSummaryResponse
  financeError: string | null
  financeQueryIsLoading: boolean
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
  operations?: OperationsLiveResponse
  operationsError: string | null
  operationsQueryIsLoading: boolean
  orderMutationError?: ApiError
  orders: OrderRecord[]
  ordersError: string | null
  ordersQueryIsLoading: boolean
  ordersTotals?: OrdersResponse['totals']
  onLogout: () => void
  onNavigateSection: (sectionId: DashboardSectionId) => void
  onProfileSubmit: (values: ProfileFormValues) => void
  onSettingsSectionChange: (sectionId: DashboardSettingsSectionId) => void
  preferenceMutation: {
    error: unknown
    isPending: boolean
    mutate: (payload: CookiePreferencePayload) => void
  }
  productMutationError?: ApiError
  products: ProductRecord[]
  productsError: string | null
  productsTotals?: ProductsResponse['totals']
  profileMutationError?: ApiError
  profileMutationIsPending: boolean
  restoreProductMutation: {
    isPending: boolean
    mutate: (productId: string) => void
  }
  restoreEmployeeMutation: {
    isPending: boolean
    mutate: (employeeId: string) => void
  }
  setEditingProduct: (product: ProductRecord | null) => void
  updateProductMutation: {
    isPending: boolean
  }
  user: AuthUser
  logoutMutationIsPending: boolean
}

export function renderActiveEnvironment(props: EnvironmentRenderProps) {
  switch (props.activeSection) {
    case 'sales':
      return <SalesEnvironment {...props} />
    case 'portfolio':
      return <PortfolioEnvironment {...props} />
    case 'pdv':
      return (
        <PdvEnvironment
          operations={props.operations}
          operationsError={props.operationsError}
          operationsQueryIsLoading={props.operationsQueryIsLoading}
          products={props.products}
          user={props.user}
        />
      )
    case 'calendario':
      return <CalendarioEnvironment />
    case 'map':
      return <MapEnvironment {...props} />
    case 'settings':
      return <SettingsEnvironment {...props} />
    case 'overview':
    default:
      return <OverviewEnvironment {...props} />
  }
}

function MapEnvironment({
  finance,
  financeError,
  financeQueryIsLoading,
  ordersTotals,
  user,
}: Readonly<Pick<EnvironmentRenderProps, 'finance' | 'financeError' | 'financeQueryIsLoading' | 'ordersTotals' | 'user'>>) {
  const displayCurrency = finance?.displayCurrency ?? user.preferredCurrency

  return (
    <section className="space-y-6">
      <DashboardSectionHeading
        description="Visualize a concentração geográfica da operação. Cada ponto representa um local de venda geocodificado automaticamente a partir do estado e cidade do pedido."
        eyebrow="Inteligência territorial"
        icon={MapPin}
        title="Mapa de Vendas — Território de Guerra"
      />
      <MapSection
        displayCurrency={displayCurrency}
        error={financeError}
        finance={finance}
        isLoading={financeQueryIsLoading}
        totalOrderCount={ordersTotals?.completedOrders}
      />
    </section>
  )
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

function PdvEnvironment({
  operations,
  operationsError,
  operationsQueryIsLoading,
  products,
  user,
}: Readonly<{
  operations?: OperationsLiveResponse
  operationsError: string | null
  operationsQueryIsLoading: boolean
  products: EnvironmentRenderProps['products']
  user: AuthUser
}>) {
  const boardProducts = products.filter((product) => product.active).map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    unitPrice: p.unitPrice,
    currency: String(p.currency),
  }))
  const operationsView = buildOperationsViewModel(operations)
  const showExecutiveOperations = user.role === 'OWNER'

  return (
    <section className="space-y-6">
      <DashboardSectionHeading
        description="Gerencie comandas abertas, em preparo e prontas. Arraste entre colunas para atualizar o status em tempo real."
        eyebrow="Kanban de comandas"
        icon={Tags}
        title="PDV — Ponto de Venda"
      />
      {showExecutiveOperations ? (
        <div className="space-y-6">
          {operationsError ? (
            <div className="imperial-card px-5 py-4 text-sm text-[var(--text-soft)]">
              Nao foi possivel carregar a operacao viva agora. {operationsError}
            </div>
          ) : null}
          <OperationsExecutiveGrid
            description={
              operationsQueryIsLoading
                ? 'Carregando a camada operacional para conectar funcionario, mesa e caixa em uma unica leitura.'
                : 'Leitura consolidada do caixa e das mesas por funcionario, pronta para crescer com o realtime.'
            }
            rows={operationsView.rows}
          />
          <OperationsTimeline
            description="Linha do tempo dos atendimentos por funcionario e mesa, desenhada para evoluir junto do FullCalendar Timeline."
            items={operationsView.timelineItems}
            resources={operationsView.resources}
          />
        </div>
      ) : null}
      <PdvBoard products={boardProducts} />
    </section>
  )
}

function OverviewEnvironment({
  employeesTotals,
  employeesQueryIsLoading,
  finance,
  financeError,
  financeQueryIsLoading,
  ordersTotals,
  ordersQueryIsLoading,
  productsTotals,
  user,
}: Readonly<
  Pick<
    EnvironmentRenderProps,
    | 'employeesTotals'
    | 'employeesQueryIsLoading'
    | 'finance'
    | 'financeError'
    | 'financeQueryIsLoading'
    | 'ordersTotals'
    | 'ordersQueryIsLoading'
    | 'productsTotals'
    | 'user'
  >
>) {
  const revenueTrend = finance?.revenueTimeline.map((t) => t.revenue) ?? []
  const profitTrend = finance?.revenueTimeline.map((t) => t.profit) ?? []
  const ordersTrend = finance?.revenueTimeline.map((t) => t.orders) ?? []

  return (
    <section className="space-y-6">
      <DashboardSectionHeading
        description="Receita realizada, pedidos por canal e distribuição de categorias em um painel financeiro detalhado."
        eyebrow="Visão financeira"
        icon={LayoutDashboard}
        title="Dashboard financeiro da operação"
      />

      <div className="grid gap-4 xl:grid-cols-5">
        <MetricCard color="#60a5fa" hint={user.fullName} icon={UserRound} label="Conta" value={user.companyName || 'Conta Demo'} />
        <MetricCard color="#36f57c" hint="Status da identidade no portal" icon={ShieldCheck} label="Status" value={formatAccountStatus(user.status)} />
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
          loading={ordersQueryIsLoading}
          trend={ordersTrend}
          value={String(ordersTotals?.completedOrders ?? 0)}
        />
        <MetricCard
          color="#fbbf24"
          hint="Equipe apta a registrar vendas"
          icon={ShieldCheck}
          label="Equipe ativa"
          loading={employeesQueryIsLoading}
          trend={profitTrend}
          value={String(employeesTotals?.activeEmployees ?? 0)}
        />
      </div>

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
      <FinanceChart error={financeError} finance={finance} isLoading={financeQueryIsLoading} ordersTotals={ordersTotals} />
      <EmployeeRankingCard error={financeError} finance={finance} isLoading={financeQueryIsLoading} />
      <SalesMapCard error={financeError} finance={finance} isLoading={financeQueryIsLoading} />
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
  user,
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
    | 'user'
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
        <MetricCard hint="Pedidos concluídos" icon={ShoppingCart} label="Concluídos" value={String(ordersTotals?.completedOrders ?? 0)} />
        <MetricCard hint="Pedidos cancelados" icon={LockKeyhole} label="Cancelados" value={String(ordersTotals?.cancelledOrders ?? 0)} />
        <MetricCard hint="Unidades vendidas" icon={Tags} label="Itens vendidos" value={String(ordersTotals?.soldUnits ?? 0)} />
        <MetricCard
          hint={user.role === 'OWNER' ? 'Funcionarios com vendas atribuidas' : 'Seu acesso operacional no workspace'}
          icon={UserRound}
          label={user.role === 'OWNER' ? 'Equipe ativa' : 'Perfil'}
          value={user.role === 'OWNER' ? String(employeesTotals?.activeEmployees ?? 0) : 'Staff'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_360px]">
        <div>
          <OrderForm
            employees={employees}
            loading={createOrderMutation.isPending}
            onSubmit={createOrderMutation.mutate}
            products={products.filter((product) => product.active)}
            userRole={user.role}
          />
        </div>

        {user.role === 'OWNER' ? (
          <div className="space-y-4">
            <EmployeeManagementCard
              busy={createEmployeeMutation.isPending || archiveEmployeeMutation.isPending || restoreEmployeeMutation.isPending}
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
        ) : (
          <div className="imperial-card p-7">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(143,183,255,0.18)] bg-[rgba(143,183,255,0.08)] text-[var(--info)]">
                <UserRound className="size-5" />
              </span>
              <div>
                <p className="text-sm text-[var(--text-soft)]">Acesso operacional</p>
                <h2 className="text-xl font-semibold text-white">Conta compacta do funcionário</h2>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="imperial-card-soft px-4 py-4 text-sm leading-7 text-[var(--text-soft)]">
                Você opera vendas, PDV e calendário com trilha de auditoria vinculada ao seu acesso.
              </div>
              <div className="imperial-card-soft px-4 py-4 text-sm leading-7 text-[var(--text-soft)]">
                Cadastros sensíveis, estrutura da equipe, edição e exclusão ficam restritos ao dono da empresa.
              </div>
              <div className="imperial-card-soft px-4 py-4 text-sm leading-7 text-[var(--text-soft)]">
                Descontos com preço manual pedem validação do dono por PIN quando essa proteção estiver ativa.
              </div>
            </div>
          </div>
        )}
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
        {orderMutationError ? <p className="mt-4 text-sm text-[var(--danger)]">{orderMutationError.message}</p> : null}

        <div className="mt-6 space-y-4">
          {orders.length ? (
            orders.map((order) => (
              <OrderCard
                busy={createOrderMutation.isPending || cancelOrderMutation.isPending}
                canCancel={user.role === 'OWNER'}
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
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8fffb9]">Localize um produto</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Busque por nome, inicial, marca ou classe de cadastro</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
              A barra abaixo filtra o portfólio em tempo real para voce achar qualquer item sem descer a tela inteira.
            </p>
            <div className="mt-5">
              <ProductSearchField onChange={setSearchQuery} onClear={() => setSearchQuery('')} value={searchQuery} />
            </div>
          </div>

          <div className="imperial-card-soft px-5 py-4 text-sm text-[var(--text-soft)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8fffb9]">Portfólio filtrado</p>
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
              <h2 className="text-xl font-semibold text-white">Registro de fluxo por categoria</h2>
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
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8fffb9]">Portfólio</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Produtos cadastrados na operação</h2>
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
        {productMutationError ? <p className="mt-5 text-sm text-[var(--danger)]">{productMutationError.message}</p> : null}

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

function SettingsEnvironment({
  activeSettingsSection,
  consentQueryIsLoading,
  cookiePreferences,
  documentTitles,
  legalAcceptances,
  logoutMutationIsPending,
  onLogout,
  onNavigateSection,
  onProfileSubmit,
  onSettingsSectionChange,
  preferenceMutation,
  profileMutationError,
  profileMutationIsPending,
  user,
}: Readonly<
  Pick<
    EnvironmentRenderProps,
    | 'activeSettingsSection'
    | 'consentQueryIsLoading'
    | 'cookiePreferences'
    | 'documentTitles'
    | 'legalAcceptances'
    | 'logoutMutationIsPending'
    | 'onLogout'
    | 'onNavigateSection'
    | 'onProfileSubmit'
    | 'onSettingsSectionChange'
    | 'preferenceMutation'
    | 'profileMutationError'
    | 'profileMutationIsPending'
    | 'user'
  >
>) {
  return (
    <section className="space-y-6">
      <DashboardSectionHeading
        description="Conta, segurança, preferências locais e conformidade agora vivem em um único ambiente administrativo."
        eyebrow="Conta e governança"
        icon={Cog}
        title="Configurações do workspace"
      />

      <DashboardSettingsPanel
        activeTab={activeSettingsSection}
        consentQueryIsLoading={consentQueryIsLoading}
        cookiePreferences={cookiePreferences}
        documentTitles={documentTitles}
        legalAcceptances={legalAcceptances}
        logoutBusy={logoutMutationIsPending}
        onLogout={onLogout}
        onNavigateSection={onNavigateSection}
        onProfileSubmit={onProfileSubmit}
        onTabChange={onSettingsSectionChange}
        preferenceMutation={preferenceMutation}
        profileError={profileMutationError?.message}
        profileLoading={profileMutationIsPending}
        user={user}
      />
    </section>
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
