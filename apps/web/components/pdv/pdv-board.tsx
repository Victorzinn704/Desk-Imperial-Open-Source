'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ShoppingBag } from 'lucide-react'
import {
  cancelComanda,
  closeComanda,
  openComanda,
  type OpenComandaPayload,
  replaceComanda,
  type ReplaceComandaPayload,
  updateComandaStatus,
} from '@/lib/api'
import type { OperationsLiveResponse } from '@contracts/contracts'
import { invalidateOperationsWorkspace, rollbackOperationsSnapshot, setOptimisticComandaStatus } from '@/lib/operations'
import { PdvColumn } from './pdv-column'
import { PdvComandaModal } from './pdv-comanda-modal'
import { buildPdvComandas, buildPdvMesas, toOperationAmounts, toOperationsStatus, toPdvComanda } from './pdv-operations'
import {
  type Comanda,
  type ComandaItem,
  type ComandaStatus,
  isEndedComandaStatus,
  KANBAN_COLUMNS,
  type Mesa,
} from './pdv-types'
import { normalizeTableLabel } from './normalize-table-label'
import type { PdvMesaIntent } from './pdv-navigation-intent'
import type { SimpleProduct } from './comanda-modal'

type PdvBoardProps = Readonly<{
  mesaIntent?: PdvMesaIntent | null
  onConsumeMesaIntent?: () => void
  operations?: OperationsLiveResponse
  products: SimpleProduct[]
  variant?: 'grid' | 'comandas' | 'cobranca'
}>

const OPERATIONS_LIVE_QUERY_KEY = ['operations', 'live'] as const

