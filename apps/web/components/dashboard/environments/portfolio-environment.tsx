'use client'

import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from 'react'
import { Archive, Boxes, MapPin, Package, PencilLine, Plus, RotateCcw, Search, ShoppingCart, Store, Tags, Trash2, TrendingUp, Truck, X } from 'lucide-react'
import type { FinanceSummaryResponse, ProductRecord, ProductsResponse } from '@contracts/contracts'
import {
  LabMetric,
  LabPageHeader,
  LabPanel,
  LabStatusPill,
  LabTable,
  type LabStatusTone,
} from '@/components/design-lab/lab-primitives'
import { OrderForm } from '@/components/dashboard/order-form'
import { ProductForm } from '@/components/dashboard/product-form'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { useDashboardMutations } from '@/components/dashboard/hooks/useDashboardMutations'
import { ApiError } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import { normalizeTextForSearch } from '@/lib/normalize-text-for-search'
import type { OrderFormInputValues, ProductFormValues } from '@/lib/validation'

type ProductMutationError = ApiError | null
type SaleMode = 'delivery' | 'balcao' | 'mesa'
type PortfolioSurfaceState =
  | { kind: 'product'; product: ProductRecord | null }
  | { kind: 'sale'; product: ProductRecord | null; mode: SaleMode }
  | null

const saleModeMeta: Record<
  SaleMode,
  {
    label: string
    channel: string
    description: string
    icon: typeof Truck
    tone: LabStatusTone
  }
> = {
  delivery: {
    label: 'Delivery',
    channel: 'Delivery',
    description: 'Entrega com localização do comprador, canal e observação operacional.',
    icon: Truck,
    tone: 'info',
  },
  balcao: {
    label: 'Balcão',
    channel: 'Balcão',
    description: 'Venda rápida de retirada, com menos fricção e sem depender do PDV completo.',
    icon: Store,
    tone: 'success',
  },
  mesa: {
    label: 'Mesa',
    channel: 'Mesa',
    description: 'Venda assistida por mesa, útil quando você quer registrar fora da comanda tradicional.',
    icon: MapPin,
    tone: 'warning',
  },
}

function buildProductPayload(values: ProductFormValues) {
  return {
    name: values.name,
    brand: values.brand,
    category: values.category,
    packagingClass: values.packagingClass,
    measurementUnit: values.measurementUnit,
    measurementValue: values.measurementValue,
    unitsPerPackage: values.unitsPerPackage,
    isCombo: values.isCombo,
    comboDescription: values.comboDescription,
    comboItems: values.comboItems,
    description: values.description,
    unitCost: values.unitCost,
    unitPrice: values.unitPrice,
    currency: values.currency,
    stock: values.stock,
    requiresKitchen: values.requiresKitchen ?? false,
    lowStockThreshold: values.lowStockThreshold ?? null,
  }
}

function resolveProductMutationError(errors: unknown[]): ProductMutationError {
  return errors.find((error): error is ApiError => error instanceof ApiError) ?? null
}

function filterProducts(products: ProductRecord[], searchQuery: string) {
  const normalizedSearch = normalizeTextForSearch(searchQuery.trim())
  if (!normalizedSearch) {
    return products
  }

  return products.filter((product) =>
    [product.name, product.brand ?? '', product.category, product.packagingClass].some((value) => {
      const normalizedValue = normalizeTextForSearch(value)
      return normalizedValue.includes(normalizedSearch) || normalizedValue.startsWith(normalizedSearch)
    }),
  )
}

function confirmProductDeletion(productName: string | undefined) {
  if (globalThis.window == null) {
    return true
  }

  return globalThis.window.confirm(
    `Excluir "${productName ?? 'este produto'}" em definitivo?\n\nEssa acao remove o item do portfolio ativo e preserva apenas o historico de vendas consolidado.`,
  )
}

function calcAvgMargin(products: ProductRecord[]): string {
  const active = products.filter((product) => product.active && product.unitPrice > 0)
  if (active.length === 0) {
    return '0%'
  }

  const avg =
    active.reduce((sum, product) => sum + ((product.unitPrice - product.unitCost) / product.unitPrice) * 100, 0) /
    active.length

  return `${avg.toFixed(0)}%`
}

