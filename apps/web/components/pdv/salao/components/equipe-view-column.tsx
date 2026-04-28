'use client'

import { AlertCircle, X } from 'lucide-react'
import { calcTotal, type Comanda, type Garcom, type Mesa } from '../../pdv-types'
import { formatCurrency } from '@/lib/currency'
import { garcomCor, initials } from '../constants'
import { MesaCard } from './mesa-card'

type SharedEquipeColumnProps = {
  assigningGarcomId: string | null
  comandaById: ReadonlyMap<string, Comanda>
  garcons: Garcom[]
  now: number
  onAssign: (mesaId: string, garcomId: string | undefined) => void
  onClickLivre: (mesa: Mesa) => void
  onClickOcupada: (comanda: Comanda) => void
  resolveMesaComanda: (mesa: Mesa, comandaById: ReadonlyMap<string, Comanda>) => Comanda | undefined
}

type SemGarcomColumnProps = SharedEquipeColumnProps & {
  mesas: Mesa[]
}

export function SemGarcomColumn({
  assigningGarcomId,
  comandaById,
  garcons,
  mesas,
  now,
  onAssign,
  onClickLivre,
  onClickOcupada,
  resolveMesaComanda,
}: Readonly<SemGarcomColumnProps>) {
  if (mesas.length === 0) {
    return null
  }

  return (
    <div
      className="flex flex-shrink-0 flex-col rounded-2xl border"
      style={{ width: 200, borderColor: 'rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.02)' }}
    >
      <div className="flex items-center gap-2 border-b border-[rgba(251,191,36,0.15)] px-3 py-3">
        <AlertCircle className="size-3.5 text-[#fbbf24]" />
        <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#fbbf24]">Sem garçom</span>
        <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-[rgba(251,191,36,0.15)] text-[10px] font-bold text-[#fbbf24]">
          {mesas.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        {mesas.map((mesa) => (
          <MesaCard
            assigningGarcomId={assigningGarcomId}
            comanda={resolveMesaComanda(mesa, comandaById)}
            garcons={garcons}
            index={0}
            key={mesa.id}
            mesa={mesa}
            now={now}
            view="equipe"
            onAssign={onAssign}
            onClickLivre={onClickLivre}
            onClickOcupada={onClickOcupada}
          />
        ))}
      </div>
    </div>
  )
}

type GarcomColumnProps = SharedEquipeColumnProps & {
  allowRosterEditing: boolean
  garcom: Garcom
  mesas: Mesa[]
  onRemoveGarcom: (id: string) => void
}

export function GarcomColumn({
  allowRosterEditing,
  assigningGarcomId,
  comandaById,
  garcom,
  garcons,
  mesas,
  now,
  onAssign,
  onClickLivre,
  onClickOcupada,
  onRemoveGarcom,
  resolveMesaComanda,
}: Readonly<GarcomColumnProps>) {
  const cor = garcomCor(garcom, garcons)
  const totalAtivo = mesas.reduce((sum, mesa) => {
    const comanda = resolveMesaComanda(mesa, comandaById)
    return sum + (comanda ? calcTotal(comanda) : 0)
  }, 0)

  return (
    <div
      className="flex flex-shrink-0 flex-col rounded-2xl border"
      style={{ width: 210, borderColor: `${cor}25`, background: `${cor}04` }}
    >
      <GarcomColumnHeader
        allowRosterEditing={allowRosterEditing}
        cor={cor}
        garcom={garcom}
        mesasCount={mesas.length}
        totalAtivo={totalAtivo}
        onRemoveGarcom={onRemoveGarcom}
      />
      <GarcomColumnBody
        assigningGarcomId={assigningGarcomId}
        comandaById={comandaById}
        garcons={garcons}
        mesas={mesas}
        now={now}
        resolveMesaComanda={resolveMesaComanda}
        onAssign={onAssign}
        onClickLivre={onClickLivre}
        onClickOcupada={onClickOcupada}
      />
    </div>
  )
}

function GarcomColumnHeader({
  allowRosterEditing,
  cor,
  garcom,
  mesasCount,
  onRemoveGarcom,
  totalAtivo,
}: Readonly<{
  allowRosterEditing: boolean
  cor: string
  garcom: Garcom
  mesasCount: number
  onRemoveGarcom: (id: string) => void
  totalAtivo: number
}>) {
  return (
    <div
      className="relative flex flex-col items-center gap-1 border-b px-3 pb-3 pt-5"
      style={{ borderColor: `${cor}18` }}
    >
      {allowRosterEditing ? <RemoveGarcomButton garcomId={garcom.id} onRemoveGarcom={onRemoveGarcom} /> : null}
      <div
        className="flex items-center justify-center rounded-full font-bold text-black"
        style={{ width: 48, height: 48, background: cor, fontSize: 18 }}
      >
        {initials(garcom.nome)}
      </div>
      <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">{garcom.nome}</p>
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-[var(--text-muted)]">
          {mesasCount} mesa{mesasCount !== 1 ? 's' : ''}
        </span>
        {totalAtivo > 0 ? (
          <span className="text-[10px] font-semibold" style={{ color: cor }}>
            {formatCurrency(totalAtivo, 'BRL')}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function GarcomColumnBody({
  assigningGarcomId,
  comandaById,
  garcons,
  mesas,
  now,
  onAssign,
  onClickLivre,
  onClickOcupada,
  resolveMesaComanda,
}: Readonly<{
  assigningGarcomId: string | null
  comandaById: ReadonlyMap<string, Comanda>
  garcons: Garcom[]
  mesas: Mesa[]
  now: number
  onAssign: (mesaId: string, garcomId: string | undefined) => void
  onClickLivre: (mesa: Mesa) => void
  onClickOcupada: (comanda: Comanda) => void
  resolveMesaComanda: (mesa: Mesa, comandaById: ReadonlyMap<string, Comanda>) => Comanda | undefined
}>) {
  return (
    <div className="flex min-h-[160px] flex-1 flex-col gap-2 p-3">
      {mesas.length === 0 ? <p className="pt-6 text-center text-xs text-[var(--text-muted)]">Nenhuma mesa</p> : null}
      {mesas.map((mesa) => (
        <MesaCard
          assigningGarcomId={assigningGarcomId}
          comanda={resolveMesaComanda(mesa, comandaById)}
          garcons={garcons}
          index={0}
          key={mesa.id}
          mesa={mesa}
          now={now}
          view="equipe"
          onAssign={onAssign}
          onClickLivre={onClickLivre}
          onClickOcupada={onClickOcupada}
        />
      ))}
    </div>
  )
}

function RemoveGarcomButton({
  garcomId,
  onRemoveGarcom,
}: Readonly<{ garcomId: string; onRemoveGarcom: (id: string) => void }>) {
  return (
    <button
      className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full text-[var(--text-muted)] opacity-0 transition-opacity hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)] hover:opacity-100"
      title="Remover garçom"
      type="button"
      onClick={() => onRemoveGarcom(garcomId)}
    >
      <X className="size-3" />
    </button>
  )
}
