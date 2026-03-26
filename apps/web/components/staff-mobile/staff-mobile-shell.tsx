'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Cog, Grid2x2, LogOut, ShoppingCart } from 'lucide-react'
import type { Mesa, Comanda, ComandaItem, ComandaStatus } from '@/components/pdv/pdv-types'
import type { ProductRecord } from '@contracts/contracts'
import { BrandMark } from '@/components/shared/brand-mark'
import { MobileComandaList } from './mobile-comanda-list'
import { MobileOrderBuilder } from './mobile-order-builder'
import { MobileTableGrid } from './mobile-table-grid'
import {
  fetchOperationsLive,
  closeComanda,
  logout,
  openComanda,
  updateComandaStatus,
  addComandaItem,
} from '@/lib/api'
import { useRouter } from 'next/navigation'
import { buildPdvComandas, buildPdvMesas, toOperationAmounts, toOperationsStatus } from '@/components/pdv/pdv-operations'
import { useOperationsRealtime } from '@/components/operations/use-operations-realtime'

type Tab = 'mesas' | 'pedido' | 'ativo'

type PendingAction =
  | { type: 'new'; mesa: Mesa }
  | { type: 'add'; comandaId: string; mesaLabel: string }

interface StaffMobileShellProps {
  currentUser: { name?: string; fullName?: string } | null
  produtos: ProductRecord[]
}

