'use client'

import { type ReactNode, useMemo, useState } from 'react'
import { Archive, MapPin, PencilLine, Plus, RotateCcw, Search, ShoppingCart, Store, Trash2, Truck, X } from 'lucide-react'
import type { FinanceSummaryResponse, ProductRecord, ProductsResponse } from '@contracts/contracts'
import {
  LabMiniStat,
  LabPageHeader,
  LabFactPill,
  LabFilterChip,
  LabMetricStrip,
  LabMetricStripItem,
  LabPanel,
  LabSignalRow,
  LabStatusPill,
  LabTable,
  type LabStatusTone,
} from '@/components/design-lab/lab-primitives'
import { LabWorkbench } from '@/components/design-lab/lab-workbench'
import { OrderForm } from '@/components/dashboard/order-form'
import { ProductForm } from '@/components/dashboard/product-form'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { useDashboardMutations } from '@/components/dashboard/hooks/useDashboardMutations'
import { ApiError } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import { normalizeTextForSearch } from '@/lib/normalize-text-for-search'
import { formatStockBreakdown } from '@/lib/product-packaging'
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
    icon: typeof Truck
    tone: LabStatusTone
  }
> = {
  delivery: {
    label: 'Delivery',
    channel: 'Delivery',
    icon: Truck,
    tone: 'info',
  },
  balcao: {
    label: 'Balcão',
    channel: 'Balcão',
    icon: Store,
    tone: 'success',
  },
  mesa: {
    label: 'Mesa',
    channel: 'Mesa',
    icon: MapPin,
    tone: 'warning',
  },
}

function buildProductPayload(values: ProductFormValues, existingProduct?: ProductRecord | null) {
  return {
    name: values.name,
    barcode: values.barcode ?? (existingProduct?.barcode ? null : undefined),
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
    [product.name, product.barcode ?? '', product.brand ?? '', product.category, product.packagingClass].some((value) => {
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
    const payload = buildProductPayload(values, activeProductModal)
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
        description="Estoque, margem e giro do catálogo."
        eyebrow="Estoque e margem"
        title="Portfolio de produtos"
      >
        <PortfolioHeaderBoard
          activeProducts={productsTotals?.activeProducts ?? 0}
          displayCurrency={displayCurrency}
          inventoryCostValue={productsTotals?.inventoryCostValue ?? 0}
          inventorySalesValue={productsTotals?.inventorySalesValue ?? 0}
          lowStockItems={finance?.totals.lowStockItems ?? 0}
        />
      </LabPageHeader>

      <div className="grid gap-5 xl:grid-cols-[400px_minmax(0,1fr)] xl:items-start">
        <div className="space-y-5">
          <PortfolioActionPanel
            activeProducts={productsTotals?.activeProducts ?? 0}
            onOpenProduct={openNewProductSurface}
            onOpenSale={() => openSaleSurface(null, 'delivery')}
          />
          <PortfolioOperationalPanel
            avgMargin={avgMargin}
            products={products}
            productsTotals={productsTotals}
          />
        </div>
        <PortfolioRadarPanel
          avgMargin={avgMargin}
          categoryBreakdown={finance?.categoryBreakdown ?? []}
          displayCurrency={displayCurrency}
          lowStockItems={finance?.totals.lowStockItems ?? 0}
          maxCategoryProfit={maxCategoryProfit}
          products={products}
          productsTotals={productsTotals}
        />
      </div>

      <PortfolioProductsPanel
        busy={productBusy}
        currency={displayCurrency}
        filteredProducts={filteredProducts}
        mutationError={productMutationError}
        onCreate={openNewProductSurface}
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
        <LabWorkbench
          description="Campos do produto, estoque e margem."
          bodyClassName="portfolio-workbench-open"
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
        </LabWorkbench>
      ) : null}

      {activeSaleSurface ? (
        <LabWorkbench
          description="Produto, canal, localização e pagamento."
          bodyClassName="portfolio-workbench-open"
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
            onSubmit={({ values }) =>
              createOrderMutation.mutate(
                { values },
                {
                  onSuccess: () => setSurface(null),
                },
              )
            }
            products={products.filter((product) => product.active)}
            saleInitialValues={saleInitialValues}
            userRole={currentUser?.role ?? 'OWNER'}
          />
        </LabWorkbench>
      ) : null}
    </section>
  )
}

