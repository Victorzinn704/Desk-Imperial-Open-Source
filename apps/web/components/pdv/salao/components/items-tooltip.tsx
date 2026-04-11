import type { Comanda } from '../../pdv-types'
import { formatCurrency } from '@/lib/currency'

export interface ItemsTooltipProps {
  comanda: Comanda
}

export function ItemsTooltip({ comanda }: ItemsTooltipProps) {
  const lastItems = comanda.itens.slice(-3)
  if (lastItems.length === 0) {return null}
  return (
    <div className="absolute bottom-full left-0 mb-2 z-40 w-[190px] rounded-[10px] border border-[rgba(255,255,255,0.1)] bg-[#0e1018] p-2.5 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-1.5">Últimos itens</p>
      {lastItems.map((item, i) => (
        <div className="flex items-center justify-between gap-2 py-0.5" key={i}>
          <span className="text-[11px] text-[var(--text-primary)] truncate flex-1">
            {item.quantidade}× {item.nome}
          </span>
          <span className="text-[10px] text-[var(--text-soft)] shrink-0">
            {formatCurrency(item.quantidade * item.precoUnitario, 'BRL')}
          </span>
        </div>
      ))}
      {comanda.itens.length > 3 && (
        <p className="text-[9px] text-[var(--text-muted)] mt-1.5 border-t border-[rgba(255,255,255,0.05)] pt-1">
          +{comanda.itens.length - 3} mais itens
        </p>
      )}
    </div>
  )
}
