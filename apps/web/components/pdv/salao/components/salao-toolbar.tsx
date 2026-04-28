import { formatCurrency } from '@/lib/currency'
import { type FilterStatus, type SalaoView } from '../constants'
import { SalaoToolbarFilters } from './salao-toolbar-filters'
import { SalaoToolbarViewToggle } from './salao-toolbar-view-toggle'

export function SalaoToolbar({
  comAtencao,
  filter,
  livres,
  mesasCount,
  ocupadas,
  semGarcom,
  setFilter,
  setView,
  totalAberto,
  view,
}: Readonly<{
  comAtencao: number
  filter: FilterStatus
  livres: number
  mesasCount: number
  ocupadas: number
  semGarcom: number
  setFilter: (filter: FilterStatus) => void
  setView: (view: SalaoView) => void
  totalAberto: number
  view: SalaoView
}>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <SalaoToolbarFilters
        comAtencao={comAtencao}
        filter={filter}
        livres={livres}
        mesasCount={mesasCount}
        ocupadas={ocupadas}
        semGarcom={semGarcom}
        setFilter={setFilter}
      />

      <div className="flex items-center gap-3">
        {totalAberto > 0 ? (
          <div className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs">
            <span className="text-[var(--text-muted)]">Em aberto </span>
            <span className="font-bold text-[var(--text-primary)]">{formatCurrency(totalAberto, 'BRL')}</span>
          </div>
        ) : null}
        <SalaoToolbarViewToggle setView={setView} view={view} />
      </div>
    </div>
  )
}
