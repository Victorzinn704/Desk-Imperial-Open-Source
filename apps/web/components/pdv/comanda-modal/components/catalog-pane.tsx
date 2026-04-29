'use client'

import { memo } from 'react'
import { Search } from 'lucide-react'
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

  return (
    <div className="flex min-h-0 flex-col border-b border-[var(--border)] xl:border-b-0 xl:border-r">
      <div className="p-4">
        <CatalogSearch search={search} setSearch={setSearch} />

        <CategoryGrid
          categories={categories}
          selectedCategory={selectedCategory}
          showAllOption={showProducts}
          onSelectCategory={setSelectedCategory}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <CatalogListHeader
          productCount={filteredProducts.length}
          productListTitle={productListTitle}
          onResetFilters={() => {
            setSelectedCategory(null)
            setSearch('')
          }}
        />

        {showProducts ? (
          <CatalogProductGrid filteredProducts={filteredProducts} itens={itens} onAddItem={onAddItem} />
        ) : null}
      </div>
    </div>
  )
}, areCatalogPanePropsEqual)

function CatalogSearch({
  search,
  setSearch,
}: Readonly<{
  search: string
  setSearch: (value: string) => void
}>) {
  return (
    <div className="flex items-center gap-2 rounded-[14px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2.5">
      <Search className="size-4 text-[var(--text-soft)]" />
      <input
        className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-soft)] outline-none"
        placeholder="Buscar produto..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
    </div>
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
    <div className="mb-3 flex items-center justify-between rounded-[14px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">{productListTitle}</p>
        <p className="mt-1 text-xs text-[var(--text-soft)]">{productCount} produtos visíveis</p>
      </div>
      <button
        className="rounded-[10px] border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-soft)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        type="button"
        onClick={onResetFilters}
      >
        Limpar
      </button>
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
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-1">
      {filteredProducts.map((product) => {
        const inCart = itens.find((item) => item.produtoId === product.id)
        return (
          <ProductCard
            inCartQty={inCart?.quantidade ?? 0}
            key={product.id}
            product={product}
            onAdd={() => onAddItem(product)}
            onDragStart={(event) => event.dataTransfer.setData('productId', product.id)}
          />
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
