'use client'

import { useState, useEffect, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import {
  Plus, Users, Clock, AlertCircle, LayoutGrid, Users2,
  X, ChevronDown, UserPlus, Zap, Minimize2, Maximize2,
} from 'lucide-react'
import type { Mesa, Comanda, Garcom, MesaStatus } from './pdv-types'
import { calcTotal, formatElapsed } from './pdv-types'
import { formatCurrency } from '@/lib/currency'

// ─── Tipos internos ────────────────────────────────────────────────────────────

type SalaoView = 'salao' | 'equipe'
type FilterStatus = 'todos' | MesaStatus | 'sem_garcom' | 'atencao'

type Props = {
  mesas: Mesa[]
  garcons: Garcom[]
  comandas: Comanda[]
  onStatusChange: (mesaId: string, status: MesaStatus) => void
  onAssignGarcom: (mesaId: string, garcomId: string | undefined) => void
  onAddGarcom: (nome: string) => void
  onRemoveGarcom: (id: string) => void
  onAddMesa: () => void
  onClickLivre: (mesa: Mesa) => void
  onClickOcupada: (comanda: Comanda) => void
  allowMesaCatalogEditing?: boolean
  allowRosterEditing?: boolean
  allowStatusDragging?: boolean
}

// ─── Cores de status ───────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  livre:     { label: 'Livre',     color: '#36f57c', bg: 'rgba(54,245,124,0.07)',  border: 'rgba(54,245,124,0.25)'  },
  ocupada:   { label: 'Ocupada',   color: '#f87171', bg: 'rgba(248,113,113,0.07)', border: 'rgba(248,113,113,0.25)' },
  reservada: { label: 'Reservada', color: '#60a5fa', bg: 'rgba(96,165,250,0.07)',  border: 'rgba(96,165,250,0.25)'  },
} as const

const GARCOM_CORES = ['#a78bfa','#34d399','#fb923c','#f472b6','#60a5fa','#fbbf24','#e879f9','#2dd4bf']

// ─── Helpers ───────────────────────────────────────────────────────────────────

function garcomCor(garcon: Garcom, all: Garcom[]) {
  return garcon.cor || GARCOM_CORES[all.findIndex(g => g.id === garcon.id) % GARCOM_CORES.length]
}