function buildSaleInitialValues(
  product: ProductRecord | null,
  currency: string,
  mode: SaleMode,
): Partial<OrderFormInputValues> {
  const resolvedCurrency: OrderFormInputValues['currency'] =
    product?.currency === 'USD' || product?.currency === 'EUR' || product?.currency === 'BRL'
      ? product.currency
      : currency === 'USD' || currency === 'EUR'
        ? currency
        : 'BRL'

  return {
    items: product
      ? [
          {
            productId: product.id,
            quantity: 1,
            unitPrice: undefined,
          },
        ]
      : [],
    buyerType: 'PERSON',
    buyerCountry: 'Brasil',
    buyerDistrict: '',
    buyerCity: '',
    buyerState: '',
    currency: resolvedCurrency,
    channel: saleModeMeta[mode].channel,
    notes: mode === 'delivery' ? 'Entrega com rastreio por localização.' : '',
  }
}

export function PortfolioEnvironment() {
  const [surface, setSurface] = useState<PortfolioSurfaceState>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const { financeQuery, productsQuery, employeesQuery, sessionQuery } = useDashboardQueries({ section: 'portfolio' })
  const {
    createProductMutation: _createProductMutation,
    updateProductMutation: _updateProductMutation,
    archiveProductMutation: _archiveProductMutation,
    restoreProductMutation,
    deleteProductMutation: _deleteProductMutation,
    createOrderMutation,
  } = useDashboardMutations()

  const currentUser = sessionQuery.data?.user
  const finance = financeQuery.data
  const products = useMemo(() => productsQuery.data?.items ?? [], [productsQuery.data?.items])
  const employees = useMemo(() => employeesQuery.data?.items ?? [], [employeesQuery.data?.items])
  const productsTotals = productsQuery.data?.totals
  const productsError = productsQuery.error instanceof ApiError ? productsQuery.error.message : null
  const productMutationError = resolveProductMutationError([
    _createProductMutation.error,
    _updateProductMutation.error,
    _archiveProductMutation.error,
    restoreProductMutation.error,
    _deleteProductMutation.error,
  ])
  const saleMutationError = createOrderMutation.error instanceof ApiError ? createOrderMutation.error.message : null
  const activeProductModal = surface?.kind === 'product' ? surface.product : null
  const activeSaleSurface = surface?.kind === 'sale' ? surface : null

  const archiveProductMutation = {
    isPending: _archiveProductMutation.isPending,
    mutate: (id: string) => _archiveProductMutation.mutate(id, { onSuccess: () => setSurface(null) }),
  }

  const updateProductMutation = {
    isPending: _updateProductMutation.isPending,
    mutate: (payload: Parameters<typeof _updateProductMutation.mutate>[0]) =>
      _updateProductMutation.mutate(payload, { onSuccess: () => setSurface(null) }),
  }

  const deleteProductMutation = {
    isPending: _deleteProductMutation.isPending,
    mutate: (id: string) =>
      _deleteProductMutation.mutate(id, {
        onSuccess: () => {
          if (activeProductModal?.id === id) {
            setSurface(null)
          }
        },
      }),
  }

  const handleProductSubmit = (values: ProductFormValues) => {
    const payload = buildProductPayload(values)
    if (activeProductModal) {
      updateProductMutation.mutate({ productId: activeProductModal.id, values: payload })
      return
    }

    _createProductMutation.mutate(payload, { onSuccess: () => setSurface(null) })
  }

  const productBusy =
    _createProductMutation.isPending ||
    updateProductMutation.isPending ||
    archiveProductMutation.isPending ||
    restoreProductMutation.isPending ||
    deleteProductMutation.isPending

  const filteredProducts = filterProducts(products, searchQuery)
  const avgMargin = calcAvgMargin(products)
  const maxCategoryProfit = Math.max(
    ...(finance?.categoryBreakdown.map((category) => category.potentialProfit) ?? [0]),
    0,
  )
  const displayCurrency = String(finance?.displayCurrency ?? products[0]?.displayCurrency ?? 'BRL')
  const saleInitialValues = useMemo(
    () =>
      activeSaleSurface
        ? buildSaleInitialValues(activeSaleSurface.product, displayCurrency, activeSaleSurface.mode)
        : undefined,
    [activeSaleSurface, displayCurrency],
  )

  function closeSurface() {
    setSurface(null)
  }

  function openNewProductSurface() {
    setSurface({ kind: 'product', product: null })
  }

  function openSaleSurface(product: ProductRecord | null = null, mode: SaleMode = 'delivery') {
    setSurface({ kind: 'sale', product, mode })
  }

  const handleDeleteProduct = (productId: string) => {
    const target = products.find((product) => product.id === productId)
    if (confirmProductDeletion(target?.name)) {
      deleteProductMutation.mutate(productId)
    }
  }

  const handleEditProduct = (product: ProductRecord | null) => {
    setSurface({ kind: 'product', product })
  }

  return (
    <section className="space-y-5">
      <LabPageHeader
        description="Cadastro, estoque e margem reunidos numa superficie desktop mais limpa, sem perder mutacoes reais do portfolio."
        eyebrow="Estoque e margem"
        meta={<PortfolioMetaSummary avgMargin={avgMargin} lowStockItems={finance?.totals.lowStockItems ?? null} productsTotals={productsTotals} />}
        title="Portfolio de produtos"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PortfolioMetricTile
          hint="produtos ativos no catalogo"
          icon={Package}
          label="SKUs ativos"
          tone="info"
          value={productsTotals ? String(productsTotals.activeProducts) : '0'}
        />
        <PortfolioMetricTile
          hint="capital parado no estoque"
          icon={Boxes}
          label="capital em estoque"
          tone="neutral"
          value={productsTotals ? formatCurrency(productsTotals.inventoryCostValue, displayCurrency as never) : 'R$ 0,00'}
        />
        <PortfolioMetricTile
          hint="valor de venda potencial"
          icon={TrendingUp}
          label="venda potencial"
          tone="success"
          value={productsTotals ? formatCurrency(productsTotals.inventorySalesValue, displayCurrency as never) : 'R$ 0,00'}
        />
        <PortfolioMetricTile
          hint="alertas de estoque baixo"
          icon={Tags}
          label="itens em alerta"
          tone={(finance?.totals.lowStockItems ?? 0) > 0 ? 'warning' : 'success'}
          value={String(finance?.totals.lowStockItems ?? 0)}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)] xl:items-start">
        <PortfolioActionPanel
          activeProducts={productsTotals?.activeProducts ?? 0}
          onOpenProduct={openNewProductSurface}
          onOpenSale={() => openSaleSurface(null, 'delivery')}
        />
        <PortfolioCategoryPanel
          categoryBreakdown={finance?.categoryBreakdown ?? []}
          displayCurrency={displayCurrency}
          maxCategoryProfit={maxCategoryProfit}
        />
      </div>

      <PortfolioProductsPanel
        busy={productBusy}
        currency={displayCurrency}
        filteredProducts={filteredProducts}
        mutationError={productMutationError}
        products={products}
        productsError={productsError}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onArchive={archiveProductMutation.mutate}
        onDelete={handleDeleteProduct}
        onEdit={handleEditProduct}
        onRestore={restoreProductMutation.mutate}
        onSell={(product) => openSaleSurface(product, 'delivery')}
      />

      {surface?.kind === 'product' ? (
        <PortfolioWorkbench
          description="Cadastro do portfólio em tela operacional contínua, sem card dentro de card."
          onClose={closeSurface}
          toolbar={<PortfolioProductToolbar product={activeProductModal} products={products} />}
          title={activeProductModal ? 'Editar produto' : 'Cadastrar produto'}
        >
          {productMutationError ? <AlertMessage message={productMutationError.message} tone="danger" /> : null}
          <PortfolioFormShell>
            <ProductForm
              appearance="embedded"
              availableProducts={products}
              loading={_createProductMutation.isPending || updateProductMutation.isPending}
              product={activeProductModal}
              onCancelEdit={closeSurface}
              onSubmit={handleProductSubmit}
            />
          </PortfolioFormShell>
        </PortfolioWorkbench>
      ) : null}

      {activeSaleSurface ? (
        <PortfolioWorkbench
          description="Venda em superfície tipo PDV, com leitura direta de canal, produto e localização."
          onClose={closeSurface}
          toolbar={
            <PortfolioSaleToolbar
              currentMode={activeSaleSurface.mode}
              onModeChange={(mode) =>
                setSurface((current) =>
                  current?.kind === 'sale'
                    ? { ...current, mode }
                    : current,
                )
              }
              product={activeSaleSurface.product}
            />
          }
          title={activeSaleSurface.product ? `Vender ${activeSaleSurface.product.name}` : 'Vender produto'}
        >
          <PortfolioSaleSurface
            currentMode={activeSaleSurface.mode}
            employees={employees}
            errorMessage={saleMutationError}
            loading={createOrderMutation.isPending}
            onModeChange={(mode) =>
              setSurface((current) =>
                current?.kind === 'sale'
                  ? { ...current, mode }
                  : current,
              )
            }
            onSubmit={({ values }) =>
              createOrderMutation.mutate(
                { values },
                {
                  onSuccess: () => setSurface(null),
                },
              )
            }
            product={activeSaleSurface.product}
            products={products.filter((product) => product.active)}
            saleInitialValues={saleInitialValues}
            userRole={currentUser?.role ?? 'OWNER'}
          />
        </PortfolioWorkbench>
      ) : null}
    </section>
  )
}

