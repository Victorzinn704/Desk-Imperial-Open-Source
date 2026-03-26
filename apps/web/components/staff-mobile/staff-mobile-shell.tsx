'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Cog, Grid2x2, LogOut, ShoppingCart } from 'lucide-react'
import type { Mesa, ComandaItem, ComandaStatus } from '@/components/pdv/pdv-types'
import type { ProductRecord } from '@contracts/contracts'
import { BrandMark } from '@/components/shared/brand-mark'
import { MobileComandaList } from './mobile-comanda-list'
import { MobileOrderBuilder } from './mobile-order-builder'
import { MobileTableGrid } from './mobile-table-grid'
import { fetchOperationsLive, closeComanda, logout, openComanda, updateComandaStatus } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { buildPdvComandas, buildPdvMesas, toOperationAmounts, toOperationsStatus } from '@/components/pdv/pdv-operations'
import { useOperationsRealtime } from '@/components/operations/use-operations-realtime'

type Tab = 'mesas' | 'pedido' | 'ativo'

interface StaffMobileShellProps {
  currentUser: { name?: string; fullName?: string } | null
  produtos: ProductRecord[]
}

export function StaffMobileShell({ currentUser, produtos }: StaffMobileShellProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('mesas')
  const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null)
  const [screenError, setScreenError] = useState<string | null>(null)

  const operationsQuery = useQuery({
    queryKey: ['operations', 'live'],
    queryFn: () => fetchOperationsLive(),
    enabled: Boolean(currentUser),
    refetchInterval: 15_000,
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

  const mesas = useMemo(() => buildPdvMesas(operationsQuery.data, ['1', '2', '3', '4', '5', '6']), [operationsQuery.data])
  const comandas = useMemo(() => buildPdvComandas(operationsQuery.data), [operationsQuery.data])
  const activeComandas = comandas.filter((comanda) => comanda.status !== 'fechada')
  const displayName = currentUser?.fullName ?? currentUser?.name ?? 'Funcionário'

  function handleSelectMesa(mesa: Mesa) {
    setSelectedMesa(mesa)
    setActiveTab('pedido')
  }

  async function handleSubmit(items: ComandaItem[]) {
    if (!selectedMesa) return

    try {
      setScreenError(null)
      await openComandaMutation.mutateAsync({
        tableLabel: selectedMesa.numero,
        items: items.map((item) => ({
          productId: item.produtoId.startsWith('manual-') ? undefined : item.produtoId,
          productName: item.produtoId.startsWith('manual-') ? item.nome : undefined,
          quantity: item.quantidade,
          unitPrice: item.precoUnitario,
          notes: item.observacao,
        })),
      })
      setSelectedMesa(null)
      setActiveTab('ativo')
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : 'Nao foi possivel abrir a comanda.')
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
      setScreenError(error instanceof Error ? error.message : 'Nao foi possivel atualizar a comanda.')
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#000000] text-white">
      <header className="flex shrink-0 items-center justify-between border-b border-[rgba(255,255,255,0.06)] bg-[#000000] px-4 py-3">
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
        </div>
      ) : null}

      <main className="flex-1 overflow-y-auto">
        {activeTab === 'mesas' ? <MobileTableGrid mesas={mesas} onSelectMesa={handleSelectMesa} /> : null}

        {activeTab === 'pedido' ? (
          selectedMesa ? (
            <MobileOrderBuilder
              mesa={selectedMesa}
              produtos={produtos}
              onSubmit={handleSubmit}
              onCancel={() => setActiveTab('mesas')}
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
          />
        ) : null}
      </main>

      <nav className="shrink-0 border-t border-[rgba(255,255,255,0.06)] bg-[#000000]">
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
