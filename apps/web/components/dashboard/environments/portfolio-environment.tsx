'use client'

import { useState } from 'react'
import { Boxes, Package, Search, Tags, TrendingUp } from 'lucide-react'
import type { ProductRecord } from '@contracts/contracts'
import { ApiError } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import type { ProductFormValues } from '@/lib/validation'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { useDashboardMutations } from '@/components/dashboard/hooks/useDashboardMutations'
import { DashboardSectionHeading } from '@/components/dashboard/dashboard-section-heading'
import { ProductCard } from '@/components/dashboard/product-card'
import { ProductForm } from '@/components/dashboard/product-form'
import { ProductSearchField } from '@/components/dashboard/product-search-field'

// ── category card ─────────────────────────────────────────────────────────────

function CategoryCard({
  category,
  products,
  units,
  potentialProfit,
  inventorySalesValue,
  displayCurrency,
  maxProfit,
}: {
  category: string
  products: number
  units: number
  potentialProfit: number
  inventorySalesValue: number
  displayCurrency: string
  maxProfit: number
}) {
  const barPct = maxProfit > 0 ? Math.max(4, (potentialProfit / maxProfit) * 100) : 4

  return (
    <div className="rounded-[18px] border border-white/6 bg-[rgba(255,255,255,0.02)] p-4 hover:border-white/10 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white leading-snug">{category}</p>
          <p className="mt-1 text-[11px] text-[var(--text-soft)]">
            {products} produto{products !== 1 ? 's' : ''} · {units} unidade{units !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-[#c9a96e]">
            {formatCurrency(potentialProfit, displayCurrency as never)}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--text-soft)]">lucro pot.</p>
        </div>
      </div>

      {/* progress bar */}
      <div className="mt-3.5 h-1 rounded-full bg-white/6 overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
          style={{ width: `${barPct}%` }}
        />
      </div>

      <p className="mt-2 text-[10px] text-[var(--text-soft)]">
        {formatCurrency(inventorySalesValue, displayCurrency as never)} em valor de venda potencial
      </p>
    </div>
  )
}

// ── summary pill ──────────────────────────────────────────────────────────────

function SummaryPill({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-white/6 bg-[rgba(255,255,255,0.02)] px-4 py-3.5 flex items-center gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-[rgba(155,132,96,0.25)] bg-[rgba(155,132,96,0.08)]">
        <Icon className="size-3.5 text-[var(--accent)]" />
      </span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  )
}

// ── avg margin calc ───────────────────────────────────────────────────────────

function calcAvgMargin(products: ProductRecord[]): string {
  const active = products.filter((p) => p.active && p.unitPrice > 0)
  if (!active.length) return '—'
  const avg = active.reduce((sum, p) => sum + ((p.unitPrice - p.unitCost) / p.unitPrice) * 100, 0) / active.length
  return `${avg.toFixed(0)}%`
}

// ── main ──────────────────────────────────────────────────────────────────────

