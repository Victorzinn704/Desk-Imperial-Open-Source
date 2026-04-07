'use client'

import { memo, useState } from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { Users, Clock, AlertCircle, ChevronDown, UserPlus } from 'lucide-react'
import type { Mesa, Comanda, Garcom } from '../../pdv-types'
import { calcTotal, formatElapsed } from '../../pdv-types'
import { formatCurrency } from '@/lib/currency'
import { STATUS_CONFIG, urgencyLevel, urgencyBorderColor, urgencyShadow, type SalaoView } from '../constants'
import { GarcomAvatar } from './garcom-avatar'
import { GarcomSelector } from './garcom-selector'
import { ItemsTooltip } from './items-tooltip'

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
    const urgency = urgencyLevel(mesa, comanda, now)
    const total = comanda ? calcTotal(comanda) : 0
    const isAssignTarget = assigningGarcomId !== null

    const borderColor = isAssignTarget
      ? 'rgba(52,242,127,0.65)'
      : urgency > 0
        ? urgencyBorderColor(urgency)
        : cfg.border

    const shadow = isAssignTarget ? '0 0 18px rgba(52,242,127,0.22)' : urgencyShadow(urgency)

    function handleClick() {
      if (showGarcomSel) {
        setShowGarcomSel(false)
        return
      }
      if (showConfirm) {
        setShowConfirm(false)
        return
      }
      if (isAssignTarget) {
        if (mesa.garcomId && mesa.garcomId !== assigningGarcomId) {
          setShowConfirm(true)
          return
        }
        onAssign(mesa.id, assigningGarcomId!)
        return
      }
      if (mesa.status === 'ocupada' && comanda) {
        onClickOcupada(comanda)
        return
      }
      onClickLivre(mesa)
    }

    const card = (
      <div
        className="group relative select-none rounded-[16px] border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
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

        {/* Urgência badge */}
        {urgency === 3 && (
          <span className="pointer-events-none absolute -right-1 -top-1 z-10 flex size-4 items-center justify-center rounded-full bg-[#f87171]">
            <AlertCircle className="size-2.5 text-[var(--text-primary)]" />
          </span>
        )}
        {urgency === 2 && (
          <span className="pointer-events-none absolute -right-1 -top-1 z-10 flex size-4 items-center justify-center rounded-full bg-[#fbbf24]">
            <AlertCircle className="size-2.5 text-black" />
          </span>
        )}

        {/* Assignment mode: badge leve no canto */}
        {isAssignTarget && !showConfirm && (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-[rgba(52,242,127,0.18)] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-[#36f57c] pointer-events-none">
            ✓ atribuir
          </span>
        )}

        {/* Confirmação: substituir garçom existente */}
        {showConfirm &&
          (() => {
            const novoGarcom = garcons.find((g) => g.id === assigningGarcomId)
            return (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 rounded-[16px] bg-[rgba(14,16,24,0.92)] px-3 backdrop-blur-sm">
                <AlertCircle className="size-4 text-[#fbbf24]" />
                <p className="text-center text-[11px] font-semibold leading-snug text-[var(--text-primary)]">
                  Mesa já tem garçom.
                  <br />
                  <span className="text-[10px] text-[var(--text-soft)]">
                    Substituir por{' '}
                    <span style={{ color: novoGarcom?.cor ?? '#36f57c' }}>{novoGarcom?.nome ?? '?'}</span>?
                  </span>
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    className="rounded-[8px] border border-[rgba(255,255,255,0.1)] px-3 py-1 text-[11px] text-[var(--text-soft)] transition-colors hover:border-[rgba(255,255,255,0.2)] hover:text-[var(--text-primary)]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAssign(mesa.id, assigningGarcomId!)
                      setShowConfirm(false)
                    }}
                    className="rounded-[8px] px-3 py-1 text-[11px] font-bold text-black transition-opacity hover:opacity-90"
                    style={{ background: novoGarcom?.cor ?? '#36f57c' }}
                  >
                    Substituir
                  </button>
                </div>
              </div>
            )
          })()}

        <div className="pointer-events-none relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between px-3 pt-3 pb-1">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: `${cfg.color}80` }}>
                Mesa
              </p>
              <p className="text-2xl font-bold text-[var(--text-primary)] leading-none">{mesa.numero}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{ background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}35` }}
              >
                {cfg.label}
              </span>
              <div className="flex items-center gap-0.5 text-[var(--text-muted)]">
                <Users className="size-2.5" />
                <span className="text-[9px]">{mesa.capacidade}</span>
              </div>
            </div>
          </div>

          <div className="mx-3 border-t border-[rgba(255,255,255,0.05)]" />
        </div>

        {/* Garçom row */}
        <div className="relative z-20 px-3 py-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (isAssignTarget) {
                if (mesa.garcomId && mesa.garcomId !== assigningGarcomId) {
                  setShowConfirm(true)
                } else {
                  onAssign(mesa.id, assigningGarcomId!)
                }
                return
              }
              setShowGarcomSel((v) => !v)
            }}
            className="flex w-full items-center gap-1.5 rounded-[8px] px-1.5 py-1 text-left transition-colors hover:bg-[rgba(255,255,255,0.05)]"
          >
            {garcom ? (
              <>
                <GarcomAvatar garcom={garcom} size={20} />
                <span className="flex-1 truncate text-[11px] font-medium text-[var(--text-primary)]">
                  {garcom.nome}
                </span>
              </>
            ) : (
              <>
                <span className="flex size-5 items-center justify-center rounded-full border border-dashed border-[rgba(255,255,255,0.2)]">
                  <UserPlus className="size-2.5 text-[var(--text-muted)]" />
                </span>
                <span className="text-[11px] italic text-[var(--text-muted)]">Sem garçom</span>
              </>
            )}
            {!isAssignTarget && <ChevronDown className="ml-auto size-3 shrink-0 text-[var(--text-muted)]" />}
          </button>
          {showGarcomSel && (
            <GarcomSelector
              mesa={mesa}
              garcons={garcons}
              onAssign={(gid) => onAssign(mesa.id, gid)}
              onClose={() => setShowGarcomSel(false)}
            />
          )}
        </div>

        {/* Comanda info */}
        {mesa.status === 'ocupada' && comanda && (
          <div
            className="pointer-events-none relative z-10 mx-3 mb-3 space-y-1 rounded-[10px] px-2.5 py-2"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="pointer-events-auto">
              <ItemsTooltip comanda={comanda} />
            </div>
            {comanda.clienteNome && (
              <p className="truncate text-[11px] font-semibold text-[var(--text-primary)]">{comanda.clienteNome}</p>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[var(--text-soft)]">
                <Clock className="size-2.5" />
                <span className="text-[10px]">{formatElapsed(comanda.abertaEm)}</span>
                <span className="text-[var(--text-muted)]">·</span>
                <span className="text-[10px]">
                  {comanda.itens.length} item{comanda.itens.length !== 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-[11px] font-bold" style={{ color: urgency >= 2 ? '#fbbf24' : cfg.color }}>
                {formatCurrency(total, 'BRL')}
              </span>
            </div>
          </div>
        )}

        {(mesa.status === 'reservada' || mesa.status === 'livre') && (
          <p className="pointer-events-none relative z-10 px-3 pb-3 text-[10px] text-[var(--text-muted)]">
            Clique para abrir comanda
          </p>
        )}
      </div>
    )

    if (view === 'equipe') return card
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
