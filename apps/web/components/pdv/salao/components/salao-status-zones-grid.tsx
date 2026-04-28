import type { ComponentProps } from 'react'
import { type Comanda, type Garcom, type MesaStatus } from '../../pdv-types'
import { SalaoStatusZone } from './salao-status-zone'

type SalaoStatusZonesGridProps = {
  allowStatusDragging: boolean
  assigningGarcomId: string | null
  comandaById: ReadonlyMap<string, Comanda>
  garcons: Garcom[]
  now: number
  onAssign: (mesaId: string, garcomId: string | undefined) => void
  onClickLivre: (mesa: Parameters<SalaoStatusZoneProps['onClickLivre']>[0]) => void
  onClickOcupada: (comanda: Parameters<SalaoStatusZoneProps['onClickOcupada']>[0]) => void
  resolveMesaComanda: SalaoStatusZoneProps['resolveMesaComanda']
  zones: {
    id: MesaStatus
    label: string
    color: string
    border: string
    bg: string
    list: SalaoStatusZoneProps['mesas']
  }[]
}

type SalaoStatusZoneProps = ComponentProps<typeof SalaoStatusZone>

export function SalaoStatusZonesGrid({
  allowStatusDragging,
  assigningGarcomId,
  comandaById,
  garcons,
  now,
  onAssign,
  onClickLivre,
  onClickOcupada,
  resolveMesaComanda,
  zones,
}: Readonly<SalaoStatusZonesGridProps>) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {zones.map((zone) => (
        <SalaoStatusZone
          allowStatusDragging={allowStatusDragging}
          assigningGarcomId={assigningGarcomId}
          background={zone.bg}
          border={zone.border}
          color={zone.color}
          comandaById={comandaById}
          garcons={garcons}
          key={zone.id}
          label={zone.label}
          mesas={zone.list}
          now={now}
          resolveMesaComanda={resolveMesaComanda}
          status={zone.id}
          onAssign={onAssign}
          onClickLivre={onClickLivre}
          onClickOcupada={onClickOcupada}
        />
      ))}
    </div>
  )
}