export function PdvBoard({
  mesaIntent = null,
  onConsumeMesaIntent,
  operations,
  products,
  variant = 'grid',
}: Readonly<PdvBoardProps>) {
  const queryClient = useQueryClient()
  const [showNewModal, setShowNewModal] = useState(false)
  const [editingComandaId, setEditingComandaId] = useState<string | null>(null)
  const [mesaPreSelected, setMesaPreSelected] = useState<Mesa | null>(null)
  const [mesaPreSelectedLabel, setMesaPreSelectedLabel] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const lastHandledIntentRef = useRef<number | null>(null)

  const comandas = useMemo(() => buildPdvComandas(operations), [operations])
  const mesas = useMemo(() => buildPdvMesas(operations), [operations])
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
  const editingComanda = (editingComandaId ? comandasById.get(editingComandaId) : null) ?? null
  const sectionCopy = {
    grid: {
      eyebrow: 'Operação viva',
      title: 'Comandas em andamento',
      description: 'Abra uma comanda e mova cada etapa sem repetir leitura no resto da tela.',
    },
    comandas: {
      eyebrow: 'Mesas e balcão',
      title: 'Fila de atendimento',
      description: 'Use as colunas para acompanhar o que está aberto, em preparo e pronto para fechar.',
    },
    cobranca: {
      eyebrow: 'Cobrança ativa',
      title: 'Fechamento por comanda',
      description: 'Abra a comanda da coluna para revisar itens, desconto e cobrança em uma única superfície.',
    },
  }[variant]

  useEffect(() => {
    if (!mesaIntent) {
      lastHandledIntentRef.current = null
      return
    }
    if (lastHandledIntentRef.current === mesaIntent.requestId) {
      return
    }

    const comandaFromIntent = mesaIntent.comandaId ? (comandasById.get(mesaIntent.comandaId) ?? null) : null
    const mesaFromIntent =
      mesasById.get(mesaIntent.mesaId) ??
      mesas.find((mesa) => normalizeTableLabel(mesa.numero) === normalizeTableLabel(mesaIntent.mesaLabel)) ??
      null

    // Espera o primeiro snapshot ao abrir direto uma comanda existente.
    if (mesaIntent.comandaId && !comandaFromIntent && !operations) {
      return
    }

    lastHandledIntentRef.current = mesaIntent.requestId
    const frame = window.requestAnimationFrame(() => {
      if (comandaFromIntent) {
        setShowNewModal(false)
        setMesaPreSelected(null)
        setMesaPreSelectedLabel(null)
        setEditingComandaId(comandaFromIntent.id)
        onConsumeMesaIntent?.()
        return
      }

      setEditingComandaId(null)
      setMesaPreSelected(mesaFromIntent)
      setMesaPreSelectedLabel(mesaFromIntent?.numero ?? mesaIntent.mesaLabel)
      setShowNewModal(true)
      onConsumeMesaIntent?.()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [comandasById, mesaIntent, mesas, mesasById, onConsumeMesaIntent, operations])

  const openComandaMutation = useMutation({
    mutationFn: (payload: OpenComandaPayload) => openComanda(payload, { includeSnapshot: false }),
    onSuccess: () => invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_KEY),
  })
  const replaceComandaMutation = useMutation({
    mutationFn: ({ comandaId, payload }: { comandaId: string; payload: ReplaceComandaPayload }) =>
      replaceComanda(comandaId, payload, { includeSnapshot: false }),
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
  const cancelComandaMutation = useMutation({
    mutationFn: (comandaId: string) => cancelComanda(comandaId, { includeSnapshot: false }),
    onMutate: async (comandaId) => {
      await queryClient.cancelQueries({ queryKey: OPERATIONS_LIVE_QUERY_KEY })
      const snapshot = setOptimisticComandaStatus(queryClient, OPERATIONS_LIVE_QUERY_KEY, comandaId, 'CANCELLED')
      return { snapshot }
    },
    onError: (_error, _vars, context) => {
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_QUERY_KEY, context?.snapshot)
    },
    onSuccess: () =>
      invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_KEY, {
        includeKitchen: true,
        includeSummary: true,
      }),
  })

  async function persistComandaDraft(data: {
    mesa: string
    clienteNome: string
    clienteDocumento: string
    notes: string
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
      notes: data.notes.trim() || undefined,
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
      mesaId: editingComanda ? selectedMesa?.id : (mesaPreSelected?.id ?? selectedMesa?.id),
      customerName: data.clienteNome.trim() || undefined,
      customerDocument: data.clienteDocumento.trim() || undefined,
      notes: data.notes.trim() || undefined,
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
      setMesaPreSelectedLabel(null)
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
      if (comanda.status === status) {
        return
      }

      if (status === 'fechada') {
        const amounts = toOperationAmounts(comanda)
        await closeComandaMutation.mutateAsync({
          comandaId: comanda.id,
          payload: amounts,
        })
        return
      }

      if (status === 'cancelada') {
        await cancelComandaMutation.mutateAsync(comanda.id)
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

  async function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result
    if (!destination || source.droppableId === destination.droppableId) {
      return
    }

    const comanda = comandasById.get(draggableId)
    if (!comanda) {
      return
    }

    await transitionComanda(comanda, destination.droppableId as ComandaStatus)
  }
  const mutationBusy =
    openComandaMutation.isPending ||
    replaceComandaMutation.isPending ||
    updateComandaStatusMutation.isPending ||
    cancelComandaMutation.isPending ||
    closeComandaMutation.isPending

  return (
    <div className="space-y-5">
      {actionError ? (
        <div
          className="rounded-[14px] border px-4 py-3 text-sm text-[var(--danger)]"
          style={{
            borderColor: 'color-mix(in srgb, var(--danger) 24%, var(--border))',
            backgroundColor: 'color-mix(in srgb, var(--danger) 10%, var(--surface))',
          }}
        >
          {actionError}
        </div>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] tracking-[0.08em] text-[var(--text-muted)]">{sectionCopy.eyebrow}</p>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{sectionCopy.title}</h2>
            <p className="max-w-2xl text-sm text-[var(--text-soft)]">{sectionCopy.description}</p>
          </div>

          <button
            className="flex min-h-11 items-center justify-center gap-2 rounded-[14px] border px-4 py-2.5 text-sm font-semibold transition-colors"
            style={{
              background: 'color-mix(in srgb, var(--accent) 10%, var(--surface))',
              borderColor: 'color-mix(in srgb, var(--accent) 24%, var(--border))',
              color: 'var(--accent)',
            }}
            type="button"
            onClick={() => {
              setMesaPreSelected(null)
              setMesaPreSelectedLabel(null)
              setShowNewModal(true)
            }}
          >
            <ShoppingBag className="size-4" />
            Nova comanda
          </button>
        </div>

        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
          <DragDropContext onDragEnd={(result) => void onDragEnd(result)}>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {KANBAN_COLUMNS.map((column) => (
                <PdvColumn
                  column={column}
                  comandas={comandasByStatus[column.id]}
                  key={column.id}
                  onCardClick={(comanda) => setEditingComandaId(comanda.id)}
                />
              ))}
            </div>
          </DragDropContext>
        </div>
      </section>

      {showNewModal ? (
        <PdvComandaModal
          busy={mutationBusy}
          initialMesa={mesaPreSelected?.numero ?? mesaPreSelectedLabel ?? undefined}
          products={products}
          onClose={() => {
            setShowNewModal(false)
            setMesaPreSelected(null)
            setMesaPreSelectedLabel(null)
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
          onStatusChange={(comanda, status) => {
            if (isEndedComandaStatus(comanda.status)) {
              return Promise.resolve()
            }
            return transitionComanda(comanda, status)
          }}
        />
      ) : null}
    </div>
  )
}
