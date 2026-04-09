import { memo } from 'react'

interface KpiCardProps {
  label: string
  value: string | number
  color: string
  isHighlight?: boolean
  total?: number
}

export const KpiCard = memo(function KpiCard({ label, value, color, isHighlight, total }: KpiCardProps) {
  const percentage = total && typeof value === 'number' ? Math.round((value / total) * 100) : null

  return (
    <div
      className={`flex flex-1 flex-col justify-center rounded-2xl px-5 py-3 transition-colors ${isHighlight ? 'bg-[rgba(255,255,255,0.03)] shadow-inner' : 'hover:bg-[rgba(255,255,255,0.02)]'}`}
    >
      <div className="flex items-center gap-2">
        <span
          className="size-2 rounded-full shadow-[0_0_10px_currentColor]"
          style={{ backgroundColor: color, color: color }}
        />
        <p className="text-[10px] uppercase tracking-widest text-[var(--text-soft)]">{label}</p>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{value}</p>
        {percentage !== null && (
          <p className="text-xs font-medium" style={{ color: `${color}99` }}>
            {percentage}%
          </p>
        )}
      </div>
    </div>
  )
})
