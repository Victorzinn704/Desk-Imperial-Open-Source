type HeroMetric = {
  color: string
  label: string
  value: string
}

export function OwnerQuickRegisterHero({
  categoriesCount,
  displayName,
  lowStockCount,
  productsCount,
  queuedCount,
}: Readonly<{
  categoriesCount: number
  displayName: string
  lowStockCount: number
  productsCount: number
  queuedCount: number
}>) {
  return (
    <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">
        Catálogo móvel
      </p>
      <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Cadastro direto do balcão</h2>
      <p className="mt-1 text-sm leading-6 text-[var(--text-soft,#7a8896)]">
        {displayName.split(' ')[0]}, use o EAN para evitar digitação e colocar o produto no banco em segundos.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {buildHeroMetrics(productsCount, categoriesCount, queuedCount, lowStockCount).map((metric) => (
          <HeroMetricCard key={metric.label} metric={metric} />
        ))}
      </div>
    </section>
  )
}

function HeroMetricCard({ metric }: Readonly<{ metric: HeroMetric }>) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">{metric.label}</p>
      <p className="mt-1 text-xl font-bold" style={{ color: metric.color }}>
        {metric.value}
      </p>
    </div>
  )
}

function buildHeroMetrics(productsCount: number, categoriesCount: number, queuedCount: number, lowStockCount: number) {
  return [
    { label: 'Produtos', value: String(productsCount), color: '#60a5fa' },
    { label: 'Categorias', value: String(categoriesCount), color: '#36f57c' },
    {
      label: queuedCount > 0 ? 'Fila' : 'Alerta',
      value: String(queuedCount > 0 ? queuedCount : lowStockCount),
      color: resolveAlertColor(queuedCount, lowStockCount),
    },
  ]
}

function resolveAlertColor(queuedCount: number, lowStockCount: number) {
  if (queuedCount > 0) {
    return '#fbbf24'
  }
  return lowStockCount > 0 ? '#f59e0b' : '#8b98a7'
}
