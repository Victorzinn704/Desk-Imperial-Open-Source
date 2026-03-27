'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChefHat, CheckCircle2, Clock, Flame, Package } from 'lucide-react'
import { useState } from 'react'
import type { KitchenItemStatus, OperationsLiveResponse } from '@contracts/contracts'
import { updateKitchenItemStatus } from '@/lib/api'

interface KitchenItem {
  itemId: string
  comandaId: string
  mesaLabel: string
  productName: string
  quantity: number
  notes: string | null
  kitchenStatus: KitchenItemStatus
  kitchenQueuedAt: string | null
  kitchenReadyAt: string | null
}

interface KitchenOrdersViewProps {
  snapshot: OperationsLiveResponse | undefined
}

type KitchenTab = 'QUEUED' | 'IN_PREPARATION' | 'READY'

const STATUS_CONFIG: Record<
  KitchenTab,
  { label: string; Icon: React.FC<{ className?: string; strokeWidth?: number }>; color: string; bg: string; nextStatus: 'IN_PREPARATION' | 'READY' | 'DELIVERED'; nextLabel: string }
> = {
  QUEUED: {
    label: 'Na fila',
    Icon: Clock,
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.1)',
    nextStatus: 'IN_PREPARATION',
    nextLabel: 'Iniciar preparo',
  },
  IN_PREPARATION: {
    label: 'Em preparo',
    Icon: Flame,
    color: '#fb923c',
    bg: 'rgba(251,146,60,0.1)',
    nextStatus: 'READY',
    nextLabel: 'Marcar como pronto',
  },
  READY: {
    label: 'Pronto',
    Icon: CheckCircle2,
    color: '#34d399',
    bg: 'rgba(52,211,153,0.1)',
    nextStatus: 'DELIVERED',
    nextLabel: 'Entregar',
  },
}

function extractKitchenItems(snapshot: OperationsLiveResponse | undefined): KitchenItem[] {
  if (!snapshot) return []
  const groups = [...snapshot.employees, snapshot.unassigned]
  const items: KitchenItem[] = []
  for (const group of groups) {
    for (const comanda of group.comandas) {
      if (comanda.status === 'CLOSED' || comanda.status === 'CANCELLED') continue
      for (const item of comanda.items) {
        if (item.kitchenStatus && item.kitchenStatus !== 'DELIVERED') {
          items.push({
            itemId: item.id,
            comandaId: comanda.id,
            mesaLabel: comanda.tableLabel,
            productName: item.productName,
            quantity: item.quantity,
            notes: item.notes,
            kitchenStatus: item.kitchenStatus,
            kitchenQueuedAt: item.kitchenQueuedAt,
            kitchenReadyAt: item.kitchenReadyAt,
          })
        }
      }
    }
  }
  // Sort: oldest first
  return items.sort((a, b) => {
    const aTime = a.kitchenQueuedAt ? new Date(a.kitchenQueuedAt).getTime() : 0
    const bTime = b.kitchenQueuedAt ? new Date(b.kitchenQueuedAt).getTime() : 0
    return aTime - bTime
  })
}

function elapsedLabel(isoDate: string | null): string {
  if (!isoDate) return ''
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'agora'
  if (mins === 1) return '1 min'
  return `${mins} min`
}

function KitchenCard({
  item,
  onAdvance,
  isBusy,
}: {
  item: KitchenItem
  onAdvance: (itemId: string, status: 'IN_PREPARATION' | 'READY' | 'DELIVERED') => void
  isBusy: boolean
}) {
  const tab = item.kitchenStatus as KitchenTab
  const config = STATUS_CONFIG[tab]
  const elapsed = elapsedLabel(item.kitchenQueuedAt)

  return (
    <div
      className="rounded-2xl border border-[rgba(255,255,255,0.07)] p-4"
      style={{ background: config.bg }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: config.color }}
            >
              Mesa {item.mesaLabel}
            </span>
            {elapsed && (
              <span className="text-[10px] text-[#7a8896]">{elapsed}</span>
            )}
          </div>
          <p className="text-sm font-semibold text-white leading-snug">
            {item.quantity}× {item.productName}
          </p>
          {item.notes && (
            <p className="mt-1 text-xs text-[#7a8896] italic">"{item.notes}"</p>
          )}
        </div>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onAdvance(item.itemId, config.nextStatus)}
          className="shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition-opacity active:opacity-70 disabled:opacity-40"
          style={{
            background: `rgba(${config.color === '#fbbf24' ? '251,191,36' : config.color === '#fb923c' ? '251,146,60' : '52,211,153'}, 0.2)`,
            color: config.color,
          }}
        >
          {config.nextLabel}
        </button>
      </div>
    </div>
  )
}

export function KitchenOrdersView({ snapshot }: KitchenOrdersViewProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<KitchenTab>('QUEUED')
  const [error, setError] = useState<string | null>(null)

  const allItems = extractKitchenItems(snapshot)
  const tabItems = allItems.filter((i) => i.kitchenStatus === activeTab)

  const advanceMutation = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: 'IN_PREPARATION' | 'READY' | 'DELIVERED' }) =>
      updateKitchenItemStatus(itemId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'live'] })
      setError(null)
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar item.')
    },
  })

  const counts = {
    QUEUED: allItems.filter((i) => i.kitchenStatus === 'QUEUED').length,
    IN_PREPARATION: allItems.filter((i) => i.kitchenStatus === 'IN_PREPARATION').length,
    READY: allItems.filter((i) => i.kitchenStatus === 'READY').length,
  }

  const hasItems = allItems.length > 0

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex shrink-0 gap-1 px-4 pt-4 pb-3">
        {(Object.entries(STATUS_CONFIG) as [KitchenTab, typeof STATUS_CONFIG[KitchenTab]][]).map(
          ([tab, config]) => {
            const isActive = activeTab === tab
            const count = counts[tab]
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className="flex-1 rounded-xl py-2.5 text-[11px] font-bold uppercase tracking-wide transition-all active:scale-95"
                style={{
                  background: isActive ? config.bg : 'rgba(255,255,255,0.04)',
                  color: isActive ? config.color : '#7a8896',
                  border: `1px solid ${isActive ? config.color + '40' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                {config.label}
                {count > 0 && (
                  <span
                    className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full text-[10px]"
                    style={{ background: config.color, color: '#000' }}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          },
        )}
      </div>

      {error && (
        <div className="mx-4 mb-3 rounded-xl bg-[rgba(248,113,113,0.08)] px-4 py-2 text-sm text-[#fca5a5] border border-[rgba(248,113,113,0.2)]">
          {error}
          <button type="button" className="ml-3 text-xs font-semibold underline opacity-70" onClick={() => setError(null)}>OK</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {!hasItems ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)]">
              <ChefHat className="size-7 text-[#7a8896]" />
            </div>
            <p className="text-sm font-medium text-white">Cozinha livre</p>
            <p className="mt-1 text-xs text-[#7a8896]">Nenhum pedido aguardando preparo</p>
          </div>
        ) : tabItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-[#7a8896]">Nenhum item {STATUS_CONFIG[activeTab].label.toLowerCase()}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tabItems.map((item) => (
              <KitchenCard
                key={item.itemId}
                item={item}
                onAdvance={(itemId, status) => advanceMutation.mutate({ itemId, status })}
                isBusy={advanceMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
