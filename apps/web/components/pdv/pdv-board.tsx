'use client'

import { useMemo, useState } from 'react'
import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock3, LayoutGrid, ShoppingBag, TrendingUp } from 'lucide-react'
import type { CreateMesaInput, OpenComandaPayload, ReplaceComandaPayload, UpdateMesaInput } from '@/lib/api'
import {
  assignComanda,
  closeComanda,
  createMesa,
  openComanda,
  replaceComanda,
  updateComandaStatus,
  updateMesa,
} from '@/lib/api'
import type { OperationsLiveResponse } from '@contracts/contracts'
import { formatCurrency } from '@/lib/currency'
import { invalidateOperationsWorkspace, rollbackOperationsSnapshot, setOptimisticComandaStatus } from '@/lib/operations'
import { PdvColumn } from './pdv-column'
import { PdvComandaModal } from './pdv-comanda-modal'
import {
  buildPdvComandas,
  buildPdvGarcons,
  buildPdvMesas,
  toOperationAmounts,
  toOperationsStatus,
  toPdvComanda,
} from './pdv-operations'
import { type Comanda, type ComandaItem, type ComandaStatus, type Mesa, KANBAN_COLUMNS, calcTotal } from './pdv-types'
import { normalizeTableLabel } from './normalize-table-label'
import { SalaoUnificado } from './pdv-salao-unified'
import { PdvHistoricoView } from './pdv-historico-view'

type SimpleProduct = {
  id: string
  name: string
  category: string
  unitPrice: number
  currency: string
  stock: number
  isLowStock: boolean
  isCombo?: boolean
  comboDescription?: string | null
  comboItems?: Array<{
    componentProductName: string
    totalUnits: number
  }>
}

type PdvBoardProps = Readonly<{
  operations?: OperationsLiveResponse
  products: SimpleProduct[]
}>

type ActiveTab = 'comandas' | 'salao' | 'historico'

type AddMesaForm = { label: string; capacity: string }
const OPERATIONS_LIVE_QUERY_KEY = ['operations', 'live'] as const

