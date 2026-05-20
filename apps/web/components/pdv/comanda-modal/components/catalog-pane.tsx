'use client'

import { type ChangeEvent, memo, useCallback, useMemo } from 'react'
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import { useCatalogVisualSuggestions } from '@/components/shared/use-catalog-visual-suggestions'
import type { ComandaItem } from '../../pdv-types'
import { CategoryGrid } from './category-grid'
import { ProductCard } from './product-card'
import { resolveFallbackTitle } from '../helpers'
import type { SimpleProduct } from '../types'

type ComandaCatalogPaneProps = Readonly<{
  categories: string[]
  filteredProducts: SimpleProduct[]
  itens: ComandaItem[]
  search: string
  selectedCategory: string | null
  setSearch: (value: string) => void
  setSelectedCategory: (value: string | null) => void
  showProducts: boolean
  onAddItem: (product: SimpleProduct) => void
}>

export const ComandaCatalogPane = memo(function ComandaCatalogPane({
  categories,
  filteredProducts,
  itens,
  search,
  selectedCategory,
  setSearch,
  setSelectedCategory,
  showProducts,
  onAddItem,
}: ComandaCatalogPaneProps) {
  const fallbackTitle = resolveFallbackTitle(search)
  const productListTitle = selectedCategory ?? fallbackTitle
  const cartUnits = itens.reduce((sum, item) => sum + item.quantidade, 0)
  const catalogProducts = useSuggestedCatalogProducts(filteredProducts)
  const handleResetFilters = useCallback(() => {
    setSelectedCategory(null)
    setSearch('')
  }, [setSearch, setSelectedCategory])

  return (
    <div className="flex min-h-0 min-w-0 flex-col border-b border-[var(--border)] bg-[var(--surface)] lg:row-span-2 lg:border-b-0 lg:border-r 2xl:row-span-1">
      <div className="space-y-4 border-b border-[var(--border)] p-4 lg:p-5">
        <CatalogHeader cartUnits={cartUnits} productCount={filteredProducts.length} />
        <CatalogSearch search={search} setSearch={setSearch} />
        <CategoryGrid
          categories={categories}
          selectedCategory={selectedCategory}
          showAllOption={showProducts}
          onSelectCategory={setSelectedCategory}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-5">
        <CatalogListHeader
          productCount={catalogProducts.length}
          productListTitle={productListTitle}
          onResetFilters={handleResetFilters}
        />

        {showProducts ? (
          <CatalogProductGrid filteredProducts={catalogProducts} itens={itens} onAddItem={onAddItem} />
        ) : null}
      </div>
    </div>
  )
}, areCatalogPanePropsEqual)

function useSuggestedCatalogProducts(filteredProducts: SimpleProduct[]) {
  const visualSuggestions = useCatalogVisualSuggestions(filteredProducts, {
    maxItems: 24,
    useBarcodeLookup: true,
  })

  return useMemo(
    () => filteredProducts.map((product) => visualSuggestions.decorateProduct(product)),
    [filteredProducts, visualSuggestions],
  )
}

function CatalogHeader({ cartUnits, productCount }: Readonly<{ cartUnits: number; productCount: number }>) {
  return (
    <div className="flex flex-col gap-3 min-[520px]:flex-row min-[520px]:items-start min-[520px]:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
          frente de caixa
        </p>
        <h3 className="mt-1 text-lg font-semibold tracking-tight text-[var(--text-primary)]">Catálogo de venda</h3>
        <p className="mt-1 text-xs text-[var(--text-soft)]">Busca rápida para caixa, delivery e mesa.</p>
      </div>
      <div className="grid shrink-0 grid-cols-2 gap-2 text-left min-[520px]:text-right">
        <CatalogStatBadge label="catálogo" value={String(productCount)} />
        <CatalogStatBadge label="na comanda" value={String(cartUnits)} />
      </div>
    </div>
  )
}

function CatalogStatBadge({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <span className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">
      {value} {label}
    </span>
  )
}

function CatalogSearch({
  search,
  setSearch,
}: Readonly<{
  search: string
  setSearch: (value: string) => void
}>) {
  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearch(event.target.value)
    },
    [setSearch],
  )

  return (
    <label className="flex min-h-14 items-center gap-3 rounded-[18px] border border-[var(--border-strong)] bg-[var(--surface-soft)] px-4 py-3 shadow-sm transition-colors focus-within:border-[var(--accent)]">
      <Search className="size-4 text-[var(--text-soft)]" />
      <input
        className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-soft)] outline-none"
        placeholder="Buscar produto, marca ou EAN"
        value={search}
        onChange={handleSearchChange}
      />
    </label>
  )
}

function CatalogListHeader({
  productCount,
  productListTitle,
  onResetFilters,
}: Readonly<{
  productCount: number
  productListTitle: string
  onResetFilters: () => void
}>) {
  return (
    <div className="sticky top-0 z-10 mb-4 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] pb-3 pt-1 backdrop-blur">
      <div className="flex items-center justify-between gap-3 rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            <SlidersHorizontal className="size-3.5" />
            {productListTitle}
          </p>
          <p className="mt-1 text-xs text-[var(--text-soft)]">{productCount} disponíveis no recorte</p>
        </div>
        <button
          aria-label="Limpar filtros do catálogo"
          className="flex size-9 items-center justify-center rounded-[12px] border border-[var(--border)] text-[var(--text-soft)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          title="Limpar filtros"
          type="button"
          onClick={onResetFilters}
        >
          <RotateCcw className="size-4" />
        </button>
      </div>
    </div>
  )
}

function CatalogProductGrid({
  filteredProducts,
  itens,
  onAddItem,
}: Readonly<{
  filteredProducts: SimpleProduct[]
  itens: ComandaItem[]
  onAddItem: (product: SimpleProduct) => void
}>) {
  if (filteredProducts.length === 0) {
    return (
      <div className="rounded-[18px] border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--text-soft)]">
        Nenhum produto encontrado para o filtro atual.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 min-[1800px]:grid-cols-4">
      {filteredProducts.map((product) => {
        const inCart = itens.find((item) => item.produtoId === product.id)
        return (
          <ProductCard inCartQty={inCart?.quantidade ?? 0} key={product.id} product={product} onAddItem={onAddItem} />
        )
      })}
    </div>
  )
}

function areCatalogPanePropsEqual(left: ComandaCatalogPaneProps, right: ComandaCatalogPaneProps) {
  return (
    left.categories === right.categories &&
    left.filteredProducts === right.filteredProducts &&
    left.itens === right.itens &&
    left.search === right.search &&
    left.selectedCategory === right.selectedCategory &&
    left.showProducts === right.showProducts &&
    left.onAddItem === right.onAddItem
  )
}
