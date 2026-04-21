'use client'

import { useMemo, useRef, useState } from 'react'
import { Boxes, Package, Search, Tags, TrendingUp } from 'lucide-react'
import type { FinanceSummaryResponse, ProductRecord, ProductsResponse } from '@contracts/contracts'
import { ApiError } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import { normalizeTextForSearch } from '@/lib/normalize-text-for-search'
import type { ProductFormValues } from '@/lib/validation'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { useDashboardMutations } from '@/components/dashboard/hooks/useDashboardMutations'
import { DashboardSectionHeading } from '@/components/dashboard/dashboard-section-heading'
import { ProductCard } from '@/components/dashboard/product-card'
import { ProductForm } from '@/components/dashboard/product-form'
import { ProductSearchField } from '@/components/dashboard/product-search-field'

function CategoryCard({
  category,
  products,
  inventoryCostValue,
  potentialProfit,
  inventorySalesValue,
  displayCurrency,
  maxProfit,
}: Readonly<{
  category: string
  products: number
  inventoryCostValue: number
  potentialProfit: number
  inventorySalesValue: number
  displayCurrency: string
  maxProfit: number
}>) {
  const barPct = maxProfit > 0 ? Math.max(4, (potentialProfit / maxProfit) * 100) : 4
  const categoryMargin =
    inventorySalesValue > 0
      ? `${Math.round((potentialProfit / inventorySalesValue) * 100)}% margem estimada`
      : 'sem venda projetada'

  return (
    <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--border-strong)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold leading-snug text-[var(--text-primary)]">{category}</p>
          <p className="mt-1 text-[11px] text-[var(--text-soft)]">
            {products} SKU{products !== 1 ? 's' : ''} · {formatCurrency(inventoryCostValue, displayCurrency as never)} de capital
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-[var(--accent)]">
            {formatCurrency(potentialProfit, displayCurrency as never)}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--text-soft)]">lucro pot.</p>
        </div>
      </div>

      <div className="mt-3.5 h-1 overflow-hidden rounded-full bg-[var(--surface-soft)]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
          style={{ width: `${barPct}%` }}
        />
      </div>

      <p className="mt-2 text-[10px] text-[var(--text-soft)]">
        {formatCurrency(inventorySalesValue, displayCurrency as never)} em venda potencial · {categoryMargin}
      </p>
    </div>
  )
}

function SummaryPill({
  icon: Icon,
  label,
  value,
  helper,
}: Readonly<{
  icon: typeof Package
  label: string
  value: string
  helper?: string
}>) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 shadow-[var(--shadow-panel)]">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-accent/20 bg-accent/[0.08]">
        <Icon className="size-3.5 text-[var(--accent)]" />
      </span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">{value}</p>
        {helper ? <p className="mt-0.5 text-[10px] text-[var(--text-soft)]">{helper}</p> : null}
      </div>
    </div>
  )
}

function calcAvgMargin(products: ProductRecord[]): string {
  const active = products.filter((product) => product.active && product.unitPrice > 0)
  if (!active.length) {
    return '—'
  }

  const avg =
    active.reduce((sum, product) => sum + ((product.unitPrice - product.unitCost) / product.unitPrice) * 100, 0) /
    active.length

  return `${avg.toFixed(0)}%`
}

type ProductMutationError = ApiError | null

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
    `Excluir "${productName ?? 'este produto'}" em definitivo?\n\nEssa ação remove o item do portfólio ativo e preserva apenas o histórico de vendas já consolidado.`,
  )
}

