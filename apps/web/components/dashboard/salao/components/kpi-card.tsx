import { memo } from 'react'
import { getSalaoToneStyle, type SalaoTone } from '../theme'

interface KpiCardProps {
  label: string
  value: string | number
  tone: SalaoTone
  isHighlight?: boolean
  total?: number
  hint?: string
}

export const KpiCard = memo(function KpiCard({ label, value, tone, isHighlight, total, hint }: KpiCardProps) {
  const percentage = total && typeof value === 'number' ? Math.round((value / total) * 100) : null
  const toneStyle = getSalaoToneStyle(tone)
  const toneLabel =
    tone === 'accent'
      ? 'ritmo'
      : tone === 'success'
        ? 'estavel'
        : tone === 'warning'
          ? 'atencao'
          : tone === 'danger'
            ? 'pressao'
            : 'apoio'

  return (
    <div
      className={`flex min-h-[128px] flex-1 flex-col justify-between rounded-2xl border px-4 py-4 transition-colors ${
        isHighlight
          ? 'border-[var(--border-strong)] bg-[var(--surface-soft)]'
          : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
        <span
          className="inline-flex min-w-[72px] justify-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={toneStyle}
        >
          {toneLabel}
        </span>
      </div>
      <div className="space-y-1.5">
        <p className="text-2xl font-semibold tabular-nums tracking-tight text-[var(--text-primary)]">{value}</p>
        {hint ? <p className="text-xs leading-5 text-[var(--text-soft)]">{hint}</p> : null}
      </div>
      <div className="flex items-center justify-between gap-2">
        {percentage !== null && <p className="text-xs font-medium text-[var(--text-soft)]">{percentage}% do total</p>}
        {isHighlight ? <p className="text-xs font-medium text-[var(--text-soft)]">leitura principal</p> : null}
      </div>
    </div>
  )
})