function PortfolioHeaderBoard({
  activeProducts,
  displayCurrency,
  inventoryCostValue,
  inventorySalesValue,
  lowStockItems,
}: Readonly<{
  activeProducts: number
  displayCurrency: string
  inventoryCostValue: number
  inventorySalesValue: number
  lowStockItems: number
}>) {
  return (
    <LabMetricStrip>
      <LabMetricStripItem
        description="itens ativos no catálogo"
        label="SKUs ativos"
        value={String(activeProducts)}
      />
      <LabMetricStripItem
        description="capital parado no estoque"
        label="capital em estoque"
        value={formatCurrency(inventoryCostValue, displayCurrency as never)}
      />
      <LabMetricStripItem
        description="valor máximo de venda do mix"
        label="venda potencial"
        value={formatCurrency(inventorySalesValue, displayCurrency as never)}
      />
      <LabMetricStripItem
        description={lowStockItems > 0 ? 'itens pedindo reposição' : 'sem pressão crítica no estoque'}
        label="itens em alerta"
        value={String(lowStockItems)}
      />
    </LabMetricStrip>
  )
}

function PortfolioOperationalPanel({
  avgMargin,
  products,
  productsTotals,
}: Readonly<{
  avgMargin: string
  products: ProductRecord[]
  productsTotals: ProductsResponse['totals'] | undefined
}>) {
  const categoriesCount =
    productsTotals?.categories.length ?? new Set(products.map((product) => product.category)).size
  const comboCount = products.filter((product) => product.isCombo).length
  const kitchenCount = products.filter((product) => product.requiresKitchen).length
  const inactiveCount = productsTotals?.inactiveProducts ?? 0

  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{categoriesCount} famílias</LabStatusPill>}
      padding="md"
      title="Leitura operacional"
    >
      <div className="space-y-0">
        <LabSignalRow label="arquivados" note="itens fora do mix ativo" tone="neutral" value={String(inactiveCount)} />
        <LabSignalRow label="combos" note="ofertas compostas no catálogo" tone="warning" value={String(comboCount)} />
        <LabSignalRow label="cozinha" note="produtos que geram fila no KDS" tone="info" value={String(kitchenCount)} />
        <LabSignalRow label="margem média" note="qualidade média de precificação" tone="success" value={avgMargin} />
      </div>
    </LabPanel>
  )
}

function PortfolioRadarPanel({
  avgMargin,
  categoryBreakdown,
  displayCurrency,
  lowStockItems,
  maxCategoryProfit,
  products,
  productsTotals,
}: Readonly<{
  avgMargin: string
  categoryBreakdown: FinanceSummaryResponse['categoryBreakdown']
  displayCurrency: string
  lowStockItems: number
  maxCategoryProfit: number
  products: ProductRecord[]
  productsTotals: ProductsResponse['totals'] | undefined
}>) {
  const categoriesCount = productsTotals?.categories.length ?? new Set(products.map((product) => product.category)).size
  const comboCount = products.filter((product) => product.isCombo).length
  const kitchenCount = products.filter((product) => product.requiresKitchen).length
  const topCategories = categoryBreakdown.slice(0, 4)
  const categoryLeader = topCategories[0]

  if (topCategories.length === 0) {
    return (
      <LabPanel
        action={<LabStatusPill tone="neutral">{categoriesCount} categorias</LabStatusPill>}
        padding="md"
        title="Radar do catálogo"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <LabMiniStat label="categorias ativas" value={String(categoriesCount)} />
          <LabMiniStat label="combos" value={String(comboCount)} />
          <LabMiniStat label="cozinha" value={String(kitchenCount)} />
          <LabMiniStat label="margem média" value={avgMargin} />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <PortfolioRadarFact label="família líder" tone="info" value="sem leitura" />
          <PortfolioRadarFact
            label="lucro líder"
            tone="success"
            value={formatCurrency(0, displayCurrency as never)}
          />
          <PortfolioRadarFact
            label="capital líder"
            tone="neutral"
            value={formatCurrency(0, displayCurrency as never)}
          />
          <PortfolioRadarFact
            label="estoque baixo"
            tone={lowStockItems > 0 ? 'warning' : 'success'}
            value={String(lowStockItems)}
          />
        </div>
      </LabPanel>
    )
  }

  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{categoriesCount} categorias</LabStatusPill>}
      padding="md"
      title="Radar do catálogo"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_280px]">
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            <LabMiniStat label="categorias ativas" value={String(categoriesCount)} />
            <LabMiniStat label="combos" value={String(comboCount)} />
            <LabMiniStat label="cozinha" value={String(kitchenCount)} />
            <LabMiniStat label="margem média" value={avgMargin} />
          </div>

          {topCategories.length > 0 ? (
            <div className="space-y-1">
              {topCategories.map((category) => {
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
              })}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <LabMiniStat label="ranking" value="0" />
              <LabMiniStat label="maior família" value="0 SKU" />
              <LabMiniStat label="lucro por categoria" value={formatCurrency(0, displayCurrency as never)} />
            </div>
          )}
        </div>

        <div className="space-y-4 border-t border-dashed border-[var(--lab-border)] pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
          <LabSignalRow
            label="família líder"
            note="categoria com maior lucro potencial"
            tone="info"
            value={categoryLeader?.category ?? 'sem leitura'}
          />
          <LabSignalRow
            label="lucro líder"
            note="potencial máximo da família dominante"
            tone="success"
            value={formatCurrency(categoryLeader?.potentialProfit ?? 0, displayCurrency as never)}
          />
          <LabSignalRow
            label="capital líder"
            note="estoque comprometido na família dominante"
            tone="neutral"
            value={formatCurrency(categoryLeader?.inventoryCostValue ?? 0, displayCurrency as never)}
          />
          <LabSignalRow
            label="estoque baixo"
            note="famílias pressionadas por reposição"
            value={String(lowStockItems)}
            tone={lowStockItems > 0 ? 'warning' : 'success'}
          />
        </div>
      </div>
    </LabPanel>
  )
}

