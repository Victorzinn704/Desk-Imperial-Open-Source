import { memo } from 'react'
import { Armchair, Clock } from 'lucide-react'
import { calcTotal, formatElapsed, type Mesa, type Comanda } from '@/components/pdv/pdv-types'
import { fmtBRL } from '../constants'
import { STATUS_COLORS, GARCOM_COLORS, type StatusKey } from '@/lib/design-tokens'

interface ModernOperacionalCardProps {
  mesa: Mesa
  comanda: Comanda | undefined
  garcomName: string | undefined
  urgency: 0 | 1 | 2 | 3
}

export const ModernOperacionalCard = memo(function ModernOperacionalCard({
  mesa,
  comanda,
  garcomName,
  urgency,
}: ModernOperacionalCardProps) {
  const cfg = STATUS_COLORS[mesa.status as StatusKey] ?? STATUS_COLORS.fechada
  const statusLabel = mesa.status === 'livre' ? 'Livre' : mesa.status === 'ocupada' ? 'Ocupada' : 'Reservada'

  const isCritical = urgency >= 3
  const isWarning = urgency === 2

  let dynamicBorder: string = cfg.border
  let dynamicShadow = '0 4px 20px rgba(0,0,0,0.2)'
  let pulseClass = ''

  if (mesa.status === 'ocupada') {
    if (isCritical) {
      dynamicBorder = STATUS_COLORS.ocupada.border
      dynamicShadow = `0 0 30px ${STATUS_COLORS.ocupada.solid}26`
      pulseClass = 'animate-pulse'
    } else if (isWarning) {
      dynamicBorder = 'rgba(251,191,36,0.4)'
      dynamicShadow = '0 0 20px rgba(251,191,36,0.1)'
    }
  }

  const total = comanda ? calcTotal(comanda) : 0
  const itemCount = comanda ? comanda.itens.reduce((s, i) => s + i.quantidade, 0) : 0
  const elapsed = comanda ? formatElapsed(comanda.abertaEm) : null

  const shortGarcom = garcomName ? garcomName.split(' ')[0] : 'S/ Garçom'
  const garcomInitials = garcomName ? garcomName.substring(0, 2).toUpperCase() : '?'

  const colorIndex = garcomName ? garcomName.charCodeAt(0) % GARCOM_COLORS.length : 0
  const garcomColor = garcomName ? GARCOM_COLORS[colorIndex] : '#7a8896'

  return (
    <div
      className="group relative flex h-full min-h-[140px] flex-col overflow-hidden rounded-[24px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] transition-all duration-500 hover:-translate-y-1 hover:border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.04)]"
      style={{
        boxShadow: dynamicShadow,
        borderColor: dynamicBorder,
      }}
    >
      {/* Background Status Glow */}
      <div
        className="absolute inset-0 opacity-40 mix-blend-screen transition-opacity duration-1000 group-hover:opacity-60"
        style={{
          background: `radial-gradient(120% 100% at 50% 0%, ${cfg.softBg} 0%, ${cfg.bg} 50%, transparent 100%)`,
        }}
      />

      {/* Critical Glow Effect */}
      {isCritical && (
        <div className="absolute inset-x-0 top-0 h-1 bg-red-400 bg-opacity-80 drop-shadow-[0_0_8px_rgba(248,113,113,1)]" />
      )}

      {/* Inner Content */}
      <div className="relative flex flex-1 flex-col p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 items-center rounded-full px-2.5 text-[9px] font-bold uppercase tracking-widest ${pulseClass}`}
              style={{ color: cfg.solid, backgroundColor: `${cfg.solid}15`, border: `1px solid ${cfg.solid}30` }}
            >
              {statusLabel}
            </span>
          </div>
          {/* Waiter Avatar ("Monitoring TV") */}
          {mesa.status === 'ocupada' && garcomName && (
            <div className="flex shrink-0 flex-col items-center justify-center animate-in zoom-in-50 duration-500">
              <div
                className="flex size-11 items-center justify-center rounded-full text-[15px] font-black shadow-lg border-[2px]"
                style={{
                  backgroundColor: garcomColor,
                  color: '#111',
                  borderColor: 'rgba(255,255,255,0.2)',
                  textShadow: '0 1px 1px rgba(255,255,255,0.5)',
                  boxShadow: `0 0 20px ${garcomColor}66`,
                }}
              >
                {garcomInitials}
              </div>
              <span className="mt-1.5 text-[10px] font-bold text-[var(--text-primary)] tracking-wide drop-shadow-md">
                {shortGarcom}
              </span>
            </div>
          )}
        </div>

        {/* Mesa Label - Big & Bold */}
        <div className="mt-3 flex-1">
          <h4 className="text-xl font-black tracking-tight text-[var(--text-primary)] drop-shadow-sm">{mesa.numero}</h4>
          {comanda?.clienteNome && (
            <p className="mt-1 truncate text-xs font-medium text-[var(--text-soft)]" title={comanda.clienteNome}>
              {comanda.clienteNome}
            </p>
          )}
        </div>

        {/* Footer Data */}
        {comanda ? (
          <div className="mt-4 flex items-end justify-between border-t border-[rgba(255,255,255,0.05)] pt-3">
            <div className="flex flex-col gap-1.5">
              <div
                className="flex items-center gap-1.5 text-[11px] font-semibold"
                style={{
                  color: isCritical
                    ? STATUS_COLORS.ocupada.solid
                    : isWarning
                      ? '#fbbf24'
                      : STATUS_COLORS.emPreparo.solid,
                }}
              >
                <Clock className="size-3.5" />
                <span>{elapsed}</span>
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                {itemCount} {itemCount === 1 ? 'item' : 'itens'}
              </span>
            </div>

            <div className="text-right">
              <span className="flex items-baseline justify-end text-lg font-black tracking-tight text-[var(--text-primary)] drop-shadow-[0_2px_10px_rgba(255,255,255,0.15)]">
                {fmtBRL(total)}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between border-t border-[rgba(255,255,255,0.05)] pt-3 opacity-60">
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
              <Armchair className="size-3.5" />
              <span>{mesa.capacidade} lugares</span>
            </div>
            {mesa.status === 'reservada' && (
              <span
                className="text-[10px] font-medium uppercase tracking-widest"
                style={{ color: STATUS_COLORS.reservada.solid }}
              >
                Reservado
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
})
