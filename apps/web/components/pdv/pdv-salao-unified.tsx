'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { DragDropContext, Droppable, type DropResult } from '@hello-pangea/dnd'
import { AlertCircle, LayoutGrid, Maximize2, Minimize2, Plus, Users2, X, Zap } from 'lucide-react'
import { calcTotal, type Comanda, type Garcom, type Mesa, type MesaStatus } from './pdv-types'
import { formatCurrency } from '@/lib/currency'

// Imports from extracted modules
import { FilterChip, type FilterStatus, GarcomAvatar, garcomCor, initials, MesaCard, MesaCompact, resolveMesaComanda, type SalaoView, urgencyLevel, useUrgencyTick, ViewBtn } from './salao'

function matchesMesaFilter(mesa: Mesa, comanda: Comanda | undefined, filter: FilterStatus, now: number): boolean {
  if (filter === 'todos') {return true}
  if (filter === 'sem_garcom') {return !mesa.garcomId && mesa.status !== 'livre'}
  if (filter === 'atencao') {return urgencyLevel(mesa, comanda, now) >= 2}
  return mesa.status === filter
}

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

// ─── GarcomStrip (atribuição rápida por clique) ───────────────────────────────

function GarcomStrip({
  garcons,
  assigningGarcomId,
  onSelect,
}: {
  garcons: Garcom[]
  assigningGarcomId: string | null
  onSelect: (id: string | null) => void
}) {
  if (garcons.length === 0) {return null}
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[14px] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Atribuir →</span>
      {garcons.map((g) => {
        const active = assigningGarcomId === g.id
        return (
          <button
            className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold transition-all duration-150"
            key={g.id}
            style={{
              background: active ? `${g.cor}28` : 'var(--surface-soft)',
              border: `1px solid ${active ? `${g.cor}70` : 'var(--border)'}`,
              color: active ? g.cor : 'var(--text-soft)',
              transform: active ? 'scale(1.06)' : 'scale(1)',
              boxShadow: active ? `0 0 8px ${g.cor}30` : 'none',
            }}
            type="button"
            onClick={() => onSelect(active ? null : g.id)}
          >
            <GarcomAvatar garcom={g} size={16} />
            {g.nome.split(' ')[0]}
            {active && <span className="text-[9px] opacity-70">← clique na mesa</span>}
          </button>
        )
      })}
      {assigningGarcomId && (
        <button
          className="flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          type="button"
          onClick={() => onSelect(null)}
        >
          <X className="size-2.5" /> cancelar
        </button>
      )}
    </div>
  )
}

// ─── SalaoView ────────────────────────────────────────────────────────────────