function PortfolioRadarFact({
  label,
  tone,
  value,
}: Readonly<{
  label: string
  tone: LabStatusTone
  value: string
}>) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-[16px] border border-dashed border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-3">
      <span className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lab-fg-soft)]">
        {label}
      </span>
      <LabStatusPill tone={tone}>{value}</LabStatusPill>
    </div>
  )
}

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
      title="Fluxos imediatos"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <ActionLaunchCard
          icon={Plus}
          label="Cadastrar produto"
          statLabel="fluxo"
          statValue="novo item"
          onClick={onOpenProduct}
        />
        <ActionLaunchCard
          icon={ShoppingCart}
          label="Vender produto"
          statLabel="canal"
          statValue="delivery"
          onClick={onOpenSale}
        />
      </div>
    </LabPanel>
  )
}

function ActionLaunchCard({
  icon: Icon,
  label,
  statLabel,
  statValue,
  onClick,
}: Readonly<{
  icon: typeof Plus
  label: string
  statLabel: string
  statValue: string
  onClick: () => void
}>) {
  return (
    <button
      className="group flex min-h-[120px] w-full flex-col justify-between rounded-[18px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-4 text-left transition hover:border-[var(--lab-blue-border)] hover:bg-[var(--lab-surface-hover)]"
      type="button"
      onClick={onClick}
    >
      <span className="flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--lab-blue-border)] bg-[var(--lab-blue-soft)] text-[var(--lab-blue)] transition group-hover:border-[var(--lab-blue)]">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-[var(--lab-fg)]">{label}</span>
          <span className="mt-1 block text-sm leading-5 text-[var(--lab-fg-soft)]">
            {label === 'Cadastrar produto'
              ? 'Abrir cadastro completo de item, estoque, margem e cozinha.'
              : 'Abrir venda rápida com localização e contexto de delivery.'}
          </span>
        </span>
      </span>

      <span className="flex items-end justify-between gap-3 border-t border-dashed border-[var(--lab-border)] pt-3">
        <span>
          <span className="block text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">{statLabel}</span>
          <span className="mt-1 block text-sm font-semibold text-[var(--lab-fg)]">{statValue}</span>
        </span>
        <span className="inline-flex h-9 items-center rounded-xl border border-[var(--lab-blue)] bg-[var(--lab-blue)] px-3 text-sm font-medium text-white transition group-hover:bg-[color:color-mix(in_srgb,var(--lab-blue)_82%,white_18%)]">
          Abrir
        </span>
      </span>
    </button>
  )
}

