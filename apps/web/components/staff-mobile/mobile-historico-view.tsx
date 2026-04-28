'use client'

import { useMemo } from 'react'
import { ClipboardList } from 'lucide-react'
import type { Comanda } from '@/components/pdv/pdv-types'
import { OperationEmptyState } from '@/components/operations/operation-empty-state'
import type { OperationPerformerStanding } from '@/lib/operations'
import { MobileHistoricoCard } from './mobile-historico-view.card'
import { sortHistoricoComandas } from './mobile-historico-view.helpers'
import { MobileHistoricoSummaryPanel } from './mobile-historico-view.summary'

type Props = Readonly<{
  comandas: Comanda[]
  summary?: {
    receitaRealizada: number
    receitaEsperada: number
    openComandasCount: number
    ranking?: OperationPerformerStanding
  }
}>

export function MobileHistoricoView({ comandas, summary }: Props) {
  const sorted = useMemo(() => sortHistoricoComandas(comandas), [comandas])

  if (sorted.length === 0 && !summary) {
    return (
      <OperationEmptyState
        Icon={ClipboardList}
        description="Os atendimentos do dia aparecerão aqui."
        title="Nenhum atendimento hoje"
      />
    )
  }

  return (
    <div className="space-y-4 p-3 pb-6 sm:p-4">
      {summary ? <MobileHistoricoSummaryPanel summary={summary} /> : null}

      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
            Atendimentos — {sorted.length}
          </p>
        </div>

        {sorted.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-[var(--text-soft,#7a8896)]">
            Nenhum atendimento próprio no recorte.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {sorted.map((comanda) => (
              <MobileHistoricoCard comanda={comanda} key={comanda.id} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
