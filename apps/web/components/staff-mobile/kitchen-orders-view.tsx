'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ChefHat, Clock, Flame, LoaderCircle, TriangleAlert, WifiOff } from 'lucide-react'
import { memo, useMemo, useState } from 'react'
import type { OperationsKitchenItemRecord, OperationsKitchenResponse } from '@contracts/contracts'
import { updateKitchenItemStatus } from '@/lib/api'
import type { LabStatusTone } from '@/components/design-lab/lab-primitives'
import { OperationEmptyState } from '@/components/operations/operation-empty-state'

interface KitchenOrdersViewProps {
  data: OperationsKitchenResponse | undefined
  queryKey: readonly unknown[]
  isLoading?: boolean
  isOffline?: boolean
  errorMessage?: string | null
}

type KitchenTab = 'QUEUED' | 'IN_PREPARATION' | 'READY'

const STATUS_CONFIG: Record<
  KitchenTab,
  {
    label: string
    Icon: React.FC<{ className?: string; strokeWidth?: number }>
    tone: LabStatusTone
    colorVar: string
    nextStatus: 'IN_PREPARATION' | 'READY' | 'DELIVERED'
    nextLabel: string
  }
> = {
  QUEUED: {
    label: 'Na fila',
    Icon: Clock,
    tone: 'warning',
    colorVar: 'var(--warning)',
    nextStatus: 'IN_PREPARATION',
    nextLabel: 'Iniciar preparo',
  },
  IN_PREPARATION: {
    label: 'Em preparo',
    Icon: Flame,
    tone: 'info',
    colorVar: 'var(--accent)',
    nextStatus: 'READY',
    nextLabel: 'Marcar como pronto',
  },
  READY: {
    label: 'Pronto',
    Icon: CheckCircle2,
    tone: 'success',
    colorVar: 'var(--success)',
    nextStatus: 'DELIVERED',
    nextLabel: 'Entregar',
  },
}

function getTonePanelStyle(tone: LabStatusTone) {
  switch (tone) {
    case 'success':
      return {
        borderColor: 'color-mix(in srgb, var(--success) 22%, var(--border))',
        backgroundColor: 'color-mix(in srgb, var(--success) 8%, var(--surface))',
      }
    case 'warning':
      return {
        borderColor: 'color-mix(in srgb, var(--warning) 22%, var(--border))',
        backgroundColor: 'color-mix(in srgb, var(--warning) 8%, var(--surface))',
      }
    case 'danger':
      return {
        borderColor: 'color-mix(in srgb, var(--danger) 22%, var(--border))',
        backgroundColor: 'color-mix(in srgb, var(--danger) 8%, var(--surface))',
      }
    case 'info':
      return {
        borderColor: 'color-mix(in srgb, var(--accent) 22%, var(--border))',
        backgroundColor: 'color-mix(in srgb, var(--accent) 8%, var(--surface))',
      }
    case 'neutral':
    default:
      return {
        borderColor: 'var(--border)',
        backgroundColor: 'color-mix(in srgb, var(--surface-muted) 34%, var(--surface))',
      }
  }
}

function elapsedLabel(isoDate: string | null): string {
  if (!isoDate) {return ''}
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) {return 'agora'}
  if (mins === 1) {return '1 min'}
  return `${mins} min`
}

function KitchenCard({
  item,
  onAdvance,
  isBusy,
}: {
  item: OperationsKitchenItemRecord
  onAdvance: (itemId: string, status: 'IN_PREPARATION' | 'READY' | 'DELIVERED') => void
  isBusy: boolean
}) {
  const tab = item.kitchenStatus as KitchenTab
  const config = STATUS_CONFIG[tab]
  const elapsed = elapsedLabel(item.kitchenQueuedAt)
  const tonePanelStyle = getTonePanelStyle(config.tone)

  return (
    <div className="rounded-2xl border p-4" style={tonePanelStyle}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: config.colorVar }}>
              Mesa {item.mesaLabel}
            </span>
            {elapsed && <span className="text-[10px] text-[var(--text-soft)]">{elapsed}</span>}
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug">
            {item.quantity}× {item.productName}
          </p>
          {item.notes && <p className="mt-1 text-xs text-[var(--text-soft)] italic">{`"${item.notes}"`}</p>}
        </div>
        <button
          className="shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition-opacity active:opacity-70 disabled:opacity-40"
          disabled={isBusy}
          style={{
            ...tonePanelStyle,
            color: config.colorVar,
          }}
          type="button"
          onClick={() => onAdvance(item.itemId, config.nextStatus)}
        >
          {config.nextLabel}
        </button>
      </div>
    </div>
  )
}

function buildStatusCounts(items: OperationsKitchenItemRecord[]) {
  return items.reduce(
    (accumulator, item) => {
      if (item.kitchenStatus === 'QUEUED') {
        accumulator.QUEUED += 1
      } else if (item.kitchenStatus === 'IN_PREPARATION') {
        accumulator.IN_PREPARATION += 1
      } else if (item.kitchenStatus === 'READY') {
        accumulator.READY += 1
      }

      return accumulator
    },
    {
      QUEUED: 0,
      IN_PREPARATION: 0,
      READY: 0,
    },
  )
}

