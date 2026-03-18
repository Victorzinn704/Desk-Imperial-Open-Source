'use client'

import { useState } from 'react'
import { Minus, Plus, Search, X } from 'lucide-react'
import type { Comanda, ComandaItem } from './pdv-types'
import { calcTotal } from './pdv-types'
import { formatCurrency } from '@/lib/currency'

type SimpleProduct = {
  id: string
  name: string
  category: string
  unitPrice: number
  currency: string
}

type PdvComandaModalProps = {
  comanda?: Comanda | null
  products: SimpleProduct[]
  onSave: (data: { mesa: string; clienteNome: string; itens: ComandaItem[]; desconto: number; acrescimo: number }) => void
  onClose: () => void
  onStatusChange?: (comanda: Comanda, status: Comanda['status']) => void
}

export function PdvComandaModal({ comanda, products, onSave, onClose, onStatusChange }: Readonly<PdvComandaModalProps>) {
  const isEditing = Boolean(comanda)
  const [mesa, setMesa] = useState(comanda?.mesa ?? '')
  const [clienteNome, setClienteNome] = useState(comanda?.clienteNome ?? '')
  const [itens, setItens] = useState<ComandaItem[]>(comanda?.itens ?? [])
  const [desconto, setDesconto] = useState(comanda?.desconto ?? 0)
  const [acrescimo, setAcrescimo] = useState(comanda?.acrescimo ?? 0)
  const [search, setSearch] = useState('')

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase()),
  )

  function addItem(product: SimpleProduct) {
    setItens((prev) => {
      const existing = prev.find((i) => i.produtoId === product.id)
      if (existing) {
        return prev.map((i) =>
          i.produtoId === product.id ? { ...i, quantidade: i.quantidade + 1 } : i,
        )
      }
      return [
        ...prev,
        {
          produtoId: product.id,
          nome: product.name,
          quantidade: 1,
          precoUnitario: product.unitPrice,
        },
      ]
    })
  }

  function changeQty(produtoId: string, delta: number) {
    setItens((prev) =>
      prev
        .map((i) => (i.produtoId === produtoId ? { ...i, quantidade: i.quantidade + delta } : i))
        .filter((i) => i.quantidade > 0),
    )
  }

  const bruto = itens.reduce((sum, i) => sum + i.quantidade * i.precoUnitario, 0)
  const mockComanda: Comanda = {
    id: '',
    status: 'aberta',
    mesa,
    clienteNome,
    itens,
    desconto,
    acrescimo,
    abertaEm: comanda?.abertaEm ?? new Date(),
  }
  const total = calcTotal(mockComanda)

  function handleSave() {
    if (itens.length === 0) return
    onSave({ mesa, clienteNome, itens, desconto, acrescimo })
  }

  const STATUS_OPTIONS: Array<{ value: Comanda['status']; label: string; color: string }> = [
    { value: 'aberta', label: 'Aberta', color: '#60a5fa' },
    { value: 'em_preparo', label: 'Em Preparo', color: '#fb923c' },
    { value: 'pronta', label: 'Pronta', color: '#36f57c' },
    { value: 'fechada', label: 'Fechar Comanda', color: '#7a8896' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="imperial-card relative flex w-full max-w-3xl flex-col gap-0 overflow-hidden"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] p-6">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {isEditing ? `Comanda #${comanda!.id.slice(-4).toUpperCase()}` : 'Nova Comanda'}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-soft)]">
              {isEditing ? 'Editar itens, desconto e status' : 'Adicione itens e confirme a comanda'}
            </p>
          </div>
          <button
            className="flex size-9 items-center justify-center rounded-[14px] border border-[rgba(255,255,255,0.08)] text-[var(--text-soft)] transition-colors hover:border-[rgba(255,255,255,0.16)] hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Left — product picker */}
          <div className="flex w-[55%] flex-col border-r border-[rgba(255,255,255,0.06)]">
            <div className="p-4">
              <div className="flex items-center gap-2 rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5">
                <Search className="size-4 text-[var(--text-soft)]" />
                <input
                  className="flex-1 bg-transparent text-sm text-white placeholder-[var(--text-soft)] outline-none"
                  placeholder="Buscar produto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <div className="grid grid-cols-1 gap-2">
                {filteredProducts.map((product) => {
                  const inCart = itens.find((i) => i.produtoId === product.id)
                  return (
                    <button
                      key={product.id}
                      className="flex w-full items-center justify-between rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-3 py-3 text-left transition-all hover:border-[rgba(52,242,127,0.22)] hover:bg-[rgba(52,242,127,0.04)]"
                      type="button"
                      onClick={() => addItem(product)}
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{product.name}</p>
                        <p className="text-xs text-[var(--text-soft)]">{product.category}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-[#36f57c]">
                          {formatCurrency(product.unitPrice, 'BRL')}
                        </span>
                        {inCart && (
                          <span className="flex size-6 items-center justify-center rounded-full bg-[rgba(52,242,127,0.16)] text-[11px] font-bold text-[#36f57c]">
                            {inCart.quantidade}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
                {filteredProducts.length === 0 && (
                  <p className="py-8 text-center text-sm text-[var(--text-soft)]">Nenhum produto encontrado</p>
                )}
              </div>
            </div>
          </div>

          {/* Right — comanda summary */}
          <div className="flex w-[45%] flex-col">
            {/* Cliente / Mesa */}
            <div className="grid grid-cols-2 gap-3 p-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                  Mesa
                </label>
                <input
                  className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm text-white outline-none focus:border-[rgba(52,242,127,0.3)]"
                  placeholder="Ex: 4"
                  value={mesa}
                  onChange={(e) => setMesa(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                  Cliente
                </label>
                <input
                  className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm text-white outline-none focus:border-[rgba(52,242,127,0.3)]"
                  placeholder="Nome (opcional)"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                />
              </div>
            </div>

            {/* Itens */}
            <div className="flex-1 overflow-y-auto px-4">
              {itens.length === 0 ? (
                <div className="flex h-24 items-center justify-center rounded-[14px] border border-dashed border-[rgba(255,255,255,0.08)]">
                  <p className="text-xs text-[var(--text-soft)]">Adicione produtos ao lado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {itens.map((item) => (
                    <div
                      key={item.produtoId}
                      className="flex items-center justify-between rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white">{item.nome}</p>
                        <p className="text-xs text-[var(--text-soft)]">
                          {formatCurrency(item.precoUnitario, 'BRL')} / un
                        </p>
                      </div>
                      <div className="ml-3 flex items-center gap-2">
                        <button
                          className="flex size-6 items-center justify-center rounded-full border border-[rgba(255,255,255,0.12)] text-[var(--text-soft)] hover:text-white"
                          type="button"
                          onClick={() => changeQty(item.produtoId, -1)}
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="w-5 text-center text-sm font-semibold text-white">
                          {item.quantidade}
                        </span>
                        <button
                          className="flex size-6 items-center justify-center rounded-full border border-[rgba(255,255,255,0.12)] text-[var(--text-soft)] hover:text-white"
                          type="button"
                          onClick={() => changeQty(item.produtoId, 1)}
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Desconto / Acréscimo */}
            <div className="grid grid-cols-2 gap-3 px-4 pt-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                  Desconto %
                </label>
                <input
                  className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm text-white outline-none focus:border-[rgba(52,242,127,0.3)]"
                  max="100"
                  min="0"
                  type="number"
                  value={desconto}
                  onChange={(e) => setDesconto(Math.min(100, Math.max(0, Number(e.target.value))))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                  Acréscimo %
                </label>
                <input
                  className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm text-white outline-none focus:border-[rgba(52,242,127,0.3)]"
                  max="100"
                  min="0"
                  type="number"
                  value={acrescimo}
                  onChange={(e) => setAcrescimo(Math.min(100, Math.max(0, Number(e.target.value))))}
                />
              </div>
            </div>

            {/* Total */}
            <div className="m-4 flex items-center justify-between rounded-[14px] border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.06)] px-4 py-3">
              <div>
                {bruto !== total && (
                  <p className="text-xs text-[var(--text-soft)] line-through">
                    {formatCurrency(bruto, 'BRL')}
                  </p>
                )}
                <p className="text-xl font-bold text-[#36f57c]">{formatCurrency(total, 'BRL')}</p>
              </div>
              <p className="text-xs text-[var(--text-soft)]">
                {itens.reduce((s, i) => s + i.quantidade, 0)} itens
              </p>
            </div>

            {/* Status (somente quando editando) */}
            {isEditing && onStatusChange && comanda && (
              <div className="grid grid-cols-2 gap-2 px-4 pb-3">
                {STATUS_OPTIONS.filter((s) => s.value !== comanda.status).map((opt) => (
                  <button
                    key={opt.value}
                    className="rounded-[12px] border px-3 py-2 text-xs font-semibold transition-all hover:opacity-90"
                    style={{
                      borderColor: `${opt.color}44`,
                      background: `${opt.color}11`,
                      color: opt.color,
                    }}
                    type="button"
                    onClick={() => { onStatusChange(comanda, opt.value); onClose() }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-[rgba(255,255,255,0.06)] p-4">
              <button
                className="w-full rounded-[14px] border border-[rgba(52,242,127,0.4)] bg-[rgba(52,242,127,0.12)] py-3 text-sm font-semibold text-[#36f57c] transition-all hover:bg-[rgba(52,242,127,0.2)] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={itens.length === 0}
                type="button"
                onClick={handleSave}
              >
                {isEditing ? 'Salvar Alterações' : 'Abrir Comanda'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
