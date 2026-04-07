import { memo } from 'react'
import type { MesaRecord } from '@contracts/contracts'
import { getStatusColor } from '@/lib/design-tokens'

interface MesaFloorCardProps {
  mesa: MesaRecord
  isDragging: boolean
}

export const MesaFloorCard = memo(function MesaFloorCard({ mesa, isDragging }: MesaFloorCardProps) {
  const statusColor = getStatusColor(mesa.status).solid

  return (
    <div
      className="imperial-card-soft flex h-full w-full flex-col justify-between rounded-xl p-2.5"
      style={{
        boxShadow: isDragging ? '0 12px 40px rgba(0,0,0,0.5)' : undefined,
        borderColor: isDragging ? 'var(--accent)' : undefined,
        transition: isDragging ? 'none' : 'box-shadow 0.15s',
      }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-xs font-semibold text-[var(--text-primary)]">{mesa.label}</span>
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: statusColor }} title={mesa.status} />
      </div>
      <div className="text-[10px] leading-tight text-[var(--text-soft)]">
        <span>👤 {mesa.capacity}</span>
        {mesa.section && <span className="ml-1 truncate opacity-75">· {mesa.section}</span>}
      </div>
    </div>
  )
})