function PortfolioMetaSummary({
  avgMargin,
  lowStockItems,
  productsTotals,
}: Readonly<{
  avgMargin: string
  lowStockItems: number | null
  productsTotals: ProductsResponse['totals'] | undefined
}>) {
  const items = [
    { label: 'ativos', value: String(productsTotals?.activeProducts ?? 0), tone: 'neutral' as const },
    { label: 'arquivados', value: String(productsTotals?.inactiveProducts ?? 0), tone: 'info' as const },
    { label: 'margem media', value: avgMargin, tone: 'success' as const },
    {
      label: 'estoque baixo',
      value: String(lowStockItems ?? 0),
      tone: (lowStockItems ?? 0) > 0 ? ('warning' as const) : ('success' as const),
    },
  ]

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-3 last:border-b-0 last:pb-0"
          key={item.label}
        >
          <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">{item.label}</span>
          <LabStatusPill tone={item.tone}>{item.value}</LabStatusPill>
        </div>
      ))}
    </div>
  )
}

function PortfolioMetricTile({
  hint,
  icon,
  label,
  tone,
  value,
}: Readonly<{
  hint: string
  icon: typeof Package
  label: string
  tone: LabStatusTone
  value: string
}>) {
  return (
    <LabMetric
      className="h-full"
      delta={metricToneLabel(tone)}
      deltaTone={tone}
      hint={hint}
      icon={icon}
      label={label}
      value={value}
    />
  )
}

