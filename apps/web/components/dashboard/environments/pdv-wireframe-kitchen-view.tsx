import type { KitchenTicket } from './pdv-wireframe-environment.types'
import { compressMesaLabel } from './pdv-wireframe-environment.helpers'

export function PdvKitchenView({
  isLoading,
  tickets,
}: Readonly<{
  isLoading: boolean
  tickets: KitchenTicket[]
}>) {
  if (isLoading) {
    return <PdvKitchenLoadingGrid />
  }
  if (tickets.length === 0) {
    return <PdvKitchenEmptyState />
  }
  return (
    <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {tickets.map((ticket) => (
        <KitchenTicketCard key={ticket.id} ticket={ticket} />
      ))}
    </section>
  )
}

function PdvKitchenLoadingGrid() {
  return (
    <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="imperial-card p-5" key={index}>
          <div className="skeleton-shimmer h-48 rounded-[8px]" />
        </div>
      ))}
    </section>
  )
}

function KitchenTicketCard({ ticket }: Readonly<{ ticket: KitchenTicket }>) {
  const overdue = ticket.elapsedMinutes > 30
  const elapsedClass = resolveKitchenElapsedClass(ticket.elapsedMinutes, overdue)

  return (
    <article className={`imperial-card p-4 ${resolveKitchenToneClass(ticket.status, overdue)}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-['Architects_Daughter','Patrick_Hand',sans-serif] text-[1.45rem] font-semibold leading-none text-[var(--text-primary)]">
            {compressMesaLabel(ticket.mesaLabel)}
          </h3>
          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {ticket.code} · {ticket.employeeName}
          </p>
        </div>
        <span className={`text-[13px] font-semibold ${elapsedClass}`}>{ticket.elapsedMinutes}min</span>
      </div>
      <div className="mt-3 border-t border-dashed border-[var(--border)] pt-2">
        {ticket.items.map((item) => (
          <div className="border-b border-dotted border-[var(--border)] py-2 last:border-b-0" key={item.itemId}>
            <div className="flex gap-2 text-sm">
              <span className="font-semibold text-[var(--accent-strong)]">{item.quantity}x</span>
              <span className="text-[var(--text-primary)]">{item.productName}</span>
            </div>
            {item.notes ? <p className="pl-6 text-[12px] italic text-[var(--text-soft)]">↳ {item.notes}</p> : null}
          </div>
        ))}
      </div>
      <button className={resolveKitchenActionClass(ticket.status)} type="button">
        {ticket.status === 'ready' ? 'entregar' : 'marcar pronto'}
      </button>
    </article>
  )
}

function PdvKitchenEmptyState() {
  return (
    <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      <div className="rounded-[8px] border border-dashed border-[var(--border)] px-4 py-10 text-center text-sm text-[var(--text-soft)] md:col-span-2 2xl:col-span-4">
        Sem tickets ativos na cozinha.
      </div>
    </section>
  )
}

function resolveKitchenToneClass(status: KitchenTicket['status'], overdue: boolean) {
  if (status === 'ready') {
    return 'bg-[color-mix(in_srgb,var(--success)_10%,var(--surface))]'
  }
  if (overdue) {
    return 'bg-[color-mix(in_srgb,var(--danger)_7%,var(--surface))]'
  }
  return 'bg-[color-mix(in_srgb,var(--surface)_96%,transparent)]'
}

function resolveKitchenActionClass(status: KitchenTicket['status']) {
  const baseClass = 'mt-4 w-full rounded-[8px] border px-3 py-2 text-sm font-semibold'
  return status === 'ready'
    ? `${baseClass} border-[color-mix(in_srgb,var(--success)_30%,var(--paper))] bg-[var(--success)] text-[var(--paper)]`
    : `${baseClass} border-[var(--border-strong)] bg-[var(--text-primary)] text-[var(--paper)]`
}

function resolveKitchenElapsedClass(elapsedMinutes: number, overdue: boolean) {
  if (overdue) {
    return 'text-[var(--danger)]'
  }
  if (elapsedMinutes > 20) {
    return 'text-[var(--warning)]'
  }
  return 'text-[var(--text-soft)]'
}
