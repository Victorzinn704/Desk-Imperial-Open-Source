'use client'

import { memo, startTransition, useCallback, useDeferredValue, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { ComandaItem } from '@/components/pdv/pdv-types'
import type { ProductRecord } from '@contracts/contracts'
import { OperationEmptyState } from '@/components/operations/operation-empty-state'
import { formatBRL as formatCurrency } from '@/lib/currency'
import { normalizeTextForSearch } from '@/lib/normalize-text-for-search'
import {
  Beer,
  ChevronLeft,
  Coffee,
  Minus,
  Package,
  Pizza,
  Plus,
  PlusCircle,
  Search,
  ShoppingCart,
  UtensilsCrossed,
  Wine,
} from 'lucide-react'

interface MobileOrderBuilderProps {
  mesaLabel: string
  mode: 'new' | 'add'
  busy?: boolean
  isLoading?: boolean
  isOffline?: boolean
  errorMessage?: string | null
  produtos: ProductRecord[]
  onSubmit: (items: ComandaItem[]) => Promise<void> | void
  onCancel: () => void
}

type CartEntry = ComandaItem & { _key: string }

// Componente memoizado para cada item de produto
const ProductItem = memo(function ProductItem({
  produto,
  qty,
  busy,
  onAdd,
  onRemove,
}: Readonly<{
  produto: ProductRecord
  qty: number
  busy?: boolean
  onAdd: () => void
  onRemove: () => void
}>) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--text-primary)]">{produto.name}</p>
        <p className="mt-0.5 text-xs text-[var(--text-soft,#7a8896)]">
          {produto.category} · {formatCurrency(produto.unitPrice)}
        </p>
        {produto.isCombo ? (
          <span className="mt-1 inline-flex rounded-full border border-[rgba(0,140,255,0.35)] bg-[rgba(0,140,255,0.14)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--accent,#008cff)]">
            combo
          </span>
        ) : null}
        {produto.isCombo && produto.comboDescription ? (
          <p className="mt-1 text-[11px] leading-4 text-[var(--accent,#008cff)] line-clamp-2">
            {produto.comboDescription}
          </p>
        ) : null}
        {produto.isCombo && (produto.comboItems?.length ?? 0) > 0 ? (
          <p className="mt-1 text-[11px] leading-4 text-[var(--text-soft,#7a8896)] line-clamp-2">
            {produto.comboItems
              ?.slice(0, 2)
              .map((item) => `${item.componentProductName} (${item.totalUnits} und)`)
              .join(' • ')}
            {(produto.comboItems?.length ?? 0) > 2 ? ' • ...' : ''}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {qty > 0 && (
          <>
            <button
              aria-label={`Remover ${produto.name}`}
              className="flex size-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-soft,#7a8896)] transition-colors active:bg-[var(--surface-soft)] btn-haptic"
              disabled={busy}
              type="button"
              onClick={onRemove}
            >
              <Minus className="size-4" />
            </button>
            <span className="min-w-[24px] text-center text-sm font-semibold text-[var(--text-primary)]">{qty}</span>
          </>
        )}
        <button
          aria-label={`Adicionar ${produto.name}`}
          className="flex size-11 items-center justify-center rounded-xl border border-[rgba(0,140,255,0.3)] bg-[rgba(0,140,255,0.12)] text-[var(--accent,#008cff)] transition-colors active:bg-[rgba(0,140,255,0.25)] btn-haptic"
          disabled={busy}
          type="button"
          onClick={onAdd}
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  )
})

// Heuristic icon mapper extracted for stable references
function getCategoryIcon(cat: string) {
  const low = cat.toLowerCase()
  if (low.includes('alco') || low.includes('cerveja') || low.includes('chopp'))
    {return <Beer className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />}
  if (low.includes('vinho'))
    {return <Wine className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />}
  if (low.includes('bebida') || low.includes('suco') || low.includes('refr'))
    {return <Coffee className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />}
  if (low.includes('combo') || low.includes('kit'))
    {return <Package className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />}
  if (low.includes('pizza') || low.includes('lanche') || low.includes('burger'))
    {return <Pizza className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />}
  return <UtensilsCrossed className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />
}

type BuilderScreen = 'categories' | 'items'

function getActiveProducts(produtos: ProductRecord[]) {
  return produtos.filter((produto) => produto.active)
}