function metricToneLabel(tone: LabStatusTone) {
  switch (tone) {
    case 'success':
      return 'ok'
    case 'warning':
      return 'alerta'
    case 'danger':
      return 'risco'
    case 'neutral':
      return 'base'
    case 'info':
    default:
      return 'leitura'
  }
}

function PortfolioCategoryPanel({
  categoryBreakdown,
  displayCurrency,
  maxCategoryProfit,
}: Readonly<{
  categoryBreakdown: FinanceSummaryResponse['categoryBreakdown']
  displayCurrency: string
  maxCategoryProfit: number
}>) {
  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{categoryBreakdown.length} categorias</LabStatusPill>}
      padding="md"
      subtitle="Categorias com melhor potencial de venda e lucro no consolidado."
      title="Fluxo por categoria"
    >
      <div className="space-y-1">
        {categoryBreakdown.length > 0 ? (
          categoryBreakdown.map((category) => {
            const pct = maxCategoryProfit > 0 ? (category.potentialProfit / maxCategoryProfit) * 100 : 0
            return (
              <article
                className="border-b border-dashed border-[var(--lab-border)] px-1 py-4 last:border-b-0"
                key={category.category}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--lab-fg)]">{category.category}</p>
                    <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">
                      {category.products} SKU(s) · {formatCurrency(category.inventoryCostValue, displayCurrency as never)} de capital
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[var(--lab-fg)]">
                      {formatCurrency(category.potentialProfit, displayCurrency as never)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--lab-fg-muted)]">lucro potencial</p>
                  </div>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--lab-surface-hover)]">
                  <div className="h-full rounded-full bg-[var(--lab-blue)]" style={{ width: `${Math.max(pct, 8)}%` }} />
                </div>

                <p className="mt-2 text-xs text-[var(--lab-fg-soft)]">
                  {formatCurrency(category.inventorySalesValue, displayCurrency as never)} em venda potencial
                </p>
              </article>
            )
          })
        ) : (
          <div className="rounded-[16px] border border-dashed border-[var(--lab-border)] px-5 py-8 text-center text-sm text-[var(--lab-fg-soft)]">
            Cadastre produtos para liberar a leitura por categoria.
          </div>
        )}
      </div>
    </LabPanel>
  )
}

