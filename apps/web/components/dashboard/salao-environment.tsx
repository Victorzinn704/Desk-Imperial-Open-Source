'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Armchair, ClipboardList, Grid3X3, List, Plus, Zap } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { MesaRecord } from '@contracts/contracts'
import { createMesa, fetchMesas, fetchOperationsLive, updateMesa } from '@/lib/api'
import { DashboardSectionHeading } from '@/components/dashboard/dashboard-section-heading'
import type { PdvMesaIntent } from '@/components/pdv/pdv-navigation-intent'
import { buildPdvComandas, buildPdvMesas } from '@/components/pdv/pdv-operations'
import { calcTotal, type Comanda, type Mesa } from '@/components/pdv/pdv-types'
import {
  LAB_RESPONSIVE_FOUR_UP_GRID,
  LabMiniStat,
  LabPageHeader,
  LabPanel,
  LabStatusPill,
  type LabStatusTone,
} from '@/components/design-lab/lab-primitives'
import {
  CANVAS_H,
  CARD_H,
  CARD_W,
  type CreateForm,
  CreateMesaModal,
  defaultCreateForm,
  type EditForm,
  EditMesaModal,
  fmtBRL,
  KpiCard,
  LIVE_QUERY_KEY,
  MesaFloorCard,
  MesaListCard,
  ModernOperacionalCard,
  QUERY_KEY,
  getComandaStatusMeta,
  useMesaDrag,
  type View,
} from './salao'

type SalaoEnvironmentProps = {
  initialView?: View
  onViewChange?: (view: View) => void
  onOpenPdvFromMesa?: (intent: Omit<PdvMesaIntent, 'requestId'>) => void
  surface?: 'legacy' | 'lab'
}

const FULL_LIVE_QUERY_KEY = ['operations', 'live', 'full'] as const