function getSortedCategories(produtos: ProductRecord[]) {
  return Array.from(new Set(produtos.map((produto) => produto.category)))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, 'pt-BR', { sensitivity: 'base', numeric: true }))
}

function filterProducts(produtos: ProductRecord[], deferredSearch: string, selectedCategory: string | null) {
  const normalizedSearch = normalizeTextForSearch(deferredSearch)
  return produtos.filter((produto) => {
    const matchSearch =
      normalizedSearch.length === 0 ||
      normalizeTextForSearch(produto.name).includes(normalizedSearch) ||
      normalizeTextForSearch(produto.category).includes(normalizedSearch)
    const matchCategory = selectedCategory ? produto.category === selectedCategory : true
    return matchSearch && matchCategory
  })
}

function addProductToCart(cart: CartEntry[], produto: ProductRecord) {
  const existing = cart.find((entry) => entry.produtoId === produto.id)
  if (existing) {
    return cart.map((entry) =>
      entry.produtoId === produto.id ? { ...entry, quantidade: entry.quantidade + 1 } : entry,
    )
  }

  return [
    ...cart,
    {
      _key: produto.id,
      produtoId: produto.id,
      nome: produto.name,
      quantidade: 1,
      precoUnitario: produto.unitPrice,
    },
  ]
}

function removeProductFromCart(cart: CartEntry[], produtoId: string) {
  const existing = cart.find((entry) => entry.produtoId === produtoId)
  if (!existing) {
    return cart
  }

  if (existing.quantidade === 1) {
    return cart.filter((entry) => entry.produtoId !== produtoId)
  }

  return cart.map((entry) => (entry.produtoId === produtoId ? { ...entry, quantidade: entry.quantidade - 1 } : entry))
}