export function KitchenOrdersView({
  data,
  queryKey,
  isLoading = false,
  isOffline = false,
  errorMessage = null,
}: KitchenOrdersViewProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<KitchenTab>('QUEUED')
  const [error, setError] = useState<string | null>(null)

  const allItems = useMemo(() => data?.items ?? [], [data])
  const tabItems = useMemo(() => allItems.filter((i) => i.kitchenStatus === activeTab), [activeTab, allItems])

  const advanceMutation = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: 'IN_PREPARATION' | 'READY' | 'DELIVERED' }) =>
      updateKitchenItemStatus(itemId, status),
    onMutate: async ({ itemId, status }) => {
      await queryClient.cancelQueries({ queryKey })
      const snapshotBefore = queryClient.getQueryData<OperationsKitchenResponse>(queryKey)

      if (snapshotBefore) {
        const nextItems = snapshotBefore.items.flatMap((item) => {
          if (item.itemId !== itemId) {
            return [item]
          }

          if (status === 'DELIVERED') {
            return []
          }

          return [
            {
              ...item,
              kitchenStatus: status,
              kitchenReadyAt: status === 'READY' ? new Date().toISOString() : item.kitchenReadyAt,
            },
          ]
        })
        const nextCounts = buildStatusCounts(nextItems)

        queryClient.setQueryData<OperationsKitchenResponse>(queryKey, {
          ...snapshotBefore,
          items: nextItems,
          statusCounts: {
            queued: nextCounts.QUEUED,
            inPreparation: nextCounts.IN_PREPARATION,
            ready: nextCounts.READY,
          },
        })
      }

      return { snapshotBefore }
    },
    onSuccess: () => {
      setError(null)
    },
    onError: (err, _vars, context) => {
      if (context?.snapshotBefore) {
        queryClient.setQueryData(queryKey, context.snapshotBefore)
      }
      setError(err instanceof Error ? err.message : 'Erro ao atualizar item.')
    },
  })

  const counts = useMemo(() => buildStatusCounts(allItems), [allItems])

  const hasItems = allItems.length > 0

  return (
    <div className="flex flex-col h-full">
      {errorMessage ? (
        <div
          className="mx-4 mt-4 rounded-2xl border px-4 py-3 text-xs text-[var(--danger)]"
          style={getTonePanelStyle('danger')}
        >
          {errorMessage}
        </div>
      ) : isOffline ? (
        <div
          className="mx-4 mt-4 rounded-2xl border px-4 py-3 text-xs text-[var(--warning)]"
          style={getTonePanelStyle('warning')}
        >
          Você está offline. A fila da cozinha pode estar desatualizada até a reconexão.
        </div>
      ) : null}

      {/* Tab bar */}
      <div className="flex shrink-0 gap-1 px-4 pt-4 pb-3">
        {(Object.entries(STATUS_CONFIG) as [KitchenTab, (typeof STATUS_CONFIG)[KitchenTab]][]).map(([tab, config]) => {
          const isActive = activeTab === tab
          const count = counts[tab]
          return (
            <button
              className="flex-1 rounded-xl py-2.5 text-[11px] font-bold uppercase tracking-wide transition-all active:scale-95"
              key={tab}
              style={{
                ...(isActive ? getTonePanelStyle(config.tone) : { backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }),
                color: isActive ? config.colorVar : 'var(--text-soft)',
                border: `1px solid ${isActive ? 'transparent' : 'var(--border)'}`,
              }}
              type="button"
              onClick={() => setActiveTab(tab)}
            >
              {config.label}
              {count > 0 && (
                <span
                  className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full text-[10px]"
                  style={{ background: config.colorVar, color: 'var(--on-accent)' }}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {error && (
        <div className="mx-4 mb-3 rounded-xl border px-4 py-2 text-sm text-[var(--danger)]" style={getTonePanelStyle('danger')}>
          {error}
          <button
            className="ml-3 text-xs font-semibold underline opacity-70"
            type="button"
            onClick={() => setError(null)}
          >
            OK
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {isLoading && !hasItems ? (
          <OperationEmptyState
            Icon={LoaderCircle}
            description="Buscando itens em preparo e pendências."
            title="Carregando fila da cozinha"
          />
        ) : errorMessage && !hasItems ? (
          <OperationEmptyState
            Icon={TriangleAlert}
            description={errorMessage}
            title="Não foi possível carregar a cozinha"
          />
        ) : isOffline && !hasItems ? (
          <OperationEmptyState
            Icon={WifiOff}
            description="Reconecte para sincronizar os pedidos da cozinha."
            title="Sem conexão para listar a cozinha"
          />
        ) : !hasItems ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <ChefHat className="size-7 text-[var(--text-soft)]" />
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)]" data-testid="kitchen-view-empty">
              Cozinha livre
            </p>
            <p className="mt-1 text-xs text-[var(--text-soft)]">Nenhum pedido aguardando preparo</p>
          </div>
        ) : tabItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-[var(--text-soft)]">
              Nenhum item {STATUS_CONFIG[activeTab].label.toLowerCase()}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tabItems.map((item) => (
              <MemoKitchenCard
                isBusy={advanceMutation.isPending}
                item={item}
                key={item.itemId}
                onAdvance={(itemId, status) => advanceMutation.mutate({ itemId, status })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const MemoKitchenCard = memo(KitchenCard)
