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

// null = no focus; string = scroll-to & highlight that comanda

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
  const [focusedComandaId, setFocusedComandaId] = useState<string | null>(null)

  const { status: realtimeStatus } = useOperationsRealtime(Boolean(currentUser), queryClient)

  const operationsQuery = useQuery({
    queryKey: ['operations', 'live'],
    queryFn: () => fetchOperationsLive(),
    enabled: Boolean(currentUser),
    // socket ativo = sem polling; socket offline = fallback a cada 20s
    refetchInterval: realtimeStatus === 'connected' ? false : 20_000,
  })

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
      // occupied → jump straight to that comanda in ativo tab
      setFocusedComandaId(mesa.comandaId)
      setActiveTab('ativo')
    } else {
      // libre → open PDV first so the staff can add items before creating the comanda
      setPendingAction({ type: 'new', mesa })
      setFocusedComandaId(null)
      setActiveTab('pedido')
    }
  }

  function handleAddItemsToComanda(comanda: Comanda) {
    setPendingAction({ type: 'add', comandaId: comanda.id, mesaLabel: comanda.mesa ?? '?' })
    setActiveTab('pedido')
  }

  function handleNewComanda() {
    // clear pending and go to mesas to pick a free table
    setPendingAction(null)
    setFocusedComandaId(null)
    setActiveTab('mesas')
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
      <header
        className="flex shrink-0 items-center justify-between bg-[#000000] px-5 pb-3"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-3">
          <BrandMark />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--accent,#9b8460)]">
                Operacional
              </span>
              <span
                className="size-1.5 rounded-full"
                style={{
                  background: realtimeStatus === 'connected' ? '#34f27f' : realtimeStatus === 'connecting' ? '#fbbf24' : '#f87171',
                }}
              />
            </div>
            <span className="text-sm font-medium text-white">{displayName.split(' ')[0]}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/dashboard?view=settings&panel=account')}
            className="flex size-10 items-center justify-center rounded-full bg-[rgba(255,255,255,0.06)] text-white transition-transform active:scale-95"
            aria-label="Abrir configurações"
          >
            <Cog className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="flex size-10 items-center justify-center rounded-full bg-[rgba(255,255,255,0.06)] text-white transition-transform active:scale-95"
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
            onNewComanda={handleNewComanda}
            focusedComandaId={focusedComandaId}
          />
        ) : null}
      </main>

      <nav
        className="shrink-0 bg-[#000000] px-2 pb-2 pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.6)]"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom,0px))' }}
      >
        <div className="grid h-16 grid-cols-3 gap-1 rounded-[2rem] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-1 relative">
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
                onClick={() => {
                  setActiveTab(id)
                  if (id !== 'ativo') setFocusedComandaId(null)
                }}
                className="relative flex h-full flex-col items-center justify-center gap-1 transition-all active:scale-95"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {isActive && (
                  <div className="absolute inset-x-2 inset-y-1 rounded-[1.5rem] bg-[rgba(155,132,96,0.15)] pointer-events-none" />
                )}
                <div className="relative z-10">
                  <Icon
                    className="size-[22px]"
                    style={{ color: isActive ? 'var(--accent, #9b8460)' : '#7a8896' }}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  {badge > 0 && (
                    <span className="absolute -right-2.5 -top-2 flex size-[18px] items-center justify-center rounded-full bg-[var(--accent,#9b8460)] text-[10px] font-bold text-[#000000] ring-2 ring-black">
                      {badge}
                    </span>
                  )}
                </div>
                <span
                  className="relative z-10 text-[10px] font-semibold tracking-wide"
                  style={{ color: isActive ? 'white' : '#7a8896' }}
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
