import { Plus } from 'lucide-react'
import type { Mesa } from '@/components/pdv/pdv-types'
import {
  MOBILE_TABLE_STATUS_COLOR,
  MOBILE_TABLE_STATUS_LABEL,
  resolveComandaPreview,
  resolveResponsibilityLabel,
  resolveWaiterColor,
} from './mobile-table-grid.helpers'

export function MobileFreeTablesSection({
  livres,
  onSelectMesa,
}: Readonly<{
  livres: Mesa[]
  onSelectMesa: (mesa: Mesa) => void
}>) {
  if (livres.length === 0) {
    return null
  }

  return (
    <>
      <p className="mb-3 ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-soft,#7a8896)]">
        Mesas livres — {livres.length}
      </p>
      <div className="mb-7 grid grid-cols-2 gap-2.5 min-[420px]:grid-cols-3 min-[420px]:gap-3">
        {livres.map((mesa) => (
          <FreeMesaCard key={mesa.id} mesa={mesa} onSelectMesa={onSelectMesa} />
        ))}
      </div>
    </>
  )
}

function FreeMesaCard({
  mesa,
  onSelectMesa,
}: Readonly<{
  mesa: Mesa
  onSelectMesa: (mesa: Mesa) => void
}>) {
  return (
    <button
      className="group relative flex min-h-[104px] flex-col items-start justify-between overflow-hidden rounded-[18px] border px-3 py-3 text-left transition-all active:scale-95 min-[420px]:min-h-[108px]"
      data-testid={`mobile-mesa-${mesa.id}`}
      style={{
        borderColor: 'rgba(54,245,124,0.3)',
        backgroundColor: 'rgba(54,245,124,0.06)',
        WebkitTapHighlightColor: 'transparent',
      }}
      type="button"
      onClick={() => onSelectMesa(mesa)}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-[rgba(54,245,124,0.25)]" />
      <div className="relative z-10">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#36f57c] opacity-90">Mesa livre</span>
        <div className="mt-1 flex items-end gap-2">
          <span className="text-[26px] font-extrabold tracking-tighter text-[#36f57c] min-[420px]:text-[28px]">
            {mesa.numero}
          </span>
          <span className="pb-1 text-[10px] font-medium text-[var(--text-soft,#7a8896)]">
            {mesa.capacidade} lugares
          </span>
        </div>
        <p className="mt-1 text-[10px] text-[var(--text-soft,#7a8896)]">Pronta para abrir atendimento agora.</p>
      </div>
      <div className="relative z-10">
        <span className="inline-flex items-center rounded-full border border-[rgba(54,245,124,0.28)] bg-[rgba(54,245,124,0.12)] px-2.5 py-1 text-[10px] font-semibold text-[#36f57c]">
          Abrir comanda
        </span>
      </div>
    </button>
  )
}

export function MobileActiveTablesSection({
  currentEmployeeId,
  ocupadas,
  onSelectMesa,
}: Readonly<{
  currentEmployeeId?: string | null
  ocupadas: Mesa[]
  onSelectMesa: (mesa: Mesa) => void
}>) {
  if (ocupadas.length === 0) {
    return null
  }

  return (
    <>
      <p className="mb-3 ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-soft,#7a8896)]">
        Mesas em atendimento — {ocupadas.length}
      </p>
      <div className="grid grid-cols-2 gap-2.5 min-[420px]:grid-cols-3 min-[420px]:gap-3">
        {ocupadas.map((mesa) => (
          <ActiveMesaCard currentEmployeeId={currentEmployeeId} key={mesa.id} mesa={mesa} onSelectMesa={onSelectMesa} />
        ))}
      </div>
    </>
  )
}

function ActiveMesaCard({
  currentEmployeeId,
  mesa,
  onSelectMesa,
}: Readonly<{
  currentEmployeeId?: string | null
  mesa: Mesa
  onSelectMesa: (mesa: Mesa) => void
}>) {
  const isOcupada = mesa.status === 'ocupada'
  const color = MOBILE_TABLE_STATUS_COLOR[mesa.status]
  const waiterName = mesa.garcomNome
  const waiterColor = resolveWaiterColor(waiterName)

  return (
    <button
      className="relative flex min-h-[116px] flex-col items-start justify-between overflow-hidden rounded-[18px] border px-3 py-3 text-left transition-all active:scale-95 min-[420px]:min-h-[120px]"
      data-testid={`mobile-mesa-${mesa.id}`}
      style={{
        borderColor: isOcupada ? 'rgba(248,113,113,0.45)' : `${color}44`,
        backgroundColor: isOcupada ? 'rgba(248,113,113,0.1)' : `${color}08`,
        WebkitTapHighlightColor: 'transparent',
      }}
      type="button"
      onClick={() => onSelectMesa(mesa)}
    >
      <ActiveMesaCardHeader color={color} isOcupada={isOcupada} mesa={mesa} />
      <ActiveMesaCardFooter
        currentEmployeeId={currentEmployeeId}
        isOcupada={isOcupada}
        mesa={mesa}
        waiterColor={waiterColor}
        waiterName={waiterName}
      />
    </button>
  )
}

