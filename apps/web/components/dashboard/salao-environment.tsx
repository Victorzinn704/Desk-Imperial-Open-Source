'use client'

import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { Armchair, ClipboardList, Grid3X3, List, Plus, Zap } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { MesaRecord } from '@contracts/contracts'
import { createMesa, fetchMesas, fetchOperationsLive, updateMesa } from '@/lib/api'
import { DashboardSectionHeading } from '@/components/dashboard/dashboard-section-heading'
import { buildPdvComandas, buildPdvMesas } from '@/components/pdv/pdv-operations'
import { calcTotal, type Mesa, type Comanda } from '@/components/pdv/pdv-types'

// Imports from extracted salao module
import {
  QUERY_KEY,
  LIVE_QUERY_KEY,
  CANVAS_H,
  CARD_W,
  CARD_H,
  STATUS_LABEL,
  fmtBRL,
  defaultCreateForm,
  type View,
  type CreateForm,
  type EditForm,
} from './salao'
import { useMesaDrag } from './salao'
import { KpiCard, ModernOperacionalCard, MesaListCard, MesaFloorCard } from './salao'
import { CreateMesaModal, EditMesaModal } from './salao'

// ── main component ─────────────────────────────────────────────────────────────

export function SalaoEnvironment() {
  const queryClient = useQueryClient()

  const [view, setView] = useState<View>('operacional')
  const [showCreate, setShowCreate] = useState(false)
  const [editingMesa, setEditingMesa] = useState<MesaRecord | null>(null)
  const [createForm, setCreateForm] = useState<CreateForm>(defaultCreateForm)
  const [editForm, setEditForm] = useState<EditForm>({ label: '', capacity: '4', section: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  // ── queries ──────────────────────────────────────────────────────────────────

  // CORREÇÃO: staleTime adicionado para evitar refetch desnecessário
  // Mesas mudam raramente, 60s é suficiente para evitar requests redundantes
  const { data: mesas = [], isLoading: mesasLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchMesas,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  // Hot path operacional usa snapshot compacto; a visão de comandas carrega o
  // payload completo só quando realmente precisamos dos itens.
  const { data: compactLiveData, isLoading: compactLiveLoading } = useQuery({
    queryKey: LIVE_QUERY_KEY,
    queryFn: () => fetchOperationsLive({ includeCashMovements: false, compactMode: true }),
    refetchInterval: 15_000,
    staleTime: 10_000,
    enabled: view === 'operacional',
    refetchOnWindowFocus: false,
  })

  const FULL_LIVE_QUERY_KEY = ['operations', 'live', 'full'] as const
  const { data: detailedLiveData, isLoading: detailedLiveLoading } = useQuery({
    queryKey: FULL_LIVE_QUERY_KEY,
    queryFn: () => fetchOperationsLive({ includeCashMovements: false }),
    refetchInterval: 15_000,
    staleTime: 10_000,
    enabled: view === 'comandas',
    refetchOnWindowFocus: false,
  })

  const liveData = view === 'comandas' ? detailedLiveData : compactLiveData
  const liveLoading = view === 'comandas' ? detailedLiveLoading : compactLiveLoading
  const liveMesas = useMemo(() => buildPdvMesas(liveData), [liveData])
  const liveComandas = useMemo(() => buildPdvComandas(liveData), [liveData])

  // garçom display name by employeeId
  const garcomNames = useMemo(() => {
    if (!liveData) return {} as Record<string, string>
    return Object.fromEntries(liveData.employees.filter((e) => e.employeeId).map((e) => [e.employeeId!, e.displayName]))
  }, [liveData])

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    void queryClient.invalidateQueries({ queryKey: LIVE_QUERY_KEY })
    void queryClient.invalidateQueries({ queryKey: FULL_LIVE_QUERY_KEY })
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
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateMesa>[1] }) => updateMesa(id, body),
    onSuccess: () => {
      invalidate()
      setEditingMesa(null)
      setFormError(null)
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : 'Erro ao atualizar mesa'),
  })

  // ── drag (using extracted hook) ───────────────────────────────────────────────

  const onPositionSave = useCallback(
    (id: string, x: number, y: number) => {
      updateMutation.mutate({ id, body: { positionX: x, positionY: y } })
    },
    [updateMutation],
  )

  const { dragging, dragPosition, getMesaPosition, handlePointerDown } = useMesaDrag({
    onPositionSave,
    canvasRef,
  })

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
        await createMutation
          .mutateAsync({ label: `${prefix} ${n}`, capacity: cap > 0 ? cap : 4, section })
          .catch(() => {})
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
      body: {
        label: editForm.label.trim(),
        capacity: cap > 0 ? cap : 4,
        section: editForm.section.trim() || undefined,
      },
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

  const TABS: { id: View; label: string; Icon: typeof Armchair }[] = [
    { id: 'operacional', label: 'Operacional', Icon: Zap },
    { id: 'comandas', label: 'Comandas', Icon: ClipboardList },
    { id: 'configuracao', label: 'Configuração', Icon: List },
    { id: 'planta', label: 'Planta Baixa', Icon: Grid3X3 },
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
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                view === id
                  ? 'bg-[var(--accent)] text-black'
                  : 'text-[var(--text-soft)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="size-4" />
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

      {/* ── COMANDAS ── */}
      {view === 'comandas' && <ComandasTableView comandas={liveComandas} isLoading={liveLoading} />}

      {/* ── CONFIGURAÇÃO ── */}
      {view === 'configuracao' && (
        <div className="space-y-6">
          {mesasLoading && <p className="text-sm text-[var(--text-soft)]">Carregando mesas…</p>}

          {!mesasLoading && mesas.length === 0 && (
            <div className="imperial-card-soft flex flex-col items-center gap-3 rounded-2xl py-16 text-center">
              <span className="text-5xl">🪑</span>
              <p className="text-sm text-[var(--text-soft)]">Nenhuma mesa cadastrada ainda.</p>
              <button
                onClick={() => {
                  setCreateForm(defaultCreateForm())
                  setShowCreate(true)
                }}
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
              touchAction: 'none',
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
              const isDraggingThis = dragging?.mesaId === mesa.id
              const basePosition = getMesaPosition(mesa, index)
              const currentPosition =
                isDraggingThis && dragPosition ? { x: dragPosition.x, y: dragPosition.y } : basePosition
              return (
                <FloorMesaNode
                  key={mesa.id}
                  mesa={mesa}
                  index={index}
                  x={currentPosition.x}
                  y={currentPosition.y}
                  isDragging={isDraggingThis}
                  onPointerDown={handlePointerDown}
                />
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
        <CreateMesaModal
          form={createForm}
          onChange={setCreateForm}
          onSubmit={(e) => void handleCreateSubmit(e)}
          onClose={() => {
            setShowCreate(false)
            setFormError(null)
          }}
          isPending={createMutation.isPending}
          error={formError}
        />
      )}

      {/* ── MODAL EDITAR ── */}
      {editingMesa && (
        <EditMesaModal
          mesaLabel={editingMesa.label}
          form={editForm}
          onChange={setEditForm}
          onSubmit={handleEditSubmit}
          onClose={() => {
            setEditingMesa(null)
            setFormError(null)
          }}
          isPending={updateMutation.isPending}
          error={formError}
        />
      )}
    </div>
  )
}

const FloorMesaNode = memo(function FloorMesaNode({
  mesa,
  index,
  x,
  y,
  isDragging,
  onPointerDown,
}: {
  mesa: MesaRecord
  index: number
  x: number
  y: number
  isDragging: boolean
  onPointerDown: (event: React.PointerEvent, mesa: MesaRecord, autoIndex: number) => void
}) {
  return (
    <div
      onPointerDown={(event) => onPointerDown(event, mesa, index)}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: CARD_W,
        height: CARD_H,
        zIndex: isDragging ? 50 : 1,
        transform: isDragging ? 'scale(1.07)' : 'scale(1)',
        transition: isDragging ? 'none' : 'left 0.14s ease-out, top 0.14s ease-out, transform 0.14s ease-out',
        cursor: isDragging ? 'grabbing' : 'grab',
        willChange: isDragging ? 'transform,left,top' : undefined,
        touchAction: 'none',
      }}
    >
      <MesaFloorCard mesa={mesa} isDragging={isDragging} />
    </div>
  )
})

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
  const [sectionFilter, setSectionFilter] = useState<string>('all')
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()
  const livres = liveMesas.filter((m) => m.status === 'livre')
  const ocupadas = liveMesas.filter((m) => m.status === 'ocupada')
  const reservadas = liveMesas.filter((m) => m.status === 'reservada')
  const receitaAberta = ocupadas.reduce((sum, m) => {
    const comanda = liveComandas.find((c) => c.id === m.comandaId)
    return sum + (comanda ? calcTotal(comanda) : 0)
  }, 0)
  const garconsAtivos = new Set(
    ocupadas.map((mesa) => mesa.garcomId).filter((value): value is string => Boolean(value)),
  ).size
  const ticketMedioAberto = ocupadas.length > 0 ? receitaAberta / ocupadas.length : 0
  const occupiedRate = liveMesas.length > 0 ? Math.round((ocupadas.length / liveMesas.length) * 100) : 0
  const sectionPills = useMemo(() => {
    const grouped = new Map<string, { total: number; occupied: number }>()

    for (const mesa of liveMesas) {
      const key = mesa.section?.trim() || 'Sem seção'
      const current = grouped.get(key) ?? { total: 0, occupied: 0 }
      current.total += 1
      if (mesa.status === 'ocupada') current.occupied += 1
      grouped.set(key, current)
    }

    return Array.from(grouped.entries())
      .map(([label, stats]) => ({
        label,
        total: stats.total,
        occupied: stats.occupied,
        occupancy: stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0,
      }))
      .sort((left, right) => right.occupied - left.occupied || left.label.localeCompare(right.label))
  }, [liveMesas])
  const visibleMesas =
    sectionFilter === 'all'
      ? liveMesas
      : liveMesas.filter((mesa) => (mesa.section?.trim() || 'Sem seção') === sectionFilter)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)]"
          />
        ))}
      </div>
    )
  }

  if (liveMesas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] py-20 text-center shadow-xl backdrop-blur-xl">
        <div className="flex size-20 items-center justify-center rounded-full border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] shadow-inner">
          <Armchair className="size-8 text-[var(--text-soft)]" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Salão vazio</h3>
          <p className="mt-2 text-sm text-[var(--text-soft)]">Seu salão ainda não possui mesas ativas.</p>
        </div>
        <p className="rounded-full bg-[rgba(255,255,255,0.05)] px-4 py-1.5 text-xs font-medium text-[var(--text-muted)]">
          Crie mesas na aba Configuração
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Premium Summary Strip */}
      <div className="grid grid-cols-2 gap-3 rounded-3xl border border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.2)] p-2 shadow-2xl backdrop-blur-2xl sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Receita Circulante" value={fmtBRL(receitaAberta)} color="var(--accent)" isHighlight />
        <KpiCard label="Ticket Aberto" value={fmtBRL(ticketMedioAberto)} color="#fbbf24" />
        <KpiCard label="Equipe em giro" value={garconsAtivos} color="#60a5fa" />
        <KpiCard label="Ocupação" value={`${occupiedRate}%`} color="#f87171" />
        <KpiCard label="Livres" value={livres.length} color="#36f57c" total={liveMesas.length} />
      </div>

      <div className="rounded-[26px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Leitura por seção
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
              Toque na área do salão que você quer acompanhar
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
              Em vez de uma grade seca, o salão agora deixa você focar por setor. Assim fica mais fácil bater o olho em
              onde está a pressão operacional agora.
            </p>
          </div>

          <div className="rounded-full border border-[rgba(96,165,250,0.14)] bg-[rgba(96,165,250,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#93c5fd]">
            {reservadas.length} reserva{reservadas.length === 1 ? '' : 's'} em preparação
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setSectionFilter('all')}
            className={`rounded-full border px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
              sectionFilter === 'all'
                ? 'border-[rgba(201,168,76,0.32)] bg-[rgba(201,168,76,0.12)] text-[#f4d78b]'
                : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text-soft)] hover:text-[var(--text-primary)]'
            }`}
          >
            Salão inteiro · {liveMesas.length}
          </button>

          {sectionPills.map((section) => {
            const isActive = sectionFilter === section.label
            const tone =
              section.occupancy >= 75
                ? {
                    text: '#fca5a5',
                    border: 'rgba(248,113,113,0.28)',
                    bg: 'rgba(248,113,113,0.10)',
                  }
                : section.occupancy >= 40
                  ? {
                      text: '#f4d78b',
                      border: 'rgba(201,168,76,0.28)',
                      bg: 'rgba(201,168,76,0.10)',
                    }
                  : {
                      text: '#8fffb9',
                      border: 'rgba(54,245,124,0.22)',
                      bg: 'rgba(54,245,124,0.08)',
                    }

            return (
              <button
                key={section.label}
                type="button"
                onClick={() => setSectionFilter(section.label)}
                className="rounded-full border px-3.5 py-2 text-left text-xs font-semibold uppercase tracking-[0.16em] transition hover:-translate-y-[1px]"
                style={{
                  color: tone.text,
                  borderColor: isActive ? tone.border : 'rgba(255,255,255,0.08)',
                  background: isActive ? tone.bg : 'rgba(255,255,255,0.03)',
                }}
              >
                {section.label} · {section.occupied}/{section.total}
              </button>
            )
          })}
        </div>
      </div>

      {/* Mesas Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {visibleMesas.map((mesa) => {
          const comanda = mesa.comandaId ? liveComandas.find((c) => c.id === mesa.comandaId) : undefined
          const garcomName = mesa.garcomId ? garcomNames[mesa.garcomId] : undefined

          let urgency: 0 | 1 | 2 | 3 = 0
          if (comanda && mesa.status === 'ocupada') {
            const min = Math.floor((now - comanda.abertaEm.getTime()) / 60000)
            urgency = min >= 90 ? 3 : min >= 60 ? 2 : min >= 30 ? 1 : 0
          }

          return (
            <ModernOperacionalCard
              key={mesa.id}
              mesa={mesa}
              comanda={comanda}
              garcomName={garcomName}
              urgency={urgency}
            />
          )
        })}
      </div>

      {visibleMesas.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[26px] border border-dashed border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] text-center">
          <p className="text-sm font-medium text-[var(--text-primary)]">Nenhuma mesa nessa área agora.</p>
          <p className="mt-2 text-sm text-[var(--text-soft)]">
            Troque a seção ou volte para o salão inteiro para acompanhar o restante da operação.
          </p>
        </div>
      ) : null}
    </div>
  )
}

// ── Comandas Table View (desktop) ────────────────────────────────────────────

type ComandasFiltro = 'tudo' | 'abertas' | 'fechadas'

function ComandasTableView({ comandas, isLoading }: { comandas: Comanda[]; isLoading: boolean }) {
  const [filtro, setFiltro] = useState<ComandasFiltro>('tudo')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = comandas.filter((c) => {
    if (filtro === 'abertas') return c.status !== 'fechada'
    if (filtro === 'fechadas') return c.status === 'fechada'
    return true
  })
  const sorted = [...filtered].sort((a, b) => b.abertaEm.getTime() - a.abertaEm.getTime())

  const countAbertas = comandas.filter((c) => c.status !== 'fechada').length
  const countFechadas = comandas.filter((c) => c.status === 'fechada').length

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)]"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Filtros */}
      <div className="flex items-center gap-2">
        {[
          { id: 'tudo' as const, label: `Tudo (${comandas.length})` },
          { id: 'abertas' as const, label: `Abertas (${countAbertas})` },
          { id: 'fechadas' as const, label: `Fechadas (${countFechadas})` },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFiltro(id)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
              filtro === id
                ? 'bg-[var(--accent)] text-black'
                : 'bg-[rgba(255,255,255,0.04)] text-[var(--text-soft)] hover:text-[var(--text-primary)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] py-16 text-center">
          <span className="text-4xl">📋</span>
          <p className="text-sm text-[var(--text-soft)]">
            Nenhuma comanda {filtro === 'abertas' ? 'aberta' : filtro === 'fechadas' ? 'fechada' : ''} encontrada
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
          {/* Header */}
          <div className="grid grid-cols-[1fr_120px_1fr_130px_80px_110px] gap-2 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-soft)]">
            <span>Mesa</span>
            <span>Status</span>
            <span>Garçom</span>
            <span>Abertura</span>
            <span className="text-center">Itens</span>
            <span className="text-right">Total</span>
          </div>

          {/* Rows */}
          {sorted.map((comanda) => {
            const badge = STATUS_LABEL[comanda.status] ?? STATUS_LABEL.aberta
            const total = calcTotal(comanda)
            const itemCount = comanda.itens.reduce((s, i) => s + i.quantidade, 0)
            const isExpanded = expandedId === comanda.id

            return (
              <div key={comanda.id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : comanda.id)}
                  className="grid w-full grid-cols-[1fr_120px_1fr_130px_80px_110px] gap-2 items-center border-b border-[rgba(255,255,255,0.04)] px-4 py-3 text-left transition-colors hover:bg-[rgba(255,255,255,0.03)] active:bg-[rgba(255,255,255,0.05)]"
                >
                  <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {comanda.mesa ?? '—'}
                  </span>
                  <span
                    className="inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: badge.color, background: badge.bg }}
                  >
                    {badge.text}
                  </span>
                  <span className="text-xs text-[var(--text-soft)] truncate">{comanda.garcomNome ?? '—'}</span>
                  <span className="text-xs text-[var(--text-soft)]">
                    {comanda.abertaEm.toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="text-xs text-center text-[var(--text-soft)]">{itemCount}</span>
                  <span className="text-sm font-bold text-right" style={{ color: badge.color }}>
                    {fmtBRL(total)}
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-b border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.15)] px-6 py-4">
                    {comanda.itens.length === 0 ? (
                      <p className="text-xs text-[var(--text-soft)] text-center py-2">Sem itens</p>
                    ) : (
                      <div className="grid grid-cols-[1fr_80px_100px] gap-1 text-xs">
                        <span className="text-[var(--text-soft)] font-semibold uppercase text-[10px] tracking-widest pb-1">
                          Item
                        </span>
                        <span className="text-[var(--text-soft)] font-semibold uppercase text-[10px] tracking-widest text-center pb-1">
                          Qtd
                        </span>
                        <span className="text-[var(--text-soft)] font-semibold uppercase text-[10px] tracking-widest text-right pb-1">
                          Valor
                        </span>
                        {comanda.itens.map((item, idx) => (
                          <div key={idx} className="contents">
                            <span className="text-[var(--text-primary)] truncate py-0.5">{item.nome}</span>
                            <span className="text-[var(--text-soft)] text-center py-0.5">{item.quantidade}</span>
                            <span className="text-[var(--text-primary)] text-right py-0.5">
                              {fmtBRL(item.quantidade * item.precoUnitario)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex justify-end border-t border-[rgba(255,255,255,0.06)] pt-2">
                      <span className="text-sm font-bold text-[var(--text-primary)]">Total: {fmtBRL(total)}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
