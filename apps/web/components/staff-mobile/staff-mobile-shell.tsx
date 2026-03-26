'use client'

import { useState } from 'react'
import { Grid2x2, ShoppingCart, ClipboardList, LogOut, Cog } from 'lucide-react'
import type { Mesa, Comanda, ComandaItem, ComandaStatus } from '@/components/pdv/pdv-types'
import type { ProductRecord } from '@contracts/contracts'
import { BrandMark } from '@/components/shared/brand-mark'
import { MobileTableGrid } from './mobile-table-grid'
import { MobileOrderBuilder } from './mobile-order-builder'
import { MobileComandaList } from './mobile-comanda-list'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { logout } from '@/lib/api'
import { useRouter } from 'next/navigation'

type Tab = 'mesas' | 'pedido' | 'ativo'

const DEFAULT_MESAS: Mesa[] = Array.from({ length: 6 }, (_, i) => ({
  id: String(i + 1),
  numero: String(i + 1),
  capacidade: 4,
  status: 'livre' as const,
}))

interface StaffMobileShellProps {
  currentUser: { name?: string; fullName?: string } | null
  produtos: ProductRecord[]
}

export function StaffMobileShell({ currentUser, produtos }: StaffMobileShellProps) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<Tab>('mesas')
  const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null)
  const [mesas, setMesas] = useState<Mesa[]>(DEFAULT_MESAS)
  const [comandas, setComandas] = useState<Comanda[]>([])

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await queryClient.cancelQueries()
      queryClient.clear()
      router.push('/login')
    },
  })

  function handleSelectMesa(mesa: Mesa) {
    setSelectedMesa(mesa)
    setActiveTab('pedido')
  }

  function handleSubmit(items: ComandaItem[]) {
    if (!selectedMesa) return

    const newComanda: Comanda = {
      id: `comanda-${Date.now()}`,
      status: 'aberta',
      mesa: selectedMesa.numero,
      itens: items,
      desconto: 0,
      acrescimo: 0,
      abertaEm: new Date(),
    }

    setComandas((prev) => [...prev, newComanda])
    setMesas((prev) =>
      prev.map((m) =>
        m.id === selectedMesa.id
          ? { ...m, status: 'ocupada' as const, comandaId: newComanda.id }
          : m,
      ),
    )
    setSelectedMesa(null)
    setActiveTab('ativo')
  }

  function handleUpdateStatus(id: string, status: ComandaStatus) {
    setComandas((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c)),
    )

    if (status === 'fechada') {
      const comanda = comandas.find((c) => c.id === id)
      if (comanda?.mesa) {
        setMesas((prev) =>
          prev.map((m) =>
            m.numero === comanda.mesa
              ? { ...m, status: 'livre' as const, comandaId: undefined }
              : m,
          ),
        )
      }
    }
  }

  const activeComandas = comandas.filter((c) => c.status !== 'fechada')
  const displayName = currentUser?.fullName ?? currentUser?.name ?? 'Funcionário'

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#000000] text-white">
      {/* Fixed top bar */}
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

      {/* Scrollable main content */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'mesas' && (
          <MobileTableGrid mesas={mesas} onSelectMesa={handleSelectMesa} />
        )}

        {activeTab === 'pedido' && (
          selectedMesa ? (
            <MobileOrderBuilder
              mesa={selectedMesa}
              produtos={produtos}
              onSubmit={handleSubmit}
              onCancel={() => setActiveTab('mesas')}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
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
        )}

        {activeTab === 'ativo' && (
          <MobileComandaList
            comandas={activeComandas}
            onUpdateStatus={handleUpdateStatus}
          />
        )}
      </main>

      {/* Fixed bottom navigation */}
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
                {/* Gold underline on active */}
                {isActive && (
                  <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-[var(--accent,#9b8460)]" />
                )}
                <div className="relative">
                  <Icon
                    className="size-5"
                    style={{ color: isActive ? 'var(--accent, #9b8460)' : '#7a8896' }}
                  />
                  {badge > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex size-4 items-center justify-center rounded-full bg-[var(--accent,#9b8460)] text-[9px] font-bold text-black">
                      {badge}
                    </span>
                  )}
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