function SalaoView({
  mesas,
  garcons,
  comandas,
  filter,
  now,
  assigningGarcomId,
  onStatusChange,
  onAssign,
  onClickLivre,
  onClickOcupada,
  onAddMesa,
  onSelectGarcom,
  allowMesaCatalogEditing,
  allowStatusDragging,
}: {
  mesas: Mesa[]
  garcons: Garcom[]
  comandas: Comanda[]
  filter: FilterStatus
  now: number
  assigningGarcomId: string | null
  onStatusChange: (mesaId: string, status: MesaStatus) => void
  onAssign: (mesaId: string, garcomId: string | undefined) => void
  onClickLivre: (m: Mesa) => void
  onClickOcupada: (c: Comanda) => void
  onAddMesa: () => void
  onSelectGarcom: (id: string | null) => void
  allowMesaCatalogEditing: boolean
  allowStatusDragging: boolean
}) {
  const [compactLivres, setCompactLivres] = useState(false)
  const comandaById = useMemo(() => new Map(comandas.map((comanda) => [comanda.id, comanda])), [comandas])

  function handleDragEnd(result: DropResult) {
    if (!allowStatusDragging) {return}
    const { draggableId, destination } = result
    if (!destination) {return}
    const newStatus = destination.droppableId as MesaStatus
    const mesa = mesas.find((m) => m.id === draggableId)
    if (!mesa || mesa.status === newStatus) {return}
    onStatusChange(draggableId, newStatus)
  }

  const { livreMesas, ocupMesas, resMesas } = useMemo(() => {
    const livre: Mesa[] = []
    const ocupada: Mesa[] = []
    const reservada: Mesa[] = []

    for (const mesa of mesas) {
      if (!matchesMesaFilter(mesa, resolveMesaComanda(mesa, comandaById), filter, now)) {continue}

      if (mesa.status === 'livre') {livre.push(mesa)}
      else if (mesa.status === 'ocupada') {ocupada.push(mesa)}
      else if (mesa.status === 'reservada') {reservada.push(mesa)}
    }

    return { livreMesas: livre, ocupMesas: ocupada, resMesas: reservada }
  }, [comandaById, filter, mesas, now])

  const zones = [
    {
      id: 'ocupada' as MesaStatus,
      label: 'Ocupada',
      color: '#f87171',
      border: 'rgba(248,113,113,0.2)',
      bg: 'rgba(248,113,113,0.03)',
      list: ocupMesas,
    },
    {
      id: 'reservada' as MesaStatus,
      label: 'Reservada',
      color: '#60a5fa',
      border: 'rgba(96,165,250,0.2)',
      bg: 'rgba(96,165,250,0.03)',
      list: resMesas,
    },
  ]

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        <GarcomStrip assigningGarcomId={assigningGarcomId} garcons={garcons} onSelect={onSelectGarcom} />

        {/* Pool livre */}
        <div
          className="rounded-2xl border p-4"
          style={{ borderColor: 'rgba(54,245,124,0.22)', background: 'rgba(54,245,124,0.02)' }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#36f57c] shadow-[0_0_6px_#36f57c]" />
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#36f57c]">Livre</span>
              <span className="text-xs text-[var(--text-muted)]">— clique para comanda · arraste para reservar</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1 rounded-[8px] border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                type="button"
                onClick={() => setCompactLivres((v) => !v)}
              >
                {compactLivres ? <Maximize2 className="size-3" /> : <Minimize2 className="size-3" />}
                {compactLivres ? 'Expandir' : 'Compactar'}
              </button>
              {allowMesaCatalogEditing ? (
                <button
                  className="flex items-center gap-1.5 rounded-[10px] border border-[rgba(54,245,124,0.3)] bg-[rgba(54,245,124,0.07)] px-3 py-1.5 text-xs font-semibold text-[#36f57c] transition-colors hover:bg-[rgba(54,245,124,0.13)]"
                  type="button"
                  onClick={onAddMesa}
                >
                  <Plus className="size-3" /> Nova Mesa
                </button>
              ) : null}
            </div>
          </div>

          <Droppable direction="horizontal" droppableId="livre">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex flex-wrap gap-3 min-h-[100px] rounded-xl p-1 transition-colors duration-150"
                style={{
                  background: snapshot.isDraggingOver ? 'rgba(54,245,124,0.05)' : 'transparent',
                  outline: snapshot.isDraggingOver ? '1.5px dashed rgba(54,245,124,0.4)' : '1.5px dashed transparent',
                }}
              >
                {livreMesas.length === 0 && !snapshot.isDraggingOver && (
                  <p className="self-center pl-1 text-xs text-[var(--text-muted)]">
                    Todas as mesas estão ocupadas ou reservadas
                  </p>
                )}
                {livreMesas.map((mesa, i) =>
                  compactLivres ? (
                    <MesaCompact
                      dragDisabled={!allowStatusDragging}
                      garcons={garcons}
                      index={i}
                      key={mesa.id}
                      mesa={mesa}
                      onAssign={onAssign}
                      onClickLivre={onClickLivre}
                    />
                  ) : (
                    <div key={mesa.id} style={{ width: 160 }}>
                      <MesaCard
                        assigningGarcomId={assigningGarcomId}
                        comanda={undefined}
                        dragDisabled={!allowStatusDragging}
                        garcons={garcons}
                        index={i}
                        mesa={mesa}
                        now={now}
                        view="salao"
                        onAssign={onAssign}
                        onClickLivre={onClickLivre}
                        onClickOcupada={onClickOcupada}
                      />
                    </div>
                  ),
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        {/* Colunas ocupada / reservada */}
        <div className="grid grid-cols-2 gap-4">
          {zones.map((zone) => (
            <div className="rounded-2xl border" key={zone.id} style={{ borderColor: zone.border, background: zone.bg }}>
              <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: zone.border }}>
                <span
                  className="size-2 rounded-full"
                  style={{ background: zone.color, boxShadow: `0 0 6px ${zone.color}` }}
                />
                <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: zone.color }}>
                  {zone.label}
                </span>
                <span
                  className="ml-auto flex size-5 items-center justify-center rounded-full text-[10px] font-bold"
                  style={{ background: `${zone.color}20`, color: zone.color }}
                >
                  {zone.list.length}
                </span>
              </div>
              <Droppable droppableId={zone.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex flex-col gap-2.5 p-3 min-h-[200px] transition-colors duration-150"
                    style={{
                      background: snapshot.isDraggingOver ? `${zone.color}08` : 'transparent',
                      outline: snapshot.isDraggingOver ? `1.5px dashed ${zone.color}50` : '1.5px dashed transparent',
                    }}
                  >
                    {zone.list.length === 0 && !snapshot.isDraggingOver && (
                      <p className="pt-8 text-center text-xs text-[var(--text-muted)]">
                        {zone.id === 'ocupada' ? 'Arraste para abrir comanda' : 'Arraste para reservar por 2h'}
                      </p>
                    )}
                    {zone.list.map((mesa, i) => (
                      <MesaCard
                        assigningGarcomId={assigningGarcomId}
                        comanda={resolveMesaComanda(mesa, comandaById)}
                        dragDisabled={!allowStatusDragging}
                        garcons={garcons}
                        index={i}
                        key={mesa.id}
                        mesa={mesa}
                        now={now}
                        view="salao"
                        onAssign={onAssign}
                        onClickLivre={onClickLivre}
                        onClickOcupada={onClickOcupada}
                      />
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
  mesas,
  garcons,
  comandas,
  now,
  assigningGarcomId,
  onAssign,
  onAddGarcom,
  onRemoveGarcom,
  onClickLivre,
  onClickOcupada,
  allowRosterEditing,
}: {
  mesas: Mesa[]
  garcons: Garcom[]
  comandas: Comanda[]
  now: number
  assigningGarcomId: string | null
  onAssign: (mesaId: string, garcomId: string | undefined) => void
  onAddGarcom: (nome: string) => void
  onRemoveGarcom: (id: string) => void
  onClickLivre: (m: Mesa) => void
  onClickOcupada: (c: Comanda) => void
  allowRosterEditing: boolean
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [newNome, setNewNome] = useState('')
  const semGarcom = mesas.filter((m) => !m.garcomId && m.status !== 'livre')
  const comandaById = useMemo(() => new Map(comandas.map((comanda) => [comanda.id, comanda])), [comandas])

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
          <button
            className="flex items-center gap-1.5 rounded-[12px] border border-[rgba(0,140,255,0.35)] bg-[rgba(0,140,255,0.08)] px-3 py-2 text-xs font-semibold text-[var(--accent)] transition-colors hover:bg-[rgba(0,140,255,0.16)]"
            type="button"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="size-3.5" /> Garçom
          </button>
        ) : null}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {semGarcom.length > 0 && (
          <div
            className="flex flex-shrink-0 flex-col rounded-2xl border"
            style={{ width: 200, borderColor: 'rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.02)' }}
          >
            <div className="flex items-center gap-2 border-b border-[rgba(251,191,36,0.15)] px-3 py-3">
              <AlertCircle className="size-3.5 text-[#fbbf24]" />
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#fbbf24]">Sem garçom</span>
              <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-[rgba(251,191,36,0.15)] text-[10px] font-bold text-[#fbbf24]">
                {semGarcom.length}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-3">
              {semGarcom.map((mesa) => (
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
        )}

        {garcons.map((garcom) => {
          const cor = garcomCor(garcom, garcons)
          const garcomMesas = mesas.filter((m) => m.garcomId === garcom.id && m.status !== 'livre')
          const totalAtivo = garcomMesas.reduce((sum, m) => {
            const c = resolveMesaComanda(m, comandaById)
            return sum + (c ? calcTotal(c) : 0)
          }, 0)

          return (
            <div
              className="flex flex-shrink-0 flex-col rounded-2xl border"
              key={garcom.id}
              style={{ width: 210, borderColor: `${cor}25`, background: `${cor}04` }}
            >
              <div
                className="relative flex flex-col items-center gap-1 border-b px-3 pb-3 pt-5"
                style={{ borderColor: `${cor}18` }}
              >
                {allowRosterEditing ? (
                  <button
                    className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full text-[var(--text-muted)] opacity-0 transition-opacity hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)] hover:opacity-100"
                    title="Remover garçom"
                    type="button"
                    onClick={() => onRemoveGarcom(garcom.id)}
                  >
                    <X className="size-3" />
                  </button>
                ) : null}
                <div
                  className="flex items-center justify-center rounded-full font-bold text-black"
                  style={{ width: 48, height: 48, background: cor, fontSize: 18 }}
                >
                  {initials(garcom.nome)}
                </div>
                <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">{garcom.nome}</p>
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
                {garcomMesas.map((mesa) => (
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
        })}

        {allowRosterEditing ? (
          <button
            className="flex w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-dashed border-[var(--border)] text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-soft)]"
            title="Adicionar garçom"
            type="button"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="size-5" />
          </button>
        ) : null}
      </div>

      {garcons.length === 0 && semGarcom.length === 0 && allowRosterEditing && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[var(--border)] py-20">
          <Users2 className="size-10 opacity-40 text-[var(--text-muted)]" />
          <div className="text-center">
            <p className="text-sm font-medium text-[var(--text-soft)]">Nenhum garçom em turno</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Adicione garçons para distribuir as mesas</p>
          </div>
          <button
            className="flex items-center gap-2 rounded-[14px] border border-[rgba(0,140,255,0.4)] bg-[rgba(0,140,255,0.1)] px-5 py-2.5 text-sm font-semibold text-[var(--accent)] transition-all hover:bg-[rgba(0,140,255,0.18)]"
            type="button"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="size-4" /> Adicionar Garçom
          </button>
        </div>
      )}

      {showAdd && allowRosterEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
            <h3 className="mb-4 text-base font-bold text-[var(--text-primary)]">Novo Garçom</h3>
            <input
              autoFocus
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
              placeholder="Nome do garçom"
              type="text"
              value={newNome}
              onChange={(e) => setNewNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newNome.trim()) {
                  onAddGarcom(newNome.trim())
                  setNewNome('')
                  setShowAdd(false)
                }
              }}
            />
            <div className="mt-4 flex gap-3">
              <button
                className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm text-[var(--text-soft)] hover:border-[var(--border-strong)]"
                type="button"
                onClick={() => setShowAdd(false)}
              >
                Cancelar
              </button>
              <button
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-40"
                disabled={!newNome.trim()}
                style={{ background: 'var(--accent)' }}
                type="button"
                onClick={() => {
                  onAddGarcom(newNome.trim())
                  setNewNome('')
                  setShowAdd(false)
                }}
              >
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
  mesas,
  garcons,
  comandas,
  onStatusChange,
  onAssignGarcom,
  onAddGarcom,
  onRemoveGarcom,
  onAddMesa,
  onClickLivre,
  onClickOcupada,
  allowMesaCatalogEditing = true,
  allowRosterEditing = true,
  allowStatusDragging = true,
}: Readonly<Props>) {
  const [view, setView] = useState<SalaoView>('salao')
  const [filter, setFilter] = useState<FilterStatus>('todos')
  const now = useUrgencyTick(60_000)
  const [assigningGarcomId, setAssigning] = useState<string | null>(null)
  const comandaById = useMemo(() => new Map(comandas.map((comanda) => [comanda.id, comanda])), [comandas])

  // ESC cancela modo de atribuição
  useEffect(() => {
    if (!assigningGarcomId) {return}
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {setAssigning(null)}
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [assigningGarcomId])

  // Modo persistente: atribui e mantém o garçom selecionado para continuar atribuindo
  // ESC ou clicar novamente no garçom na strip cancela o modo
  const handleAssign = useCallback(
    (mesaId: string, garcomId: string | undefined) => {
      onAssignGarcom(mesaId, garcomId)
      // não limpa o assigningGarcomId — modo permanece ativo
    },
    [onAssignGarcom],
  )

  // Stats
  const { livres, ocupadas, semGarcom, comAtencao, totalAberto } = useMemo(() => {
    let livresCount = 0
    let ocupadasCount = 0
    let semGarcomCount = 0
    let comAtencaoCount = 0
    let totalAbertoValue = 0

    for (const mesa of mesas) {
      const comanda = resolveMesaComanda(mesa, comandaById)

      if (mesa.status === 'livre') {
        livresCount += 1
      }

      if (mesa.status === 'ocupada') {
        ocupadasCount += 1
        if (comanda) {
          totalAbertoValue += calcTotal(comanda)
        }
      }

      if (mesa.status !== 'livre' && !mesa.garcomId) {
        semGarcomCount += 1
      }

      if (urgencyLevel(mesa, comanda, now) >= 2) {
        comAtencaoCount += 1
      }
    }

    return {
      livres: livresCount,
      ocupadas: ocupadasCount,
      semGarcom: semGarcomCount,
      comAtencao: comAtencaoCount,
      totalAberto: totalAbertoValue,
    }
  }, [comandaById, mesas, now])

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
          <FilterChip
            active={filter === 'todos'}
            color="#7a8896"
            count={mesas.length}
            label="Todos"
            onClick={() => setFilter('todos')}
          />
          <FilterChip
            active={filter === 'livre'}
            color="#36f57c"
            count={livres}
            label="Livres"
            onClick={() => setFilter('livre')}
          />
          <FilterChip
            active={filter === 'ocupada'}
            color="#f87171"
            count={ocupadas}
            label="Ocupadas"
            onClick={() => setFilter('ocupada')}
          />
          {semGarcom > 0 && (
            <FilterChip
              active={filter === 'sem_garcom'}
              color="#fbbf24"
              count={semGarcom}
              icon={<AlertCircle className="size-3" />}
              label="Sem garçom"
              onClick={() => setFilter('sem_garcom')}
            />
          )}
          {comAtencao > 0 && (
            <FilterChip
              active={filter === 'atencao'}
              color="#f87171"
              count={comAtencao}
              icon={<Zap className="size-3" />}
              label="Atenção"
              onClick={() => setFilter('atencao')}
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          {totalAberto > 0 && (
            <div className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs">
              <span className="text-[var(--text-muted)]">Em aberto </span>
              <span className="font-bold text-[var(--text-primary)]">{formatCurrency(totalAberto, 'BRL')}</span>
            </div>
          )}
          <div className="flex rounded-[12px] border border-[var(--border)] bg-[var(--surface-muted)] p-0.5">
            <ViewBtn
              active={view === 'salao'}
              icon={<LayoutGrid className="size-3.5" />}
              label="Salão"
              onClick={() => setView('salao')}
            />
            <ViewBtn
              active={view === 'equipe'}
              icon={<Users2 className="size-3.5" />}
              label="Equipe"
              onClick={() => setView('equipe')}
            />
          </div>
        </div>
      </div>

      {view === 'salao' && (
        <p className="text-xs text-[var(--text-soft)]">
          {allowStatusDragging
            ? 'Livre→Ocupada: abre comanda · Livre→Reservada: reserva por 2h · Reservada→Livre: cancela reserva · selecione garçom para atribuir (ESC cancela) · hover para ver itens'
            : 'O estado das mesas acompanha a comanda real · selecione um garçom para redistribuir o atendimento · hover na comanda para ver os itens'}
        </p>
      )}

      {view === 'salao' ? (
        <SalaoView
          allowMesaCatalogEditing={allowMesaCatalogEditing}
          allowStatusDragging={allowStatusDragging}
          assigningGarcomId={assigningGarcomId}
          comandas={comandas}
          filter={filter}
          garcons={garcons}
          mesas={mesas}
          now={now}
          onAddMesa={onAddMesa}
          onAssign={handleAssign}
          onClickLivre={onClickLivre}
          onClickOcupada={onClickOcupada}
          onSelectGarcom={setAssigning}
          onStatusChange={onStatusChange}
        />
      ) : (
        <EquipeView
          allowRosterEditing={allowRosterEditing}
          assigningGarcomId={assigningGarcomId}
          comandas={comandas}
          garcons={garcons}
          mesas={mesas}
          now={now}
          onAddGarcom={onAddGarcom}
          onAssign={handleAssign}
          onClickLivre={onClickLivre}
          onClickOcupada={onClickOcupada}
          onRemoveGarcom={onRemoveGarcom}
        />
      )}
    </div>
  )
}