export function PdvBoard({ operations, products }: Readonly<PdvBoardProps>) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<ActiveTab>('comandas')
  const [showNewModal, setShowNewModal] = useState(false)
  const [editingComandaId, setEditingComandaId] = useState<string | null>(null)
  const [mesaPreSelected, setMesaPreSelected] = useState<Mesa | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [addMesaForm, setAddMesaForm] = useState<AddMesaForm | null>(null)

  const comandas = useMemo(() => buildPdvComandas(operations), [operations])
  const mesas = useMemo(() => buildPdvMesas(operations), [operations])
  const garcons = useMemo(() => buildPdvGarcons(operations), [operations])
  const comandasById = useMemo(() => new Map(comandas.map((comanda) => [comanda.id, comanda])), [comandas])
  const mesasById = useMemo(() => new Map(mesas.map((mesa) => [mesa.id, mesa])), [mesas])
  const comandasByStatus = useMemo(
    () =>
      KANBAN_COLUMNS.reduce(
        (acc, column) => {
          acc[column.id] = comandas.filter((comanda) => comanda.status === column.id)
          return acc
        },
        {} as Record<(typeof KANBAN_COLUMNS)[number]['id'], Comanda[]>,
      ),
    [comandas],
  )
  const abertas = useMemo(() => comandas.filter((comanda) => comanda.status !== 'fechada'), [comandas])
  const editingComanda = (editingComandaId ? comandasById.get(editingComandaId) : null) ?? null

  const openComandaMutation = useMutation({
    mutationFn: (payload: OpenComandaPayload) => openComanda(payload, { includeSnapshot: false }),
    onSuccess: () => invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_KEY),
  })
  const replaceComandaMutation = useMutation({
    mutationFn: ({ comandaId, payload }: { comandaId: string; payload: ReplaceComandaPayload }) =>
      replaceComanda(comandaId, payload, { includeSnapshot: false }),
    onSuccess: () => invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_KEY),
  })
  const assignComandaMutation = useMutation({
    mutationFn: ({ comandaId, employeeId }: { comandaId: string; employeeId?: string }) =>
      assignComanda(comandaId, employeeId, { includeSnapshot: false }),
    onSuccess: () => invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_KEY),
  })
  const updateComandaStatusMutation = useMutation({
    mutationFn: ({ comandaId, status }: { comandaId: string; status: 'OPEN' | 'IN_PREPARATION' | 'READY' }) =>
      updateComandaStatus(comandaId, status, { includeSnapshot: false }),
    onMutate: async ({ comandaId, status }) => {
      await queryClient.cancelQueries({ queryKey: OPERATIONS_LIVE_QUERY_KEY })
      const snapshot = setOptimisticComandaStatus(queryClient, OPERATIONS_LIVE_QUERY_KEY, comandaId, status)
      return { snapshot }
    },
    onError: (_error, _vars, context) => {
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_QUERY_KEY, context?.snapshot)
    },
    onSuccess: () => invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_KEY),
  })
  const closeComandaMutation = useMutation({
    mutationFn: ({
      comandaId,
      payload,
    }: {
      comandaId: string
      payload: { discountAmount: number; serviceFeeAmount: number }
    }) => closeComanda(comandaId, payload, { includeSnapshot: false }),
    onMutate: async ({ comandaId }) => {
      await queryClient.cancelQueries({ queryKey: OPERATIONS_LIVE_QUERY_KEY })
      const snapshot = setOptimisticComandaStatus(queryClient, OPERATIONS_LIVE_QUERY_KEY, comandaId, 'CLOSED')
      return { snapshot }
    },
    onError: (_error, _vars, context) => {
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_QUERY_KEY, context?.snapshot)
    },
    onSuccess: () =>
      invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_KEY, {
        includeOrders: true,
        includeFinance: true,
      }),
  })
  const createMesaMutation = useMutation({
    mutationFn: (body: CreateMesaInput) => createMesa(body),
    onSuccess: () => {
      invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_KEY)
      setAddMesaForm(null)
    },
  })

  const updateMesaMutation = useMutation({
    mutationFn: ({ mesaId, body }: { mesaId: string; body: UpdateMesaInput }) => updateMesa(mesaId, body),
    onSuccess: () => invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_KEY),
  })

  async function persistComandaDraft(data: {
    mesa: string
    clienteNome: string
    clienteDocumento: string
    itens: ComandaItem[]
    desconto: number
    acrescimo: number
  }) {
    setActionError(null)

    const draft: Comanda = {
      id: editingComanda?.id ?? '',
      status: editingComanda?.status ?? 'aberta',
      mesa: normalizeTableLabel(data.mesa),
      clienteNome: data.clienteNome || undefined,
      clienteDocumento: data.clienteDocumento || undefined,
      itens: data.itens,
      desconto: data.desconto,
      acrescimo: data.acrescimo,
      abertaEm: editingComanda?.abertaEm ?? new Date(),
    }
    const amounts = toOperationAmounts(draft)
    const selectedMesa =
      mesas.find((mesa) => normalizeTableLabel(mesa.numero) === normalizeTableLabel(data.mesa)) ?? null
    const payload = {
      tableLabel: normalizeTableLabel(data.mesa),
      mesaId: editingComanda ? selectedMesa?.id : mesaPreSelected?.id,
      customerName: data.clienteNome.trim() || undefined,
      customerDocument: data.clienteDocumento.trim() || undefined,
      items: data.itens.map((item) => ({
        productId: item.produtoId.startsWith('manual-') ? undefined : item.produtoId,
        productName: item.produtoId.startsWith('manual-') ? item.nome : undefined,
        quantity: item.quantidade,
        unitPrice: item.precoUnitario,
        notes: item.observacao,
      })),
      discountAmount: amounts.discountAmount,
      serviceFeeAmount: amounts.serviceFeeAmount,
    }

    try {
      if (editingComanda) {
        const response = await replaceComandaMutation.mutateAsync({
          comandaId: editingComanda.id,
          payload,
        })
        setEditingComandaId(null)
        return toPdvComanda(response.comanda)
      }

      const response = await openComandaMutation.mutateAsync(payload satisfies OpenComandaPayload)
      setShowNewModal(false)
      setMesaPreSelected(null)
      return toPdvComanda(response.comanda)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel salvar a comanda agora.'
      setActionError(message)
      throw error
    }
  }

  async function transitionComanda(comanda: Comanda, status: ComandaStatus) {
    setActionError(null)

    try {
      if (status === 'fechada') {
        const amounts = toOperationAmounts(comanda)
        await closeComandaMutation.mutateAsync({
          comandaId: comanda.id,
          payload: amounts,
        })
        return
      }

      await updateComandaStatusMutation.mutateAsync({
        comandaId: comanda.id,
        status: toOperationsStatus(status),
      })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Nao foi possivel atualizar a comanda.')
      throw error
    }
  }

  async function handleAssignGarcom(mesaId: string, garcomId: string | undefined) {
    const mesa = mesasById.get(mesaId)
    if (!mesa?.comandaId) {
      setActionError('Abra uma comanda nessa mesa antes de atribuir um garçom.')
      return
    }

    try {
      setActionError(null)
      await assignComandaMutation.mutateAsync({
        comandaId: mesa.comandaId,
        employeeId: garcomId,
      })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Nao foi possivel redistribuir a mesa.')
    }
  }

  async function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result
    if (!destination || source.droppableId === destination.droppableId) return

    const comanda = comandasById.get(draggableId)
    if (!comanda) return

    await transitionComanda(comanda, destination.droppableId as ComandaStatus)
  }

  function handleClickMesaLivre(mesa: Mesa) {
    setMesaPreSelected(mesa)
    setShowNewModal(true)
  }

  function handleClickMesaOcupada(comanda: Comanda) {
    setEditingComandaId(comanda.id)
    setActiveTab('comandas')
  }

  const totalEmAberto = abertas.reduce((sum, comanda) => sum + calcTotal(comanda), 0)
  const mesasLivres = mesas.filter((mesa) => mesa.status === 'livre').length
  const mesasOcupadas = mesas.filter((mesa) => mesa.status === 'ocupada').length
  const mutationBusy =
    openComandaMutation.isPending ||
    replaceComandaMutation.isPending ||
    assignComandaMutation.isPending ||
    updateComandaStatusMutation.isPending ||
    closeComandaMutation.isPending ||
    createMesaMutation.isPending ||
    updateMesaMutation.isPending

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="imperial-card-soft flex items-center gap-4 p-4">
          <span className="flex size-11 items-center justify-center rounded-[18px] bg-[rgba(96,165,250,0.12)] text-[#60a5fa]">
            <ShoppingBag className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">Comandas abertas</p>
            <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{abertas.length}</p>
          </div>
        </div>

        <div className="imperial-card-soft flex items-center gap-4 p-4">
          <span className="flex size-11 items-center justify-center rounded-[18px] bg-[rgba(52,242,127,0.12)] text-[#36f57c]">
            <TrendingUp className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">Em aberto</p>
            <p className="mt-1 text-2xl font-bold text-[#36f57c]">{formatCurrency(totalEmAberto, 'BRL')}</p>
          </div>
        </div>

        <div className="imperial-card-soft flex items-center gap-4 p-4">
          <span className="flex size-11 items-center justify-center rounded-[18px] bg-[rgba(122,136,150,0.12)] text-[var(--text-soft)]">
            <LayoutGrid className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">Mesas</p>
            <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
              <span className="text-[#36f57c]">{mesasLivres}</span>
              <span className="mx-1 text-[var(--text-muted)] text-lg">/</span>
              <span className="text-[#fb923c]">{mesasOcupadas}</span>
              <span className="ml-1.5 text-xs font-normal text-[var(--text-soft)]">livres / ocupadas</span>
            </p>
          </div>
        </div>
      </div>

      {actionError ? (
        <div className="rounded-[14px] border border-[rgba(245,132,132,0.2)] bg-[rgba(245,132,132,0.08)] px-4 py-3 text-sm text-[#fca5a5]">
          {actionError}
        </div>
      ) : null}

      <div className="flex items-center gap-1 rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-1 w-fit">
        {(
          [
            { id: 'comandas' as ActiveTab, label: 'Comandas', icon: ShoppingBag },
            { id: 'salao' as ActiveTab, label: 'Salão', icon: LayoutGrid },
            { id: 'historico' as ActiveTab, label: 'Histórico', icon: Clock3 },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className="flex items-center gap-2 rounded-[10px] px-4 py-2 text-sm font-medium transition-all"
            style={{
              background: activeTab === id ? 'rgba(52,242,127,0.1)' : 'transparent',
              color: activeTab === id ? '#36f57c' : 'var(--text-soft)',
              border: activeTab === id ? '1px solid rgba(52,242,127,0.25)' : '1px solid transparent',
            }}
            onClick={() => setActiveTab(id)}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'comandas' ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-soft)]">
              Arraste as comandas entre colunas para atualizar o status real da operação
            </p>
            <button
              className="flex items-center gap-2 rounded-[14px] border border-[rgba(52,242,127,0.4)] bg-[rgba(52,242,127,0.1)] px-4 py-2.5 text-sm font-semibold text-[#36f57c] transition-all hover:bg-[rgba(52,242,127,0.18)]"
              type="button"
              onClick={() => {
                setMesaPreSelected(null)
                setShowNewModal(true)
              }}
            >
              Nova Comanda
            </button>
          </div>

          <DragDropContext onDragEnd={(result) => void onDragEnd(result)}>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {KANBAN_COLUMNS.map((column) => (
                <PdvColumn
                  key={column.id}
                  column={column}
                  comandas={comandasByStatus[column.id]}
                  onCardClick={(comanda) => setEditingComandaId(comanda.id)}
                />
              ))}
            </div>
          </DragDropContext>
        </>
      ) : activeTab === 'salao' ? (
        <>
          <SalaoUnificado
            mesas={mesas}
            garcons={garcons}
            comandas={comandas}
            onStatusChange={(mesaId, newStatus) => {
              const mesa = mesasById.get(mesaId)
              if (!mesa) return
              // Arrastar para ocupada = abrir comanda (status é derivado da comanda)
              if (newStatus === 'ocupada' && mesa.status === 'livre') {
                handleClickMesaLivre(mesa)
                return
              }
              // Arrastar para reservada = marcar reserva por 2h
              if (newStatus === 'reservada' && mesa.status === 'livre') {
                const reservedUntil = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
                void updateMesaMutation.mutateAsync({ mesaId, body: { reservedUntil } }).catch((err) => {
                  setActionError(err instanceof Error ? err.message : 'Nao foi possivel reservar a mesa.')
                })
                return
              }
              // Arrastar reservada de volta para livre = cancelar reserva
              if (newStatus === 'livre' && mesa.status === 'reservada') {
                void updateMesaMutation.mutateAsync({ mesaId, body: { reservedUntil: null } }).catch((err) => {
                  setActionError(err instanceof Error ? err.message : 'Nao foi possivel liberar a mesa.')
                })
                return
              }
              // Mesas ocupadas não podem ser movidas manualmente (dependem do fechamento da comanda)
              if (mesa.status === 'ocupada') {
                setActionError('Feche a comanda para liberar esta mesa.')
              }
            }}
            onAssignGarcom={(mesaId, garcomId) => {
              void handleAssignGarcom(mesaId, garcomId)
            }}
            onAddGarcom={() => setActionError('Cadastre funcionários pela área de Vendas para adicioná-los ao turno.')}
            onRemoveGarcom={(employeeId) => {
              const mesa = mesas.find((item) => item.garcomId === employeeId && item.comandaId)
              if (mesa?.comandaId) {
                void handleAssignGarcom(mesa.id, undefined)
                return
              }
              setActionError('Nenhuma mesa ativa vinculada a este funcionário para remover agora.')
            }}
            onAddMesa={() => setAddMesaForm({ label: '', capacity: '4' })}
            onClickLivre={handleClickMesaLivre}
            onClickOcupada={handleClickMesaOcupada}
          />
          {addMesaForm !== null ? (
            <AddMesaModal
              form={addMesaForm}
              busy={createMesaMutation.isPending}
              error={createMesaMutation.error instanceof Error ? createMesaMutation.error.message : null}
              onChange={setAddMesaForm}
              onConfirm={() => {
                const label = addMesaForm.label.trim()
                const capacity = Number.parseInt(addMesaForm.capacity, 10)
                if (!label) {
                  setActionError('Informe o nome da mesa.')
                  setAddMesaForm(null)
                  return
                }
                createMesaMutation.mutate(
                  {
                    label,
                    capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : 4,
                  },
                  {
                    onError: (err) =>
                      setActionError(err instanceof Error ? err.message : 'Nao foi possivel criar a mesa.'),
                  },
                )
              }}
              onClose={() => setAddMesaForm(null)}
            />
          ) : null}
        </>
      ) : (
        <PdvHistoricoView comandas={comandas} />
      )}

      {showNewModal ? (
        <PdvComandaModal
          busy={mutationBusy}
          products={products}
          initialMesa={mesaPreSelected?.numero}
          onClose={() => {
            setShowNewModal(false)
            setMesaPreSelected(null)
          }}
          onSave={persistComandaDraft}
        />
      ) : null}

      {editingComanda ? (
        <PdvComandaModal
          busy={mutationBusy}
          comanda={editingComanda}
          products={products}
          onClose={() => setEditingComandaId(null)}
          onSave={persistComandaDraft}
          onStatusChange={transitionComanda}
        />
      ) : null}
    </div>
  )
}

