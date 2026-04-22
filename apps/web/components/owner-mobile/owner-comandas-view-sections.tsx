'use client'

import type { ReactNode } from 'react'
import { OperationEmptyState } from '@/components/operations/operation-empty-state'
import { type Comanda, formatElapsed } from '@/components/pdv/pdv-types'
import { formatBRL as formatCurrency } from '@/lib/currency'
import {
  buildOwnerComandasEmptyState,
  type ComandasFilter,
  type OwnerComandasViewProps,
  type ResponsibleFilter,
  slugify,
} from './owner-comandas-view-model'

export function OwnerComandasStatusBanner({
  errorMessage,
  isOffline,
}: Pick<OwnerComandasViewProps, 'errorMessage' | 'isOffline'>) {
  if (errorMessage) {
    return (
      <div className="mb-4 rounded-2xl border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-xs text-[#fca5a5]">
        {errorMessage}
      </div>
    )
  }

  if (isOffline) {
    return (
      <div className="mb-4 rounded-2xl border border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.08)] px-4 py-3 text-xs text-[#fcd34d]">
        Você está offline. O extrato das comandas pode estar desatualizado até a reconexão.
      </div>
    )
  }

  return null
}

export function OwnerComandasHero({
  countAbertas,
  countFechadas,
  countProntas,
  selectedResponsibleLabel,
  ultimaComanda,
  valorEmAberto,
}: {
  countAbertas: number
  countFechadas: number
  countProntas: number
  selectedResponsibleLabel: string
  ultimaComanda: Comanda | null
  valorEmAberto: number
}) {
  return (
    <section className="mb-4 rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <OwnerComandasHeroHeader selectedResponsibleLabel={selectedResponsibleLabel} ultimaComanda={ultimaComanda} />
      <OwnerComandasHeroMetrics
        countAbertas={countAbertas}
        countFechadas={countFechadas}
        countProntas={countProntas}
        valorEmAberto={valorEmAberto}
      />
    </section>
  )
}

function OwnerComandasHeroHeader({
  selectedResponsibleLabel,
  ultimaComanda,
}: {
  selectedResponsibleLabel: string
  ultimaComanda: Comanda | null
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">Comandas</p>
        <h1 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Ao vivo e histórico</h1>
        <p className="mt-1 text-sm leading-6 text-[var(--text-soft,#7a8896)]">
          Acompanhe abertura, preparo e fechamento sem perder o rastro operacional por garçom.
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Recorte atual</p>
        <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{selectedResponsibleLabel}</p>
        <p className="mt-1 text-[11px] text-[var(--text-soft)]">
          {ultimaComanda ? `última leitura há ${formatElapsed(ultimaComanda.abertaEm)}` : 'sem movimento'}
        </p>
      </div>
    </div>
  )
}

function OwnerComandasHeroMetrics({
  countAbertas,
  countFechadas,
  countProntas,
  valorEmAberto,
}: {
  countAbertas: number
  countFechadas: number
  countProntas: number
  valorEmAberto: number
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[18px] bg-[var(--border)] sm:grid-cols-4">
      {[
        { label: 'Abertas', value: String(countAbertas), color: '#f87171' },
        { label: 'Prontas', value: String(countProntas), color: '#60a5fa' },
        { label: 'Fechadas', value: String(countFechadas), color: '#36f57c' },
        { label: 'Em aberto', value: formatCurrency(valorEmAberto), color: '#008cff' },
      ].map(({ label, value, color }) => (
        <div className="bg-[var(--surface-muted)] px-3 py-3" key={label}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft,#7a8896)]">
            {label}
          </p>
          <p className="mt-1 text-base font-bold leading-tight" style={{ color }}>
            {value}
          </p>
        </div>
      ))}
    </div>
  )
}

export function OwnerComandasFilterBar({
  countAbertas,
  countFechadas,
  filtro,
  scopedCount,
  setFiltro,
}: {
  countAbertas: number
  countFechadas: number
  filtro: ComandasFilter
  scopedCount: number
  setFiltro: (value: ComandasFilter) => void
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {(
        [
          { id: 'tudo', label: `Tudo (${scopedCount})` },
          { id: 'abertas', label: `Abertas (${countAbertas})` },
          { id: 'fechadas', label: `Fechadas (${countFechadas})` },
        ] as const
      ).map(({ id, label }) => (
        <button
          className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-95"
          key={id}
          style={{
            background: filtro === id ? 'rgba(0,140,255,0.2)' : 'var(--surface)',
            border: `1px solid ${filtro === id ? 'rgba(0,140,255,0.4)' : 'var(--border)'}`,
            color: filtro === id ? '#008cff' : 'var(--text-soft, #7a8896)',
          }}
          type="button"
          onClick={() => setFiltro(id)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function OwnerComandasResponsibleFilters({
  responsibleFilter,
  responsibleOptions,
  setResponsibleFilter,
}: {
  responsibleFilter: ResponsibleFilter
  responsibleOptions: string[]
  setResponsibleFilter: (value: ResponsibleFilter) => void
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {responsibleOptions.map((option) => {
        const isActive = responsibleFilter === option
        const label = option === 'all' ? 'Equipe inteira' : option

        return (
          <button
            className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-95"
            data-testid={`owner-responsible-filter-${slugify(label)}`}
            key={option}
            style={{
              background: isActive ? 'rgba(167,139,250,0.18)' : 'var(--surface)',
              border: `1px solid ${isActive ? 'rgba(167,139,250,0.36)' : 'var(--border)'}`,
              color: isActive ? '#c4b5fd' : 'var(--text-soft, #7a8896)',
            }}
            type="button"
            onClick={() => setResponsibleFilter(option)}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export function OwnerComandasEmptyState({
  errorMessage,
  filtro,
  isLoading,
  isOffline,
}: {
  errorMessage: string | null
  filtro: ComandasFilter
  isLoading: boolean
  isOffline: boolean
}) {
  const { Icon, description, title } = buildOwnerComandasEmptyState({ errorMessage, filtro, isLoading, isOffline })

  return <OperationEmptyState Icon={Icon} description={description} title={title} />
}

export function OwnerComandasList({ cards, emptyState }: { cards: ReactNode[]; emptyState: ReactNode }) {
  if (cards.length === 0) {
    return emptyState
  }

  return <ul className="space-y-2">{cards}</ul>
}
