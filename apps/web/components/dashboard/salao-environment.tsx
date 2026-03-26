'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Armchair, Clock, Grid3X3, List, Pencil, Plus, Power, Zap, X } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { MesaRecord } from '@contracts/contracts'
import { createMesa, fetchMesas, fetchOperationsLive, updateMesa } from '@/lib/api'
import { DashboardSectionHeading } from '@/components/dashboard/dashboard-section-heading'
import { buildPdvComandas, buildPdvMesas } from '@/components/pdv/pdv-operations'
import { calcTotal, formatElapsed, type Mesa, type Comanda } from '@/components/pdv/pdv-types'

function fmtBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ── constants ──────────────────────────────────────────────────────────────────

const QUERY_KEY = ['mesas'] as const
const CANVAS_H = 560
const CARD_W = 112
const CARD_H = 76
const GRID_SPACING_X = 136
const GRID_SPACING_Y = 100
const GRID_COLS = 7
const CANVAS_PADDING = 24

// ── types ──────────────────────────────────────────────────────────────────────

type View = 'operacional' | 'configuracao' | 'planta'

type CreateForm = {
  mode: 'single' | 'bulk'
  label: string
  capacity: string
  section: string
  bulkPrefix: string
  bulkFrom: string
  bulkTo: string
}

type EditForm = {
  label: string
  capacity: string
  section: string
}

type DragState = {
  mesaId: string
  startMouseX: number
  startMouseY: number
  origX: number
  origY: number
}

// ── helpers ────────────────────────────────────────────────────────────────────

function defaultCreateForm(): CreateForm {
  return { mode: 'single', label: '', capacity: '4', section: '', bulkPrefix: 'Mesa', bulkFrom: '1', bulkTo: '10' }
}

function getAutoPosition(index: number): { x: number; y: number } {
  const col = index % GRID_COLS
  const row = Math.floor(index / GRID_COLS)
  return { x: CANVAS_PADDING + col * GRID_SPACING_X, y: CANVAS_PADDING + row * GRID_SPACING_Y }
}

function clamp(value: number, min: number, maxValue: number) {
  return Math.max(min, Math.min(maxValue, value))
}

const URGENCY_BORDER: Record<0 | 1 | 2 | 3, string> = {
  0: 'rgba(248,113,113,0.25)',
  1: 'rgba(251,191,36,0.28)',
  2: 'rgba(251,191,36,0.55)',
  3: 'rgba(248,113,113,0.65)',
}

const URGENCY_SHADOW: Record<0 | 1 | 2 | 3, string | undefined> = {
  0: undefined,
  1: undefined,
  2: '0 0 10px rgba(251,191,36,0.12)',
  3: '0 0 18px rgba(248,113,113,0.2)',
}

// ── main component ─────────────────────────────────────────────────────────────