function ActiveMesaCardHeader({
  color,
  isOcupada,
  mesa,
}: Readonly<{
  color: string
  isOcupada: boolean
  mesa: Mesa
}>) {
  return (
    <div className="relative z-10">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color }}>
        {isOcupada ? 'Mesa ocupada' : 'Mesa reservada'}
      </span>
      <div className="mt-1 flex items-end gap-2">
        <span className="text-[26px] font-extrabold tracking-tighter min-[420px]:text-[28px]" style={{ color }}>
          {mesa.numero}
        </span>
        {!isOcupada ? (
          <span className="pb-1 text-[10px] font-medium text-[var(--text-soft,#7a8896)]">
            {mesa.capacidade} lugares
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-[10px] text-[var(--text-soft,#7a8896)]">
        {isOcupada ? resolveComandaPreview(mesa.comandaId) : 'Reserva aguardando atendimento'}
      </p>
    </div>
  )
}

function ActiveMesaCardFooter({
  currentEmployeeId,
  isOcupada,
  mesa,
  waiterColor,
  waiterName,
}: Readonly<{
  currentEmployeeId?: string | null
  isOcupada: boolean
  mesa: Mesa
  waiterColor?: string
  waiterName?: string | null
}>) {
  const color = MOBILE_TABLE_STATUS_COLOR[mesa.status]

  return (
    <div className="relative z-10 flex w-full max-w-full flex-col items-start gap-1.5">
      <StatusPill color={color} status={mesa.status} />
      {isOcupada && waiterName ? <WaiterChip waiterColor={waiterColor} waiterName={waiterName} /> : null}
      {isOcupada ? (
        <ResponsibilityPill
          currentEmployeeId={currentEmployeeId}
          garcomId={mesa.garcomId}
          garcomNome={mesa.garcomNome}
        />
      ) : null}
      {isOcupada && mesa.comandaId && !waiterName ? <ItensHint /> : null}
      <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-primary)]">
        {isOcupada ? 'Retomar comanda' : 'Abrir reserva'}
      </span>
    </div>
  )
}

function StatusPill({
  color,
  status,
}: Readonly<{
  color: string
  status: Mesa['status']
}>) {
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.15em] whitespace-nowrap"
      style={{ color, backgroundColor: `${color}15`, borderColor: `${color}30` }}
    >
      {MOBILE_TABLE_STATUS_LABEL[status]}
    </span>
  )
}

function ResponsibilityPill({
  currentEmployeeId,
  garcomId,
  garcomNome,
}: Readonly<{
  currentEmployeeId?: string | null
  garcomId?: string | null
  garcomNome?: string | null
}>) {
  return (
    <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[9px] font-semibold text-[var(--text-soft)]">
      {resolveResponsibilityLabel({ currentEmployeeId, garcomId, garcomNome })}
    </span>
  )
}

function ItensHint() {
  return (
    <span className="flex items-center gap-0.5 text-[9px] font-semibold tracking-wide text-[var(--accent,#008cff)]">
      <Plus className="size-2.5" strokeWidth={3} />
      ITENS
    </span>
  )
}

function WaiterChip({
  waiterColor,
  waiterName,
}: Readonly<{
  waiterColor?: string
  waiterName: string
}>) {
  return (
    <div className="flex max-w-full items-center gap-1">
      <span
        className="flex size-4 shrink-0 items-center justify-center rounded-full text-[7px] font-bold text-black"
        style={{ backgroundColor: waiterColor }}
      >
        {waiterName.charAt(0).toUpperCase()}
      </span>
      <span className="max-w-[92px] truncate text-[9px] font-semibold text-[var(--text-primary)]/80">
        {waiterName.split(' ')[0]}
      </span>
    </div>
  )
}