function AddMesaModal({
  form,
  busy,
  error,
  onChange,
  onConfirm,
  onClose,
}: Readonly<{
  form: AddMesaForm
  busy: boolean
  error: string | null
  onChange: (form: AddMesaForm) => void
  onConfirm: () => void
  onClose: () => void
}>) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="imperial-card w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Nova mesa</h2>
        <p className="mt-1 text-sm text-[var(--text-soft)]">Informe o nome e a capacidade da mesa.</p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-soft)]">
              Nome / identificador
            </label>
            <input
              autoFocus
              className="mt-2 w-full rounded-[10px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[rgba(52,242,127,0.5)]"
              placeholder="Ex: Mesa 1, Varanda 3, VIP"
              value={form.label}
              onChange={(e) => onChange({ ...form, label: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onConfirm()
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-soft)]">
              Capacidade (lugares)
            </label>
            <input
              type="number"
              min={1}
              max={50}
              className="mt-2 w-full rounded-[10px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[rgba(52,242,127,0.5)]"
              value={form.capacity}
              onChange={(e) => onChange({ ...form, capacity: e.target.value })}
            />
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border border-[rgba(255,255,255,0.1)] px-4 py-2 text-sm text-[var(--text-soft)] transition-colors hover:text-[var(--text-primary)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy || !form.label.trim()}
            onClick={onConfirm}
            className="rounded-[10px] bg-[rgba(52,242,127,0.12)] px-4 py-2 text-sm font-semibold text-[#36f57c] transition-colors hover:bg-[rgba(52,242,127,0.22)] disabled:opacity-40"
          >
            {busy ? 'Criando...' : 'Criar mesa'}
          </button>
        </div>
      </div>
    </div>
  )
}
