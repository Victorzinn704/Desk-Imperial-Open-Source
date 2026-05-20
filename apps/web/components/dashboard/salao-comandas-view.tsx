import { useMemo, useState } from 'react'
import type { PdvMesaIntent } from '@/components/pdv/pdv-navigation-intent'
import { calcTotal, type Comanda, type Mesa } from '@/components/pdv/pdv-types'
import { fmtBRL, getComandaStatusMeta } from './salao'
import { FilterChip } from './salao-filter-chip'
import { countComandaItems, filterComandas, findMesaForComanda, sortComandasByNewest } from './salao-environment.model'

type ComandaFilter = 'tudo' | 'abertas' | 'fechadas'

const COMANDAS_LOADING_ROW_KEYS = ['loading-1', 'loading-2', 'loading-3', 'loading-4', 'loading-5', 'loading-6']

export function ComandasTableView({
  comandas,
  isLoading,
  liveMesas,
  onOpenPdvFromMesa,
}: Readonly<{
  comandas: Comanda[]
  isLoading: boolean
  liveMesas: Mesa[]
  onOpenPdvFromMesa?: (intent: Omit<PdvMesaIntent, 'requestId'>) => void
}>) {
  const [filter, setFilter] = useState<ComandaFilter>('tudo')
  const visibleComandas = useMemo(() => sortComandasByNewest(filterComandas(comandas, filter)), [comandas, filter])

  if (isLoading) {
    return <ComandasLoadingView />
  }

  return (
    <div className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <ComandasFilterBar comandas={comandas} filter={filter} onFilterChange={setFilter} />
      {visibleComandas.length === 0 ? (
        <ComandasEmptyView />
      ) : (
        <ComandasGrid liveMesas={liveMesas} rows={visibleComandas} onOpenPdvFromMesa={onOpenPdvFromMesa} />
      )}
    </div>
  )
}

function ComandasLoadingView() {
  return (
    <div className="space-y-3">
      {COMANDAS_LOADING_ROW_KEYS.map((key) => (
        <div className="h-14 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]" key={key} />
      ))}
    </div>
  )
}

function ComandasFilterBar({
  comandas,
  filter,
  onFilterChange,
}: Readonly<{
  comandas: Comanda[]
  filter: ComandaFilter
  onFilterChange: (filter: ComandaFilter) => void
}>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterChip
        active={filter === 'tudo'}
        label={`Tudo (${comandas.length})`}
        tone="info"
        onClick={() => onFilterChange('tudo')}
      />
      <FilterChip
        active={filter === 'abertas'}
        label={`Abertas (${filterComandas(comandas, 'abertas').length})`}
        tone="warning"
        onClick={() => onFilterChange('abertas')}
      />
      <FilterChip
        active={filter === 'fechadas'}
        label={`Fechadas (${filterComandas(comandas, 'fechadas').length})`}
        tone="success"
        onClick={() => onFilterChange('fechadas')}
      />
    </div>
  )
}

function ComandasEmptyView() {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-soft)] px-6 py-14 text-center">
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">Nenhuma comanda no recorte atual</h3>
      <p className="mt-2 text-sm text-[var(--text-soft)]">
        Assim que a operação registrar comandas, elas aparecem aqui para auditoria e atalho para o PDV.
      </p>
    </div>
  )
}

function ComandasGrid({
  liveMesas,
  onOpenPdvFromMesa,
  rows,
}: Readonly<{
  liveMesas: Mesa[]
  onOpenPdvFromMesa?: (intent: Omit<PdvMesaIntent, 'requestId'>) => void
  rows: Comanda[]
}>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
      <ComandasGridHeader />
      {rows.map((comanda) => (
        <ComandaRow
          comanda={comanda}
          key={comanda.id}
          mesa={findMesaForComanda(liveMesas, comanda)}
          onOpenPdvFromMesa={onOpenPdvFromMesa}
        />
      ))}
    </div>
  )
}

function ComandasGridHeader() {
  return (
    <div className="grid grid-cols-[1.3fr_120px_1fr_130px_90px_120px_110px] gap-3 border-b border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
      <span>Mesa</span>
      <span>Status</span>
      <span>Garçom</span>
      <span>Abertura</span>
      <span className="text-center">Itens</span>
      <span className="text-right">Total</span>
      <span className="text-right">Ação</span>
    </div>
  )
}

function ComandaRow({
  comanda,
  mesa,
  onOpenPdvFromMesa,
}: Readonly<{
  comanda: Comanda
  mesa: Mesa | undefined
  onOpenPdvFromMesa?: (intent: Omit<PdvMesaIntent, 'requestId'>) => void
}>) {
  return (
    <div className="grid grid-cols-[1.3fr_120px_1fr_130px_90px_120px_110px] gap-3 border-b border-[var(--border)]/70 px-4 py-3 text-sm last:border-b-0">
      <ComandaIdentityCell comanda={comanda} />
      <ComandaStatusCell status={comanda.status} />
      <span className="truncate text-[var(--text-soft)]">{comanda.garcomNome ?? 'Sem garçom'}</span>
      <span className="text-[var(--text-soft)]">{formatComandaOpenedAt(comanda)}</span>
      <span className="text-center text-[var(--text-soft)]">{countComandaItems(comanda)}</span>
      <span className="text-right font-semibold text-[var(--text-primary)]">{fmtBRL(calcTotal(comanda))}</span>
      <ComandaActionCell comanda={comanda} mesa={mesa} onOpenPdvFromMesa={onOpenPdvFromMesa} />
    </div>
  )
}

function ComandaIdentityCell({ comanda }: Readonly<{ comanda: Comanda }>) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-[var(--text-primary)]">{comanda.mesa ?? 'Sem mesa'}</p>
      <p className="truncate text-xs text-[var(--text-soft)]">#{comanda.id.slice(0, 8)}</p>
    </div>
  )
}

function ComandaStatusCell({ status }: Readonly<{ status: Comanda['status'] }>) {
  const badge = getComandaStatusMeta(status)
  const tone = badge.tone === 'accent' ? 'accent' : badge.tone

  return (
    <div>
      <span
        className="inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{
          background: badge.tone === 'accent' ? 'var(--accent-soft)' : `var(--${tone}-soft)`,
          borderColor: badge.tone === 'accent' ? 'var(--accent)' : `var(--${tone})`,
          color: `var(--${tone})`,
        }}
      >
        {badge.text}
      </span>
    </div>
  )
}

function ComandaActionCell({
  comanda,
  mesa,
  onOpenPdvFromMesa,
}: Readonly<{
  comanda: Comanda
  mesa: Mesa | undefined
  onOpenPdvFromMesa?: (intent: Omit<PdvMesaIntent, 'requestId'>) => void
}>) {
  if (!(mesa && onOpenPdvFromMesa)) {
    return <span className="text-xs text-[var(--text-muted)]">—</span>
  }

  return (
    <div className="flex justify-end">
      <button
        className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
        type="button"
        onClick={() => onOpenPdvFromMesa({ mesaId: mesa.id, mesaLabel: mesa.numero, comandaId: comanda.id })}
      >
        Abrir PDV
      </button>
    </div>
  )
}

function formatComandaOpenedAt(comanda: Comanda) {
  return comanda.abertaEm.toLocaleString('pt-BR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  })
}
