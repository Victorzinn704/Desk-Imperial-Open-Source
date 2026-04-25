'use client'

/* eslint-disable max-lines, max-lines-per-function, complexity, no-nested-ternary */

import {
  memo,
  type ReactNode,
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { ComandaItem } from '@/components/pdv/pdv-types'
import type { ProductRecord } from '@contracts/contracts'
import { OperationEmptyState } from '@/components/operations/operation-empty-state'
import { ProductThumb } from '@/components/shared/product-thumb'
import { useCatalogVisualSuggestions } from '@/components/shared/use-catalog-visual-suggestions'
import { formatBRL as formatCurrency } from '@/lib/currency'
import { normalizeTextForSearch } from '@/lib/normalize-text-for-search'
import { Beer, Coffee, Minus, Package, Pizza, Plus, Search, ShoppingCart, UtensilsCrossed, Wine } from 'lucide-react'

interface MobileOrderBuilderProps {
  mesaLabel: string
  mode: 'new' | 'add' | 'edit'
  busy?: boolean
  checkoutDockOffset?: 'navigation' | 'screen'
  isLoading?: boolean
  isOffline?: boolean
  errorMessage?: string | null
  initialItems?: ComandaItem[]
  produtos: ProductRecord[]
  onSubmit: (items: ComandaItem[]) => Promise<void> | void
  onCancel: () => void
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  summaryItems?: Array<{
    label: string
    value: ReactNode
    tone?: string
  }>
}

type CartEntry = ComandaItem & { _key: string }

function getInitialItemsKey(initialItems: ComandaItem[] | undefined) {
  return (initialItems ?? [])
    .map((item) =>
      [
        item.produtoId,
        item.nome,
        String(item.quantidade),
        String(item.precoUnitario),
        item.observacao ?? '',
      ].join('|'),
    )
    .join('::')
}

function buildInitialCart(initialItems: ComandaItem[] | undefined): CartEntry[] {
  const grouped = new Map<string, CartEntry>()

  for (const item of initialItems ?? []) {
    const key = [item.produtoId, item.nome, String(item.precoUnitario), item.observacao ?? ''].join('|')
    const existing = grouped.get(key)
    if (existing) {
      grouped.set(key, {
        ...existing,
        quantidade: existing.quantidade + item.quantidade,
      })
      continue
    }

    grouped.set(key, {
      ...item,
      _key: key,
    })
  }

  return Array.from(grouped.values())
}

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
      <ProductThumb product={produto} size="sm" />
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
  if (low.includes('alco') || low.includes('cerveja') || low.includes('chopp')) {
    return <Beer className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />
  }
  if (low.includes('vinho')) {
    return <Wine className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />
  }
  if (low.includes('bebida') || low.includes('suco') || low.includes('refr')) {
    return <Coffee className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />
  }
  if (low.includes('combo') || low.includes('kit')) {
    return <Package className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />
  }
  if (low.includes('pizza') || low.includes('lanche') || low.includes('burger')) {
    return <Pizza className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />
  }
  return <UtensilsCrossed className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />
}

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
  headerLabel,
  mode,
  mesaLabel,
  onCancel,
  onSecondaryAction,
  onSelectAll,
  onSelectCategory,
  onSearchChange,
  search,
  secondaryActionLabel,
  selectedCategory,
  summaryItems,
}: Readonly<{
  categories: string[]
  headerLabel?: string
  mode: MobileOrderBuilderProps['mode']
  mesaLabel: string
  onCancel: () => void
  onSecondaryAction?: () => void
  onSelectAll: () => void
  onSelectCategory: (category: string) => void
  onSearchChange: (value: string) => void
  search: string
  secondaryActionLabel?: string
  selectedCategory: string | null
  summaryItems?: MobileOrderBuilderProps['summaryItems']
}>) {
  const subtitle =
    mode === 'edit'
      ? 'Revise quantidades e salve a composição atual da comanda'
      : mode === 'add'
        ? 'Adicione itens sem perder o contexto da comanda em atendimento'
        : 'Monte os itens e abra a comanda da mesa'

  return (
    <div className="border-b border-[var(--border)] px-3.5 py-3 sm:px-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">
              {headerLabel ?? `Mesa ${mesaLabel}`}
            </p>
          </div>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
            {mode === 'edit' ? 'Editar comanda' : mode === 'add' ? 'Retomar pedido' : 'Nova comanda'}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-soft,#7a8896)]">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onSecondaryAction && secondaryActionLabel ? (
            <button
              className="min-h-[40px] rounded-xl border border-[rgba(0,140,255,0.3)] bg-[rgba(0,140,255,0.08)] px-3 py-2 text-xs font-semibold text-[var(--accent,#008cff)] transition active:opacity-80"
              type="button"
              onClick={onSecondaryAction}
            >
              {secondaryActionLabel}
            </button>
          ) : null}
          <button
            className="min-h-[44px] shrink-0 rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-soft,#7a8896)] transition-colors active:text-[var(--text-primary)]"
            type="button"
            onClick={onCancel}
          >
            Cancelar
          </button>
        </div>
      </div>

      {summaryItems && summaryItems.length > 0 ? (
        <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-[16px] bg-[var(--border)]">
          {summaryItems.map((item) => (
            <div className="bg-[var(--surface-muted)] px-3 py-3" key={item.label}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft,#7a8896)]">
                {item.label}
              </p>
              <p
                className="mt-1 text-base font-bold leading-tight"
                style={{ color: item.tone ?? 'var(--text-primary)' }}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}

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

      {categories.length > 0 ? (
        <div className="-mx-1 mt-3 overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2 px-1">
            <button
              className="min-h-[40px] rounded-full border px-3 py-2 text-xs font-semibold transition active:scale-[0.98]"
              style={{
                borderColor: selectedCategory === null ? 'rgba(0,140,255,0.28)' : 'var(--border)',
                background: selectedCategory === null ? 'rgba(0,140,255,0.12)' : 'var(--surface-muted)',
                color: selectedCategory === null ? 'var(--accent,#008cff)' : 'var(--text-primary)',
              }}
              type="button"
              onClick={onSelectAll}
            >
              Todos
            </button>
            {categories.map((category) => {
              const isActive = selectedCategory === category
              return (
                <button
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition active:scale-[0.98]"
                  key={category}
                  style={{
                    borderColor: isActive ? 'rgba(0,140,255,0.28)' : 'var(--border)',
                    background: isActive ? 'rgba(0,140,255,0.12)' : 'var(--surface-muted)',
                    color: isActive ? 'var(--accent,#008cff)' : 'var(--text-primary)',
                  }}
                  type="button"
                  onClick={() => onSelectCategory(category)}
                >
                  {getCategoryIcon(category)}
                  <span>{category}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function CartSummaryBar({
  busy,
  dockOffset = 'navigation',
  mode,
  onSubmit,
  submitLabel,
  totalItems,
  totalValue,
}: Readonly<{
  busy?: boolean
  dockOffset?: MobileOrderBuilderProps['checkoutDockOffset']
  mode: MobileOrderBuilderProps['mode']
  onSubmit: () => void
  submitLabel: string
  totalItems: number
  totalValue: number
}>) {
  if (totalItems === 0) {
    return null
  }

  const compactLabel = submitLabel.toLowerCase().includes('salvar')
    ? 'Salvar'
    : submitLabel.toLowerCase().includes('adicionar')
      ? 'Adicionar'
      : 'Abrir'
  const helper =
    mode === 'edit'
      ? 'Salve sem rolar até o fim'
      : mode === 'add'
        ? 'Itens entram na comanda aberta'
        : 'Abra a comanda sem rolar a lista'
  const fixedOffsetClass =
    dockOffset === 'screen'
      ? 'bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))]'
      : 'bottom-[calc(5.3rem+env(safe-area-inset-bottom,0px))]'

  return (
    <div
      className={`fixed inset-x-3 ${fixedOffsetClass} z-40 md:static md:inset-auto md:z-auto md:shrink-0 md:border-t md:border-[rgba(0,140,255,0.2)] md:bg-[var(--bg)]/95 md:px-3 md:pb-3 md:pt-2 md:backdrop-blur`}
      data-testid="mobile-order-checkout-dock"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_4.25rem] gap-2 rounded-[18px] border border-[rgba(0,140,255,0.24)] bg-[var(--surface)] p-2 shadow-[0_-14px_34px_rgba(0,0,0,0.34)]">
        <div className="flex min-w-0 items-center gap-3 rounded-[14px] bg-[var(--surface-muted)] px-3 py-2.5">
          <div className="relative shrink-0">
            <ShoppingCart className="size-5 text-[var(--accent,#008cff)]" />
            <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-[var(--accent,#008cff)] text-[10px] font-bold text-[var(--on-accent)]">
              {totalItems}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft,#7a8896)]">
              {totalItems} {totalItems === 1 ? 'item' : 'itens'}
            </p>
            <p className="truncate text-base font-semibold text-[var(--text-primary)]">{formatCurrency(totalValue)}</p>
            <p className="mt-0.5 truncate text-[10px] text-[var(--text-soft,#7a8896)]">{helper}</p>
          </div>
        </div>

        <button
          aria-label={submitLabel}
          className="flex size-[68px] flex-col items-center justify-center rounded-[16px] bg-[var(--accent,#008cff)] px-2 py-2 text-center text-[11px] font-semibold text-[var(--on-accent)] transition-opacity disabled:opacity-40 active:opacity-80 btn-haptic"
          disabled={busy}
          type="button"
          onClick={onSubmit}
        >
          <ShoppingCart className="size-5" />
          <span className="mt-1 leading-tight">{busy ? 'Enviando' : compactLabel}</span>
        </button>
      </div>
    </div>
  )
}

export const MobileOrderBuilder = memo(function MobileOrderBuilder({
  mesaLabel,
  mode,
  busy,
  checkoutDockOffset = 'navigation',
  isLoading = false,
  isOffline = false,
  errorMessage = null,
  initialItems,
  produtos,
  onSubmit,
  onCancel,
  secondaryAction,
  summaryItems,
}: Readonly<MobileOrderBuilderProps>) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const initialItemsKey = useMemo(() => getInitialItemsKey(initialItems), [initialItems])
  const lastInitialItemsKey = useRef(initialItemsKey)
  const [cart, setCart] = useState<CartEntry[]>(() => buildInitialCart(initialItems))
  const deferredSearch = useDeferredValue(search)
  const parentRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (lastInitialItemsKey.current === initialItemsKey) {
      return
    }

    lastInitialItemsKey.current = initialItemsKey
    setCart(buildInitialCart(initialItems))
  }, [initialItems, initialItemsKey])

  const activeProdutos = useMemo(() => getActiveProducts(produtos), [produtos])
  const categories = useMemo(() => getSortedCategories(activeProdutos), [activeProdutos])
  const filtered = useMemo(
    () => filterProducts(activeProdutos, deferredSearch, selectedCategory),
    [activeProdutos, deferredSearch, selectedCategory],
  )
  const { decorateProduct } = useCatalogVisualSuggestions(filtered.slice(0, 12))

  // Mapa de quantidades para lookup O(1)
  const qtyMap = useMemo(() => {
    const map = new Map<string, number>()
    cart.forEach((c) => map.set(c.produtoId, (map.get(c.produtoId) ?? 0) + c.quantidade))
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
  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 92,
    measureElement: (element) => element?.getBoundingClientRect().height ?? 92,
    overscan: 6,
  })
  const virtualItems = rowVirtualizer.getVirtualItems()

  const handleSubmit = useCallback(async () => {
    if (cart.length === 0 || busy) {
      return
    }
    const items: ComandaItem[] = cart.map(({ _key: _k, ...rest }) => rest)
    await onSubmit(items)
  }, [cart, busy, onSubmit])

  const submitLabel = mode === 'edit' ? 'Salvar edição' : mode === 'add' ? 'Adicionar itens' : 'Abrir comanda'
  const handleSearchChange = useCallback((value: string) => {
    startTransition(() => setSearch(value))
  }, [])
  const showAllProducts = useCallback(() => {
    startTransition(() => {
      setSelectedCategory(null)
    })
  }, [])
  const openCategory = useCallback((category: string) => {
    startTransition(() => {
      setSelectedCategory(category)
    })
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--surface)]">
      <MobileOrderHeader
        categories={categories}
        headerLabel={`Mesa ${mesaLabel}`}
        mesaLabel={mesaLabel}
        mode={mode}
        search={search}
        secondaryActionLabel={secondaryAction?.label}
        selectedCategory={selectedCategory}
        summaryItems={summaryItems}
        onCancel={onCancel}
        onSearchChange={handleSearchChange}
        onSecondaryAction={secondaryAction?.onClick}
        onSelectAll={showAllProducts}
        onSelectCategory={openCategory}
      />

      <div
        className={`min-h-0 flex-1 overflow-y-auto scroll-optimized custom-scrollbar ${
          totalItems > 0 ? 'pb-28 md:pb-0' : ''
        }`}
        ref={parentRef}
      >
        {isLoading && activeProdutos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 size-10 animate-spin rounded-full border-2 border-[var(--accent,#008cff)] border-t-transparent" />
            <p className="text-sm font-medium text-[var(--text-primary)]">Carregando produtos...</p>
            <p className="mt-1 text-xs text-[var(--text-soft,#7a8896)]">Aguarde o catálogo terminar de sincronizar.</p>
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
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-[var(--text-soft,#7a8896)]">
              {activeProdutos.length === 0 ? 'Nenhum produto ativo no catálogo' : 'Nenhum produto encontrado'}
            </p>
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
                {selectedCategory ? (
                  <button
                    className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-soft,#7a8896)] transition-colors active:text-[var(--text-primary)]"
                    type="button"
                    onClick={showAllProducts}
                  >
                    Ver tudo
                  </button>
                ) : null}
              </div>
            </div>

            <div
              style={{
                height: `${rowVirtualizer.getTotalSize() + (totalItems > 0 ? 118 : 0)}px`,
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
                          busy={busy}
                          produto={decorateProduct(produto)}
                          qty={qty}
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
                          busy={busy}
                          produto={decorateProduct(produto)}
                          qty={qty}
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
        dockOffset={checkoutDockOffset}
        mode={mode}
        submitLabel={submitLabel}
        totalItems={totalItems}
        totalValue={totalValue}
        onSubmit={() => void handleSubmit()}
      />
    </div>
  )
})
