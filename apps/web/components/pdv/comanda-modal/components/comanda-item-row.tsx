'use client'

import { memo, type Dispatch, type SetStateAction } from 'react'
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

  return (
    <div className="rounded-[16px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.025)] px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{item.nome}</p>
          <p className="mt-1 text-xs text-[var(--text-soft)]">
            {formatCurrency(item.precoUnitario, 'BRL')} por unidade
          </p>
        </div>
        <p className="shrink-0 text-sm font-semibold text-[#36f57c]">{formatCurrency(lineTotal, 'BRL')}</p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            className="flex size-8 items-center justify-center rounded-full border border-[rgba(255,255,255,0.12)] text-[var(--text-soft)] transition-colors hover:text-white"
            type="button"
            onClick={() => onChangeQty(item.produtoId, -1)}
          >
            <Minus className="size-3.5" />
          </button>
          <input
            type="number"
            min={1}
            className="w-10 bg-transparent text-center text-sm font-semibold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            value={item.quantidade}
            onChange={(e) => {
              const v = Math.max(1, Math.floor(Number(e.target.value) || 1))
              setItens((prev) => prev.map((i) => (i.produtoId === item.produtoId ? { ...i, quantidade: v } : i)))
            }}
          />
          <button
            className="flex size-8 items-center justify-center rounded-full border border-[rgba(255,255,255,0.12)] text-[var(--text-soft)] transition-colors hover:text-white"
            type="button"
            onClick={() => onChangeQty(item.produtoId, 1)}
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        <span className="rounded-full border border-[rgba(52,242,127,0.18)] bg-[rgba(52,242,127,0.08)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8fffb9]">
          {item.quantidade} und
        </span>
      </div>
    </div>
  )
})