const formBridgeStyle = {
  '--bg': '#0b1016',
  '--surface': 'rgba(255,255,255,0.03)',
  '--surface-muted': 'rgba(255,255,255,0.06)',
  '--surface-soft': 'rgba(255,255,255,0.04)',
  '--border': 'rgba(255,255,255,0.08)',
  '--border-strong': 'rgba(255,255,255,0.14)',
  '--text-primary': '#f4f7fb',
  '--text-soft': '#98a2b3',
  '--text-muted': '#64748b',
  '--accent': '#36f57c',
  '--accent-strong': '#28d86a',
  '--accent-soft': 'rgba(54,245,124,0.12)',
  '--on-accent': '#07120c',
  '--danger': '#fca5a5',
  '--warning': '#fb923c',
  '--success': '#36f57c',
  '--shadow-panel': '0 18px 40px rgba(0,0,0,0.34)',
} as CSSProperties

function PortfolioActionPanel({
  activeProducts,
  onOpenProduct,
  onOpenSale,
}: Readonly<{
  activeProducts: number
  onOpenProduct: () => void
  onOpenSale: () => void
}>) {
  return (
    <LabPanel
      action={<LabStatusPill tone="info">{activeProducts} ativos</LabStatusPill>}
      padding="md"
      subtitle="Os fluxos de cadastro e venda agora entram sob demanda, como superfície acionada."
      title="Fluxos sob demanda"
    >
      <div className="space-y-0">
        <ActionLaunchCard
          description="Abra o cadastro só quando precisar incluir ou revisar um item do portfólio."
          icon={Plus}
          label="Cadastrar produto"
          onClick={onOpenProduct}
          tone="neutral"
        />
        <ActionLaunchCard
          description="Inicie uma venda com localização e canal já no contexto de delivery."
          icon={ShoppingCart}
          label="Vender produto"
          onClick={onOpenSale}
          tone="info"
        />
      </div>
    </LabPanel>
  )
}