function MobileOrderHeader({
  categories,
  mode,
  mesaLabel,
  onCancel,
  onSearchChange,
  screen,
  search,
  selectedCategory,
}: Readonly<{
  categories: string[]
  mode: MobileOrderBuilderProps['mode']
  mesaLabel: string
  onCancel: () => void
  onSearchChange: (value: string) => void
  screen: BuilderScreen
  search: string
  selectedCategory: string | null
}>) {
  const showItemsScreen = screen === 'items' || categories.length === 0
  const subtitle = mode === 'add' ? 'Adicionar itens à comanda' : 'Adicionar produtos ao pedido'

  return (
    <div className="border-b border-[var(--border)] px-3.5 py-3 sm:px-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {mode === 'add' ? <PlusCircle className="size-3.5 text-[var(--accent,#008cff)]" /> : null}
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">
              Mesa {mesaLabel}
            </p>
          </div>
          <p className="text-sm text-[var(--text-soft,#7a8896)]">{subtitle}</p>
        </div>
        <button
          className="min-h-[44px] shrink-0 rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-soft,#7a8896)] transition-colors active:text-[var(--text-primary)]"
          type="button"
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>

      {showItemsScreen ? (
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-soft,#7a8896)]" />
          <input
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] py-3 pl-9 pr-4 text-base text-[var(--text-primary)] placeholder-[var(--text-soft,#7a8896)] outline-none focus:border-[rgba(0,140,255,0.45)]"
            placeholder={selectedCategory ? `Buscar em ${selectedCategory}...` : 'Buscar produto...'}
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      ) : categories.length > 0 ? (
        <p className="mt-3 text-sm leading-6 text-[var(--text-soft,#7a8896)]">
          Escolha a categoria primeiro. Depois abrimos só a lista daquela classe, sem dividir a tela.
        </p>
      ) : null}
    </div>
  )
}

function CategorySelectionScreen({
  categories,
  onSelectAll,
  onSelectCategory,
}: Readonly<{
  categories: string[]
  onSelectAll: () => void
  onSelectCategory: (category: string) => void
}>) {
  return (
    <div className="p-3.5 sm:p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">
        Escolha uma categoria
      </p>
      <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3 sm:grid-cols-4">
        <button
          className="group flex min-h-[72px] flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-2 py-3 text-[var(--text-soft,#7a8896)] transition-all active:scale-95 active:border-[var(--border-strong)]"
          type="button"
          onClick={onSelectAll}
        >
          <Search className="mb-1 size-5 opacity-80 transition-opacity group-hover:opacity-100" />
          <span className="line-clamp-2 text-center text-[10px] font-bold uppercase tracking-wider">Todos</span>
        </button>
        {categories.map((category) => (
          <button
            className="group flex min-h-[72px] flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-2 py-3 text-[var(--text-soft,#7a8896)] transition-all active:scale-95 active:border-[var(--border-strong)]"
            key={category}
            type="button"
            onClick={() => onSelectCategory(category)}
          >
            {getCategoryIcon(category)}
            <span className="line-clamp-2 text-center text-[10px] font-bold uppercase tracking-wider">{category}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function CartSummaryBar({
  busy,
  onSubmit,
  submitLabel,
  totalItems,
  totalValue,
}: Readonly<{
  busy?: boolean
  onSubmit: () => void
  submitLabel: string
  totalItems: number
  totalValue: number
}>) {
  return (
    <div className="shrink-0 border-t border-[rgba(0,140,255,0.2)] bg-[var(--surface)] px-4 py-3">
      <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
        <div className="relative">
          <ShoppingCart className="size-5 text-[var(--text-soft,#7a8896)]" />
          {totalItems > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-[var(--accent,#008cff)] text-[10px] font-bold text-[var(--on-accent)]">
              {totalItems}
            </span>
          )}
        </div>
        <div className="flex-1">
          <p className="text-xs text-[var(--text-soft,#7a8896)]">
            {totalItems === 0 ? 'Carrinho vazio' : `${totalItems} ${totalItems === 1 ? 'item' : 'itens'}`}
          </p>
          {totalValue > 0 ? (
            <p className="text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(totalValue)}</p>
          ) : null}
        </div>
        <button
          className="min-h-[48px] w-full rounded-xl bg-[var(--accent,#008cff)] px-5 py-3 text-sm font-semibold text-[var(--on-accent)] transition-opacity disabled:opacity-40 active:opacity-80 btn-haptic sm:w-auto"
          disabled={totalItems === 0 || busy}
          type="button"
          onClick={onSubmit}
        >
          {busy ? 'Enviando...' : submitLabel}
        </button>
      </div>
    </div>
  )
}

export const MobileOrderBuilder = memo(function MobileOrderBuilder({
  mesaLabel,
  mode,
  busy,
  isLoading = false,
  isOffline = false,
  errorMessage = null,
  produtos,
  onSubmit,
  onCancel,
}: Readonly<MobileOrderBuilderProps>) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [screen, setScreen] = useState<BuilderScreen>('categories')
  const [cart, setCart] = useState<CartEntry[]>([])
  const deferredSearch = useDeferredValue(search)
  const parentRef = useRef<HTMLDivElement | null>(null)

  const activeProdutos = useMemo(() => getActiveProducts(produtos), [produtos])
  const categories = useMemo(() => getSortedCategories(activeProdutos), [activeProdutos])
  const filtered = useMemo(
    () => filterProducts(activeProdutos, deferredSearch, selectedCategory),
    [activeProdutos, deferredSearch, selectedCategory],
  )

  // Mapa de quantidades para lookup O(1)
  const qtyMap = useMemo(() => {
    const map = new Map<string, number>()
    cart.forEach((c) => map.set(c.produtoId, c.quantidade))
    return map
  }, [cart])

  const getQty = useCallback((produtoId: string): number => qtyMap.get(produtoId) ?? 0, [qtyMap])

  const addItem = useCallback((produto: ProductRecord) => {
    setCart((prev) => addProductToCart(prev, produto))
  }, [])

  const removeItem = useCallback((produtoId: string) => {
    setCart((prev) => removeProductFromCart(prev, produtoId))
  }, [])

  const totalItems = useMemo(() => cart.reduce((sum, c) => sum + c.quantidade, 0), [cart])
  const totalValue = useMemo(() => cart.reduce((sum, c) => sum + c.quantidade * c.precoUnitario, 0), [cart])
  const showItemsScreen = screen === 'items' || categories.length === 0
  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 92,
    measureElement: (element) => element?.getBoundingClientRect().height ?? 92,
    overscan: 6,
  })
  const virtualItems = rowVirtualizer.getVirtualItems()

  const handleSubmit = useCallback(async () => {
    if (cart.length === 0 || busy) {return}
    const items: ComandaItem[] = cart.map(({ _key: _k, ...rest }) => rest)
    await onSubmit(items)
  }, [cart, busy, onSubmit])

  const submitLabel = mode === 'add' ? 'Adicionar itens' : 'Enviar pedido'
  const handleSearchChange = useCallback((value: string) => {
    startTransition(() => setSearch(value))
  }, [])
  const showAllProducts = useCallback(() => {
    startTransition(() => {
      setSelectedCategory(null)
      setSearch('')
      setScreen('items')
    })
  }, [])
  const openCategory = useCallback((category: string) => {
    startTransition(() => {
      setSelectedCategory(category)
      setSearch('')
      setScreen('items')
    })
  }, [])
  const returnToCategories = useCallback(() => {
    startTransition(() => {
      setScreen('categories')
      setSearch('')
    })
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--bg)]">
      <MobileOrderHeader
        categories={categories}
        mesaLabel={mesaLabel}
        mode={mode}
        screen={screen}
        search={search}
        selectedCategory={selectedCategory}
        onCancel={onCancel}
        onSearchChange={handleSearchChange}
      />

      <div className="min-h-0 flex-1 overflow-y-auto scroll-optimized custom-scrollbar" ref={parentRef}>
        {isLoading && activeProdutos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 size-10 animate-spin rounded-full border-2 border-[var(--accent,#008cff)] border-t-transparent" />
            <p className="text-sm font-medium text-[var(--text-primary)]">Carregando produtos...</p>
            <p className="mt-1 text-xs text-[var(--text-soft,#7a8896)]">
              Aguarde o catálogo terminar de sincronizar.
            </p>
          </div>
        ) : errorMessage && activeProdutos.length === 0 ? (
          <div className="px-4 py-6">
            <OperationEmptyState
              Icon={ShoppingCart}
              description={
                isOffline
                  ? 'Sem conexão para carregar o catálogo agora.'
                  : errorMessage || 'Não foi possível carregar os produtos agora.'
              }
              title={isOffline ? 'Sem conexão' : 'Falha ao carregar produtos'}
            />
          </div>
        ) : !showItemsScreen && categories.length > 0 ? (
          <CategorySelectionScreen
            categories={categories}
            onSelectAll={showAllProducts}
            onSelectCategory={openCategory}
          />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-[var(--text-soft,#7a8896)]">Nenhum produto encontrado</p>
          </div>
        ) : (
          <>
            <div className="border-b border-[var(--border)] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">
                    {selectedCategory ?? (deferredSearch.trim().length > 0 ? 'Busca rápida' : 'Todos os produtos')}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-soft,#7a8896)]">{filtered.length} produtos disponíveis</p>
                </div>
                <button
                  className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-soft,#7a8896)] transition-colors active:text-[var(--text-primary)]"
                  type="button"
                  onClick={returnToCategories}
                >
                  <ChevronLeft className="size-3.5" />
                  Categorias
                </button>
              </div>
            </div>

            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: 'relative',
              }}
            >
              {virtualItems.length > 0
                ? virtualItems.map((virtualItem) => {
                    const produto = filtered[virtualItem.index]
                    const qty = getQty(produto.id)
                    return (
                      <div
                        className="border-b border-[var(--border)]"
                        key={produto.id}
                        ref={rowVirtualizer.measureElement}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualItem.start}px)`,
                        }}
                      >
                        <ProductItem
                          produto={produto}
                          qty={qty}
                          busy={busy}
                          onAdd={() => addItem(produto)}
                          onRemove={() => removeItem(produto.id)}
                        />
                      </div>
                    )
                  })
                : filtered.slice(0, 12).map((produto) => {
                    const qty = getQty(produto.id)
                    return (
                      <div className="border-b border-[var(--border)]" key={produto.id}>
                        <ProductItem
                          produto={produto}
                          qty={qty}
                          busy={busy}
                          onAdd={() => addItem(produto)}
                          onRemove={() => removeItem(produto.id)}
                        />
                      </div>
                    )
                  })}
            </div>
          </>
        )}
      </div>

      <CartSummaryBar
        busy={busy}
        submitLabel={submitLabel}
        totalItems={totalItems}
        totalValue={totalValue}
        onSubmit={() => void handleSubmit()}
      />
    </div>
  )
})
