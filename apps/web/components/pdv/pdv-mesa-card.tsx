'use client'

import { memo, type ReactNode } from 'react'
import { Clock, ShoppingBag, Users } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import { calcTotal, type Comanda, countComandaItems, formatElapsed, type Mesa } from './pdv-types'

const STATUS_CONFIG = {
  livre: {
    bg: 'rgba(54, 245, 124, 0.07)',
    border: 'rgba(54, 245, 124, 0.22)',
    dot: '#36f57c',
    label: 'Livre',
    text: 'text-[#36f57c]',
  },
  ocupada: {
    bg: 'rgba(251, 146, 60, 0.08)',
    border: 'rgba(251, 146, 60, 0.28)',
    dot: '#fb923c',
    label: 'Ocupada',
    text: 'text-[#fb923c]',
  },
  reservada: {
    bg: 'rgba(96, 165, 250, 0.08)',
    border: 'rgba(96, 165, 250, 0.22)',
    dot: '#60a5fa',
    label: 'Reservada',
    text: 'text-[#60a5fa]',
  },
}

type PdvMesaCardProps = Readonly<{
  comanda?: Comanda
  mesa: Mesa
  onClickLivre: (mesa: Mesa) => void
  onClickOcupada: (comanda: Comanda) => void
  onDelete: (mesaId: string) => void
}>

export const PdvMesaCard = memo(function PdvMesaCard(props: PdvMesaCardProps) {
  const cfg = STATUS_CONFIG[props.mesa.status]

  return (
    <div
      className="relative flex min-h-[148px] select-none flex-col justify-between rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.32)]"
      style={{ background: cfg.bg, borderColor: cfg.border }}
    >
      <MesaClickLayer {...props} />
      <MesaDeleteButton mesaId={props.mesa.id} onDelete={props.onDelete} />
      <MesaCardBody cfg={cfg} comanda={props.comanda} mesa={props.mesa} />
    </div>
  )
})

function MesaClickLayer({
  comanda,
  mesa,
  onClickLivre,
  onClickOcupada,
}: Pick<PdvMesaCardProps, 'comanda' | 'mesa' | 'onClickLivre' | 'onClickOcupada'>) {
  return (
    <button
      aria-label={mesa.status === 'ocupada' ? `Abrir comanda da mesa ${mesa.numero}` : `Abrir mesa ${mesa.numero}`}
      className="absolute inset-0 rounded-2xl border-0 bg-transparent p-0"
      type="button"
      onClick={() => handleMesaClick({ comanda, mesa, onClickLivre, onClickOcupada })}
    />
  )
}

function MesaDeleteButton({ mesaId, onDelete }: Readonly<{ mesaId: string; onDelete: (mesaId: string) => void }>) {
  return (
    <button
      className="absolute right-3 top-3 z-20 flex size-6 items-center justify-center rounded-full text-[var(--text-muted)] opacity-0 transition hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--text-primary)] hover:opacity-100 group-hover:opacity-100"
      title="Remover mesa"
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onDelete(mesaId)
      }}
    >
      ×
    </button>
  )
}

function MesaCardBody({
  cfg,
  comanda,
  mesa,
}: Readonly<{ cfg: (typeof STATUS_CONFIG)[keyof typeof STATUS_CONFIG]; comanda?: Comanda; mesa: Mesa }>) {
  return (
    <div className="pointer-events-none relative z-10">
      <MesaHeader cfg={cfg} mesa={mesa} />
      <MesaCapacity capacidade={mesa.capacidade} />
      {mesa.status === 'ocupada' && comanda ? <MesaComandaPanel comanda={comanda} /> : null}
      {mesa.status === 'livre' ? (
        <p className="mt-3 text-[11px] text-[var(--text-muted)]">Clique para abrir comanda</p>
      ) : null}
    </div>
  )
}

function MesaHeader({ cfg, mesa }: Readonly<{ cfg: (typeof STATUS_CONFIG)[keyof typeof STATUS_CONFIG]; mesa: Mesa }>) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Mesa</p>
        <p className="mt-0.5 text-3xl font-bold leading-none text-[var(--text-primary)]">{mesa.numero}</p>
      </div>
      <span
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${cfg.text}`}
        style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${cfg.border}` }}
      >
        <span className="inline-block size-1.5 rounded-full" style={{ background: cfg.dot }} />
        {cfg.label}
      </span>
    </div>
  )
}

function MesaCapacity({ capacidade }: Readonly<{ capacidade: number }>) {
  return (
    <div className="mt-3 flex items-center gap-1.5 text-[var(--text-soft)]">
      <Users className="size-3.5" />
      <span className="text-xs">{capacidade} pessoas</span>
    </div>
  )
}

function MesaComandaPanel({ comanda }: Readonly<{ comanda: Comanda }>) {
  return (
    <div className="mt-3 rounded-xl border border-[rgba(251,146,60,0.18)] bg-[rgba(251,146,60,0.05)] p-3">
      <MesaComandaMetrics comanda={comanda} />
      {comanda.clienteNome ? (
        <p className="mt-1.5 truncate text-[11px] font-medium text-[var(--text-primary)]">{comanda.clienteNome}</p>
      ) : null}
      <p className="mt-1 text-sm font-bold text-[#fb923c]">{formatCurrency(calcTotal(comanda), 'BRL')}</p>
    </div>
  )
}

function MesaComandaMetrics({ comanda }: Readonly<{ comanda: Comanda }>) {
  return (
    <div className="flex items-center justify-between">
      <MesaComandaMetric icon={<ShoppingBag className="size-3.5" />} value={formatItemCountLabel(comanda)} />
      <MesaComandaMetric icon={<Clock className="size-3.5" />} value={formatElapsed(comanda.abertaEm)} />
    </div>
  )
}

function MesaComandaMetric({ icon, value }: Readonly<{ icon: ReactNode; value: string }>) {
  return (
    <div className="flex items-center gap-1.5 text-[var(--text-soft)]">
      {icon}
      <span className="text-[11px]">{value}</span>
    </div>
  )
}

function handleMesaClick({
  comanda,
  mesa,
  onClickLivre,
  onClickOcupada,
}: Pick<PdvMesaCardProps, 'comanda' | 'mesa' | 'onClickLivre' | 'onClickOcupada'>) {
  if (mesa.status === 'livre' || mesa.status === 'reservada') {
    onClickLivre(mesa)
    return
  }

  if (mesa.status === 'ocupada' && comanda) {
    onClickOcupada(comanda)
  }
}

function formatItemCountLabel(comanda: Comanda) {
  const itemCount = countComandaItems(comanda)
  return `${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`
}