export function SalaoEnvironment() {
  const queryClient = useQueryClient()

  const [view, setView] = useState<View>('operacional')
  const [showCreate, setShowCreate] = useState(false)
  const [editingMesa, setEditingMesa] = useState<MesaRecord | null>(null)
  const [createForm, setCreateForm] = useState<CreateForm>(defaultCreateForm)
  const [editForm, setEditForm] = useState<EditForm>({ label: '', capacity: '4', section: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const [dragging, setDragging] = useState<DragState | null>(null)
  const [dragOverrides, setDragOverrides] = useState<Record<string, { x: number; y: number }>>({})
  const dragOverridesRef = useRef(dragOverrides)
  useLayoutEffect(() => { dragOverridesRef.current = dragOverrides })
  const canvasRef = useRef<HTMLDivElement>(null)

  // ── queries ──────────────────────────────────────────────────────────────────

  const { data: mesas = [], isLoading: mesasLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchMesas,
  })

  const { data: liveData, isLoading: liveLoading } = useQuery({
    queryKey: ['operations', 'live'],
    queryFn: () => fetchOperationsLive(),
    refetchInterval: 15_000,
    enabled: view === 'operacional',
  })

  const liveMesas = useMemo(() => buildPdvMesas(liveData), [liveData])
  const liveComandas = useMemo(() => buildPdvComandas(liveData), [liveData])

  // garçom display name by employeeId
  const garcomNames = useMemo(() => {
    if (!liveData) return {} as Record<string, string>
    return Object.fromEntries(
      liveData.employees
        .filter((e) => e.employeeId)
        .map((e) => [e.employeeId!, e.displayName])
    )
  }, [liveData])

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    void queryClient.invalidateQueries({ queryKey: ['operations', 'live'] })
  }

  // ── mutations ─────────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: createMesa,
    onSuccess: () => {
      invalidate()
      setShowCreate(false)
      setCreateForm(defaultCreateForm())
      setFormError(null)
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : 'Erro ao criar mesa'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateMesa>[1] }) =>
      updateMesa(id, body),
    onSuccess: () => {
      invalidate()
      setEditingMesa(null)
      setFormError(null)
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : 'Erro ao atualizar mesa'),
  })

  // ── drag ──────────────────────────────────────────────────────────────────────

  function getMesaPosition(mesa: MesaRecord, autoIndex: number): { x: number; y: number } {
    if (dragOverrides[mesa.id]) return dragOverrides[mesa.id]
    if (mesa.positionX !== null && mesa.positionY !== null) return { x: mesa.positionX, y: mesa.positionY }
    return getAutoPosition(autoIndex)
  }

  function handleMouseDown(e: React.MouseEvent, mesa: MesaRecord, autoIndex: number) {
    e.preventDefault()
    const pos = getMesaPosition(mesa, autoIndex)
    setDragging({ mesaId: mesa.id, startMouseX: e.clientX, startMouseY: e.clientY, origX: pos.x, origY: pos.y })
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging) return
      const canvasEl = canvasRef.current
      const canvasW = canvasEl ? canvasEl.offsetWidth : 800
      const newX = clamp(dragging.origX + (e.clientX - dragging.startMouseX), 0, canvasW - CARD_W)
      const newY = clamp(dragging.origY + (e.clientY - dragging.startMouseY), 0, CANVAS_H - CARD_H)
      setDragOverrides((prev) => ({ ...prev, [dragging.mesaId]: { x: newX, y: newY } }))
    },
    [dragging],
  )

  const handleMouseUp = useCallback(() => {
    if (!dragging) return
    const pos = dragOverridesRef.current[dragging.mesaId]
    if (pos) {
      updateMutation.mutate({
        id: dragging.mesaId,
        body: { positionX: Math.round(pos.x), positionY: Math.round(pos.y) },
      })
    }
    setDragging(null)
  }, [dragging, updateMutation])

  useEffect(() => {
    if (!dragging) return
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, handleMouseMove, handleMouseUp])

  // ── create / edit ─────────────────────────────────────────────────────────────

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (createForm.mode === 'single') {
      if (!createForm.label.trim()) return setFormError('Nome é obrigatório')
      const cap = parseInt(createForm.capacity, 10)
      createMutation.mutate({
        label: createForm.label.trim(),
        capacity: cap > 0 ? cap : 4,
        section: createForm.section.trim() || undefined,
      })
    } else {
      const from = parseInt(createForm.bulkFrom, 10)
      const to = parseInt(createForm.bulkTo, 10)
      if (isNaN(from) || isNaN(to) || from > to || to - from > 49) {
        return setFormError('Range inválido (máx 50 de uma vez)')
      }
      const cap = parseInt(createForm.capacity, 10)
      const prefix = createForm.bulkPrefix.trim() || 'Mesa'
      const section = createForm.section.trim() || undefined
      for (let n = from; n <= to; n++) {
        await createMutation.mutateAsync({ label: `${prefix} ${n}`, capacity: cap > 0 ? cap : 4, section }).catch(() => {})
      }
      invalidate()
      setShowCreate(false)
      setCreateForm(defaultCreateForm())
    }
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingMesa) return
    setFormError(null)
    if (!editForm.label.trim()) return setFormError('Nome é obrigatório')
    const cap = parseInt(editForm.capacity, 10)
    updateMutation.mutate({
      id: editingMesa.id,
      body: { label: editForm.label.trim(), capacity: cap > 0 ? cap : 4, section: editForm.section.trim() || undefined },
    })
  }

  function openEdit(mesa: MesaRecord) {
    setEditForm({ label: mesa.label, capacity: String(mesa.capacity), section: mesa.section ?? '' })
    setEditingMesa(mesa)
    setFormError(null)
  }

  function toggleActive(mesa: MesaRecord) {
    updateMutation.mutate({ id: mesa.id, body: { active: !mesa.active } })
  }

  // ── derived ───────────────────────────────────────────────────────────────────

  const activeMesas = mesas.filter((m) => m.active)
  const inactiveMesas = mesas.filter((m) => !m.active)

  // ── render ────────────────────────────────────────────────────────────────────

  const TABS: { id: View; label: string }[] = [
    { id: 'operacional', label: 'Operacional' },
    { id: 'configuracao', label: 'Configuração' },
    { id: 'planta', label: 'Planta Baixa' },
  ]

  return (
    <div className="space-y-6">
      <DashboardSectionHeading
        eyebrow="Gestão do salão"
        icon={Armchair}
        title="Salão"
        description="Acompanhe o status das mesas em tempo real, gerencie o cadastro e posicione na planta baixa."
      />

      {/* tab bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 rounded-xl bg-[rgba(255,255,255,0.04)] p-1">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                view === id
                  ? 'bg-[var(--accent)] text-black'
                  : 'text-[var(--text-soft)] hover:text-[var(--text-primary)]'
              }`}
            >
              {id === 'operacional' ? <Zap className="size-4" /> : id === 'configuracao' ? <List className="size-4" /> : <Grid3X3 className="size-4" />}
              {label}
            </button>
          ))}
        </div>

        {view === 'configuracao' && (
          <button
            onClick={() => {
              setCreateForm(defaultCreateForm())
              setFormError(null)
              setShowCreate(true)
            }}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent-strong)]"
          >
            <Plus className="size-4" /> Nova Mesa
          </button>
        )}
      </div>

      {/* ── OPERACIONAL ── */}
      {view === 'operacional' && (
        <OperacionalView
          liveMesas={liveMesas}
          liveComandas={liveComandas}
          garcomNames={garcomNames}
          isLoading={liveLoading}
        />
      )}

      {/* ── CONFIGURAÇÃO ── */}
      {view === 'configuracao' && (
        <div className="space-y-6">
          {mesasLoading && <p className="text-sm text-[var(--text-soft)]">Carregando mesas…</p>}

          {!mesasLoading && mesas.length === 0 && (
            <div className="imperial-card-soft flex flex-col items-center gap-3 rounded-2xl py-16 text-center">
              <span className="text-5xl">🪑</span>
              <p className="text-sm text-[var(--text-soft)]">Nenhuma mesa cadastrada ainda.</p>
              <button
                onClick={() => { setCreateForm(defaultCreateForm()); setShowCreate(true) }}
                className="mt-1 text-sm font-medium text-[var(--accent)] hover:underline"
              >
                Criar primeira mesa
              </button>
            </div>
          )}

          {activeMesas.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--text-soft)]">
                Ativas — {activeMesas.length}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {activeMesas.map((mesa) => (
                  <MesaListCard
                    key={mesa.id}
                    mesa={mesa}
                    onEdit={() => openEdit(mesa)}
                    onToggle={() => toggleActive(mesa)}
                    isPending={updateMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {inactiveMesas.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--text-soft)]">
                Inativas — {inactiveMesas.length}
              </p>
              <div className="grid grid-cols-2 gap-3 opacity-50 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {inactiveMesas.map((mesa) => (
                  <MesaListCard
                    key={mesa.id}
                    mesa={mesa}
                    onEdit={() => openEdit(mesa)}
                    onToggle={() => toggleActive(mesa)}
                    isPending={updateMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PLANTA BAIXA ── */}
      {view === 'planta' && (
        <div className="imperial-card-soft overflow-hidden rounded-2xl p-2">
          <div
            ref={canvasRef}
            className="relative w-full rounded-xl"
            style={{
              height: CANVAS_H,
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
              backgroundColor: 'rgba(0,0,0,0.28)',
              cursor: dragging ? 'grabbing' : 'default',
              userSelect: 'none',
            }}
          >
            {mesasLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-[var(--text-soft)]">Carregando…</p>
              </div>
            )}

            {!mesasLoading && activeMesas.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <p className="text-sm text-[var(--text-soft)]">Nenhuma mesa ativa. Crie mesas na aba Configuração.</p>
              </div>
            )}

            {activeMesas.map((mesa, index) => {
              const pos = getMesaPosition(mesa, index)
              const isDraggingThis = dragging?.mesaId === mesa.id
              return (
                <div
                  key={mesa.id}
                  onMouseDown={(e) => handleMouseDown(e, mesa, index)}
                  style={{
                    position: 'absolute',
                    left: pos.x,
                    top: pos.y,
                    width: CARD_W,
                    height: CARD_H,
                    zIndex: isDraggingThis ? 50 : 1,
                    transform: isDraggingThis ? 'scale(1.07)' : 'scale(1)',
                    transition: isDraggingThis ? 'none' : 'transform 0.12s',
                    cursor: isDraggingThis ? 'grabbing' : 'grab',
                  }}
                >
                  <MesaFloorCard mesa={mesa} isDragging={isDraggingThis} />
                </div>
              )
            })}
          </div>
          <p className="mt-2 px-1 text-xs text-[var(--text-soft)]">
            Arraste as mesas para posicioná-las no salão. As posições são salvas automaticamente.
          </p>
        </div>
      )}

      {/* ── MODAL CRIAR ── */}
      {showCreate && (
        <Modal
          title="Nova Mesa"
          onClose={() => { setShowCreate(false); setFormError(null) }}
        >
          <form onSubmit={(e) => void handleCreateSubmit(e)} className="space-y-4">
            <div className="flex items-center gap-1 rounded-xl bg-[rgba(255,255,255,0.04)] p-1">
              {(['single', 'bulk'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCreateForm((f) => ({ ...f, mode }))}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                    createForm.mode === mode
                      ? 'bg-[var(--accent)] text-black'
                      : 'text-[var(--text-soft)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {mode === 'single' ? 'Mesa única' : 'Criar várias de uma vez'}
                </button>
              ))}
            </div>

            {createForm.mode === 'single' ? (
              <>
                <Field label="Nome da mesa *">
                  <input
                    className="imperial-input w-full"
                    placeholder="Ex: Mesa 1, VIP, Varanda"
                    value={createForm.label}
                    onChange={(e) => setCreateForm((f) => ({ ...f, label: e.target.value }))}
                    maxLength={40}
                    autoFocus
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Capacidade">
                    <input
                      type="number"
                      min={1}
                      className="imperial-input w-full"
                      value={createForm.capacity}
                      onChange={(e) => setCreateForm((f) => ({ ...f, capacity: e.target.value }))}
                    />
                  </Field>
                  <Field label="Seção">
                    <input
                      className="imperial-input w-full"
                      placeholder="Salão, Varanda, Bar…"
                      value={createForm.section}
                      onChange={(e) => setCreateForm((f) => ({ ...f, section: e.target.value }))}
                    />
                  </Field>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Prefixo">
                    <input
                      className="imperial-input w-full"
                      placeholder="Mesa"
                      value={createForm.bulkPrefix}
                      onChange={(e) => setCreateForm((f) => ({ ...f, bulkPrefix: e.target.value }))}
                    />
                  </Field>
                  <Field label="De">
                    <input
                      type="number"
                      min={1}
                      className="imperial-input w-full"
                      value={createForm.bulkFrom}
                      onChange={(e) => setCreateForm((f) => ({ ...f, bulkFrom: e.target.value }))}
                    />
                  </Field>
                  <Field label="Até">
                    <input
                      type="number"
                      min={1}
                      className="imperial-input w-full"
                      value={createForm.bulkTo}
                      onChange={(e) => setCreateForm((f) => ({ ...f, bulkTo: e.target.value }))}
                    />
                  </Field>
                </div>
                <p className="rounded-lg bg-[rgba(195,164,111,0.08)] px-3 py-2 text-xs text-[var(--text-soft)]">
                  Criará:{' '}
                  <strong className="text-[var(--accent)]">{createForm.bulkPrefix || 'Mesa'} {createForm.bulkFrom}</strong>
                  {' '}até{' '}
                  <strong className="text-[var(--accent)]">{createForm.bulkPrefix || 'Mesa'} {createForm.bulkTo}</strong>
                  {' '}— {Math.max(0, parseInt(createForm.bulkTo, 10) - parseInt(createForm.bulkFrom, 10) + 1) || 0} mesas
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Capacidade padrão">
                    <input
                      type="number"
                      min={1}
                      className="imperial-input w-full"
                      value={createForm.capacity}
                      onChange={(e) => setCreateForm((f) => ({ ...f, capacity: e.target.value }))}
                    />
                  </Field>
                  <Field label="Seção">
                    <input
                      className="imperial-input w-full"
                      placeholder="Opcional"
                      value={createForm.section}
                      onChange={(e) => setCreateForm((f) => ({ ...f, section: e.target.value }))}
                    />
                  </Field>
                </div>
              </>
            )}

            {formError && <p className="text-xs text-red-400">{formError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setShowCreate(false); setFormError(null) }}
                className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-soft)] transition-colors hover:text-[var(--text-primary)]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-50"
              >
                {createMutation.isPending ? 'Criando…' : 'Criar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL EDITAR ── */}
      {editingMesa && (
        <Modal
          title={`Editar — ${editingMesa.label}`}
          onClose={() => { setEditingMesa(null); setFormError(null) }}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <Field label="Nome da mesa *">
              <input
                className="imperial-input w-full"
                value={editForm.label}
                onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                maxLength={40}
                autoFocus
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Capacidade">
                <input
                  type="number"
                  min={1}
                  className="imperial-input w-full"
                  value={editForm.capacity}
                  onChange={(e) => setEditForm((f) => ({ ...f, capacity: e.target.value }))}
                />
              </Field>
              <Field label="Seção">
                <input
                  className="imperial-input w-full"
                  placeholder="Salão, Varanda, Bar…"
                  value={editForm.section}
                  onChange={(e) => setEditForm((f) => ({ ...f, section: e.target.value }))}
                />
              </Field>
            </div>

            {formError && <p className="text-xs text-red-400">{formError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setEditingMesa(null); setFormError(null) }}
                className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-soft)] transition-colors hover:text-[var(--text-primary)]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ── OperacionalView ─────────────────────────────────────────────────────────────

function OperacionalView({
  liveMesas,
  liveComandas,
  garcomNames,
  isLoading,
}: {
  liveMesas: Mesa[]
  liveComandas: Comanda[]
  garcomNames: Record<string, string>
  isLoading: boolean
}) {
  const now = Date.now()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-[rgba(255,255,255,0.04)]" />
        ))}
      </div>
    )
  }

  if (liveMesas.length === 0) {
    return (
      <div className="imperial-card-soft flex flex-col items-center gap-3 rounded-2xl py-16 text-center">
        <span className="text-5xl">🪑</span>
        <p className="text-sm text-[var(--text-soft)]">Nenhuma mesa ativa.</p>
        <p className="text-xs text-[var(--text-soft)] opacity-60">Crie mesas na aba Configuração.</p>
      </div>
    )
  }

  const livres = liveMesas.filter((m) => m.status === 'livre')
  const ocupadas = liveMesas.filter((m) => m.status === 'ocupada')
  const reservadas = liveMesas.filter((m) => m.status === 'reservada')

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="flex items-center gap-6 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-5 py-3">
        <Kpi label="Ocupadas" value={ocupadas.length} color="#f87171" />
        <div className="h-8 w-px bg-[rgba(255,255,255,0.06)]" />
        <Kpi label="Livres" value={livres.length} color="#36f57c" />
        <div className="h-8 w-px bg-[rgba(255,255,255,0.06)]" />
        <Kpi label="Reservadas" value={reservadas.length} color="#60a5fa" />
        {ocupadas.length > 0 && (
          <>
            <div className="h-8 w-px bg-[rgba(255,255,255,0.06)]" />
            <Kpi
              label="Receita aberta"
              value={fmtBRL(
                ocupadas.reduce((sum, m) => {
                  const comanda = liveComandas.find((c) => c.id === m.comandaId)
                  return sum + (comanda ? calcTotal(comanda) : 0)
                }, 0)
              )}
              color="var(--accent)"
            />
          </>
        )}
      </div>

      {/* Mesa grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {liveMesas.map((mesa) => {
          const comanda = mesa.comandaId ? liveComandas.find((c) => c.id === mesa.comandaId) : undefined
          const garcomId = mesa.garcomId
          const garcomName = garcomId ? garcomNames[garcomId] : undefined

          let urgency: 0 | 1 | 2 | 3 = 0
          if (comanda && mesa.status === 'ocupada') {
            const min = Math.floor((now - comanda.abertaEm.getTime()) / 60000)
            urgency = min >= 90 ? 3 : min >= 60 ? 2 : min >= 30 ? 1 : 0
          }

          return (
            <OperacionalCard
              key={mesa.id}
              mesa={mesa}
              comanda={comanda}
              garcomName={garcomName}
              urgency={urgency}
            />
          )
        })}
      </div>
    </div>
  )
}

function Kpi({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-soft)' }}>{label}</p>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
    </div>
  )
}

function OperacionalCard({
  mesa,
  comanda,
  garcomName,
  urgency,
}: {
  mesa: Mesa
  comanda: Comanda | undefined
  garcomName: string | undefined
  urgency: 0 | 1 | 2 | 3
}) {
  const STATUS_CFG = {
    livre:     { label: 'Livre',     color: '#36f57c', bg: 'rgba(54,245,124,0.06)'  },
    ocupada:   { label: 'Ocupada',   color: '#f87171', bg: 'rgba(248,113,113,0.06)' },
    reservada: { label: 'Reservada', color: '#60a5fa', bg: 'rgba(96,165,250,0.06)'  },
  }

  const cfg = STATUS_CFG[mesa.status]
  const borderColor = mesa.status === 'ocupada' ? URGENCY_BORDER[urgency] : `${cfg.color}28`

  const total = comanda ? calcTotal(comanda) : 0
  const itemCount = comanda ? comanda.itens.reduce((s, i) => s + i.quantidade, 0) : 0
  const elapsed = comanda ? formatElapsed(comanda.abertaEm) : null

  return (
    <div
      className="imperial-card-soft flex flex-col gap-2 rounded-xl p-3 transition-all duration-300"
      style={{
        backgroundColor: cfg.bg,
        borderColor,
        boxShadow: URGENCY_SHADOW[urgency],
      }}
    >
      {/* Header: label + status badge */}
      <div className="flex items-start justify-between gap-1">
        <span className="truncate text-sm font-bold text-[var(--text-primary)]">{mesa.numero}</span>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: cfg.color, backgroundColor: `${cfg.color}18` }}
        >
          {cfg.label}
        </span>
      </div>

      {comanda ? (
        <>
          {/* Itens + garçom */}
          <p className="text-[11px] text-[var(--text-soft)]">
            {itemCount} {itemCount === 1 ? 'item' : 'itens'}
            {garcomName ? <span className="opacity-70"> · {garcomName.split(' ')[0]}</span> : null}
          </p>
          {/* Tempo + total */}
          <div className="flex items-center justify-between gap-1">
            <span
              className="flex items-center gap-0.5 text-[11px]"
              style={{ color: urgency >= 2 ? '#fbbf24' : urgency === 1 ? '#fb923c' : 'var(--text-soft)' }}
            >
              <Clock className="size-3 shrink-0" />
              {elapsed}
            </span>
            <span className="text-xs font-semibold text-white">{fmtBRL(total)}</span>
          </div>
        </>
      ) : (
        <p className="text-[11px] text-[var(--text-soft)]">
          👤 {mesa.capacidade}
        </p>
      )}
    </div>
  )
}

