'use client'

import { useState } from 'react'
import type { ComandaItem } from '@/components/pdv/pdv-types'
import type { ProductRecord } from '@contracts/contracts'
import { ShoppingCart, Plus, Minus, Search, PlusCircle, Coffee, Pizza, Beer, Package, UtensilsCrossed, Wine } from 'lucide-react'

interface MobileOrderBuilderProps {
  mesaLabel: string
  mode: 'new' | 'add'
  busy?: boolean
  produtos: ProductRecord[]
  onSubmit: (items: ComandaItem[]) => Promise<void> | void
  onCancel: () => void
}

type CartEntry = ComandaItem & { _key: string }

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function MobileOrderBuilder({ mesaLabel, mode, busy, produtos, onSubmit, onCancel }: MobileOrderBuilderProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartEntry[]>([])

  const activeProdutos = produtos.filter((p) => p.active)
  const categories = Array.from(new Set(activeProdutos.map(p => p.category))).filter(Boolean).sort()

  const filtered = activeProdutos.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())
    const matchCat = selectedCategory ? p.category === selectedCategory : true
    return matchSearch && matchCat
  })

  // Heuristic icon mapper
  function getCategoryIcon(cat: string) {
    const low = cat.toLowerCase()
    if (low.includes('alco') || low.includes('cerveja') || low.includes('chopp')) return <Beer className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />
    if (low.includes('vinho')) return <Wine className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />
    if (low.includes('bebida') || low.includes('suco') || low.includes('refr')) return <Coffee className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />
    if (low.includes('combo') || low.includes('kit')) return <Package className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />
    if (low.includes('pizza') || low.includes('lanche') || low.includes('burger')) return <Pizza className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />
    return <UtensilsCrossed className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />
  }

  function getQty(produtoId: string): number {
    return cart.find((c) => c.produtoId === produtoId)?.quantidade ?? 0
  }

  function addItem(produto: ProductRecord) {
    setCart((prev) => {
      const existing = prev.find((c) => c.produtoId === produto.id)
      if (existing) {
        return prev.map((c) =>
          c.produtoId === produto.id ? { ...c, quantidade: c.quantidade + 1 } : c,
        )
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
  }

  function removeItem(produtoId: string) {
    setCart((prev) => {
      const existing = prev.find((c) => c.produtoId === produtoId)
      if (!existing) return prev
      if (existing.quantidade === 1) return prev.filter((c) => c.produtoId !== produtoId)
      return prev.map((c) =>
        c.produtoId === produtoId ? { ...c, quantidade: c.quantidade - 1 } : c,
      )
    })
  }

  const totalItems = cart.reduce((sum, c) => sum + c.quantidade, 0)
  const totalValue = cart.reduce((sum, c) => sum + c.quantidade * c.precoUnitario, 0)

  async function handleSubmit() {
    if (cart.length === 0 || busy) return
    const items: ComandaItem[] = cart.map(({ _key: _k, ...rest }) => rest)
    await onSubmit(items)
  }

  const submitLabel = mode === 'add' ? 'Adicionar itens' : 'Enviar pedido'
  const subtitle = mode === 'add'
    ? 'Adicionar itens à comanda'
    : 'Adicionar produtos ao pedido'

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-[rgba(255,255,255,0.06)] px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              {mode === 'add' ? (
                <PlusCircle className="size-3.5 text-[var(--accent,#9b8460)]" />
              ) : null}
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent,#9b8460)]">
                Mesa {mesaLabel}
              </p>
            </div>
            <p className="text-sm text-[var(--text-soft,#7a8896)]">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-soft,#7a8896)] transition-colors active:text-white"
          >
            Cancelar
          </button>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-soft,#7a8896)]" />
          <input
            type="text"
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] py-2.5 pl-9 pr-4 text-sm text-white placeholder-[var(--text-soft,#7a8896)] outline-none focus:border-[rgba(155,132,96,0.45)]"
          />
        </div>

        {/* Categories Kanban Squares */}
        {categories.length > 0 && (
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`group flex shrink-0 flex-col items-center justify-center rounded-2xl border px-4 py-3 min-w-[80px] transition-all hover:-translate-y-0.5 ${
                selectedCategory === null 
                  ? 'bg-[var(--accent,#9b8460)] border-[var(--accent,#9b8460)] text-black shadow-[0_4px_16px_rgba(155,132,96,0.4)]' 
                  : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.08)] text-[var(--text-soft,#7a8896)] hover:border-[rgba(255,255,255,0.2)]'
              }`}
            >
              <Search className={`size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity ${selectedCategory === null ? 'text-black' : ''}`} />
              <span className={`text-[10px] uppercase font-bold tracking-wider ${selectedCategory === null ? 'text-black' : ''}`}>Todos</span>
            </button>

            {categories.map((cat) => {
              const isActive = selectedCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`group flex shrink-0 flex-col items-center justify-center rounded-2xl border px-4 py-3 min-w-[80px] transition-all hover:-translate-y-0.5 ${
                    isActive
                      ? 'bg-[var(--accent,#9b8460)] border-[var(--accent,#9b8460)] text-black shadow-[0_4px_16px_rgba(155,132,96,0.4)]'
                      : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.08)] text-[var(--text-soft,#7a8896)] hover:border-[rgba(255,255,255,0.2)]'
                  }`}
                >
                  {getCategoryIcon(cat)}
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${isActive ? 'text-black' : ''}`}>
                    {cat.length > 10 ? cat.substring(0,10) + '...' : cat}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Product list — scrollable */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom,0px))' }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-[var(--text-soft,#7a8896)]">Nenhum produto encontrado</p>
          </div>
        ) : (
          <ul className="divide-y divide-[rgba(255,255,255,0.04)]">
            {filtered.map((produto) => {
              const qty = getQty(produto.id)
              return (
                <li
                  key={produto.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{produto.name}</p>
                    <p className="mt-0.5 text-xs text-[var(--text-soft,#7a8896)]">
                      {produto.category} · {formatCurrency(produto.unitPrice)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {qty > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => removeItem(produto.id)}
                          className="flex size-9 items-center justify-center rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)] text-[var(--text-soft,#7a8896)] transition-colors active:bg-[rgba(255,255,255,0.12)]"
                        >
                          <Minus className="size-4" />
                        </button>
                        <span className="min-w-[20px] text-center text-sm font-semibold text-white">
                          {qty}
                        </span>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => addItem(produto)}
                      className="flex size-9 items-center justify-center rounded-xl border border-[rgba(155,132,96,0.3)] bg-[rgba(155,132,96,0.12)] text-[var(--accent,#9b8460)] transition-colors active:bg-[rgba(155,132,96,0.25)]"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Sticky bottom cart bar — safe-area aware */}
      <div
        className="fixed left-0 right-0 border-t border-[rgba(155,132,96,0.2)] bg-[#0a0a0a] px-4 py-3 shadow-lg"
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom,0px))' }}
      >
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
            {totalValue > 0 && (
              <p className="text-sm font-semibold text-white">{formatCurrency(totalValue)}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={cart.length === 0 || busy}
            className="rounded-xl bg-[var(--accent,#9b8460)] px-4 py-2.5 text-sm font-semibold text-black transition-opacity disabled:opacity-40 active:opacity-80"
          >
            {busy ? 'Enviando...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
