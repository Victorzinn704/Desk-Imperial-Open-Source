'use client'

import { memo, useState } from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { calcTotal, type Comanda, type Garcom, type Mesa } from '../../pdv-types'
import { type SalaoView, STATUS_CONFIG, urgencyBorderColor, urgencyLevel, urgencyShadow } from '../constants'
import { MesaCardAssignmentOverlay } from './mesa-card-assignment-overlay'
import { MesaCardComandaSummary } from './mesa-card-comanda-summary'
import { MesaCardHeader } from './mesa-card-header'
import { MesaCardWaiterRow } from './mesa-card-waiter-row'

export interface MesaCardProps {
  mesa: Mesa
  garcons: Garcom[]
  comanda?: Comanda
  index: number
  view: SalaoView
  now: number
  assigningGarcomId: string | null
  onAssign: (mesaId: string, garcomId: string | undefined) => void
  onClickLivre: (m: Mesa) => void
  onClickOcupada: (c: Comanda) => void
  dragDisabled?: boolean
}

export const MesaCard = memo(
  // eslint-disable-next-line max-lines-per-function
  function MesaCard({
    mesa,
    garcons,
    comanda,
    index,
    view,
    now,
    assigningGarcomId,
    onAssign,
    onClickLivre,
    onClickOcupada,
    dragDisabled = false,
  }: MesaCardProps) {
    const [showGarcomSel, setShowGarcomSel] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const cfg = STATUS_CONFIG[mesa.status]
    const garcom = garcons.find((g) => g.id === mesa.garcomId)
    const nextGarcom = garcons.find((g) => g.id === assigningGarcomId)
    const urgency = urgencyLevel(mesa, comanda, now)
    const total = comanda ? calcTotal(comanda) : 0
    const isAssignTarget = assigningGarcomId !== null
    const borderColor = resolveMesaBorderColor(cfg.border, isAssignTarget, urgency)
    const shadow = isAssignTarget ? '0 0 18px rgba(52,242,127,0.22)' : urgencyShadow(urgency)

    const closeGarcomSelector = () => setShowGarcomSel(false)
    const toggleGarcomSelector = () => setShowGarcomSel((visible) => !visible)
    const requestGarcomReplacement = () => setShowConfirm(true)
    const cancelGarcomReplacement = () => setShowConfirm(false)
    const confirmGarcomReplacement = () => confirmMesaAssignment(assigningGarcomId, mesa.id, onAssign, setShowConfirm)
    const handleClick = () =>
      runMesaCardClick({
        assigningGarcomId,
        comanda,
        isAssignTarget,
        mesa,
        onAssign,
        onCancelConfirm: cancelGarcomReplacement,
        onClickLivre,
        onClickOcupada,
        onCloseGarcomSelector: closeGarcomSelector,
        onRequestConfirm: requestGarcomReplacement,
        showConfirm,
        showGarcomSel,
      })

    const card = (
      <MesaCardSurface
        assigningGarcomId={assigningGarcomId}
        borderColor={borderColor}
        cfg={cfg}
        comanda={comanda}
        garcom={garcom}
        garcons={garcons}
        handleClick={handleClick}
        isAssignTarget={isAssignTarget}
        mesa={mesa}
        nextGarcom={nextGarcom}
        shadow={shadow}
        showConfirm={showConfirm}
        showGarcomSel={showGarcomSel}
        total={total}
        urgency={urgency}
        onAssign={onAssign}
        onCancelConfirm={cancelGarcomReplacement}
        onConfirm={confirmGarcomReplacement}
        onRequestConfirm={requestGarcomReplacement}
        onToggleSelector={showGarcomSel ? closeGarcomSelector : toggleGarcomSelector}
      />
    )

    if (view === 'equipe') {
      return card
    }

    return (
      <Draggable draggableId={mesa.id} index={index} isDragDisabled={dragDisabled}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={{ ...provided.draggableProps.style, opacity: snapshot.isDragging ? 0.85 : 1 }}
          >
            {card}
          </div>
        )}
      </Draggable>
    )
  },
  (prev, next) => {
    return (
      prev.mesa.id === next.mesa.id &&
      prev.mesa.status === next.mesa.status &&
      prev.mesa.garcomId === next.mesa.garcomId &&
      prev.comanda?.id === next.comanda?.id &&
      prev.assigningGarcomId === next.assigningGarcomId &&
      prev.now === next.now &&
      prev.dragDisabled === next.dragDisabled &&
      prev.view === next.view
    )
  },
)

function resolveMesaBorderColor(baseBorder: string, isAssignTarget: boolean, urgency: 0 | 1 | 2 | 3) {
  if (isAssignTarget) {
    return 'rgba(52,242,127,0.65)'
  }

  if (urgency > 0) {
    return urgencyBorderColor(urgency)
  }

  return baseBorder
}

function confirmMesaAssignment(
  assigningGarcomId: string | null,
  mesaId: string,
  onAssign: (mesaId: string, garcomId: string | undefined) => void,
  setShowConfirm: (visible: boolean) => void,
) {
  if (!assigningGarcomId) {
    return
  }

  onAssign(mesaId, assigningGarcomId)
  setShowConfirm(false)
}