export function StaffMobileShell({ currentUser, produtos }: StaffMobileShellProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('mesas')
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [screenError, setScreenError] = useState<string | null>(null)

  const operationsQuery = useQuery({
    queryKey: ['operations', 'live'],
    queryFn: () => fetchOperationsLive(),
    enabled: Boolean(currentUser),
    refetchInterval: 5_000,
  })

  useOperationsRealtime(Boolean(currentUser), queryClient)

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await queryClient.cancelQueries()
      queryClient.clear()
      router.push('/login')
    },
  })
  const openComandaMutation = useMutation({
    mutationFn: openComanda,
    onSuccess: () => invalidateMobileWorkspace(queryClient),
  })
  const addComandaItemMutation = useMutation({
    mutationFn: ({ comandaId, payload }: { comandaId: string; payload: Parameters<typeof addComandaItem>[1] }) =>
      addComandaItem(comandaId, payload),
  })
  const updateComandaStatusMutation = useMutation({
    mutationFn: ({ comandaId, status }: { comandaId: string; status: 'OPEN' | 'IN_PREPARATION' | 'READY' }) =>
      updateComandaStatus(comandaId, status),
    onSuccess: () => invalidateMobileWorkspace(queryClient),
  })
  const closeComandaMutation = useMutation({
    mutationFn: ({ comandaId, discountAmount, serviceFeeAmount }: { comandaId: string; discountAmount: number; serviceFeeAmount: number }) =>
      closeComanda(comandaId, { discountAmount, serviceFeeAmount }),
    onSuccess: () => invalidateMobileWorkspace(queryClient),
  })

  const mesas = useMemo(() => buildPdvMesas(operationsQuery.data), [operationsQuery.data])
  const comandas = useMemo(() => buildPdvComandas(operationsQuery.data), [operationsQuery.data])
  const activeComandas = comandas.filter((comanda) => comanda.status !== 'fechada')
  const displayName = currentUser?.fullName ?? currentUser?.name ?? 'Funcionário'

  const isBusy =
    openComandaMutation.isPending ||
    addComandaItemMutation.isPending ||
    updateComandaStatusMutation.isPending ||
    closeComandaMutation.isPending

  function handleSelectMesa(mesa: Mesa) {
    if (mesa.status === 'ocupada' && mesa.comandaId) {
      setPendingAction({ type: 'add', comandaId: mesa.comandaId, mesaLabel: mesa.numero })
    } else {
      setPendingAction({ type: 'new', mesa })
    }
    setActiveTab('pedido')
  }

  function handleAddItemsToComanda(comanda: Comanda) {
    setPendingAction({ type: 'add', comandaId: comanda.id, mesaLabel: comanda.mesa ?? '?' })
    setActiveTab('pedido')
  }

  async function handleSubmit(items: ComandaItem[]) {
    if (!pendingAction) return
    setScreenError(null)

    try {
      if (pendingAction.type === 'add') {
        for (const item of items) {
          await addComandaItemMutation.mutateAsync({
            comandaId: pendingAction.comandaId,
            payload: {
              productId: item.produtoId.startsWith('manual-') ? undefined : item.produtoId,
              productName: item.produtoId.startsWith('manual-') ? item.nome : undefined,
              quantity: item.quantidade,
              unitPrice: item.precoUnitario,
              notes: item.observacao,
            },
          })
        }
        await invalidateMobileWorkspace(queryClient)
        setPendingAction(null)
        setActiveTab('ativo')
        return
      }

      // type === 'new'
      await openComandaMutation.mutateAsync({
        tableLabel: pendingAction.mesa.numero,
        items: items.map((item) => ({
          productId: item.produtoId.startsWith('manual-') ? undefined : item.produtoId,
          productName: item.produtoId.startsWith('manual-') ? item.nome : undefined,
          quantity: item.quantidade,
          unitPrice: item.precoUnitario,
          notes: item.observacao,
        })),
      })
      setPendingAction(null)
      setActiveTab('ativo')
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : 'Não foi possível processar o pedido.')
    }
  }

  async function handleUpdateStatus(id: string, status: ComandaStatus) {
    const comanda = comandas.find((item) => item.id === id)
    if (!comanda) return

    try {
      setScreenError(null)

      if (status === 'fechada') {
        const amounts = toOperationAmounts(comanda)
        await closeComandaMutation.mutateAsync({
          comandaId: id,
          ...amounts,
        })
        return
      }

      await updateComandaStatusMutation.mutateAsync({
        comandaId: id,
        status: toOperationsStatus(status),
      })
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : 'Não foi possível atualizar a comanda.')
    }
  }

  const mesaLabel = pendingAction
    ? pendingAction.type === 'new'
      ? pendingAction.mesa.numero
      : pendingAction.mesaLabel
    : '?'
  const orderMode = pendingAction?.type === 'add' ? 'add' : 'new'

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#000000] text-white">
      <header className="flex shrink-0 items-center justify-between border-b border-[rgba(255,255,255,0.06)] bg-[#000000] px-4 py-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#9b8460)]">
              Operacional
            </p>
            <p className="text-xs text-[#7a8896]">Olá, {displayName.split(' ')[0]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/dashboard?view=settings&panel=account')}
            className="flex size-9 items-center justify-center rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[#7a8896] transition-colors active:bg-[rgba(255,255,255,0.1)]"
            aria-label="Abrir configurações"
          >
            <Cog className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="flex size-9 items-center justify-center rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[#7a8896] transition-colors active:bg-[rgba(255,255,255,0.1)]"
            aria-label="Encerrar sessão"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      {screenError ? (
        <div className="border-b border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-sm text-[#fca5a5]">
          {screenError}
          <button
            type="button"
            className="ml-3 text-xs font-semibold underline opacity-70"
            onClick={() => setScreenError(null)}
          >
            OK
          </button>
        </div>
      ) : null}

      <main className="flex-1 overflow-y-auto">
        {activeTab === 'mesas' ? <MobileTableGrid mesas={mesas} onSelectMesa={handleSelectMesa} /> : null}

        {activeTab === 'pedido' ? (
          pendingAction ? (
            <MobileOrderBuilder
              mesaLabel={mesaLabel}
              mode={orderMode}
              busy={isBusy}
              produtos={produtos}
              onSubmit={handleSubmit}
              onCancel={() => { setPendingAction(null); setActiveTab('mesas') }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)]">
                <ShoppingCart className="size-7 text-[#7a8896]" />
              </div>
              <p className="text-sm font-medium text-white">Selecione uma mesa primeiro</p>
              <p className="mt-1 text-xs text-[#7a8896]">
                Vá para a aba Mesas e toque em uma mesa para criar um pedido
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('mesas')}
                className="mt-6 rounded-xl bg-[rgba(155,132,96,0.15)] px-5 py-2.5 text-sm font-semibold text-[var(--accent,#9b8460)] transition-opacity active:opacity-70"
              >
                Ver mesas
              </button>
            </div>
          )
        ) : null}

        {activeTab === 'ativo' ? (
          <MobileComandaList
            comandas={activeComandas}
            onUpdateStatus={handleUpdateStatus}
            onAddItems={handleAddItemsToComanda}
          />
        ) : null}
      </main>

      <nav
        className="shrink-0 border-t border-[rgba(255,255,255,0.06)] bg-[#000000]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom,0px)' }}
      >
        <div className="grid grid-cols-3">
          {(
            [
              { id: 'mesas', label: 'Mesas', Icon: Grid2x2, badge: 0 },
              { id: 'pedido', label: 'Pedido', Icon: ShoppingCart, badge: 0 },
              { id: 'ativo', label: 'Ativo', Icon: ClipboardList, badge: activeComandas.length },
            ] as const
          ).map(({ id, label, Icon, badge }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className="relative flex flex-col items-center justify-center gap-1 py-3 transition-colors"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {isActive ? (
                  <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-[var(--accent,#9b8460)]" />
                ) : null}
                <div className="relative">
                  <Icon
                    className="size-5"
                    style={{ color: isActive ? 'var(--accent, #9b8460)' : '#7a8896' }}
                  />
                  {badge > 0 ? (
                    <span className="absolute -right-2 -top-1.5 flex size-4 items-center justify-center rounded-full bg-[var(--accent,#9b8460)] text-[9px] font-bold text-black">
                      {badge}
                    </span>
                  ) : null}
                </div>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: isActive ? 'var(--accent, #9b8460)' : '#7a8896' }}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

async function invalidateMobileWorkspace(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['operations', 'live'] }),
    queryClient.invalidateQueries({ queryKey: ['orders'] }),
    queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] }),
  ])
}