function PortfolioFormShell({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return <div className="scroll-mt-24">{children}</div>
}

function PortfolioSaleSurface({
  currentMode,
  employees,
  errorMessage,
  loading,
  onSubmit,
  products,
  saleInitialValues,
  userRole,
}: Readonly<{
  currentMode: SaleMode
  employees: Parameters<typeof OrderForm>[0]['employees']
  errorMessage: string | null
  loading: boolean
  onSubmit: Parameters<typeof OrderForm>[0]['onSubmit']
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
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">Modalidade</span>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(saleModeMeta) as SaleMode[]).map((entry) => {
          const entryMeta = saleModeMeta[entry]
          const Icon = entryMeta.icon
          const active = currentMode === entry

          return (
            <button
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                active
                  ? 'border-[var(--lab-blue-border)] bg-[var(--lab-blue-soft)] text-[var(--lab-blue)]'
                  : 'border-[var(--lab-border)] bg-[var(--lab-surface)] text-[var(--lab-fg-soft)] hover:border-[var(--lab-border-strong)] hover:text-[var(--lab-fg)]'
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
      <LabFactPill label="canal" value={mode.channel} />
      <LabFactPill label="produto" value={product ? `${product.name} · ${product.category}` : 'seleção livre'} />
      <LabFactPill
        label="preço base"
        value={product ? formatCurrency(product.unitPrice, product.displayCurrency) : 'valor do cadastro'}
      />
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
      <LabFactPill label="modo" value={product ? 'edição' : 'novo item'} />
      <LabFactPill label="skus ativos" value={String(products.filter((item) => item.active).length)} />
      <LabFactPill label="cozinha" value={product?.requiresKitchen ? 'envia para KDS' : 'definido no fluxo'} />
      <LabFactPill label="combos" value={product?.isCombo ? 'combo habilitado' : 'produto simples'} />
    </>
  )
}

function PortfolioProductsPanel({
  busy,
  currency,
  filteredProducts,
  mutationError,
  onCreate,
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
  onCreate: () => void
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
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'active' | 'low-stock' | 'combo' | 'kitchen'>('all')

  const tableRows = useMemo(() => {
    switch (catalogFilter) {
      case 'active':
        return filteredProducts.filter((product) => product.active)
      case 'low-stock':
        return filteredProducts.filter((product) => product.isLowStock)
      case 'combo':
        return filteredProducts.filter((product) => product.isCombo)
      case 'kitchen':
        return filteredProducts.filter((product) => product.requiresKitchen)
      case 'all':
      default:
        return filteredProducts
    }
  }, [catalogFilter, filteredProducts])

  const filterOptions = [
    { key: 'all' as const, label: 'Todos', count: filteredProducts.length },
    { key: 'active' as const, label: 'Ativos', count: filteredProducts.filter((product) => product.active).length },
    { key: 'low-stock' as const, label: 'Estoque baixo', count: filteredProducts.filter((product) => product.isLowStock).length },
    { key: 'combo' as const, label: 'Combos', count: filteredProducts.filter((product) => product.isCombo).length },
    { key: 'kitchen' as const, label: 'Cozinha', count: filteredProducts.filter((product) => product.requiresKitchen).length },
  ]

  const emptyTitle = products.length
    ? 'Nenhum produto bate com a busca'
    : 'Nenhum produto cadastrado'
  const emptyDescription = products.length
    ? 'Tente outro termo para localizar nome, marca, categoria ou classe.'
    : 'Abra o cadastro do portfólio para criar os primeiros itens reais.'

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-[var(--lab-border)] pb-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[var(--lab-fg)]">Produtos cadastrados</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--lab-fg-soft)]">
            Catálogo real com estoque, margem, EAN e ações operacionais sem encapsular a tabela em outro card.
          </p>
        </div>
        <PortfolioSearchBox value={searchQuery} onChange={setSearchQuery} />
      </div>

      {productsError ? <AlertMessage message={productsError} tone="danger" /> : null}
      {mutationError ? <AlertMessage message={mutationError.message} tone="danger" /> : null}

      <div className="flex flex-wrap items-center gap-2">
        {filterOptions.map((option) => (
          <LabFilterChip
            active={catalogFilter === option.key}
            count={option.count}
            key={option.key}
            label={option.label}
            onClick={() => setCatalogFilter(option.key)}
          />
        ))}
      </div>

      <LabTable
        dense
        columns={[
          {
            id: 'produto',
            header: 'Produto',
            cell: (product) => (
              <div className="min-w-0 space-y-2">
                <p className="truncate font-medium text-[var(--lab-fg)]">{product.name}</p>
                <p className="mt-1 truncate text-xs text-[var(--lab-fg-soft)]">
                  {product.category} · {product.brand ?? 'sem marca'} · {product.packagingClass}
                  {product.barcode ? ` · EAN ${product.barcode}` : ''}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <ProductRowTag tone={product.active ? 'success' : 'neutral'}>
                    {product.active ? 'ativo' : 'arquivado'}
                  </ProductRowTag>
                  {product.requiresKitchen ? <ProductRowTag tone="info">cozinha</ProductRowTag> : null}
                  {product.isCombo ? <ProductRowTag tone="warning">combo</ProductRowTag> : null}
                </div>
              </div>
            ),
          },
          {
            id: 'operacao',
            header: 'Leitura operacional',
            cell: (product) => (
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--lab-fg-soft)]">
                  <span>{formatStockBreakdown(product.stock, product.unitsPerPackage, { compact: true })}</span>
                  <span>·</span>
                  <span>{product.stockBaseUnits} und base</span>
                  {product.lowStockThreshold != null ? (
                    <>
                      <span>·</span>
                      <span>alerta em {product.lowStockThreshold}</span>
                    </>
                  ) : null}
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--lab-surface-hover)]">
                  <div
                    className={product.isLowStock ? 'h-full rounded-full bg-[var(--lab-warning)]' : 'h-full rounded-full bg-[var(--lab-blue)]'}
                    style={{
                      width: `${Math.max(
                        product.lowStockThreshold && product.lowStockThreshold > 0
                          ? Math.min((product.stockBaseUnits / (product.lowStockThreshold * 3)) * 100, 100)
                          : Math.min((product.stockBaseUnits / Math.max(product.stockBaseUnits, 1)) * 100, 100),
                        10,
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <LabStatusPill tone={product.isLowStock ? 'warning' : 'success'}>
                    {product.isLowStock ? 'estoque baixo' : 'estoque estável'}
                  </LabStatusPill>
                </div>
              </div>
            ),
            width: '270px',
          },
          {
            id: 'preco',
            header: 'Preço e margem',
            cell: (product) => (
              <div className="space-y-1.5">
                <ValueReading label="custo" value={formatCurrency(product.unitCost, product.displayCurrency)} />
                <ValueReading label="venda" value={formatCurrency(product.unitPrice, product.displayCurrency)} strong />
                <div className="pt-0.5">
                  <MarginPill marginPercent={product.marginPercent} />
                </div>
              </div>
            ),
            align: 'right',
            width: '180px',
          },
          {
            id: 'potencial',
            header: 'Potencial',
            cell: (product) => (
              <div className="space-y-1.5">
                <ValueReading label="venda" value={formatCurrency(product.inventorySalesValue, product.displayCurrency)} strong />
                <ValueReading label="lucro" value={formatCurrency(product.potentialProfit, product.displayCurrency)} />
              </div>
            ),
            align: 'right',
            width: '170px',
          },
          {
            id: 'acoes',
            header: 'Ações',
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
            width: '280px',
          },
        ]}
        emptyAction={
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-2 text-sm font-medium text-[var(--lab-fg)] transition hover:bg-[var(--lab-surface-hover)]"
            type="button"
            onClick={onCreate}
          >
            <Plus className="size-4" />
            Cadastrar produto
          </button>
        }
        emptyDescription={emptyDescription}
        emptyTitle={emptyTitle}
        rowKey="id"
        rows={tableRows}
      />

      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[var(--lab-fg-muted)]">
        <span>
          {tableRows.length} de {products.length}{' '}
          {tableRows.length === 1 ? 'encontrado' : 'encontrados'}
        </span>
        <span>{formatCurrency(productsTotalsValue(tableRows, currency), currency as never)} em venda filtrada</span>
      </div>
    </section>
  )
}

function ProductRowTag({
  children,
  tone,
}: Readonly<{
  children: ReactNode
  tone: LabStatusTone
}>) {
  return (
    <LabStatusPill size="sm" tone={tone}>
      {children}
    </LabStatusPill>
  )
}

function ValueReading({
  label,
  strong = false,
  value,
}: Readonly<{
  label: string
  strong?: boolean
  value: string
}>) {
  return (
    <div className="flex items-center justify-end gap-2 text-xs">
      <span className="uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">{label}</span>
      <span className={strong ? 'font-semibold text-[var(--lab-fg)]' : 'text-[var(--lab-fg-soft)]'}>{value}</span>
    </div>
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
        placeholder="Buscar nome, EAN, marca ou classe"
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