function initials(nome: string) {
  return nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

// 0=normal · 1=30-59min amber · 2=60-89min amber+glow · 3=90+ red pulsing
function urgencyLevel(mesa: Mesa, comanda: Comanda | undefined, now: number): 0 | 1 | 2 | 3 {
  if (mesa.status !== 'ocupada' || !comanda) return 0
  const min = Math.floor((now - comanda.abertaEm.getTime()) / 60000)
  if (min >= 90) return 3
  if (min >= 60) return 2
  if (min >= 30) return 1
  return 0
}

function urgencyBorderColor(level: 0 | 1 | 2 | 3): string {
  if (level === 3) return 'rgba(248,113,113,0.65)'
  if (level === 2) return 'rgba(251,191,36,0.5)'
  if (level === 1) return 'rgba(251,191,36,0.28)'
  return ''
}

function urgencyShadow(level: 0 | 1 | 2 | 3): string | undefined {
  if (level === 3) return '0 0 18px rgba(248,113,113,0.22)'
  if (level === 2) return '0 0 10px rgba(251,191,36,0.15)'
  return undefined
}

// ─── GarcomAvatar ─────────────────────────────────────────────────────────────

function GarcomAvatar({ garcon, size = 22 }: { garcon: Garcom; size?: number }) {
  return (
    <span
      className="flex items-center justify-center rounded-full font-bold text-black shrink-0"
      style={{ width: size, height: size, background: garcon.cor, fontSize: size * 0.38 }}
    >
      {initials(garcon.nome)}
    </span>
  )
}

// ─── GarcomSelector ────────────────────────────────────────────────────────────

function GarcomSelector({
  mesa, garcons, onAssign, onClose,
}: {
  mesa: Mesa
  garcons: Garcom[]
  onAssign: (garcomId: string | undefined) => void
  onClose: () => void
}) {
  return (
    <div
      className="absolute z-30 left-0 top-full mt-1 min-w-[160px] rounded-[12px] border border-[rgba(255,255,255,0.1)] bg-[#0e1018] p-1 shadow-2xl"
      onClick={e => e.stopPropagation()}
    >
      {mesa.garcomId && (
        <button type="button" onClick={() => { onAssign(undefined); onClose() }}
          className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-xs text-[#f87171] hover:bg-[rgba(248,113,113,0.08)] transition-colors">
          <X className="size-3" /> Remover garçom
        </button>
      )}
      {garcons.map(g => (
        <button key={g.id} type="button" onClick={() => { onAssign(g.id); onClose() }}
          className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-xs text-white hover:bg-[rgba(255,255,255,0.06)] transition-colors">
          <GarcomAvatar garcon={g} size={18} />
          {g.nome}
          {mesa.garcomId === g.id && <span className="ml-auto text-[10px] text-[#36f57c]">✓</span>}
        </button>
      ))}
      {garcons.length === 0 && (
        <p className="px-3 py-2 text-[11px] text-[var(--text-muted)]">Nenhum garçom cadastrado</p>
      )}
    </div>
  )
}

// ─── ItemsTooltip (preview hover da comanda) ──────────────────────────────────

function ItemsTooltip({ comanda }: { comanda: Comanda }) {
  const lastItems = comanda.itens.slice(-3)
  if (lastItems.length === 0) return null
  return (
    <div className="absolute bottom-full left-0 mb-2 z-40 w-[190px] rounded-[10px] border border-[rgba(255,255,255,0.1)] bg-[#0e1018] p-2.5 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-1.5">Últimos itens</p>
      {lastItems.map((item, i) => (
        <div key={i} className="flex items-center justify-between gap-2 py-0.5">
          <span className="text-[11px] text-white truncate flex-1">{item.quantidade}× {item.nome}</span>
          <span className="text-[10px] text-[var(--text-soft)] shrink-0">
            {formatCurrency(item.quantidade * item.precoUnitario, 'BRL')}
          </span>
        </div>
      ))}
      {comanda.itens.length > 3 && (
        <p className="text-[9px] text-[var(--text-muted)] mt-1.5 border-t border-[rgba(255,255,255,0.05)] pt-1">
          +{comanda.itens.length - 3} mais itens
        </p>
      )}
    </div>
  )
}

// ─── MesaCard ─────────────────────────────────────────────────────────────────

function MesaCard({
  mesa, garcons, comanda, index, view, now, assigningGarcomId,
  onAssign, onClickLivre, onClickOcupada, dragDisabled = false,
}: {
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
}) {
  const [showGarcomSel, setShowGarcomSel] = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)
  const cfg = STATUS_CONFIG[mesa.status]
  const garcom = garcons.find(g => g.id === mesa.garcomId)
  const urgency = urgencyLevel(mesa, comanda, now)
  const total = comanda ? calcTotal(comanda) : 0
  const isAssignTarget = assigningGarcomId !== null

  const borderColor = isAssignTarget
    ? 'rgba(52,242,127,0.65)'
    : urgency > 0 ? urgencyBorderColor(urgency) : cfg.border

  const shadow = isAssignTarget
    ? '0 0 18px rgba(52,242,127,0.22)'
    : urgencyShadow(urgency)

  function handleClick() {
    if (showGarcomSel) { setShowGarcomSel(false); return }
    if (showConfirm)   { setShowConfirm(false);   return }
    if (isAssignTarget) {
      // Mesa já tem garçom diferente do selecionado → pede confirmação
      if (mesa.garcomId && mesa.garcomId !== assigningGarcomId) {
        setShowConfirm(true)
        return
      }
      onAssign(mesa.id, assigningGarcomId!)
      return
    }
    if (mesa.status === 'ocupada' && comanda) { onClickOcupada(comanda); return }
    onClickLivre(mesa)
  }

  const card = (
    <div
      onClick={handleClick}
      className="group relative select-none rounded-[16px] border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
      style={{
        background: isAssignTarget ? 'rgba(52,242,127,0.06)' : cfg.bg,
        borderColor,
        boxShadow: shadow,
        animation: urgency === 3 ? 'salao-border-pulse 1.8s ease-in-out infinite' : undefined,
      }}
    >
      {/* Urgência badge */}
      {urgency === 3 && (
        <span className="absolute -right-1 -top-1 z-10 flex size-4 items-center justify-center rounded-full bg-[#f87171]">
          <AlertCircle className="size-2.5 text-white" />
        </span>
      )}
      {urgency === 2 && (
        <span className="absolute -right-1 -top-1 z-10 flex size-4 items-center justify-center rounded-full bg-[#fbbf24]">
          <AlertCircle className="size-2.5 text-black" />
        </span>
      )}

      {/* Assignment mode: badge leve no canto, sem bloquear drag */}
      {isAssignTarget && !showConfirm && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-[rgba(52,242,127,0.18)] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-[#36f57c] pointer-events-none">
          ✓ atribuir
        </span>
      )}

      {/* Confirmação: substituir garçom existente */}
      {showConfirm && (() => {
        const novoGarcom = garcons.find(g => g.id === assigningGarcomId)
        return (
          <div
            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 rounded-[16px] bg-[rgba(14,16,24,0.92)] px-3 backdrop-blur-sm"
            onClick={e => e.stopPropagation()}
          >
            <AlertCircle className="size-4 text-[#fbbf24]" />
            <p className="text-center text-[11px] font-semibold leading-snug text-white">
              Mesa já tem garçom.<br />
              <span className="text-[10px] text-[var(--text-soft)]">
                Substituir por{' '}
                <span style={{ color: novoGarcom?.cor ?? '#36f57c' }}>{novoGarcom?.nome ?? '?'}</span>?
              </span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-[8px] border border-[rgba(255,255,255,0.1)] px-3 py-1 text-[11px] text-[var(--text-soft)] transition-colors hover:border-[rgba(255,255,255,0.2)] hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { onAssign(mesa.id, assigningGarcomId!); setShowConfirm(false) }}
                className="rounded-[8px] px-3 py-1 text-[11px] font-bold text-black transition-opacity hover:opacity-90"
                style={{ background: novoGarcom?.cor ?? '#36f57c' }}
              >
                Substituir
              </button>
            </div>
          </div>
        )
      })()}

      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: `${cfg.color}80` }}>Mesa</p>
          <p className="text-2xl font-bold text-white leading-none">{mesa.numero}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}35` }}>
            {cfg.label}
          </span>
          <div className="flex items-center gap-0.5 text-[var(--text-muted)]">
            <Users className="size-2.5" />
            <span className="text-[9px]">{mesa.capacidade}</span>
          </div>
        </div>
      </div>

      <div className="mx-3 border-t border-[rgba(255,255,255,0.05)]" />

      {/* Garçom row */}
      <div className="relative px-3 py-2">
        <button type="button"
          onClick={e => {
            e.stopPropagation()
            if (isAssignTarget) {
              if (mesa.garcomId && mesa.garcomId !== assigningGarcomId) {
                setShowConfirm(true)
              } else {
                onAssign(mesa.id, assigningGarcomId!)
              }
              return
            }
            setShowGarcomSel(v => !v)
          }}
          className="flex w-full items-center gap-1.5 rounded-[8px] px-1.5 py-1 text-left transition-colors hover:bg-[rgba(255,255,255,0.05)]">
          {garcom ? (
            <>
              <GarcomAvatar garcon={garcom} size={20} />
              <span className="flex-1 truncate text-[11px] font-medium text-white">{garcom.nome}</span>
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
          <GarcomSelector mesa={mesa} garcons={garcons}
            onAssign={(gid) => onAssign(mesa.id, gid)}
            onClose={() => setShowGarcomSel(false)} />
        )}
      </div>

      {/* Comanda info */}
      {mesa.status === 'ocupada' && comanda && (
        <div className="relative mx-3 mb-3 space-y-1 rounded-[10px] px-2.5 py-2"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <ItemsTooltip comanda={comanda} />
          {comanda.clienteNome && (
            <p className="truncate text-[11px] font-semibold text-white">{comanda.clienteNome}</p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[var(--text-soft)]">
              <Clock className="size-2.5" />
              <span className="text-[10px]">{formatElapsed(comanda.abertaEm)}</span>
              <span className="text-[var(--text-muted)]">·</span>
              <span className="text-[10px]">{comanda.itens.length} item{comanda.itens.length !== 1 ? 's' : ''}</span>
            </div>
            <span className="text-[11px] font-bold" style={{ color: urgency >= 2 ? '#fbbf24' : cfg.color }}>
              {formatCurrency(total, 'BRL')}
            </span>
          </div>
        </div>
      )}

      {(mesa.status === 'reservada' || mesa.status === 'livre') && (
        <p className="px-3 pb-3 text-[10px] text-[var(--text-muted)]">Clique para abrir comanda</p>
      )}
    </div>
  )

  if (view === 'equipe') return card
  return (
    <Draggable draggableId={mesa.id} index={index} isDragDisabled={dragDisabled}>
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
          style={{ ...provided.draggableProps.style, opacity: snapshot.isDragging ? 0.85 : 1 }}>
          {card}
        </div>
      )}
    </Draggable>
  )
}

// ─── MesaCompact (modo compacto para pool livre) ───────────────────────────────

function MesaCompact({
  mesa, garcons, index, onAssign, onClickLivre, dragDisabled = false,
}: {
  mesa: Mesa; garcons: Garcom[]; index: number
  onAssign: (mesaId: string, garcomId: string | undefined) => void
  onClickLivre: (m: Mesa) => void
  dragDisabled?: boolean
}) {
  const [showGarcomSel, setShowGarcomSel] = useState(false)
  const garcom = garcons.find(g => g.id === mesa.garcomId)

  return (
    <Draggable draggableId={mesa.id} index={index} isDragDisabled={dragDisabled}>
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
          style={{ ...provided.draggableProps.style, opacity: snapshot.isDragging ? 0.8 : 1 }}>
          <div
            onClick={() => { if (!showGarcomSel) onClickLivre(mesa) }}
            className="relative flex cursor-pointer select-none flex-col items-center justify-center gap-1 rounded-[12px] border border-[rgba(54,245,124,0.22)] bg-[rgba(54,245,124,0.05)] p-2 transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(54,245,124,0.45)] hover:bg-[rgba(54,245,124,0.09)]"
            style={{ width: 72, height: 80 }}
          >
            <p className="text-xl font-bold leading-none text-white">{mesa.numero}</p>
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#36f57c]">Livre</span>
            {garcom ? (
              <div className="relative">
                <button type="button" onClick={e => { e.stopPropagation(); setShowGarcomSel(v => !v) }}>
                  <GarcomAvatar garcon={garcom} size={16} />
                </button>
                {showGarcomSel && (
                  <GarcomSelector mesa={mesa} garcons={garcons}
                    onAssign={(gid) => onAssign(mesa.id, gid)}
                    onClose={() => setShowGarcomSel(false)} />
                )}
              </div>
            ) : (
              <div className="flex size-4 items-center justify-center rounded-full border border-dashed border-[rgba(255,255,255,0.15)]">
                <UserPlus className="size-2 text-[var(--text-muted)]" />
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  )
}

// ─── GarcomStrip (atribuição rápida por clique) ───────────────────────────────

function GarcomStrip({
  garcons, assigningGarcomId, onSelect,
}: {
  garcons: Garcom[]; assigningGarcomId: string | null; onSelect: (id: string | null) => void
}) {
  if (garcons.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Atribuir →</span>
      {garcons.map(g => {
        const active = assigningGarcomId === g.id
        return (
          <button key={g.id} type="button"
            onClick={() => onSelect(active ? null : g.id)}
            className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold transition-all duration-150"
            style={{
              background: active ? `${g.cor}28` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${active ? `${g.cor}70` : 'rgba(255,255,255,0.08)'}`,
              color: active ? g.cor : 'var(--text-soft)',
              transform: active ? 'scale(1.06)' : 'scale(1)',
              boxShadow: active ? `0 0 8px ${g.cor}30` : 'none',
            }}>
            <GarcomAvatar garcon={g} size={16} />
            {g.nome.split(' ')[0]}
            {active && <span className="text-[9px] opacity-70">← clique na mesa</span>}
          </button>
        )
      })}
      {assigningGarcomId && (
        <button type="button" onClick={() => onSelect(null)}
          className="flex items-center gap-1 rounded-full border border-[rgba(255,255,255,0.08)] px-2 py-1 text-[10px] text-[var(--text-muted)] transition-colors hover:text-white">
          <X className="size-2.5" /> cancelar
        </button>
      )}
    </div>
  )
}