export function SalaoEnvironment({
  initialView = 'operacional',
  onViewChange,
  onOpenPdvFromMesa,
  surface = 'legacy',
}: Readonly<SalaoEnvironmentProps>) {
  const queryClient = useQueryClient()
  const [view, setView] = useState<View>(initialView)
  const [showCreate, setShowCreate] = useState(false)
  const [editingMesa, setEditingMesa] = useState<MesaRecord | null>(null)
  const [createForm, setCreateForm] = useState<CreateForm>(defaultCreateForm)
  const [editForm, setEditForm] = useState<EditForm>({ label: '', capacity: '4', section: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setView(initialView)
  }, [initialView])

  const { data: mesas = [], isLoading: mesasLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchMesas,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const { data: compactLiveData, isLoading: compactLiveLoading, dataUpdatedAt: compactLiveUpdatedAt } = useQuery({
    queryKey: LIVE_QUERY_KEY,
    queryFn: () => fetchOperationsLive({ includeCashMovements: false, compactMode: true }),
    refetchInterval: 15_000,
    staleTime: 10_000,
    enabled: view === 'operacional',
    refetchOnWindowFocus: false,
  })

  const { data: detailedLiveData, isLoading: detailedLiveLoading, dataUpdatedAt: detailedLiveUpdatedAt } = useQuery({
    queryKey: FULL_LIVE_QUERY_KEY,
    queryFn: () => fetchOperationsLive({ includeCashMovements: false }),
    refetchInterval: 15_000,
    staleTime: 10_000,
    enabled: view === 'comandas',
    refetchOnWindowFocus: false,
  })

  const liveData = view === 'comandas' ? detailedLiveData : compactLiveData
  const liveLoading = view === 'comandas' ? detailedLiveLoading : compactLiveLoading
  const liveReferenceTime = view === 'comandas' ? detailedLiveUpdatedAt : compactLiveUpdatedAt
  const liveMesas = useMemo(() => buildPdvMesas(liveData), [liveData])
  const liveComandas = useMemo(() => buildPdvComandas(liveData), [liveData])

  const garcomNames = useMemo(() => {
    if (!liveData) {
      return {} as Record<string, string>
    }

    return Object.fromEntries(
      liveData.employees.filter((employee) => employee.employeeId).map((employee) => [employee.employeeId!, employee.displayName]),
    )
  }, [liveData])

  const activeMesas = useMemo(() => mesas.filter((mesa) => mesa.active), [mesas])
  const inactiveMesas = useMemo(() => mesas.filter((mesa) => !mesa.active), [mesas])

  const openRevenue = useMemo(
    () =>
      liveMesas
        .filter((mesa) => mesa.status === 'ocupada')
        .reduce((sum, mesa) => {
          const comanda = liveComandas.find((current) => current.id === mesa.comandaId)
          return sum + (comanda ? calcTotal(comanda) : 0)
        }, 0),
    [liveComandas, liveMesas],
  )
  const occupiedMesas = useMemo(() => liveMesas.filter((mesa) => mesa.status === 'ocupada'), [liveMesas])
  const reservedMesas = useMemo(() => liveMesas.filter((mesa) => mesa.status === 'reservada'), [liveMesas])
  const freeMesas = useMemo(() => liveMesas.filter((mesa) => mesa.status === 'livre'), [liveMesas])
  const occupiedRate = liveMesas.length > 0 ? Math.round((occupiedMesas.length / liveMesas.length) * 100) : 0
  const activeWaiters = useMemo(
    () =>
      new Set(occupiedMesas.map((mesa) => mesa.garcomId).filter((value): value is string => Boolean(value))).size,
    [occupiedMesas],
  )
  const averageOpenTicket = occupiedMesas.length > 0 ? openRevenue / occupiedMesas.length : 0
  const sectionStats = useMemo(() => {
    const grouped = new Map<string, { total: number; occupied: number }>()

    for (const mesa of liveMesas) {
      const key = mesa.section?.trim() || 'Sem seção'
      const current = grouped.get(key) ?? { total: 0, occupied: 0 }
      current.total += 1
      if (mesa.status === 'ocupada') {
        current.occupied += 1
      }
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

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    void queryClient.invalidateQueries({ queryKey: LIVE_QUERY_KEY })
    void queryClient.invalidateQueries({ queryKey: FULL_LIVE_QUERY_KEY })
  }

  const createMutation = useMutation({
    mutationFn: createMesa,
    onSuccess: () => {
      invalidate()
      setShowCreate(false)
      setCreateForm(defaultCreateForm())
      setFormError(null)
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : 'Erro ao criar mesa')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateMesa>[1] }) => updateMesa(id, body),
    onSuccess: () => {
      invalidate()
      setEditingMesa(null)
      setFormError(null)
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : 'Erro ao atualizar mesa')
    },
  })

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

  function handleSetView(nextView: View) {
    setView(nextView)
    onViewChange?.(nextView)
  }

  async function handleCreateSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)

    if (createForm.mode === 'single') {
      if (!createForm.label.trim()) {
        setFormError('Nome é obrigatório')
        return
      }

      const capacity = Number.parseInt(createForm.capacity, 10)
      createMutation.mutate({
        label: createForm.label.trim(),
        capacity: capacity > 0 ? capacity : 4,
        section: createForm.section.trim() || undefined,
      })
      return
    }

    const from = Number.parseInt(createForm.bulkFrom, 10)
    const to = Number.parseInt(createForm.bulkTo, 10)
    if (Number.isNaN(from) || Number.isNaN(to) || from > to || to - from > 49) {
      setFormError('Range inválido (máx 50 de uma vez)')
      return
    }

    const capacity = Number.parseInt(createForm.capacity, 10)
    const prefix = createForm.bulkPrefix.trim() || 'Mesa'
    const section = createForm.section.trim() || undefined

    for (let index = from; index <= to; index += 1) {
      await createMutation
        .mutateAsync({
          label: `${prefix} ${index}`,
          capacity: capacity > 0 ? capacity : 4,
          section,
        })
        .catch(() => {})
    }

    invalidate()
    setShowCreate(false)
    setCreateForm(defaultCreateForm())
  }

  function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingMesa) {
      return
    }

    setFormError(null)
    if (!editForm.label.trim()) {
      setFormError('Nome é obrigatório')
      return
    }

    const capacity = Number.parseInt(editForm.capacity, 10)
    updateMutation.mutate({
      id: editingMesa.id,
      body: {
        label: editForm.label.trim(),
        capacity: capacity > 0 ? capacity : 4,
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

  function openPdvFromMesa(mesa: Mesa) {
    onOpenPdvFromMesa?.({
      mesaId: mesa.id,
      mesaLabel: mesa.numero,
      comandaId: mesa.comandaId,
    })
  }

  const tabs: Array<{ id: View; label: string; icon: typeof Armchair }> = [
    { id: 'operacional', label: 'Operacional', icon: Zap },
    { id: 'comandas', label: 'Comandas', icon: ClipboardList },
    { id: 'configuracao', label: 'Configuração', icon: List },
    { id: 'planta', label: 'Planta baixa', icon: Grid3X3 },
  ]

  return (
    <section className="space-y-6">
      {surface === 'lab' ? (
        <LabPageHeader
          description="Ocupação, receita e giro de mesas."
          eyebrow="Gestão do salão"
          meta={
            <div className="space-y-3">
              <SalaoMetaRow label="mesas ativas" tone="info" value={String(liveMesas.length)} />
              <SalaoMetaRow label="ocupadas" tone={occupiedMesas.length > 0 ? 'warning' : 'neutral'} value={String(occupiedMesas.length)} />
              <SalaoMetaRow label="atendentes" tone={activeWaiters > 0 ? 'success' : 'neutral'} value={String(activeWaiters)} />
            </div>
          }
          title="Salão"
        >
          <div className={`grid gap-3 ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
            <LabMiniStat label="receita aberta" value={fmtBRL(openRevenue)} />
            <LabMiniStat label="livres" value={String(freeMesas.length)} />
            <LabMiniStat label="ticket aberto" value={fmtBRL(averageOpenTicket)} />
            <LabMiniStat label="ocupação" value={`${occupiedRate}%`} />
          </div>
        </LabPageHeader>
      ) : (
        <DashboardSectionHeading
          description="Ocupação, comandas e giro de mesas."
          eyebrow="Gestão do salão"
          icon={Armchair}
          title="Salão"
        />
      )}

      {surface === 'legacy' ? (
        <div className={`grid gap-4 ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
          <KpiCard isHighlight label="Receita em aberto" tone="accent" value={fmtBRL(openRevenue)} />
          <KpiCard label="Mesas livres" tone="success" total={liveMesas.length} value={freeMesas.length} />
          <KpiCard label="Ticket aberto" tone="warning" value={fmtBRL(averageOpenTicket)} />
          <KpiCard label="Ocupação" tone="danger" value={`${occupiedRate}%`} />
        </div>
      ) : null}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const active = view === tab.id

            return (
              <button
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                    : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-soft)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]'
                }`}
                key={tab.id}
                type="button"
                onClick={() => handleSetView(tab.id)}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
          <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1.5">
            {activeWaiters} atendentes em giro
          </span>
          <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1.5">
            {reservedMesas.length} reservas
          </span>
          {view === 'configuracao' ? (
            <button
              className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent-strong)] hover:bg-[var(--surface-soft)]"
              type="button"
              onClick={() => {
                setCreateForm(defaultCreateForm())
                setFormError(null)
                setShowCreate(true)
              }}
            >
              <Plus className="size-4" />
              Nova mesa
            </button>
          ) : null}
        </div>
      </div>

      {view === 'operacional' ? (
        <OperacionalView
          garcomNames={garcomNames}
          isLoading={liveLoading}
          liveComandas={liveComandas}
          liveMesas={liveMesas}
          onOpenPdvFromMesa={onOpenPdvFromMesa ? openPdvFromMesa : undefined}
          referenceTime={liveReferenceTime}
        />
      ) : null}

      {view === 'comandas' ? (
        <ComandasTableView
          comandas={liveComandas}
          isLoading={liveLoading}
          liveMesas={liveMesas}
          onOpenPdvFromMesa={onOpenPdvFromMesa}
        />
      ) : null}

      {view === 'configuracao' ? (
        <ConfiguracaoView
          activeMesas={activeMesas}
          inactiveMesas={inactiveMesas}
          isPending={updateMutation.isPending}
          mesasLoading={mesasLoading}
          onCreate={() => {
            setCreateForm(defaultCreateForm())
            setFormError(null)
            setShowCreate(true)
          }}
          onEdit={openEdit}
          onToggle={toggleActive}
        />
      ) : null}

      {view === 'planta' ? (
        <PlantaView
          activeMesas={activeMesas}
          canvasRef={canvasRef}
          dragging={dragging}
          dragPosition={dragPosition}
          getMesaPosition={getMesaPosition}
          handlePointerDown={handlePointerDown}
          mesasLoading={mesasLoading}
        />
      ) : null}

      {surface === 'lab' ? (
        <div className="grid gap-5 xl:grid-cols-[400px_minmax(0,1fr)] xl:items-start">
          <LabPanel
            action={<LabStatusPill tone="info">{liveMesas.length} mesas</LabStatusPill>}
            padding="md"
            title="Leitura do salão"
          >
            <div className="space-y-0">
              <SalaoSignalRow label="receita em aberto" note="valor vivo nas mesas ocupadas" tone="info" value={fmtBRL(openRevenue)} />
              <SalaoSignalRow label="ocupação" note="pressão atual do salão" tone={occupiedRate >= 75 ? 'danger' : occupiedRate >= 40 ? 'warning' : 'success'} value={`${occupiedRate}%`} />
              <SalaoSignalRow label="ticket aberto" note="média por mesa ocupada" tone={averageOpenTicket > 0 ? 'info' : 'neutral'} value={fmtBRL(averageOpenTicket)} />
              <SalaoSignalRow label="atendentes" note="garçons com mesa em giro" tone={activeWaiters > 0 ? 'success' : 'neutral'} value={String(activeWaiters)} />
            </div>
          </LabPanel>

          <LabPanel
            action={<LabStatusPill tone="neutral">{sectionStats.length} setores</LabStatusPill>}
            padding="md"
            title="Radar do salão"
          >
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_280px]">
              <div className="space-y-5">
                <div className={`grid gap-3 ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
                  <SalaoMiniStat label="ocupadas" value={String(occupiedMesas.length)} />
                  <SalaoMiniStat label="livres" value={String(freeMesas.length)} />
                  <SalaoMiniStat label="reservas" value={String(reservedMesas.length)} />
                  <SalaoMiniStat label="setor líder" value={sectionStats[0]?.label ?? 'sem leitura'} />
                </div>

                {sectionStats.length > 0 ? (
                  <div className="space-y-1">
                    {sectionStats.slice(0, 4).map((section) => (
                      <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] px-1 py-4 last:border-b-0" key={section.label}>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[var(--lab-fg)]">{section.label}</p>
                          <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">{section.occupied}/{section.total} ocupadas</p>
                        </div>
                        <LabStatusPill tone={section.occupancy >= 75 ? 'danger' : section.occupancy >= 40 ? 'warning' : 'success'}>
                          {section.occupancy}%
                        </LabStatusPill>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-4 border-t border-dashed border-[var(--lab-border)] pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
                <SalaoMetaRow label="ocupadas" tone={occupiedMesas.length > 0 ? 'warning' : 'neutral'} value={String(occupiedMesas.length)} />
                <SalaoMetaRow label="reservadas" tone={reservedMesas.length > 0 ? 'info' : 'neutral'} value={String(reservedMesas.length)} />
                <SalaoMetaRow label="livres" tone={freeMesas.length > 0 ? 'success' : 'warning'} value={String(freeMesas.length)} />
                <SalaoMetaRow
                  label="próxima ação"
                  tone={occupiedRate >= 75 ? 'warning' : reservedMesas.length > 0 ? 'info' : 'success'}
                  value={occupiedRate >= 75 ? 'girar mesas' : reservedMesas.length > 0 ? 'preparar reserva' : 'manter cadência'}
                />
              </div>
            </div>
          </LabPanel>
        </div>
      ) : null}

      {showCreate ? (
        <CreateMesaModal
          error={formError}
          form={createForm}
          isPending={createMutation.isPending}
          onChange={setCreateForm}
          onClose={() => {
            setShowCreate(false)
            setFormError(null)
          }}
          onSubmit={(event) => void handleCreateSubmit(event)}
        />
      ) : null}

      {editingMesa ? (
        <EditMesaModal
          error={formError}
          form={editForm}
          isPending={updateMutation.isPending}
          mesaLabel={editingMesa.label}
          onChange={setEditForm}
          onClose={() => {
            setEditingMesa(null)
            setFormError(null)
          }}
          onSubmit={handleEditSubmit}
        />
      ) : null}
    </section>
  )
}

function SalaoMetaRow({
  label,
  tone,
  value,
}: Readonly<{
  label: string
  tone: LabStatusTone
  value: string
}>) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-3 last:border-b-0 last:pb-0">
      <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">{label}</span>
      <LabStatusPill tone={tone}>{value}</LabStatusPill>
    </div>
  )
}

function SalaoSignalRow({
  label,
  note,
  tone,
  value,
}: Readonly<{
  label: string
  note: string
  tone: LabStatusTone
  value: string
}>) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] px-1 py-4 last:border-b-0" >
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--lab-fg)]">{label}</p>
        <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">{note}</p>
      </div>
      <LabStatusPill tone={tone}>{value}</LabStatusPill>
    </div>
  )
}

