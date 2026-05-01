'use client'

import { type Dispatch, memo, type SetStateAction } from 'react'
import { Minus, Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import type { ComandaItem } from '../../pdv-types'

type ComandaItemRowProps = {
  item: ComandaItem
  onChangeQty: (produtoId: string, delta: number) => void
  setItens: Dispatch<SetStateAction<ComandaItem[]>>
}

export const ComandaItemRow = memo(function ComandaItemRow({ item, onChangeQty, setItens }: ComandaItemRowProps) {
  const lineTotal = item.quantidade * item.precoUnitario
  const noteInputId = `comanda-item-note-${item.produtoId}`

  return (
    <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">{item.nome}</p>
          <p className="mt-1 text-xs text-[var(--text-soft)]">
            {formatCurrency(item.precoUnitario, 'BRL')} por unidade
          </p>
        </div>
        <p className="shrink-0 text-sm font-semibold text-[var(--accent)]">{formatCurrency(lineTotal, 'BRL')}</p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            className="flex size-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-soft)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            type="button"
            onClick={() => onChangeQty(item.produtoId, -1)}
          >
            <Minus className="size-3.5" />
          </button>
          <input
            className="w-10 bg-transparent text-center text-sm font-semibold text-[var(--text-primary)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            min={1}
            type="number"
            value={item.quantidade}
            onChange={(e) => {
              const v = Math.max(1, Math.floor(Number(e.target.value) || 1))
              setItens((prev) => prev.map((i) => (i.produtoId === item.produtoId ? { ...i, quantidade: v } : i)))
            }}
          />
          <button
            className="flex size-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-soft)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            type="button"
            onClick={() => onChangeQty(item.produtoId, 1)}
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        <span className="rounded-full border border-[var(--accent-soft)] bg-[var(--accent-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
          {item.quantidade} und
        </span>
      </div>

      <div className="mt-3 border-t border-dashed border-[var(--border)] pt-3">
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]" htmlFor={noteInputId}>
          Observação do item
        </label>
        <input
          className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-soft)] focus:border-[var(--accent)]"
          id={noteInputId}
          placeholder="Ex: sem gelo, retirar cebola, ponto da carne"
          type="text"
          value={item.observacao ?? ''}
          onChange={(e) => {
            const value = e.target.value
            setItens((prev) =>
              prev.map((current) =>
                current.produtoId === item.produtoId
                  ? { ...current, observacao: value.trim().length > 0 ? value : undefined }
                  : current,
              ),
            )
          }}
        />
      </div>
    </div>
  )
})