function PortfolioSummaryStrip({
  avgMargin,
  displayCurrency,
  lowStockItems,
  productsTotals,
}: Readonly<{
  avgMargin: string
  displayCurrency: string
  lowStockItems: number | null
  productsTotals: ProductsResponse['totals'] | undefined
}>) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <SummaryPill
        helper={productsTotals ? `${productsTotals.inactiveProducts} arquivado(s)` : undefined}
        icon={Package}
        label="SKUs ativos"
        value={productsTotals ? String(productsTotals.activeProducts) : '—'}
      />
      <SummaryPill
        helper={productsTotals ? `${productsTotals.stockBaseUnits} unidades base` : undefined}
        icon={Boxes}
        label="Capital em estoque"
        value={productsTotals ? formatCurrency(productsTotals.inventoryCostValue, displayCurrency as never) : '—'}
      />
      <SummaryPill
        helper={
          productsTotals
            ? `${formatCurrency(productsTotals.potentialProfit, displayCurrency as never)} em lucro potencial`
            : undefined
        }
        icon={TrendingUp}
        label="Venda potencial"
        value={productsTotals ? formatCurrency(productsTotals.inventorySalesValue, displayCurrency as never) : '—'}
      />
      <SummaryPill
        helper={`Margem média ${avgMargin}`}
        icon={Tags}
        label="Itens em alerta"
        value={String(lowStockItems ?? '—')}
      />
    </div>
  )
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
    <div className="imperial-card p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-[12px] border border-accent/20 bg-accent/[0.08]">
          <Tags className="size-4 text-[var(--accent)]" />
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Categorias</p>
          <h2 className="text-base font-semibold leading-snug text-[var(--text-primary)]">Fluxo por categoria</h2>
        </div>
      </div>

      <div className="space-y-2.5">
        {categoryBreakdown.length ? (
          categoryBreakdown.map((item) => (
            <CategoryCard
              category={item.category}
              displayCurrency={displayCurrency}
              inventoryCostValue={item.inventoryCostValue}
              inventorySalesValue={item.inventorySalesValue}
              key={item.category}
              maxProfit={maxCategoryProfit}
              potentialProfit={item.potentialProfit}
              products={item.products}
            />
          ))
        ) : (
          <div className="rounded-[16px] border border-dashed border-[var(--border)] px-5 py-8 text-center">
            <Tags className="mx-auto mb-3 size-7 text-[var(--text-soft)]/50" />
            <p className="text-sm text-[var(--text-soft)]">Cadastre produtos para destravar a leitura por categoria.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function PortfolioProductList({
  busy,
  filteredProducts,
  mutationError,
  onArchive,
  onDelete,
  onEdit,
  onRestore,
  products,
  productsError,
  searchQuery,
  setSearchQuery,
}: Readonly<{
  busy: boolean
  filteredProducts: ProductRecord[]
  mutationError: ProductMutationError
  onArchive: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (product: ProductRecord | null) => void
  onRestore: (id: string) => void
  products: ProductRecord[]
  productsError: string | null
  searchQuery: string
  setSearchQuery: (value: string) => void
}>) {
  return (
    <section className="imperial-card p-6 md:p-8">
      <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Portfólio</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Produtos cadastrados</h2>
          <p className="mt-1.5 text-sm text-[var(--text-soft)]">
            {filteredProducts.length === products.length
              ? `${products.length} item${products.length !== 1 ? 'ns' : ''}`
              : `${filteredProducts.length} de ${products.length} encontrado${filteredProducts.length !== 1 ? 's' : ''} para "${searchQuery}"`}
          </p>
        </div>
        <div className="sm:w-72">
          <ProductSearchField value={searchQuery} onChange={setSearchQuery} onClear={() => setSearchQuery('')} />
        </div>
      </div>

      {productsError ? (
        <p className="mt-5 rounded-[12px] border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.06)] px-4 py-3 text-sm text-[#f87171]">
          {productsError}
        </p>
      ) : null}
      {mutationError ? (
        <p className="mt-5 rounded-[12px] border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.06)] px-4 py-3 text-sm text-[#f87171]">
          {mutationError.message}
        </p>
      ) : null}

      <div className="mt-6 grid gap-3 xl:grid-cols-2">
        {filteredProducts.length ? (
          filteredProducts.map((product) => (
            <ProductCard
              busy={busy}
              key={product.id}
              product={product}
              onArchive={onArchive}
              onDelete={onDelete}
              onEdit={onEdit}
              onRestore={onRestore}
            />
          ))
        ) : (
          <div className="col-span-2 rounded-[20px] border border-dashed border-[var(--border)] px-6 py-14 text-center">
            <Search className="mx-auto mb-3 size-9 text-[var(--text-soft)]/50" />
            <p className="text-base font-semibold text-[var(--text-primary)]">
              {products.length ? 'Nenhum produto bate com a sua busca.' : 'Nenhum produto cadastrado ainda.'}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
              {products.length
                ? 'Tente outro nome, marca ou inicial para encontrar o item desejado.'
                : 'Use o formulário ao lado para criar os primeiros itens do portfólio.'}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

export function PortfolioLegacyEnvironment() {
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const productFormRef = useRef<HTMLDivElement | null>(null)

  const { financeQuery, productsQuery } = useDashboardQueries({ section: 'portfolio' })
  const {
    createProductMutation: _createProductMutation,
    updateProductMutation: _updateProductMutation,
    archiveProductMutation: _archiveProductMutation,
    restoreProductMutation,
    deleteProductMutation: _deleteProductMutation,
  } = useDashboardMutations()

  const finance = financeQuery.data
  const products = useMemo(() => productsQuery.data?.items ?? [], [productsQuery.data?.items])
  const productsTotals = productsQuery.data?.totals
  const productsError = productsQuery.error instanceof ApiError ? productsQuery.error.message : null
  const productMutationError = resolveProductMutationError([
    _createProductMutation.error,
    _updateProductMutation.error,
    _archiveProductMutation.error,
    restoreProductMutation.error,
    _deleteProductMutation.error,
  ])

  const archiveProductMutation = {
    isPending: _archiveProductMutation.isPending,
    mutate: (id: string) => _archiveProductMutation.mutate(id, { onSuccess: () => setEditingProduct(null) }),
  }

  const updateProductMutation = {
    isPending: _updateProductMutation.isPending,
    mutate: (payload: Parameters<typeof _updateProductMutation.mutate>[0]) =>
      _updateProductMutation.mutate(payload, { onSuccess: () => setEditingProduct(null) }),
  }

  const deleteProductMutation = {
    isPending: _deleteProductMutation.isPending,
    mutate: (id: string) =>
      _deleteProductMutation.mutate(id, {
        onSuccess: () => {
          if (editingProduct?.id === id) {
            setEditingProduct(null)
          }
        },
      }),
  }

  const handleProductSubmit = (values: ProductFormValues) => {
    const payload = buildProductPayload(values, editingProduct)
    if (editingProduct) {
      updateProductMutation.mutate({ productId: editingProduct.id, values: payload })
      return
    }

    _createProductMutation.mutate(payload)
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

  const handleDeleteProduct = (productId: string) => {
    const target = products.find((product) => product.id === productId)
    if (confirmProductDeletion(target?.name)) {
      deleteProductMutation.mutate(productId)
    }
  }

  const handleEditProduct = (product: ProductRecord | null) => {
    setEditingProduct(product)

    if (!product || typeof globalThis === 'undefined') {
      return
    }

    globalThis.requestAnimationFrame(() => {
      const formElement = productFormRef.current
      if (!formElement) {
        return
      }

      if (typeof formElement.scrollIntoView === 'function') {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      formElement.focus({ preventScroll: true })
    })
  }

  const displayCurrency = String(finance?.displayCurrency ?? 'BRL')

  return (
    <section className="space-y-6">
      <DashboardSectionHeading
        description="Estoque, preço e margem."
        eyebrow="Estoque e margem"
        icon={Boxes}
        title="Portfólio de produtos"
      />

      <PortfolioSummaryStrip
        avgMargin={avgMargin}
        displayCurrency={displayCurrency}
        lowStockItems={finance?.totals.lowStockItems ?? null}
        productsTotals={productsTotals}
      />

      <div className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr] xl:items-start">
        <div className="scroll-mt-24 space-y-4 outline-none" ref={productFormRef} tabIndex={-1}>
          <ProductForm
            availableProducts={products}
            loading={_createProductMutation.isPending || updateProductMutation.isPending}
            product={editingProduct}
            onCancelEdit={() => setEditingProduct(null)}
            onSubmit={handleProductSubmit}
          />
        </div>

        <PortfolioCategoryPanel
          categoryBreakdown={finance?.categoryBreakdown ?? []}
          displayCurrency={displayCurrency}
          maxCategoryProfit={maxCategoryProfit}
        />
      </div>

      <PortfolioProductList
        busy={productBusy}
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
      />
    </section>
  )
}