function SalaoMiniStat({
  label,
  value,
}: Readonly<{
  label: string
  value: string
}>) {
  return (
    <div className="rounded-[18px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[var(--lab-fg)]">{value}</p>
    </div>
  )
}

function OperacionalView({
  liveMesas,
  liveComandas,
  garcomNames,
  isLoading,
  onOpenPdvFromMesa,
  referenceTime,
}: Readonly<{
  liveMesas: Mesa[]
  liveComandas: Comanda[]
  garcomNames: Record<string, string>
  isLoading: boolean
  onOpenPdvFromMesa?: (mesa: Mesa) => void
  referenceTime: number
}>) {
  const [sectionFilter, setSectionFilter] = useState('all')

  const sectionPills = useMemo(() => {
    const grouped = new Map<string, { total: number; occupied: number }>()

    for (const mesa of liveMesas) {
      const key = mesa.section?.trim() || 'Sem seção'
      const current = grouped.get(key) ?? { total: 0, occupied: 0 }
      current.total += 1
      if (mesa.status === 'ocupada') {
        current.occupied += 1
      }
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            className="h-32 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
            key={index}
          />
        ))}
      </div>
    )
  }

  if (liveMesas.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-soft)]">
          <Armchair className="size-6" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">Nenhuma mesa ativa no salão</h3>
        <p className="mt-2 text-sm text-[var(--text-soft)]">
          Crie mesas na aba de configuração para liberar a leitura operacional.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Leitura por setor
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
              Filtre a área do salão que merece atenção agora
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
              O foco por setor evita grade morta e acelera a leitura de pressão operacional antes de abrir o PDV.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
            {visibleMesas.length} mesas no recorte atual
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <FilterChip
            active={sectionFilter === 'all'}
            label={`Salão inteiro · ${liveMesas.length}`}
            tone="info"
            onClick={() => setSectionFilter('all')}
          />
          {sectionPills.map((section) => (
            <FilterChip
              active={sectionFilter === section.label}
              key={section.label}
              label={`${section.label} · ${section.occupied}/${section.total}`}
              tone={section.occupancy >= 75 ? 'danger' : section.occupancy >= 40 ? 'warning' : 'success'}
              onClick={() => setSectionFilter(section.label)}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {visibleMesas.map((mesa) => {
          const comanda = mesa.comandaId ? liveComandas.find((current) => current.id === mesa.comandaId) : undefined
          const garcomName = mesa.garcomId ? garcomNames[mesa.garcomId] : undefined

          let urgency: 0 | 1 | 2 | 3 = 0
          if (comanda && mesa.status === 'ocupada' && referenceTime > 0) {
            const minutes = Math.floor((referenceTime - comanda.abertaEm.getTime()) / 60_000)
            urgency = minutes >= 90 ? 3 : minutes >= 60 ? 2 : minutes >= 30 ? 1 : 0
          }

          return (
            <ModernOperacionalCard
              comanda={comanda}
              garcomName={garcomName}
              key={mesa.id}
              mesa={mesa}
              urgency={urgency}
              onClick={onOpenPdvFromMesa ? () => onOpenPdvFromMesa(mesa) : undefined}
            />
          )
        })}
      </div>

      {visibleMesas.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-14 text-center">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Nenhuma mesa nesse setor agora</h3>
          <p className="mt-2 text-sm text-[var(--text-soft)]">
            Troque o recorte ou volte para o salão inteiro para enxergar o restante da operação.
          </p>
        </div>
      ) : null}
    </div>
  )
}