function ActionLaunchCard({
  icon: Icon,
  label,
  description,
  tone,
  onClick,
}: Readonly<{
  icon: typeof Plus
  label: string
  description: string
  tone: 'neutral' | 'info'
  onClick: () => void
}>) {
  return (
    <button
      className="flex w-full items-start gap-3 border-b border-dashed border-[var(--lab-border)] px-1 py-4 text-left transition last:border-b-0 hover:bg-[var(--lab-surface-hover)]"
      type="button"
      onClick={onClick}
    >
      <span
        className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl border ${
          tone === 'info'
            ? 'border-[var(--lab-blue-border)] bg-[var(--lab-blue-soft)] text-[var(--lab-blue)]'
            : 'border-[var(--lab-border)] bg-[var(--lab-surface)] text-[var(--lab-fg)]'
        }`}
      >
        <Icon className="size-4" />
      </span>
      <span className="space-y-1">
        <span className="block text-sm font-semibold text-[var(--lab-fg)]">{label}</span>
        <span className="block text-sm leading-6 text-[var(--lab-fg-soft)]">{description}</span>
      </span>
    </button>
  )
}

function PortfolioFormShell({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <div
      className="scroll-mt-24 [&_.imperial-card]:rounded-none [&_.imperial-card]:border-0 [&_.imperial-card]:bg-transparent [&_.imperial-card]:p-0 [&_.imperial-card]:shadow-none [&_.imperial-card-soft]:rounded-none [&_.imperial-card-soft]:border-0 [&_.imperial-card-soft]:bg-transparent [&_.imperial-card-soft]:p-0 [&_.imperial-card-soft]:shadow-none [&_.imperial-card-stat]:rounded-none [&_.imperial-card-stat]:border-0 [&_.imperial-card-stat]:bg-transparent [&_.imperial-card-stat]:p-0 [&_.imperial-card-stat]:shadow-none"
      style={formBridgeStyle}
    >
      {children}
    </div>
  )
}

function PortfolioWorkbench({
  title,
  description,
  children,
  toolbar,
  onClose,
}: Readonly<{
  title: string
  description: string
  children: ReactNode
  toolbar?: ReactNode
  onClose: () => void
}>) {
  useEffect(() => {
    document.body.classList.add('portfolio-workbench-open')
    return () => {
      document.body.classList.remove('portfolio-workbench-open')
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center p-0" role="presentation">
      <button
        aria-label="Fechar superfície"
        className="absolute inset-0 border-0 bg-black/70 p-0 backdrop-blur-sm"
        type="button"
        onClick={onClose}
      />

      <div
        aria-modal="true"
        className="relative z-10 flex h-full w-full flex-col overflow-hidden bg-[var(--bg)]"
        role="dialog"
        style={formBridgeStyle}
      >
        <div className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_92%,black_8%)]">
          <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-4 px-5 py-4 lg:px-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Superfície acionada</p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{title}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-soft)]">{description}</p>
              </div>
              <button
                className="flex size-10 items-center justify-center rounded-[14px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-soft)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                type="button"
                onClick={onClose}
              >
                <X className="size-4" />
              </button>
            </div>

            {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--bg)]">
          <div className="mx-auto w-full max-w-[1360px] px-5 py-6 lg:px-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

function PortfolioSaleSurface({
  currentMode,
  employees,
  errorMessage,
  loading,
  onModeChange,
  onSubmit,
  product,
  products,
  saleInitialValues,
  userRole,
}: Readonly<{
  currentMode: SaleMode
  employees: Parameters<typeof OrderForm>[0]['employees']
  errorMessage: string | null
  loading: boolean
  onModeChange: (mode: SaleMode) => void
  onSubmit: Parameters<typeof OrderForm>[0]['onSubmit']
  product: ProductRecord | null
  products: ProductRecord[]
  saleInitialValues?: Partial<OrderFormInputValues>
  userRole: 'OWNER' | 'STAFF'
}>) {
  return (
    <div className="space-y-4">
      {errorMessage ? <AlertMessage message={errorMessage} tone="danger" /> : null}

      <PortfolioFormShell>
        <OrderForm
          appearance="embedded"
          channelPreset={saleModeMeta[currentMode].channel}
          employees={employees}
          initialValues={saleInitialValues}
          loading={loading}
          products={products}
          submitLabel="Registrar venda"
          userRole={userRole}
          onSubmit={onSubmit}
        />
      </PortfolioFormShell>
    </div>
  )
}

function PortfolioSaleToolbar({
  currentMode,
  onModeChange,
  product,
}: Readonly<{
  currentMode: SaleMode
  onModeChange: (mode: SaleMode) => void
  product: ProductRecord | null
}>) {
  const mode = saleModeMeta[currentMode]

  return (
    <>
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Modalidade</span>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(saleModeMeta) as SaleMode[]).map((entry) => {
          const entryMeta = saleModeMeta[entry]
          const Icon = entryMeta.icon
          const active = currentMode === entry

          return (
            <button
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                active
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-soft)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
              }`}
              key={entry}
              type="button"
              onClick={() => onModeChange(entry)}
            >
              <Icon className="size-4" />
              {entryMeta.label}
            </button>
          )
        })}
      </div>
      <PortfolioHeaderFact label="canal" value={mode.channel} />
      <PortfolioHeaderFact label="produto" value={product ? `${product.name} · ${product.category}` : 'seleção livre'} />
      <PortfolioHeaderFact
        label="preço base"
        value={product ? formatCurrency(product.unitPrice, product.displayCurrency) : 'valor do cadastro'}
      />
      <span className="text-sm text-[var(--text-soft)]">{mode.description}</span>
    </>
  )
}

function PortfolioProductToolbar({
  product,
  products,
}: Readonly<{
  product: ProductRecord | null
  products: ProductRecord[]
}>) {
  return (
    <>
      <PortfolioHeaderFact label="modo" value={product ? 'edição' : 'novo item'} />
      <PortfolioHeaderFact label="skus ativos" value={String(products.filter((item) => item.active).length)} />
      <PortfolioHeaderFact label="cozinha" value={product?.requiresKitchen ? 'envia para KDS' : 'definido no fluxo'} />
      <PortfolioHeaderFact label="combos" value={product?.isCombo ? 'combo habilitado' : 'produto simples'} />
    </>
  )
}