// ── sub-components ─────────────────────────────────────────────────────────────

function MesaListCard({
  mesa,
  onEdit,
  onToggle,
  isPending,
}: {
  mesa: MesaRecord
  onEdit: () => void
  onToggle: () => void
  isPending: boolean
}) {
  return (
    <div className="imperial-card-soft group flex flex-col gap-2 rounded-xl p-3">
      <div className="flex items-start justify-between gap-1">
        <span className="truncate font-semibold text-[var(--text-primary)]">{mesa.label}</span>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onEdit}
            title="Editar"
            className="rounded-lg p-1 transition-colors hover:bg-[rgba(255,255,255,0.08)]"
          >
            <Pencil className="size-3.5 text-[var(--text-soft)]" />
          </button>
          <button
            onClick={onToggle}
            disabled={isPending}
            title={mesa.active ? 'Desativar' : 'Reativar'}
            className="rounded-lg p-1 transition-colors hover:bg-[rgba(255,255,255,0.08)]"
          >
            <Power className={`size-3.5 ${mesa.active ? 'text-[var(--text-soft)]' : 'text-emerald-400'}`} />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-[var(--text-soft)]">
        <span>👤 {mesa.capacity}</span>
        {mesa.section && <span className="truncate">· {mesa.section}</span>}
      </div>
      {mesa.active && (
        <span
          className="w-fit rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
          style={{
            background:
              mesa.status === 'ocupada' ? 'rgba(248,113,113,0.12)' :
              mesa.status === 'reservada' ? 'rgba(96,165,250,0.12)' :
              'rgba(52,242,127,0.08)',
            color:
              mesa.status === 'ocupada' ? '#f87171' :
              mesa.status === 'reservada' ? '#60a5fa' :
              '#36f57c',
          }}
        >
          {mesa.status === 'ocupada' ? 'Ocupada' : mesa.status === 'reservada' ? 'Reservada' : 'Livre'}
        </span>
      )}
    </div>
  )
}

function MesaFloorCard({ mesa, isDragging }: { mesa: MesaRecord; isDragging: boolean }) {
  const statusColor =
    mesa.status === 'ocupada' ? '#ef4444' : mesa.status === 'reservada' ? '#a78bfa' : '#34d399'

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
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: statusColor }}
          title={mesa.status}
        />
      </div>
      <div className="text-[10px] leading-tight text-[var(--text-soft)]">
        <span>👤 {mesa.capacity}</span>
        {mesa.section && <span className="ml-1 truncate opacity-75">· {mesa.section}</span>}
      </div>
    </div>
  )
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="imperial-card w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-soft)] transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--text-primary)]"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[var(--text-soft)]">{label}</label>
      {children}
    </div>
  )
}