function ComandasTableView({
  comandas,
  isLoading,
  liveMesas,
  onOpenPdvFromMesa,
}: Readonly<{
  comandas: Comanda[]
  isLoading: boolean
  liveMesas: Mesa[]
  onOpenPdvFromMesa?: (intent: Omit<PdvMesaIntent, 'requestId'>) => void
}>) {
  const [filter, setFilter] = useState<'tudo' | 'abertas' | 'fechadas'>('tudo')

  const filtered = useMemo(() => {
    return comandas.filter((comanda) => {
      if (filter === 'abertas') {
        return comanda.status !== 'fechada'
      }
      if (filter === 'fechadas') {
        return comanda.status === 'fechada'
      }
      return true
    })
  }, [comandas, filter])

  const sorted = useMemo(
    () => [...filtered].sort((left, right) => right.abertaEm.getTime() - left.abertaEm.getTime()),
    [filtered],
  )

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            className="h-14 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
            key={index}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          active={filter === 'tudo'}
          label={`Tudo (${comandas.length})`}
          tone="info"
          onClick={() => setFilter('tudo')}
        />
        <FilterChip
          active={filter === 'abertas'}
          label={`Abertas (${comandas.filter((comanda) => comanda.status !== 'fechada').length})`}
          tone="warning"
          onClick={() => setFilter('abertas')}
        />
        <FilterChip
          active={filter === 'fechadas'}
          label={`Fechadas (${comandas.filter((comanda) => comanda.status === 'fechada').length})`}
          tone="success"
          onClick={() => setFilter('fechadas')}
        />
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-soft)] px-6 py-14 text-center">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Nenhuma comanda no recorte atual</h3>
          <p className="mt-2 text-sm text-[var(--text-soft)]">
            Assim que a operação registrar comandas, elas aparecem aqui para auditoria e atalho para o PDV.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
          <div className="grid grid-cols-[1.3fr_120px_1fr_130px_90px_120px_110px] gap-3 border-b border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            <span>Mesa</span>
            <span>Status</span>
            <span>Garçom</span>
            <span>Abertura</span>
            <span className="text-center">Itens</span>
            <span className="text-right">Total</span>
            <span className="text-right">Ação</span>
          </div>

          {sorted.map((comanda) => {
            const badge = getComandaStatusMeta(comanda.status)
            const mesa = liveMesas.find((candidate) => candidate.numero === comanda.mesa || candidate.id === comanda.mesa)
            const itemCount = comanda.itens.reduce((sum, item) => sum + item.quantidade, 0)

            return (
              <div
                className="grid grid-cols-[1.3fr_120px_1fr_130px_90px_120px_110px] gap-3 border-b border-[var(--border)]/70 px-4 py-3 text-sm last:border-b-0"
                key={comanda.id}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--text-primary)]">{comanda.mesa ?? 'Sem mesa'}</p>
                  <p className="truncate text-xs text-[var(--text-soft)]">#{comanda.id.slice(0, 8)}</p>
                </div>
                <div>
                  <span
                    className="inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                    style={{
                      color: `var(--${badge.tone === 'accent' ? 'accent' : badge.tone})`,
                      background:
                        badge.tone === 'accent'
                          ? 'var(--accent-soft)'
                          : `var(--${badge.tone}-soft)`,
                      borderColor:
                        badge.tone === 'accent'
                          ? 'var(--accent)'
                          : `var(--${badge.tone})`,
                    }}
                  >
                    {badge.text}
                  </span>
                </div>
                <span className="truncate text-[var(--text-soft)]">{comanda.garcomNome ?? 'Sem garçom'}</span>
                <span className="text-[var(--text-soft)]">
                  {comanda.abertaEm.toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="text-center text-[var(--text-soft)]">{itemCount}</span>
                <span className="text-right font-semibold text-[var(--text-primary)]">{fmtBRL(calcTotal(comanda))}</span>
                <div className="flex justify-end">
                  {mesa && onOpenPdvFromMesa ? (
                    <button
                      className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                      type="button"
                      onClick={() =>
                        onOpenPdvFromMesa({
                          mesaId: mesa.id,
                          mesaLabel: mesa.numero,
                          comandaId: comanda.id,
                        })
                      }
                    >
                      Abrir PDV
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">—</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ConfiguracaoView({
  mesasLoading,
  activeMesas,
  inactiveMesas,
  isPending,
  onEdit,
  onToggle,
  onCreate,
}: Readonly<{
  mesasLoading: boolean
  activeMesas: MesaRecord[]
  inactiveMesas: MesaRecord[]
  isPending: boolean
  onEdit: (mesa: MesaRecord) => void
  onToggle: (mesa: MesaRecord) => void
  onCreate: () => void
}>) {
  if (mesasLoading) {
    return <p className="text-sm text-[var(--text-soft)]">Carregando mesas...</p>
  }

  if (activeMesas.length === 0 && inactiveMesas.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Nenhuma mesa cadastrada</h3>
        <p className="mt-2 text-sm text-[var(--text-soft)]">
          Crie a primeira mesa para liberar o mapa físico e a leitura operacional.
        </p>
        <button
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent-strong)] hover:bg-[var(--surface-soft)]"
          type="button"
          onClick={onCreate}
        >
          <Plus className="size-4" />
          Criar primeira mesa
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {activeMesas.length > 0 ? (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Ativas — {activeMesas.length}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {activeMesas.map((mesa) => (
              <MesaListCard
                isPending={isPending}
                key={mesa.id}
                mesa={mesa}
                onEdit={() => onEdit(mesa)}
                onToggle={() => onToggle(mesa)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {inactiveMesas.length > 0 ? (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Inativas — {inactiveMesas.length}
          </p>
          <div className="grid grid-cols-2 gap-3 opacity-70 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {inactiveMesas.map((mesa) => (
              <MesaListCard
                isPending={isPending}
                key={mesa.id}
                mesa={mesa}
                onEdit={() => onEdit(mesa)}
                onToggle={() => onToggle(mesa)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function PlantaView({
  activeMesas,
  mesasLoading,
  canvasRef,
  dragging,
  dragPosition,
  getMesaPosition,
  handlePointerDown,
}: Readonly<{
  activeMesas: MesaRecord[]
  mesasLoading: boolean
  canvasRef: React.RefObject<HTMLDivElement | null>
  dragging: { mesaId: string } | null
  dragPosition: { mesaId: string; x: number; y: number } | null
  getMesaPosition: (mesa: MesaRecord, autoIndex: number) => { x: number; y: number }
  handlePointerDown: (event: ReactPointerEvent, mesa: MesaRecord, autoIndex: number) => void
}>) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)]"
        ref={canvasRef}
        style={{
          height: CANVAS_H,
          backgroundImage: 'radial-gradient(circle, color-mix(in srgb, var(--border) 60%, transparent) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      >
        {mesasLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-[var(--text-soft)]">Carregando planta...</p>
          </div>
        ) : null}

        {!mesasLoading && activeMesas.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            <Grid3X3 className="size-6 text-[var(--text-soft)]" />
            <p className="text-sm font-medium text-[var(--text-primary)]">Nenhuma mesa ativa para posicionar</p>
            <p className="max-w-md text-sm text-[var(--text-soft)]">
              Crie mesas na configuração para montar a planta baixa do salão.
            </p>
          </div>
        ) : null}

        {activeMesas.map((mesa, index) => {
          const isDraggingThis = dragging?.mesaId === mesa.id
          const basePosition = getMesaPosition(mesa, index)
          const currentPosition =
            isDraggingThis && dragPosition ? { x: dragPosition.x, y: dragPosition.y } : basePosition

          return (
            <div
              key={mesa.id}
              onPointerDown={(event) => handlePointerDown(event, mesa, index)}
              style={{
                position: 'absolute',
                left: currentPosition.x,
                top: currentPosition.y,
                width: CARD_W,
                height: CARD_H,
                zIndex: isDraggingThis ? 50 : 1,
                transform: isDraggingThis ? 'scale(1.07)' : 'scale(1)',
                transition: isDraggingThis ? 'none' : 'left 0.14s ease-out, top 0.14s ease-out, transform 0.14s ease-out',
                cursor: isDraggingThis ? 'grabbing' : 'grab',
                willChange: isDraggingThis ? 'transform,left,top' : undefined,
                touchAction: 'none',
              }}
            >
              <MesaFloorCard isDragging={Boolean(isDraggingThis)} mesa={mesa} />
            </div>
          )
        })}
      </div>

      <p className="mt-3 px-1 text-xs text-[var(--text-soft)]">
        Arraste as mesas para posicionar o salão. As coordenadas são salvas automaticamente.
      </p>
    </div>
  )
}

function FilterChip({
  active,
  label,
  tone,
  onClick,
}: Readonly<{
  active: boolean
  label: string
  tone: 'info' | 'warning' | 'success' | 'danger'
  onClick: () => void
}>) {
  const toneClass =
    tone === 'danger'
      ? 'border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]'
      : tone === 'warning'
        ? 'border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning)]'
        : tone === 'success'
          ? 'border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]'
          : 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'

  return (
    <button
      className={`rounded-full border px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
        active
          ? toneClass
          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-soft)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]'
      }`}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  )
}