function PortfolioHeaderFact({
  label,
  value,
}: Readonly<{
  label: string
  value: string
}>) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text-soft)]">
      <span className="uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</span>
      <span className="font-medium text-[var(--text-primary)]">{value}</span>
    </div>
  )
}

function PortfolioProductsPanel({
  busy,
  currency,
  filteredProducts,
  mutationError,
  onArchive,
  onDelete,
  onEdit,
  onRestore,
  onSell,
  products,
  productsError,
  searchQuery,
  setSearchQuery,
}: Readonly<{
  busy: boolean
  currency: string
  filteredProducts: ProductRecord[]
  mutationError: ProductMutationError
  onArchive: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (product: ProductRecord | null) => void
  onRestore: (id: string) => void
  onSell: (product: ProductRecord) => void
  products: ProductRecord[]
  productsError: string | null
  searchQuery: string
  setSearchQuery: (value: string) => void
}>) {
  const emptyTitle = products.length
    ? 'Nenhum produto bate com a busca'
    : 'Nenhum produto cadastrado'
  const emptyDescription = products.length
    ? 'Tente outro termo para localizar nome, marca, categoria ou classe.'
    : 'Use o formulario ao lado para criar os primeiros itens do portfolio.'

  return (
    <LabPanel
      action={<PortfolioSearchBox value={searchQuery} onChange={setSearchQuery} />}
      padding="md"
      subtitle="Tabela de leitura rapida para editar, arquivar ou reativar produtos."
      title="Produtos cadastrados"
    >
      {productsError ? <AlertMessage message={productsError} tone="danger" /> : null}
      {mutationError ? <AlertMessage message={mutationError.message} tone="danger" /> : null}

      <LabTable
        className="mt-4"
        columns={[
          {
            id: 'produto',
            header: 'Produto',
            cell: (product) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--lab-fg)]">{product.name}</p>
                <p className="mt-1 truncate text-xs text-[var(--lab-fg-soft)]">
                  {product.category} · {product.brand ?? 'sem marca'} · {product.packagingClass}
                </p>
              </div>
            ),
          },
          {
            id: 'estoque',
            header: 'Estoque',
            cell: (product) => (
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm text-[var(--lab-fg)]">{product.stockBaseUnits} und base</span>
                <LabStatusPill tone={product.isLowStock ? 'warning' : 'success'}>
                  {product.isLowStock ? 'baixo' : 'ok'}
                </LabStatusPill>
              </div>
            ),
            align: 'right',
            width: '130px',
          },
          {
            id: 'custo',
            header: 'Custo unit.',
            cell: (product) => <span className="text-[var(--lab-fg-soft)]">{formatCurrency(product.unitCost, product.displayCurrency)}</span>,
            align: 'right',
            width: '130px',
          },
          {
            id: 'venda',
            header: 'Venda unit.',
            cell: (product) => <span className="font-medium text-[var(--lab-fg)]">{formatCurrency(product.unitPrice, product.displayCurrency)}</span>,
            align: 'right',
            width: '130px',
          },
          {
            id: 'margem',
            header: 'Margem',
            cell: (product) => <MarginPill marginPercent={product.marginPercent} />,
            align: 'right',
            width: '120px',
          },
          {
            id: 'lucro',
            header: 'Lucro pot.',
            cell: (product) => <span className="text-[var(--lab-fg-soft)]">{formatCurrency(product.potentialProfit, product.displayCurrency)}</span>,
            align: 'right',
            width: '140px',
          },
          {
            id: 'status',
            header: 'Status',
            cell: (product) => (
              <LabStatusPill tone={product.active ? 'success' : 'neutral'}>
                {product.active ? 'ativo' : 'arquivado'}
              </LabStatusPill>
            ),
            width: '130px',
          },
          {
            id: 'acoes',
            header: 'Acoes',
            cell: (product) => (
              <div className="flex justify-end gap-2">
                <ActionButton disabled={busy} icon={PencilLine} label="Editar" onClick={() => onEdit(product)} />
                {product.active ? (
                  <>
                    <ActionButton
                      disabled={busy}
                      icon={ShoppingCart}
                      label="Vender"
                      tone="info"
                      onClick={() => onSell(product)}
                    />
                    <ActionButton
                      disabled={busy}
                      icon={Archive}
                      label="Arquivar"
                      onClick={() => onArchive(product.id)}
                    />
                  </>
                ) : (
                  <>
                    <ActionButton
                      disabled={busy}
                      icon={RotateCcw}
                      label="Reativar"
                      onClick={() => onRestore(product.id)}
                    />
                    <ActionButton
                      disabled={busy}
                      icon={Trash2}
                      label="Excluir"
                      tone="danger"
                      onClick={() => onDelete(product.id)}
                    />
                  </>
                )}
              </div>
            ),
            align: 'right',
            width: '360px',
          },
        ]}
        emptyDescription={emptyDescription}
        emptyTitle={emptyTitle}
        rowKey="id"
        rows={filteredProducts}
      />

      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[var(--lab-fg-muted)]">
        <span>
          {filteredProducts.length} de {products.length}{' '}
          {filteredProducts.length === 1 ? 'encontrado' : 'encontrados'}
        </span>
        <span>{formatCurrency(productsTotalsValue(filteredProducts, currency), currency as never)} em venda filtrada</span>
      </div>
    </LabPanel>
  )
}

