'use client'

import { useMemo, useState } from 'react'
import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LayoutGrid, ShoppingBag, TrendingUp } from 'lucide-react'
import type { AuthUser, OpenComandaPayload, ReplaceComandaPayload } from '@/lib/api'
import { assignComanda, closeComanda, openComanda, replaceComanda, updateComandaStatus } from '@/lib/api'
import type { OperationsLiveResponse } from '@contracts/contracts'
import { formatCurrency } from '@/lib/currency'
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
import { SalaoUnificado } from './pdv-salao-unified'

type SimpleProduct = {
  id: string
  name: string
  category: string
  unitPrice: number
  currency: string
}

type PdvBoardProps = {
  currentUser: AuthUser
  operations?: OperationsLiveResponse
  products: SimpleProduct[]
}

type ActiveTab = 'comandas' | 'salao'

export function PdvBoard({ currentUser, operations, products }: Readonly<PdvBoardProps>) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<ActiveTab>('comandas')
  const [showNewModal, setShowNewModal] = useState(false)
  const [editingComandaId, setEditingComandaId] = useState<string | null>(null)
  const [mesaPreSelected, setMesaPreSelected] = useState<Mesa | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const comandas = useMemo(() => buildPdvComandas(operations), [operations])
  const mesas = useMemo(() => buildPdvMesas(operations), [operations])
  const garcons = useMemo(() => buildPdvGarcons(operations), [operations])
  const editingComanda = comandas.find((item) => item.id === editingComandaId) ?? null

  const openComandaMutation = useMutation({
    mutationFn: openComanda,
    onSuccess: () => invalidateOperationsWorkspace(queryClient),
  })
  const replaceComandaMutation = useMutation({
    mutationFn: ({ comandaId, payload }: { comandaId: string; payload: ReplaceComandaPayload }) =>
      replaceComanda(comandaId, payload),
    onSuccess: () => invalidateOperationsWorkspace(queryClient),
  })
  const assignComandaMutation = useMutation({
    mutationFn: ({ comandaId, employeeId }: { comandaId: string; employeeId?: string }) => assignComanda(comandaId, employeeId),
    onSuccess: () => invalidateOperationsWorkspace(queryClient),
  })
  const updateComandaStatusMutation = useMutation({
    mutationFn: ({ comandaId, status }: { comandaId: string; status: 'OPEN' | 'IN_PREPARATION' | 'READY' }) =>
      updateComandaStatus(comandaId, status),
    onSuccess: () => invalidateOperationsWorkspace(queryClient),
  })
  const closeComandaMutation = useMutation({
    mutationFn: ({ comandaId, payload }: { comandaId: string; payload: { discountAmount: number; serviceFeeAmount: number } }) =>
      closeComanda(comandaId, payload),
    onSuccess: () => invalidateOperationsWorkspace(queryClient),
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
      mesa: data.mesa,
      clienteNome: data.clienteNome || undefined,
      clienteDocumento: data.clienteDocumento || undefined,
      itens: data.itens,
      desconto: data.desconto,
      acrescimo: data.acrescimo,
      abertaEm: editingComanda?.abertaEm ?? new Date(),
    }
    const amounts = toOperationAmounts(draft)
    const payload = {
      tableLabel: data.mesa.trim(),
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
    const mesa = mesas.find((item) => item.id === mesaId)
    if (!mesa?.comandaId || currentUser.role !== 'OWNER') {
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

    const comanda = comandas.find((item) => item.id === draggableId)
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

  const abertas = comandas.filter((comanda) => comanda.status !== 'fechada')
  const totalEmAberto = abertas.reduce((sum, comanda) => sum + calcTotal(comanda), 0)
  const mesasLivres = mesas.filter((mesa) => mesa.status === 'livre').length
  const mesasOcupadas = mesas.filter((mesa) => mesa.status === 'ocupada').length
  const mutationBusy =
    openComandaMutation.isPending ||
    replaceComandaMutation.isPending ||
    assignComandaMutation.isPending ||
    updateComandaStatusMutation.isPending ||
    closeComandaMutation.isPending

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="imperial-card-soft flex items-center gap-4 p-4">
          <span className="flex size-11 items-center justify-center rounded-[18px] bg-[rgba(96,165,250,0.12)] text-[#60a5fa]">
            <ShoppingBag className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">Comandas abertas</p>
            <p className="mt-1 text-2xl font-bold text-white">{abertas.length}</p>
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
            <p className="mt-1 text-2xl font-bold text-white">
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
        {([
          { id: 'comandas' as ActiveTab, label: 'Comandas', icon: ShoppingBag },
          { id: 'salao' as ActiveTab, label: 'Salão', icon: LayoutGrid },
        ] as const).map(({ id, label, icon: Icon }) => (
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
                  comandas={comandas.filter((comanda) => comanda.status === column.id)}
                  onCardClick={(comanda) => setEditingComandaId(comanda.id)}
                />
              ))}
            </div>
          </DragDropContext>
        </>
      ) : (
        <SalaoUnificado
          mesas={mesas}
          garcons={garcons}
          comandas={comandas}
          onStatusChange={() => undefined}
          onAssignGarcom={(mesaId, garcomId) => {
            void handleAssignGarcom(mesaId, garcomId)
          }}
          onAddGarcom={() => setActionError('Cadastre ou edite funcionários pela área administrativa da empresa.')}
          onRemoveGarcom={(employeeId) => {
            const mesa = mesas.find((item) => item.garcomId === employeeId && item.comandaId)
            if (mesa?.comandaId) {
              void handleAssignGarcom(mesa.id, undefined)
              return
            }
            setActionError('Nenhuma mesa ativa vinculada a este funcionário para remover agora.')
          }}
          onAddMesa={() => setActionError('A lista persistente de mesas ainda depende da camada de banco em andamento.')}
          onClickLivre={handleClickMesaLivre}
          onClickOcupada={handleClickMesaOcupada}
        />
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

async function invalidateOperationsWorkspace(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['operations', 'live'] }),
    queryClient.invalidateQueries({ queryKey: ['orders'] }),
    queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] }),
  ])
}
