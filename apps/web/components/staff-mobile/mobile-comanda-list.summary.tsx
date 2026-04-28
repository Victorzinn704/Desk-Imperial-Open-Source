import { Plus } from 'lucide-react'
import type { MobileComandaListProps } from './mobile-comanda-list.types'

type MobileComandaListSummaryProps = Pick<MobileComandaListProps, 'isBusy' | 'onNewComanda' | 'summary'> & {
  activeCount: number
}

export function MobileComandaListSummary({
  activeCount,
  isBusy = false,
  onNewComanda,
  summary,
}: Readonly<MobileComandaListSummaryProps>) {
  return (
    <>
      <SummaryHeaderPanel activeCount={activeCount} summary={summary} />
      <SummaryToolbar activeCount={activeCount} isBusy={isBusy} onNewComanda={onNewComanda} />
    </>
  )
}

function SummaryHeaderPanel({
  activeCount,
  summary,
}: Readonly<{
  activeCount: number
  summary: MobileComandaListSummaryProps['summary']
}>) {
  const items = buildSummaryItems(activeCount, summary)

  return (
    <section className="mb-4 rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">
            Comandas do salão
          </p>
          <h1 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Operação aberta do turno</h1>
          <p className="mt-1 text-sm leading-6 text-[var(--text-soft,#7a8896)]">
            Retome, avance status e feche comandas abertas do salão, com responsável principal visível em cada mesa.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-[rgba(0,140,255,0.22)] bg-[rgba(0,140,255,0.1)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent,#008cff)]">
          {activeCount} ativas
        </span>
      </div>
      <SummaryStatGrid items={items} />
    </section>
  )
}

function SummaryStatGrid({
  items,
}: Readonly<{
  items: Array<{ hint: string; label: string; tone: string; value: number }>
}>) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-[18px] bg-[var(--border)]">
      {items.map((item) => (
        <div
          className="bg-[var(--surface-muted)] px-3 py-3"
          data-testid={`summary-card-${item.label.toLowerCase().replaceAll(' ', '-')}`}
          key={item.label}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft,#7a8896)]">
            {item.label}
          </p>
          <p className="mt-2 text-lg font-semibold" style={{ color: item.tone }}>
            {item.value}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-[var(--text-soft,#7a8896)]">{item.hint}</p>
        </div>
      ))}
    </div>
  )
}

function SummaryToolbar({
  activeCount,
  isBusy,
  onNewComanda,
}: Readonly<{
  activeCount: number
  isBusy: boolean
  onNewComanda?: () => void
}>) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
        Em curso — {activeCount}
      </p>
      <InlineNewComandaButton isBusy={isBusy} onNewComanda={onNewComanda} />
    </div>
  )
}

function buildSummaryItems(activeCount: number, summary: MobileComandaListSummaryProps['summary']) {
  return [
    { hint: 'em curso agora', label: 'Ativas', tone: '#60a5fa', value: summary?.activeCount ?? activeCount },
    { hint: 'pedidos correndo', label: 'Em preparo', tone: '#fb923c', value: summary?.preparingCount ?? 0 },
    { hint: 'aguardando fechamento', label: 'Prontas', tone: '#36f57c', value: summary?.readyCount ?? 0 },
  ]
}

function InlineNewComandaButton({
  isBusy,
  onNewComanda,
}: Readonly<{
  isBusy: boolean
  onNewComanda?: () => void
}>) {
  if (!onNewComanda) {
    return null
  }

  return (
    <button
      className="flex items-center gap-1.5 rounded-xl border border-[rgba(0,140,255,0.3)] bg-[rgba(0,140,255,0.1)] px-3 py-1.5 text-xs font-semibold text-[var(--accent,#008cff)] transition-colors active:bg-[rgba(0,140,255,0.2)] disabled:opacity-50"
      disabled={isBusy}
      type="button"
      onClick={onNewComanda}
    >
      <Plus className="size-3.5" />
      Nova
    </button>
  )
}
