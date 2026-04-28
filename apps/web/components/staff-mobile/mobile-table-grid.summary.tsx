import type { Mesa } from '@/components/pdv/pdv-types'

// eslint-disable-next-line max-lines-per-function
export function MobileTableGridSummary({
  livres,
  mesas,
  ocupadas,
  reservadas,
  suasMesas,
}: Readonly<{
  livres: Mesa[]
  mesas: Mesa[]
  ocupadas: Mesa[]
  reservadas: Mesa[]
  suasMesas: number
}>) {
  const items = [
    { label: 'Livres', tone: '#36f57c', value: livres.length },
    { label: 'Em uso', tone: '#f87171', value: ocupadas.length - reservadas.length },
    { label: 'Reservadas', tone: '#60a5fa', value: reservadas.length },
    { label: 'Suas', tone: '#c4b5fd', value: suasMesas },
  ]

  return (
    <section className="mb-4 rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">Salão</p>
          <h1 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Mapa compartilhado do salão</h1>
          <p className="mt-1 text-sm leading-6 text-[var(--text-soft,#7a8896)]">
            Abra mesa livre, retome comandas em curso e veja o responsável principal antes de apoiar outro atendimento.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-[rgba(0,140,255,0.22)] bg-[rgba(0,140,255,0.1)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent,#008cff)]">
          {mesas.length} mesas
        </span>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-px overflow-hidden rounded-[18px] bg-[var(--border)]">
        {items.map((item) => (
          <div
            className="bg-[var(--surface-muted)] px-3 py-3"
            data-testid={`mesa-summary-${item.label.toLowerCase()}`}
            key={item.label}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft,#7a8896)]">
              {item.label}
            </p>
            <p className="mt-1 text-lg font-bold" style={{ color: item.tone }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
