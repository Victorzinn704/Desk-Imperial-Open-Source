import { memo } from 'react'
import { Armchair } from 'lucide-react'
import { calcTotal, formatElapsed, type Mesa, type Comanda } from '@/components/pdv/pdv-types'
import { fmtBRL } from '../constants'

interface ModernOperacionalCardProps {
  mesa: Mesa
  comanda: Comanda | undefined
  garcomName: string | undefined
  urgency: 0 | 1 | 2 | 3
}

const STATUS_CFG = {
  livre: {
    label: 'Livre',
    color: '#36f57c',
    bgFrom: 'rgba(54,245,124,0.03)',
    bgTo: 'rgba(54,245,124,0.01)',
    border: 'rgba(54,245,124,0.15)',
  },
  ocupada: {
    label: 'Ocupada',
    color: '#f87171',
    bgFrom: 'rgba(248,113,113,0.04)',
    bgTo: 'rgba(248,113,113,0.01)',
    border: 'rgba(248,113,113,0.2)',
  },
  reservada: {
    label: 'Reservada',
    color: '#60a5fa',
    bgFrom: 'rgba(96,165,250,0.04)',
    bgTo: 'rgba(96,165,250,0.01)',
    border: 'rgba(96,165,250,0.2)',
  },
}

export const ModernOperacionalCard = memo(function ModernOperacionalCard({
  mesa,
  comanda,
  garcomName,
  urgency,
}: ModernOperacionalCardProps) {
  const tone = STATUS_CFG[mesa.status]
  const total = comanda ? calcTotal(comanda) : 0
  const itemCount = comanda ? comanda.itens.reduce((s, i) => s + i.quantidade, 0) : 0
  const elapsed = comanda ? formatElapsed(comanda.abertaEm) : null
  const shortGarcom = garcomName ? garcomName.split(' ')[0] : 'Sem garçom'
  const urgencyLabel =
    urgency >= 3 ? 'Crítico' : urgency === 2 ? 'Alerta' : urgency === 1 ? 'Atenção' : 'Normal'

  return (
    <article
      className="relative flex min-h-[150px] flex-col overflow-hidden rounded-[26px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] shadow-[0_20px_60px_rgba(0,0,0,0.45)] transition-all duration-300"
    >
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: tone.bgTo }} />
      <div className="relative flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--text-soft)]">{tone.label}</p>
            <h3 className="text-2xl font-black text-[var(--text-primary)]">{mesa.numero}</h3>
            {comanda?.clienteNome ? (
              <p className="mt-1 text-sm text-[var(--text-soft)] truncate">{comanda.clienteNome}</p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">{urgencyLabel}</p>
            <p className="text-sm text-[var(--text-soft)]">{mesa.capacidade} lugares</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">Garçom</span>
            <span className="text-sm font-semibold text-[var(--text-primary)]">{shortGarcom}</span>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">
              Última atualização
            </span>
            <span className="text-sm font-semibold text-[var(--text-primary)]">{elapsed ?? 'Sem movimentação'}</span>
          </div>
        </div>

        {comanda ? (
          <div className="mt-auto flex items-center justify-between rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.25)] p-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--text-soft)]">Itens</p>
              <p className="text-lg font-black text-[var(--text-primary)]">{itemCount}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--text-soft)]">Total</p>
              <p className="text-lg font-black text-[var(--text-primary)]">{fmtBRL(total)}</p>
            </div>
          </div>
        ) : (
          <div className="mt-auto flex items-center justify-between rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-3 text-[var(--text-soft)]">
            <div className="flex items-center gap-1">
              <Armchair className="size-4" />
              <span>Sem comanda aberta</span>
            </div>
            {mesa.status === 'reservada' && (
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#60a5fa]">Reservado</span>
            )}
          </div>
        )}
      </div>
    </article>
  )
})