function PortfolioSearchBox({
  value,
  onChange,
}: Readonly<{
  value: string
  onChange: (value: string) => void
}>) {
  return (
    <label className="flex w-full items-center gap-3 rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-surface)] px-3 py-2 xl:w-[280px]">
      <span className="sr-only">Buscar produto</span>
      <Search className="size-4 text-[var(--lab-fg-muted)]" />
      <input
        className="h-8 min-w-0 flex-1 bg-transparent text-sm text-[var(--lab-fg)] outline-none placeholder:text-[var(--lab-fg-muted)]"
        placeholder="Buscar nome, marca ou classe"
        type="search"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {value ? (
        <button
          className="inline-flex size-8 items-center justify-center rounded-xl border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] text-[var(--lab-fg-soft)] transition hover:bg-[var(--lab-surface-hover)] hover:text-[var(--lab-fg)]"
          type="button"
          onClick={() => onChange('')}
        >
          <X className="size-4" />
          <span className="sr-only">Limpar busca</span>
        </button>
      ) : null}
    </label>
  )
}

function MarginPill({ marginPercent }: Readonly<{ marginPercent: number }>) {
  let tone: LabStatusTone = 'danger'
  if (marginPercent >= 50) {
    tone = 'success'
  } else if (marginPercent >= 30) {
    tone = 'info'
  } else if (marginPercent >= 15) {
    tone = 'warning'
  }

  return <LabStatusPill tone={tone}>{`${marginPercent.toFixed(0)}%`}</LabStatusPill>
}

function ActionButton({
  disabled,
  icon: Icon,
  label,
  onClick,
  tone = 'neutral',
}: Readonly<{
  disabled?: boolean
  icon: typeof PencilLine
  label: string
  onClick: () => void
  tone?: 'neutral' | 'danger' | 'info'
}>) {
  const className =
    tone === 'danger'
      ? 'border-[var(--lab-danger-soft)] bg-[var(--lab-danger-soft)] text-[var(--lab-danger)]'
      : tone === 'info'
        ? 'border-[var(--lab-blue-border)] bg-[var(--lab-blue-soft)] text-[var(--lab-blue)]'
      : 'border-[var(--lab-border)] bg-[var(--lab-surface-raised)] text-[var(--lab-fg-soft)] hover:bg-[var(--lab-surface-hover)] hover:text-[var(--lab-fg)]'

  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  )
}

function AlertMessage({
  message,
  tone,
}: Readonly<{
  message: string
  tone: LabStatusTone
}>) {
  const textClass =
    tone === 'danger'
      ? 'text-[var(--lab-danger)]'
      : tone === 'warning'
        ? 'text-[var(--lab-warning)]'
        : tone === 'success'
          ? 'text-[var(--lab-success)]'
          : 'text-[var(--lab-fg)]'

  return (
    <div className="mb-4 rounded-[14px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-3">
      <p className={`text-sm ${textClass}`}>{message}</p>
    </div>
  )
}

function productsTotalsValue(products: ProductRecord[], currency: string) {
  if (products.length === 0) {
    return 0
  }

  return products.reduce((sum, product) => {
    if (product.displayCurrency !== currency) {
      return sum + product.inventorySalesValue
    }

    return sum + product.inventorySalesValue
  }, 0)
}
