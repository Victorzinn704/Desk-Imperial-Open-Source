'use client'

import { useMemo, useState } from 'react'
import { calcTotal, type Comanda, formatElapsed } from '@/components/pdv/pdv-types'
import { formatCurrency } from '@/lib/currency'
import {
  buildPdvComandaGroups,
  filterPdvComandas,
  formatComandaCode,
  resolveComandaLabel,
} from './pdv-wireframe-environment.helpers'
import type { ComandaCurrency, PdvComandaGroupId } from './pdv-wireframe-environment.types'
import { ComandaStatusPill } from './pdv-wireframe-shared'

export function PdvComandasView({
  comandas,
  currency,
}: Readonly<{
  comandas: Comanda[]
  currency: ComandaCurrency
}>) {
  const [activeGroup, setActiveGroup] = useState<PdvComandaGroupId>('todas')
  const groups = useMemo(() => buildPdvComandaGroups(comandas), [comandas])
  const filteredComandas = useMemo(() => filterPdvComandas(comandas, activeGroup), [activeGroup, comandas])

  return (
    <section className="space-y-4">
      <PdvComandaFilters
        activeGroup={activeGroup}
        groups={groups}
        visibleCount={filteredComandas.length}
        onGroupChange={setActiveGroup}
      />
      <PdvComandaGrid comandas={filteredComandas} currency={currency} />
    </section>
  )
}

function PdvComandaFilters({
  activeGroup,
  groups,
  visibleCount,
  onGroupChange,
}: Readonly<{
  activeGroup: PdvComandaGroupId
  groups: ReturnType<typeof buildPdvComandaGroups>
  visibleCount: number
  onGroupChange: (groupId: PdvComandaGroupId) => void
}>) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="wireframe-filtermeta">recorte das comandas</p>
          <p className="mt-1 text-sm text-[var(--text-soft)]">
            a subseção continua no topo. aqui você só muda o conjunto visível.
          </p>
        </div>
        <span className="wireframe-filtermeta">{visibleCount} na leitura</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {groups.map((group) => (
          <button
            className={
              activeGroup === group.id ? 'wireframe-filterchip wireframe-filterchip--active' : 'wireframe-filterchip'
            }
            key={group.id}
            type="button"
            onClick={() => onGroupChange(group.id)}
          >
            <span className="wireframe-filterchip__meta">{group.count}</span>
            {group.label}
          </button>
        ))}
        <button className="wireframe-inline-button ml-auto" type="button">
          + nova comanda
        </button>
      </div>
    </div>
  )
}

function PdvComandaGrid({
  comandas,
  currency,
}: Readonly<{
  comandas: Comanda[]
  currency: ComandaCurrency
}>) {
  if (comandas.length === 0) {
    return (
      <div className="rounded-[8px] border border-dashed border-[var(--border)] px-4 py-10 text-center text-sm text-[var(--text-soft)]">
        Nenhuma comanda corresponde a este recorte.
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {comandas.map((comanda) => (
        <PdvComandaCard comanda={comanda} currency={currency} key={comanda.id} />
      ))}
    </div>
  )
}

function PdvComandaCard({
  comanda,
  currency,
}: Readonly<{
  comanda: Comanda
  currency: ComandaCurrency
}>) {
  const totalItems = comanda.itens.reduce((sum, item) => sum + item.quantidade, 0)

  return (
    <article className="imperial-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-['Architects_Daughter','Patrick_Hand',sans-serif] text-[1.3rem] font-semibold text-[var(--text-primary)]">
            {resolveComandaLabel(comanda)}
          </h3>
          <p className="mt-1 text-[12px] text-[var(--text-soft)]">
            {totalItems} itens · {comanda.garcomNome ?? 'sem garcom'}
          </p>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
          {formatComandaCode(comanda.id)}
        </span>
      </div>
      <div className="mt-4 font-['Architects_Daughter','Patrick_Hand',sans-serif] text-[1.8rem] leading-none text-[var(--text-primary)]">
        {formatCurrency(calcTotal(comanda), currency)}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <ComandaStatusPill status={comanda.status} />
        <span className="text-[11px] font-medium text-[var(--text-soft)]">{formatElapsed(comanda.abertaEm)}</span>
      </div>
    </article>
  )
}