function runMesaCardClick({
  assigningGarcomId,
  comanda,
  isAssignTarget,
  mesa,
  onAssign,
  onCancelConfirm,
  onClickLivre,
  onClickOcupada,
  onCloseGarcomSelector,
  onRequestConfirm,
  showConfirm,
  showGarcomSel,
}: Readonly<{
  assigningGarcomId: string | null
  comanda?: Comanda
  isAssignTarget: boolean
  mesa: Mesa
  onAssign: (mesaId: string, garcomId: string | undefined) => void
  onCancelConfirm: () => void
  onClickLivre: (mesa: Mesa) => void
  onClickOcupada: (comanda: Comanda) => void
  onCloseGarcomSelector: () => void
  onRequestConfirm: () => void
  showConfirm: boolean
  showGarcomSel: boolean
}>) {
  if (showGarcomSel) {
    onCloseGarcomSelector()
    return
  }

  if (showConfirm) {
    onCancelConfirm()
    return
  }

  if (handleMesaAssignmentClick(assigningGarcomId, isAssignTarget, mesa, onAssign, onRequestConfirm)) {
    return
  }

  if (mesa.status === 'ocupada' && comanda) {
    onClickOcupada(comanda)
    return
  }

  onClickLivre(mesa)
}

function handleMesaAssignmentClick(
  assigningGarcomId: string | null,
  isAssignTarget: boolean,
  mesa: Mesa,
  onAssign: (mesaId: string, garcomId: string | undefined) => void,
  onRequestConfirm: () => void,
) {
  if (!isAssignTarget || !assigningGarcomId) {
    return false
  }

  if (mesa.garcomId && mesa.garcomId !== assigningGarcomId) {
    onRequestConfirm()
    return true
  }

  onAssign(mesa.id, assigningGarcomId)
  return true
}

// eslint-disable-next-line max-lines-per-function
function MesaCardSurface({
  assigningGarcomId,
  borderColor,
  cfg,
  comanda,
  garcom,
  garcons,
  handleClick,
  isAssignTarget,
  mesa,
  nextGarcom,
  shadow,
  showConfirm,
  showGarcomSel,
  total,
  urgency,
  onAssign,
  onCancelConfirm,
  onConfirm,
  onRequestConfirm,
  onToggleSelector,
}: Readonly<{
  assigningGarcomId: string | null
  borderColor: string
  cfg: (typeof STATUS_CONFIG)[Mesa['status']]
  comanda?: Comanda
  garcom?: Garcom
  garcons: Garcom[]
  handleClick: () => void
  isAssignTarget: boolean
  mesa: Mesa
  nextGarcom?: Garcom
  shadow?: string
  showConfirm: boolean
  showGarcomSel: boolean
  total: number
  urgency: number
  onAssign: (mesaId: string, garcomId: string | undefined) => void
  onCancelConfirm: () => void
  onConfirm: () => void
  onRequestConfirm: () => void
  onToggleSelector: () => void
}>) {
  return (
    <div
      className="group relative cursor-pointer select-none rounded-[16px] border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        background: isAssignTarget ? 'rgba(52,242,127,0.06)' : cfg.bg,
        borderColor,
        boxShadow: shadow,
        animation: urgency === 3 ? 'salao-border-pulse 1.8s ease-in-out infinite' : undefined,
      }}
    >
      <button
        aria-label={mesa.status === 'ocupada' ? `Abrir comanda da mesa ${mesa.numero}` : `Abrir mesa ${mesa.numero}`}
        className="absolute inset-0 rounded-[16px] border-0 bg-transparent p-0"
        type="button"
        onClick={handleClick}
      />

      <MesaCardHeader color={cfg.color} label={cfg.label} mesa={mesa} urgency={urgency} />
      {isAssignTarget && !showConfirm ? <MesaAssignTargetBadge /> : null}
      {showConfirm ? (
        <MesaCardAssignmentOverlay garcom={nextGarcom} onCancel={onCancelConfirm} onConfirm={onConfirm} />
      ) : null}

      <MesaCardWaiterRow
        assigningGarcomId={assigningGarcomId}
        garcom={garcom}
        garcons={garcons}
        isAssignTarget={isAssignTarget}
        mesa={mesa}
        showGarcomSel={showGarcomSel}
        onAssign={onAssign}
        onRequestConfirm={onRequestConfirm}
        onToggleSelector={onToggleSelector}
      />

      {mesa.status === 'ocupada' && comanda ? (
        <MesaCardComandaSummary color={cfg.color} comanda={comanda} total={total} urgency={urgency} />
      ) : null}
      {mesa.status === 'reservada' || mesa.status === 'livre' ? <MesaCardCallToAction /> : null}
    </div>
  )
}

function MesaAssignTargetBadge() {
  return (
    <span className="pointer-events-none absolute left-2 top-2 z-10 rounded-full bg-[rgba(52,242,127,0.18)] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-[#36f57c]">
      ✓ atribuir
    </span>
  )
}

function MesaCardCallToAction() {
  return (
    <p className="pointer-events-none relative z-10 px-3 pb-3 text-[10px] text-[var(--text-muted)]">
      Clique para abrir comanda
    </p>
  )
}
