import { type PointerEvent as ReactPointerEvent, type RefObject, useCallback } from 'react'
import { Grid3X3 } from 'lucide-react'
import type { MesaRecord } from '@contracts/contracts'
import { CANVAS_H, CARD_H, CARD_W, MesaFloorCard } from './salao'

export function PlantaView({
  activeMesas,
  canvasRef,
  dragging,
  dragPosition,
  getMesaPosition,
  handlePointerDown,
  mesasLoading,
}: Readonly<{
  activeMesas: MesaRecord[]
  canvasRef: RefObject<HTMLDivElement | null>
  dragging: { mesaId: string } | null
  dragPosition: { mesaId: string; x: number; y: number } | null
  getMesaPosition: (mesa: MesaRecord, autoIndex: number) => { x: number; y: number }
  handlePointerDown: (event: ReactPointerEvent, mesa: MesaRecord, autoIndex: number) => void
  mesasLoading: boolean
}>) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <PlantaCanvas
        activeMesas={activeMesas}
        canvasRef={canvasRef}
        dragPosition={dragPosition}
        dragging={dragging}
        getMesaPosition={getMesaPosition}
        handlePointerDown={handlePointerDown}
        mesasLoading={mesasLoading}
      />
      <p className="mt-3 px-1 text-xs text-[var(--text-soft)]">
        Arraste as mesas para posicionar o salão. As coordenadas são salvas automaticamente.
      </p>
    </div>
  )
}

function PlantaCanvas({
  activeMesas,
  canvasRef,
  dragging,
  dragPosition,
  getMesaPosition,
  handlePointerDown,
  mesasLoading,
}: Readonly<{
  activeMesas: MesaRecord[]
  canvasRef: RefObject<HTMLDivElement | null>
  dragging: { mesaId: string } | null
  dragPosition: { mesaId: string; x: number; y: number } | null
  getMesaPosition: (mesa: MesaRecord, autoIndex: number) => { x: number; y: number }
  handlePointerDown: (event: ReactPointerEvent, mesa: MesaRecord, autoIndex: number) => void
  mesasLoading: boolean
}>) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)]"
      ref={canvasRef}
      style={getCanvasStyle()}
    >
      {mesasLoading ? <PlantaLoadingState /> : null}
      {!mesasLoading && activeMesas.length === 0 ? <EmptyPlantaState /> : null}
      {activeMesas.map((mesa, index) => (
        <PlantaMesa
          dragPosition={dragPosition}
          dragging={dragging}
          getMesaPosition={getMesaPosition}
          handlePointerDown={handlePointerDown}
          index={index}
          key={mesa.id}
          mesa={mesa}
        />
      ))}
    </div>
  )
}

function PlantaLoadingState() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <p className="text-sm text-[var(--text-soft)]">Carregando planta...</p>
    </div>
  )
}

function EmptyPlantaState() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
      <Grid3X3 className="size-6 text-[var(--text-soft)]" />
      <p className="text-sm font-medium text-[var(--text-primary)]">Nenhuma mesa ativa para posicionar</p>
      <p className="max-w-md text-sm text-[var(--text-soft)]">
        Crie mesas na configuração para montar a planta baixa do salão.
      </p>
    </div>
  )
}

function PlantaMesa({
  dragPosition,
  dragging,
  getMesaPosition,
  handlePointerDown,
  index,
  mesa,
}: Readonly<{
  dragPosition: { mesaId: string; x: number; y: number } | null
  dragging: { mesaId: string } | null
  getMesaPosition: (mesa: MesaRecord, autoIndex: number) => { x: number; y: number }
  handlePointerDown: (event: ReactPointerEvent, mesa: MesaRecord, autoIndex: number) => void
  index: number
  mesa: MesaRecord
}>) {
  const isDraggingThis = dragging?.mesaId === mesa.id
  const basePosition = getMesaPosition(mesa, index)
  const currentPosition = isDraggingThis && dragPosition ? { x: dragPosition.x, y: dragPosition.y } : basePosition
  const handleMesaPointerDown = useCallback(
    (event: ReactPointerEvent) => handlePointerDown(event, mesa, index),
    [handlePointerDown, index, mesa],
  )

  return (
    <div key={mesa.id} style={getMesaStyle({ currentPosition, isDraggingThis })} onPointerDown={handleMesaPointerDown}>
      <MesaFloorCard isDragging={Boolean(isDraggingThis)} mesa={mesa} />
    </div>
  )
}

function getCanvasStyle() {
  return {
    backgroundImage: 'radial-gradient(circle, color-mix(in srgb, var(--border) 60%, transparent) 1px, transparent 1px)',
    backgroundSize: '32px 32px',
    height: CANVAS_H,
  }
}

function getMesaStyle({
  currentPosition,
  isDraggingThis,
}: {
  currentPosition: { x: number; y: number }
  isDraggingThis: boolean
}) {
  return {
    cursor: isDraggingThis ? 'grabbing' : 'grab',
    height: CARD_H,
    left: currentPosition.x,
    position: 'absolute' as const,
    top: currentPosition.y,
    touchAction: 'manipulation',
    transform: isDraggingThis ? 'scale(1.07)' : 'scale(1)',
    transition: isDraggingThis ? 'none' : 'left 0.14s ease-out, top 0.14s ease-out, transform 0.14s ease-out',
    width: CARD_W,
    willChange: isDraggingThis ? 'transform,left,top' : undefined,
    zIndex: isDraggingThis ? 50 : 1,
  }
}
