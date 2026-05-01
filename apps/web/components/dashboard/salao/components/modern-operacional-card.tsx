import { memo } from 'react'
import { Armchair, ArrowUpRight, Receipt, UserRound } from 'lucide-react'
import { calcTotal, type Comanda, formatElapsed, type Mesa } from '@/components/pdv/pdv-types'
import { fmtBRL } from '../constants'
import { getMesaStatusMeta, getSalaoToneStyle, getUrgencyTone } from '../theme'

interface ModernOperacionalCardProps {
  mesa: Mesa
  comanda: Comanda | undefined
  garcomName: string | undefined
  urgency: 0 | 1 | 2 | 3
  onClick?: () => void
}

function getWaiterLabel(name: string | undefined) {
  if (!name) {
    return 'Sem garcom'
  }

  return name.split(' ').slice(0, 2).join(' ')
}

export const ModernOperacionalCard = memo(function ModernOperacionalCard({
  mesa,
  comanda,
  garcomName,
  urgency,
  onClick,
}: ModernOperacionalCardProps) {
  const statusMeta = getMesaStatusMeta(mesa.status)
  const statusStyle = getSalaoToneStyle(statusMeta.tone)
  const urgencyTone = getUrgencyTone(urgency)
  const urgencyStyle = getSalaoToneStyle(urgencyTone)
  const total = comanda ? calcTotal(comanda) : 0
  const itemCount = comanda ? comanda.itens.reduce((sum, item) => sum + item.quantidade, 0) : 0
  const elapsed = comanda ? formatElapsed(comanda.abertaEm) : null
  const waiterLabel = getWaiterLabel(garcomName)
  const clientLabel =
    comanda?.clienteNome?.trim() ||
    (mesa.status === 'reservada' ? 'Reserva aguardando chegada' : 'Pronta para abrir nova comanda')
  const isInteractive = typeof onClick === 'function'

  return (
    <div
      className={`group flex h-full min-h-[208px] flex-col rounded-[24px] border bg-[var(--surface)] p-4 shadow-[var(--shadow-panel)] transition-colors ${
        isInteractive
          ? 'cursor-pointer hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]'
          : ''
      }`}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      style={{
        borderColor: urgencyTone === 'neutral' ? 'var(--border)' : urgencyStyle.borderColor,
      }}
      onClick={onClick}
      onKeyDown={
        isInteractive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-3">
          <span
            className="inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={statusStyle}
          >
            {statusMeta.label}
          </span>
          <div className="min-w-0 space-y-1">
            <h4 className="truncate text-lg font-semibold tracking-tight text-[var(--text-primary)]">{mesa.numero}</h4>
            <p className="truncate text-sm text-[var(--text-soft)]" title={clientLabel}>
              {clientLabel}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 text-right">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
            <Armchair className="size-3.5" />
            {mesa.capacidade} lugares
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] font-medium text-[var(--text-soft)]">
            <UserRound className="size-3.5" />
            {waiterLabel}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MetricCell
          label={comanda ? 'Em aberto' : mesa.status === 'reservada' ? 'Reserva' : 'Disponivel'}
          tone={comanda ? statusMeta.tone : mesa.status === 'reservada' ? 'warning' : 'success'}
          value={comanda ? fmtBRL(total) : mesa.status === 'reservada' ? 'Mesa guardada' : 'Liberada agora'}
        />
        <MetricCell
          label={comanda ? 'Tempo' : 'Leitura'}
          tone={urgencyTone}
          value={comanda && elapsed ? elapsed : mesa.status === 'ocupada' ? 'Sem horario' : 'Sem pressao'}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <MetricCell
          label="Itens"
          tone={comanda ? 'accent' : 'neutral'}
          value={comanda ? `${itemCount} ${itemCount === 1 ? 'item' : 'itens'}` : 'Nenhum item'}
        />
        <MetricCell
          label="Fluxo"
          tone={mesa.status === 'ocupada' ? 'danger' : mesa.status === 'reservada' ? 'warning' : 'success'}
          value={
            mesa.status === 'ocupada'
              ? 'Atendimento em curso'
              : mesa.status === 'reservada'
                ? 'Chegada prevista'
                : 'Pronta para giro'
          }
        />
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-3">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Receipt className="size-3.5" />
          <span>{comanda ? `Comanda ${comanda.id.slice(0, 8)}` : 'Sem comanda vinculada'}</span>
        </div>
        {isInteractive ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">
            Abrir PDV
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        ) : null}
      </div>
    </div>
  )
})

const MetricCell = memo(function MetricCell({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'neutral' | 'accent' | 'success' | 'warning' | 'danger'
}) {
  const style = getSalaoToneStyle(tone)

  return (
    <div className="rounded-2xl border px-3 py-2.5" style={style}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-5 text-[var(--text-primary)]">{value}</p>
    </div>
  )
})