export function PortfolioEnvironment() {
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const { financeQuery, productsQuery } = useDashboardQueries()
  const {
    createProductMutation: _createProductMutation,
    updateProductMutation: _updateProductMutation,
    archiveProductMutation: _archiveProductMutation,
    restoreProductMutation,
  } = useDashboardMutations()

  const finance = financeQuery.data
  const products = productsQuery.data?.items ?? []
  const productsTotals = productsQuery.data?.totals
  const productsError = productsQuery.error instanceof ApiError ? productsQuery.error.message : null
  const productMutationError = [
    _createProductMutation.error,
    _updateProductMutation.error,
    _archiveProductMutation.error,
    restoreProductMutation.error,
  ].find((error) => error instanceof ApiError)

  const archiveProductMutation = {
    isPending: _archiveProductMutation.isPending,
    mutate: (id: string) => _archiveProductMutation.mutate(id, { onSuccess: () => setEditingProduct(null) }),
  }

  const updateProductMutation = {
    isPending: _updateProductMutation.isPending,
    mutate: (payload: Parameters<typeof _updateProductMutation.mutate>[0]) =>
      _updateProductMutation.mutate(payload, { onSuccess: () => setEditingProduct(null) }),
  }

  const handleProductSubmit = (values: ProductFormValues) => {
    const payload = {
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
    }

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
    restoreProductMutation.isPending

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase('pt-BR')
  const filteredProducts = normalizedSearch
    ? products.filter((product) =>
        [product.name, product.brand ?? '', product.category, product.packagingClass].some((value) => {
          const normalizedValue = value.toLocaleLowerCase('pt-BR')
          return normalizedValue.includes(normalizedSearch) || normalizedValue.startsWith(normalizedSearch)
        }),
      )
    : products

  const avgMargin = calcAvgMargin(products)
  const maxCategoryProfit = Math.max(...(finance?.categoryBreakdown.map((c) => c.potentialProfit) ?? [0]), 0)

  return (
    <section className="space-y-6">
      <DashboardSectionHeading
        description="O portfólio alimenta estoque, potencial de lucro e o comportamento financeiro do painel."
        eyebrow="Estoque e margem"
        icon={Boxes}
        title="Portfólio de produtos"
      />

      {/* summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryPill
          icon={Package}
          label="Produtos ativos"
          value={productsTotals ? String(productsTotals.activeProducts) : '—'}
        />
        <SummaryPill
          icon={Boxes}
          label="Total em estoque"
          value={productsTotals ? `${productsTotals.stockUnits} und` : '—'}
        />
        <SummaryPill icon={TrendingUp} label="Margem média" value={avgMargin} />
        <SummaryPill
          icon={Tags}
          label="SKUs cadastrados"
          value={productsTotals ? String(productsTotals.totalProducts) : '—'}
        />
      </div>

      {/* form + import + category */}
      <div className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr] xl:items-start">
        <div className="space-y-4">
          <ProductForm
            availableProducts={products}
            loading={_createProductMutation.isPending || updateProductMutation.isPending}
            onCancelEdit={() => setEditingProduct(null)}
            onSubmit={handleProductSubmit}
            product={editingProduct}
          />
        </div>

        {/* categories */}
        <div className="imperial-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="flex size-9 items-center justify-center rounded-[12px] border border-[rgba(155,132,96,0.25)] bg-[rgba(155,132,96,0.08)]">
              <Tags className="size-4 text-[var(--accent)]" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                Categorias
              </p>
              <h2 className="text-base font-semibold text-white leading-snug">Fluxo por categoria</h2>
            </div>
          </div>

          <div className="space-y-2.5">
            {finance?.categoryBreakdown.length ? (
              finance.categoryBreakdown.map((item) => (
                <CategoryCard
                  key={item.category}
                  category={item.category}
                  products={item.products}
                  units={item.units}
                  potentialProfit={item.potentialProfit}
                  inventorySalesValue={item.inventorySalesValue}
                  displayCurrency={String(finance.displayCurrency)}
                  maxProfit={maxCategoryProfit}
                />
              ))
            ) : (
              <div className="rounded-[16px] border border-dashed border-white/8 px-5 py-8 text-center">
                <Tags className="mx-auto size-7 text-[var(--text-soft)]/50 mb-3" />
                <p className="text-sm text-[var(--text-soft)]">
                  Cadastre produtos para destravar a leitura por categoria.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* product list */}
      <section className="imperial-card p-6 md:p-8">
        {/* list header */}
        <div className="flex flex-col gap-4 border-b border-white/6 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Portfólio</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Produtos cadastrados</h2>
            <p className="mt-1.5 text-sm text-[var(--text-soft)]">
              {filteredProducts.length === products.length
                ? `${products.length} item${products.length !== 1 ? 'ns' : ''} · busque por nome, marca ou categoria`
                : `${filteredProducts.length} de ${products.length} encontrado${filteredProducts.length !== 1 ? 's' : ''} para "${searchQuery}"`}
            </p>
          </div>
          <div className="sm:w-72">
            <ProductSearchField onChange={setSearchQuery} onClear={() => setSearchQuery('')} value={searchQuery} />
          </div>
        </div>

        {/* errors */}
        {productsError ? (
          <p className="mt-5 rounded-[12px] border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.06)] px-4 py-3 text-sm text-[#f87171]">
            {productsError}
          </p>
        ) : null}
        {productMutationError ? (
          <p className="mt-5 rounded-[12px] border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.06)] px-4 py-3 text-sm text-[#f87171]">
            {productMutationError.message}
          </p>
        ) : null}

        {/* grid */}
        <div className="mt-6 grid gap-3 xl:grid-cols-2">
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
            <div className="col-span-2 rounded-[20px] border border-dashed border-white/8 px-6 py-14 text-center">
              <Search className="mx-auto size-9 text-[var(--text-soft)]/50 mb-3" />
              <p className="text-base font-semibold text-white">
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
    </section>
  )
}
