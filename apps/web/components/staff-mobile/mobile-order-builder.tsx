'use client'

import { useState, useMemo, useCallback, memo, useDeferredValue, startTransition, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { ComandaItem } from '@/components/pdv/pdv-types'
import type { ProductRecord } from '@contracts/contracts'
import { formatBRL as formatCurrency } from '@/lib/currency'
import {
  ShoppingCart,
  Plus,
  Minus,
  Search,
  PlusCircle,
  ChevronLeft,
  Coffee,
  Pizza,
  Beer,
  Package,
  UtensilsCrossed,
  Wine,
} from 'lucide-react'

interface MobileOrderBuilderProps {
  mesaLabel: string
  mode: 'new' | 'add'
  busy?: boolean
  produtos: ProductRecord[]
  onSubmit: (items: ComandaItem[]) => Promise<void> | void
  onCancel: () => void
}

type CartEntry = ComandaItem & { _key: string }

// Componente memoizado para cada item de produto
const ProductItem = memo(function ProductItem({
  produto,
  qty,
  onAdd,
  onRemove,
}: {
  produto: ProductRecord
  qty: number
  onAdd: () => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{produto.name}</p>
        <p className="mt-0.5 text-xs text-[var(--text-soft,#7a8896)]">
          {produto.category} · {formatCurrency(produto.unitPrice)}
        </p>
        {produto.isCombo ? (
          <span className="mt-1 inline-flex rounded-full border border-[rgba(155,132,96,0.35)] bg-[rgba(155,132,96,0.14)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--accent,#9b8460)]">
            combo
          </span>
        ) : null}
        {produto.isCombo && produto.comboDescription ? (
          <p className="mt-1 text-[11px] leading-4 text-[var(--accent,#9b8460)] line-clamp-2">
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
              type="button"
              onClick={onRemove}
              aria-label={`Remover ${produto.name}`}
              className="flex size-11 items-center justify-center rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)] text-[var(--text-soft,#7a8896)] transition-colors active:bg-[rgba(255,255,255,0.12)] btn-haptic"
            >
              <Minus className="size-4" />
            </button>
            <span className="min-w-[24px] text-center text-sm font-semibold text-white">{qty}</span>
          </>
        )}
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Adicionar ${produto.name}`}
          className="flex size-11 items-center justify-center rounded-xl border border-[rgba(155,132,96,0.3)] bg-[rgba(155,132,96,0.12)] text-[var(--accent,#9b8460)] transition-colors active:bg-[rgba(155,132,96,0.25)] btn-haptic"
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
    return <Beer className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />
  if (low.includes('vinho'))
    return <Wine className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />
  if (low.includes('bebida') || low.includes('suco') || low.includes('refr'))
    return <Coffee className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />
  if (low.includes('combo') || low.includes('kit'))
    return <Package className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />
  if (low.includes('pizza') || low.includes('lanche') || low.includes('burger'))
    return <Pizza className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />
  return <UtensilsCrossed className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />
}

export const MobileOrderBuilder = memo(function MobileOrderBuilder({
  mesaLabel,
  mode,
  busy,
  produtos,
  onSubmit,
  onCancel,
}: MobileOrderBuilderProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [screen, setScreen] = useState<'categories' | 'items'>('categories')
  const [cart, setCart] = useState<CartEntry[]>([])
  const deferredSearch = useDeferredValue(search)
  const parentRef = useRef<HTMLDivElement | null>(null)

  // Memoização para evitar recálculos desnecessários
  const activeProdutos = useMemo(() => produtos.filter((p) => p.active), [produtos])

  const categories = useMemo(
    () =>
      Array.from(new Set(activeProdutos.map((p) => p.category)))
        .filter(Boolean)
        .sort(),
    [activeProdutos],
  )

  const filtered = useMemo(() => {
    const searchLower = deferredSearch.toLowerCase()
    return activeProdutos.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(searchLower) || p.category.toLowerCase().includes(searchLower)
      const matchCat = selectedCategory ? p.category === selectedCategory : true
      return matchSearch && matchCat
    })
  }, [activeProdutos, deferredSearch, selectedCategory])

  // Mapa de quantidades para lookup O(1)
  const qtyMap = useMemo(() => {
    const map = new Map<string, number>()
    cart.forEach((c) => map.set(c.produtoId, c.quantidade))
    return map
  }, [cart])

  const getQty = useCallback((produtoId: string): number => qtyMap.get(produtoId) ?? 0, [qtyMap])

  const addItem = useCallback((produto: ProductRecord) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.produtoId === produto.id)
      if (existing) {
        return prev.map((c) => (c.produtoId === produto.id ? { ...c, quantidade: c.quantidade + 1 } : c))
      }
      return [
        ...prev,
        {
          _key: produto.id,
          produtoId: produto.id,
          nome: produto.name,
          quantidade: 1,
          precoUnitario: produto.unitPrice,
        },
      ]
    })
  }, [])

  const removeItem = useCallback((produtoId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.produtoId === produtoId)
      if (!existing) return prev
      if (existing.quantidade === 1) return prev.filter((c) => c.produtoId !== produtoId)
      return prev.map((c) => (c.produtoId === produtoId ? { ...c, quantidade: c.quantidade - 1 } : c))
    })
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
    if (cart.length === 0 || busy) return
    const items: ComandaItem[] = cart.map(({ _key: _k, ...rest }) => rest)
    await onSubmit(items)
  }, [cart, busy, onSubmit])

  const submitLabel = mode === 'add' ? 'Adicionar itens' : 'Enviar pedido'
  const subtitle = mode === 'add' ? 'Adicionar itens à comanda' : 'Adicionar produtos ao pedido'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className="border-b border-[rgba(255,255,255,0.06)] px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              {mode === 'add' ? <PlusCircle className="size-3.5 text-[var(--accent,#9b8460)]" /> : null}
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent,#9b8460)]">
                Mesa {mesaLabel}
              </p>
            </div>
            <p className="text-sm text-[var(--text-soft,#7a8896)]">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-soft,#7a8896)] transition-colors active:text-white min-h-[44px]"
          >
            Cancelar
          </button>
        </div>

        {showItemsScreen ? (
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-soft,#7a8896)]" />
            <input
              type="text"
              placeholder={selectedCategory ? `Buscar em ${selectedCategory}...` : 'Buscar produto...'}
              value={search}
              onChange={(e) => {
                const nextValue = e.target.value
                startTransition(() => setSearch(nextValue))
              }}
              className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] py-3 pl-9 pr-4 text-base text-white placeholder-[var(--text-soft,#7a8896)] outline-none focus:border-[rgba(155,132,96,0.45)]"
            />
          </div>
        ) : categories.length > 0 ? (
          <p className="mt-3 text-sm leading-6 text-[var(--text-soft,#7a8896)]">
            Escolha a categoria primeiro. Depois abrimos só a lista daquela classe, sem dividir a tela.
          </p>
        ) : null}
      </div>

      {/* Product list */}
      <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto scroll-optimized custom-scrollbar">
        {!showItemsScreen && categories.length > 0 ? (
          <div className="p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#9b8460)]">
              Escolha uma categoria
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => {
                  startTransition(() => {
                    setSelectedCategory(null)
                    setSearch('')
                    setScreen('items')
                  })
                }}
                className="group flex min-h-[72px] flex-col items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-2 py-3 text-[var(--text-soft,#7a8896)] transition-all active:scale-95 active:border-[rgba(255,255,255,0.2)]"
              >
                <Search className="mb-1 size-5 opacity-80 transition-opacity group-hover:opacity-100" />
                <span className="line-clamp-2 text-center text-[10px] font-bold uppercase tracking-wider">Todos</span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    startTransition(() => {
                      setSelectedCategory(cat)
                      setSearch('')
                      setScreen('items')
                    })
                  }}
                  className="group flex min-h-[72px] flex-col items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-2 py-3 text-[var(--text-soft,#7a8896)] transition-all active:scale-95 active:border-[rgba(255,255,255,0.2)]"
                >
                  {getCategoryIcon(cat)}
                  <span className="line-clamp-2 text-center text-[10px] font-bold uppercase tracking-wider">{cat}</span>
                </button>
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-[var(--text-soft,#7a8896)]">Nenhum produto encontrado</p>
          </div>
        ) : (
          <>
            <div className="border-b border-[rgba(255,255,255,0.04)] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#9b8460)]">
                    {selectedCategory ?? (deferredSearch.trim().length > 0 ? 'Busca rápida' : 'Todos os produtos')}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-soft,#7a8896)]">{filtered.length} produtos disponíveis</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    startTransition(() => {
                      setScreen('categories')
                      setSearch('')
                    })
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-[rgba(255,255,255,0.08)] px-3 py-2 text-xs font-semibold text-[var(--text-soft,#7a8896)] transition-colors active:text-white"
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
                        key={produto.id}
                        className="border-b border-[rgba(255,255,255,0.04)]"
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
                          onAdd={() => addItem(produto)}
                          onRemove={() => removeItem(produto.id)}
                        />
                      </div>
                    )
                  })
                : filtered.slice(0, 12).map((produto) => {
                    const qty = getQty(produto.id)
                    return (
                      <div key={produto.id} className="border-b border-[rgba(255,255,255,0.04)]">
                        <ProductItem
                          produto={produto}
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

      {/* Bottom cart bar */}
      <div className="shrink-0 border-t border-[rgba(155,132,96,0.2)] bg-[#0a0a0a] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingCart className="size-5 text-[var(--text-soft,#7a8896)]" />
            {totalItems > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-[var(--accent,#9b8460)] text-[10px] font-bold text-black">
                {totalItems}
              </span>
            )}
          </div>
          <div className="flex-1">
            <p className="text-xs text-[var(--text-soft,#7a8896)]">
              {totalItems === 0 ? 'Carrinho vazio' : `${totalItems} ${totalItems === 1 ? 'item' : 'itens'}`}
            </p>
            {totalValue > 0 && <p className="text-sm font-semibold text-white">{formatCurrency(totalValue)}</p>}
          </div>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={cart.length === 0 || busy}
            className="rounded-xl bg-[var(--accent,#9b8460)] px-5 py-3 text-sm font-semibold text-black transition-opacity disabled:opacity-40 active:opacity-80 min-h-[48px] btn-haptic"
          >
            {busy ? 'Enviando...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
})