// ─── SalaoView ────────────────────────────────────────────────────────────────

function SalaoView({
  mesas, garcons, comandas, filter, now, assigningGarcomId,
  onStatusChange, onAssign, onClickLivre, onClickOcupada, onAddMesa, onSelectGarcom,
  allowMesaCatalogEditing, allowStatusDragging,
}: {
  mesas: Mesa[]; garcons: Garcom[]; comandas: Comanda[]
  filter: FilterStatus; now: number; assigningGarcomId: string | null
  onStatusChange: (mesaId: string, status: MesaStatus) => void
  onAssign: (mesaId: string, garcomId: string | undefined) => void
  onClickLivre: (m: Mesa) => void; onClickOcupada: (c: Comanda) => void
  onAddMesa: () => void; onSelectGarcom: (id: string | null) => void
  allowMesaCatalogEditing: boolean
  allowStatusDragging: boolean
}) {
  const [compactLivres, setCompactLivres] = useState(false)

  function handleDragEnd(result: DropResult) {
    if (!allowStatusDragging) return
    const { draggableId, destination } = result
    if (!destination) return
    const newStatus = destination.droppableId as MesaStatus
    const mesa = mesas.find(m => m.id === draggableId)
    if (!mesa || mesa.status === newStatus) return
    onStatusChange(draggableId, newStatus)
  }

  const filtered = mesas.filter(m => {
    if (filter === 'todos') return true
    if (filter === 'sem_garcom') return !m.garcomId && m.status !== 'livre'
    if (filter === 'atencao') return urgencyLevel(m, m.comandaId ? comandas.find(c => c.id === m.comandaId) : undefined, now) >= 2
    return m.status === filter
  })

  const livreMesas  = filtered.filter(m => m.status === 'livre')
  const ocupMesas   = filtered.filter(m => m.status === 'ocupada')
  const resMesas    = filtered.filter(m => m.status === 'reservada')

  const zones = [
    { id: 'ocupada'   as MesaStatus, label: 'Ocupada',   color: '#f87171', border: 'rgba(248,113,113,0.2)', bg: 'rgba(248,113,113,0.03)', list: ocupMesas },
    { id: 'reservada' as MesaStatus, label: 'Reservada', color: '#60a5fa', border: 'rgba(96,165,250,0.2)',  bg: 'rgba(96,165,250,0.03)',  list: resMesas  },
  ]

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        <GarcomStrip garcons={garcons} assigningGarcomId={assigningGarcomId} onSelect={onSelectGarcom} />

        {/* Pool livre */}
        <div className="rounded-2xl border p-4"
          style={{ borderColor: 'rgba(54,245,124,0.22)', background: 'rgba(54,245,124,0.02)' }}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#36f57c] shadow-[0_0_6px_#36f57c]" />
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#36f57c]">Livre</span>
              <span className="text-xs text-[var(--text-muted)]">— arraste para ocupar</span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setCompactLivres(v => !v)}
                className="flex items-center gap-1 rounded-[8px] border border-[rgba(255,255,255,0.08)] px-2 py-1 text-[10px] text-[var(--text-muted)] transition-colors hover:text-white">
                {compactLivres ? <Maximize2 className="size-3" /> : <Minimize2 className="size-3" />}
                {compactLivres ? 'Expandir' : 'Compactar'}
              </button>
              {allowMesaCatalogEditing ? (
                <button type="button" onClick={onAddMesa}
                  className="flex items-center gap-1.5 rounded-[10px] border border-[rgba(54,245,124,0.3)] bg-[rgba(54,245,124,0.07)] px-3 py-1.5 text-xs font-semibold text-[#36f57c] transition-colors hover:bg-[rgba(54,245,124,0.13)]">
                  <Plus className="size-3" /> Nova Mesa
                </button>
              ) : null}
            </div>
          </div>

          <Droppable droppableId="livre" direction="horizontal">
            {(provided, snapshot) => (
              <div ref={provided.innerRef} {...provided.droppableProps}
                className="flex flex-wrap gap-3 min-h-[100px] rounded-xl p-1 transition-colors duration-150"
                style={{
                  background: snapshot.isDraggingOver ? 'rgba(54,245,124,0.05)' : 'transparent',
                  outline: snapshot.isDraggingOver ? '1.5px dashed rgba(54,245,124,0.4)' : '1.5px dashed transparent',
                }}>
                {livreMesas.length === 0 && !snapshot.isDraggingOver && (
                  <p className="self-center pl-1 text-xs text-[var(--text-muted)]">Todas as mesas estão ocupadas ou reservadas</p>
                )}
                {livreMesas.map((mesa, i) =>
                  compactLivres ? (
                    <MesaCompact key={mesa.id} mesa={mesa} garcons={garcons} index={i}
                      dragDisabled={!allowStatusDragging}
                      onAssign={onAssign} onClickLivre={onClickLivre} />
                  ) : (
                    <div key={mesa.id} style={{ width: 160 }}>
                      <MesaCard mesa={mesa} garcons={garcons} comanda={undefined}
                        index={i} view="salao" now={now} assigningGarcomId={assigningGarcomId}
                        dragDisabled={!allowStatusDragging}
                        onAssign={onAssign} onClickLivre={onClickLivre} onClickOcupada={onClickOcupada} />
                    </div>
                  )
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        {/* Colunas ocupada / reservada */}
        <div className="grid grid-cols-2 gap-4">
          {zones.map(zone => (
            <div key={zone.id} className="rounded-2xl border"
              style={{ borderColor: zone.border, background: zone.bg }}>
              <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: zone.border }}>
                <span className="size-2 rounded-full" style={{ background: zone.color, boxShadow: `0 0 6px ${zone.color}` }} />
                <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: zone.color }}>{zone.label}</span>
                <span className="ml-auto flex size-5 items-center justify-center rounded-full text-[10px] font-bold"
                  style={{ background: `${zone.color}20`, color: zone.color }}>
                  {zone.list.length}
                </span>
              </div>
              <Droppable droppableId={zone.id}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}
                    className="flex flex-col gap-2.5 p-3 min-h-[200px] transition-colors duration-150"
                    style={{
                      background: snapshot.isDraggingOver ? `${zone.color}08` : 'transparent',
                      outline: snapshot.isDraggingOver ? `1.5px dashed ${zone.color}50` : '1.5px dashed transparent',
                    }}>
                    {zone.list.length === 0 && !snapshot.isDraggingOver && (
                      <p className="pt-8 text-center text-xs text-[var(--text-muted)]">Arraste uma mesa aqui</p>
                    )}
                    {zone.list.map((mesa, i) => (
                      <MesaCard key={mesa.id} mesa={mesa} garcons={garcons}
                        comanda={mesa.comandaId ? comandas.find(c => c.id === mesa.comandaId) : undefined}
                        index={i} view="salao" now={now} assigningGarcomId={assigningGarcomId}
                        dragDisabled={!allowStatusDragging}
                        onAssign={onAssign} onClickLivre={onClickLivre} onClickOcupada={onClickOcupada} />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </div>
    </DragDropContext>
  )
}

// ─── EquipeView ───────────────────────────────────────────────────────────────

function EquipeView({
  mesas, garcons, comandas, now, assigningGarcomId,
  onAssign, onAddGarcom, onRemoveGarcom, onClickLivre, onClickOcupada, allowRosterEditing,
}: {
  mesas: Mesa[]; garcons: Garcom[]; comandas: Comanda[]
  now: number; assigningGarcomId: string | null
  onAssign: (mesaId: string, garcomId: string | undefined) => void
  onAddGarcom: (nome: string) => void; onRemoveGarcom: (id: string) => void
  onClickLivre: (m: Mesa) => void; onClickOcupada: (c: Comanda) => void
  allowRosterEditing: boolean
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [newNome, setNewNome] = useState('')
  const semGarcom = mesas.filter(m => !m.garcomId && m.status !== 'livre')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-soft)]">
          {garcons.length} {garcons.length === 1 ? 'garçom' : 'garçons'} em turno
          {semGarcom.length > 0 && (
            <span className="ml-2 text-[#fbbf24]">
              · {semGarcom.length} mesa{semGarcom.length > 1 ? 's' : ''} sem responsável
            </span>
          )}
        </p>
        {allowRosterEditing ? (
          <button type="button" onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-[12px] border border-[rgba(155,132,96,0.35)] bg-[rgba(155,132,96,0.08)] px-3 py-2 text-xs font-semibold text-[var(--accent)] transition-colors hover:bg-[rgba(155,132,96,0.16)]">
            <Plus className="size-3.5" /> Garçom
          </button>
        ) : null}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {semGarcom.length > 0 && (
          <div className="flex flex-shrink-0 flex-col rounded-2xl border"
            style={{ width: 200, borderColor: 'rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.02)' }}>
            <div className="flex items-center gap-2 border-b border-[rgba(251,191,36,0.15)] px-3 py-3">
              <AlertCircle className="size-3.5 text-[#fbbf24]" />
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#fbbf24]">Sem garçom</span>
              <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-[rgba(251,191,36,0.15)] text-[10px] font-bold text-[#fbbf24]">
                {semGarcom.length}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-3">
              {semGarcom.map(mesa => (
                <MesaCard key={mesa.id} mesa={mesa} garcons={garcons}
                  comanda={mesa.comandaId ? comandas.find(c => c.id === mesa.comandaId) : undefined}
                  index={0} view="equipe" now={now} assigningGarcomId={assigningGarcomId}
                  onAssign={onAssign} onClickLivre={onClickLivre} onClickOcupada={onClickOcupada} />
              ))}
            </div>
          </div>
        )}

        {garcons.map(garcom => {
          const cor = garcomCor(garcom, garcons)
          const garcomMesas = mesas.filter(m => m.garcomId === garcom.id && m.status !== 'livre')
          const totalAtivo = garcomMesas.reduce((sum, m) => {
            const c = m.comandaId ? comandas.find(co => co.id === m.comandaId) : undefined
            return sum + (c ? calcTotal(c) : 0)
          }, 0)

          return (
            <div key={garcom.id} className="flex flex-shrink-0 flex-col rounded-2xl border"
              style={{ width: 210, borderColor: `${cor}25`, background: `${cor}04` }}>
              <div className="relative flex flex-col items-center gap-1 border-b px-3 pb-3 pt-5"
                style={{ borderColor: `${cor}18` }}>
                {allowRosterEditing ? (
                  <button type="button" title="Remover garçom" onClick={() => onRemoveGarcom(garcom.id)}
                    className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full text-[var(--text-muted)] opacity-0 transition-opacity hover:bg-[rgba(255,255,255,0.06)] hover:text-white hover:opacity-100">
                    <X className="size-3" />
                  </button>
                ) : null}
                <div className="flex items-center justify-center rounded-full font-bold text-black"
                  style={{ width: 48, height: 48, background: cor, fontSize: 18 }}>
                  {initials(garcom.nome)}
                </div>
                <p className="mt-1 text-sm font-bold text-white">{garcom.nome}</p>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {garcomMesas.length} mesa{garcomMesas.length !== 1 ? 's' : ''}
                  </span>
                  {totalAtivo > 0 && (
                    <span className="text-[10px] font-semibold" style={{ color: cor }}>
                      {formatCurrency(totalAtivo, 'BRL')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3 min-h-[160px]">
                {garcomMesas.length === 0 && (
                  <p className="pt-6 text-center text-xs text-[var(--text-muted)]">Nenhuma mesa</p>
                )}
                {garcomMesas.map(mesa => (
                  <MesaCard key={mesa.id} mesa={mesa} garcons={garcons}
                    comanda={mesa.comandaId ? comandas.find(c => c.id === mesa.comandaId) : undefined}
                    index={0} view="equipe" now={now} assigningGarcomId={assigningGarcomId}
                    onAssign={onAssign} onClickLivre={onClickLivre} onClickOcupada={onClickOcupada} />
                ))}
              </div>
            </div>
          )
        })}

        {allowRosterEditing ? (
          <button type="button" onClick={() => setShowAdd(true)}
            className="flex w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-dashed border-[rgba(255,255,255,0.1)] text-[var(--text-muted)] transition-colors hover:border-[rgba(255,255,255,0.2)] hover:text-[var(--text-soft)]"
            title="Adicionar garçom">
            <Plus className="size-5" />
          </button>
        ) : null}
      </div>

      {garcons.length === 0 && semGarcom.length === 0 && allowRosterEditing && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[rgba(255,255,255,0.08)] py-20">
          <Users2 className="size-10 opacity-40 text-[var(--text-muted)]" />
          <div className="text-center">
            <p className="text-sm font-medium text-[var(--text-soft)]">Nenhum garçom em turno</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Adicione garçons para distribuir as mesas</p>
          </div>
          <button type="button" onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 rounded-[14px] border border-[rgba(155,132,96,0.4)] bg-[rgba(155,132,96,0.1)] px-5 py-2.5 text-sm font-semibold text-[var(--accent)] transition-all hover:bg-[rgba(155,132,96,0.18)]">
            <Plus className="size-4" /> Adicionar Garçom
          </button>
        </div>
      )}

      {showAdd && allowRosterEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[#0e1018] p-6 shadow-2xl">
            <h3 className="mb-4 text-base font-bold text-white">Novo Garçom</h3>
            <input autoFocus type="text" placeholder="Nome do garçom"
              className="w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-sm text-white placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
              value={newNome} onChange={e => setNewNome(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newNome.trim()) {
                  onAddGarcom(newNome.trim()); setNewNome(''); setShowAdd(false)
                }
              }} />
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={() => setShowAdd(false)}
                className="flex-1 rounded-xl border border-[rgba(255,255,255,0.1)] py-2.5 text-sm text-[var(--text-soft)] hover:border-[rgba(255,255,255,0.2)]">
                Cancelar
              </button>
              <button type="button" disabled={!newNome.trim()}
                onClick={() => { onAddGarcom(newNome.trim()); setNewNome(''); setShowAdd(false) }}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-black disabled:opacity-40"
                style={{ background: 'var(--accent)' }}>
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SalaoUnificado ───────────────────────────────────────────────────────────

export function SalaoUnificado({
  mesas, garcons, comandas,
  onStatusChange, onAssignGarcom, onAddGarcom, onRemoveGarcom,
  onAddMesa, onClickLivre, onClickOcupada,
  allowMesaCatalogEditing = true,
  allowRosterEditing = true,
  allowStatusDragging = true,
}: Readonly<Props>) {
  const [view, setView]                       = useState<SalaoView>('salao')
  const [filter, setFilter]                   = useState<FilterStatus>('todos')
  const [now, setNow]                         = useState(() => Date.now())
  const [assigningGarcomId, setAssigning]     = useState<string | null>(null)

  // Tick ao vivo a cada 60s
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  // ESC cancela modo de atribuição
  useEffect(() => {
    if (!assigningGarcomId) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setAssigning(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [assigningGarcomId])

  // Modo persistente: atribui e mantém o garçom selecionado para continuar atribuindo
  // ESC ou clicar novamente no garçom na strip cancela o modo
  const handleAssign = useCallback((mesaId: string, garcomId: string | undefined) => {
    onAssignGarcom(mesaId, garcomId)
    // não limpa o assigningGarcomId — modo permanece ativo
  }, [onAssignGarcom])

  // Stats
  const livres     = mesas.filter(m => m.status === 'livre').length
  const ocupadas   = mesas.filter(m => m.status === 'ocupada').length
  const semGarcom  = mesas.filter(m => m.status !== 'livre' && !m.garcomId).length
  const comAtencao = mesas.filter(m => urgencyLevel(m, m.comandaId ? comandas.find(c => c.id === m.comandaId) : undefined, now) >= 2).length
  const totalAberto = mesas
    .filter(m => m.status === 'ocupada' && m.comandaId)
    .reduce((sum, m) => {
      const c = comandas.find(co => co.id === m.comandaId)
      return sum + (c ? calcTotal(c) : 0)
    }, 0)

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes salao-border-pulse {
          0%, 100% { border-color: rgba(248,113,113,0.4); box-shadow: 0 0 8px rgba(248,113,113,0.12); }
          50%       { border-color: rgba(248,113,113,0.85); box-shadow: 0 0 20px rgba(248,113,113,0.25); }
        }
      `}</style>

      {/* Barra operacional */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <FilterChip label="Todos"     count={mesas.length} active={filter === 'todos'}      color="#7a8896"  onClick={() => setFilter('todos')} />
          <FilterChip label="Livres"    count={livres}       active={filter === 'livre'}      color="#36f57c"  onClick={() => setFilter('livre')} />
          <FilterChip label="Ocupadas"  count={ocupadas}     active={filter === 'ocupada'}    color="#f87171"  onClick={() => setFilter('ocupada')} />
          {semGarcom > 0  && <FilterChip label="Sem garçom" count={semGarcom}  active={filter === 'sem_garcom'} color="#fbbf24" icon={<AlertCircle className="size-3" />} onClick={() => setFilter('sem_garcom')} />}
          {comAtencao > 0 && <FilterChip label="Atenção"    count={comAtencao} active={filter === 'atencao'}    color="#f87171" icon={<Zap className="size-3" />}          onClick={() => setFilter('atencao')} />}
        </div>

        <div className="flex items-center gap-3">
          {totalAberto > 0 && (
            <div className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-xs">
              <span className="text-[var(--text-muted)]">Em aberto </span>
              <span className="font-bold text-white">{formatCurrency(totalAberto, 'BRL')}</span>
            </div>
          )}
          <div className="flex rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-0.5">
            <ViewBtn active={view === 'salao'}  onClick={() => setView('salao')}  icon={<LayoutGrid className="size-3.5" />} label="Salão" />
            <ViewBtn active={view === 'equipe'} onClick={() => setView('equipe')} icon={<Users2 className="size-3.5" />}    label="Equipe" />
          </div>
        </div>
      </div>

      {view === 'salao' && (
        <p className="text-xs text-[var(--text-soft)]">
          {allowStatusDragging
            ? 'Arraste mesas entre zonas · selecione um garçom para atribuir (persiste até ESC) · hover na comanda para ver os itens'
            : 'O estado das mesas acompanha a comanda real · selecione um garçom para redistribuir o atendimento · hover na comanda para ver os itens'}
        </p>
      )}

      {view === 'salao' ? (
        <SalaoView
          mesas={mesas} garcons={garcons} comandas={comandas}
          filter={filter} now={now} assigningGarcomId={assigningGarcomId}
          onStatusChange={onStatusChange} onAssign={handleAssign}
          onClickLivre={onClickLivre} onClickOcupada={onClickOcupada}
          onAddMesa={onAddMesa} onSelectGarcom={setAssigning}
          allowMesaCatalogEditing={allowMesaCatalogEditing}
          allowStatusDragging={allowStatusDragging}
        />
      ) : (
        <EquipeView
          mesas={mesas} garcons={garcons} comandas={comandas}
          now={now} assigningGarcomId={assigningGarcomId}
          onAssign={handleAssign} onAddGarcom={onAddGarcom}
          onRemoveGarcom={onRemoveGarcom} onClickLivre={onClickLivre}
          onClickOcupada={onClickOcupada}
          allowRosterEditing={allowRosterEditing}
        />
      )}
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function FilterChip({ label, count, active, color, icon, onClick }: {
  label: string; count: number; active: boolean; color: string
  icon?: React.ReactNode; onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150"
      style={{
        background: active ? `${color}18` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? `${color}50` : 'rgba(255,255,255,0.08)'}`,
        color: active ? color : 'var(--text-soft)',
        transform: active ? 'scale(1.04)' : 'scale(1)',
      }}>
      {icon}
      {label}
      <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
        style={{ background: active ? `${color}25` : 'rgba(255,255,255,0.06)', color: active ? color : 'var(--text-muted)' }}>
        {count}
      </span>
    </button>
  )
}

function ViewBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-semibold transition-all"
      style={{
        background: active ? 'rgba(52,242,127,0.1)' : 'transparent',
        color: active ? '#36f57c' : 'var(--text-soft)',
        border: active ? '1px solid rgba(52,242,127,0.25)' : '1px solid transparent',
      }}>
      {icon} {label}
    </button>
  )
}
