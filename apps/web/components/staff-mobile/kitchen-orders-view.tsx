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
  currentEmployeeId?: string | null
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
    chipBg: string
  }
> = {
  QUEUED: {
    label: 'Na fila',
    Icon: Clock,
    tone: 'warning',
    colorVar: 'var(--warning)',
    nextStatus: 'IN_PREPARATION',
    nextLabel: 'Iniciar preparo',
    chipBg: 'color-mix(in srgb, var(--warning) 16%, transparent)',
  },
  IN_PREPARATION: {
    label: 'Em preparo',
    Icon: Flame,
    tone: 'info',
    colorVar: 'var(--accent)',
    nextStatus: 'READY',
    nextLabel: 'Marcar como pronto',
    chipBg: 'color-mix(in srgb, var(--accent) 16%, transparent)',
  },
  READY: {
    label: 'Pronto',
    Icon: CheckCircle2,
    tone: 'success',
    colorVar: 'var(--success)',
    nextStatus: 'DELIVERED',
    nextLabel: 'Entregar',
    chipBg: 'color-mix(in srgb, var(--success) 16%, transparent)',
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

function resolvePressureTone(queued: number, inPreparation: number, ready: number): LabStatusTone {
  if (queued > inPreparation) {return 'warning'}
  if (inPreparation > 0) {return 'info'}
  if (ready > 0) {return 'success'}
  return 'neutral'
}

function resolvePressureLabel(queued: number, inPreparation: number, ready: number) {
  if (queued > inPreparation) {return 'fila puxando'}
  if (ready > 0) {return 'saída pendente'}
  if (inPreparation > 0) {return 'cozinha rodando'}
  return 'cozinha livre'
}

function resolveNextAction(queued: number, ready: number) {
  if (queued > 0) {return 'Iniciar preparo'}
  if (ready > 0) {return 'Despachar pratos'}
  return 'Manter fluxo'
}

function buildKitchenSnapshot(items: OperationsKitchenItemRecord[], currentEmployeeId: string | null) {
  const counts = buildStatusCounts(items)
  const activeMesas = new Set(items.map((item) => item.mesaLabel)).size
  const oldestQueuedItem =
    [...items]
      .filter((item) => item.kitchenQueuedAt)
      .sort(
        (left, right) =>
          new Date(left.kitchenQueuedAt ?? 0).getTime() - new Date(right.kitchenQueuedAt ?? 0).getTime(),
      )[0] ?? null
  const ownItems = currentEmployeeId
    ? items.filter((item) => item.employeeId === currentEmployeeId).length
    : 0

  return {
    counts,
    activeMesas,
    ownItems,
    oldestQueuedItem,
    oldestQueuedLabel: oldestQueuedItem?.kitchenQueuedAt ? elapsedLabel(oldestQueuedItem.kitchenQueuedAt) : 'agora',
    pressureTone: resolvePressureTone(counts.QUEUED, counts.IN_PREPARATION, counts.READY),
    pressureLabel: resolvePressureLabel(counts.QUEUED, counts.IN_PREPARATION, counts.READY),
    nextAction: resolveNextAction(counts.QUEUED, counts.READY),
  }
}

function KitchenCard({
  currentEmployeeId,
  item,
  onAdvance,
  isBusy,
}: {
  currentEmployeeId: string | null
  item: OperationsKitchenItemRecord
  onAdvance: (itemId: string, status: 'IN_PREPARATION' | 'READY' | 'DELIVERED') => void
  isBusy: boolean
}) {
  const tab = item.kitchenStatus as KitchenTab
  const config = STATUS_CONFIG[tab]
  const elapsed = elapsedLabel(item.kitchenQueuedAt)
  const tonePanelStyle = getTonePanelStyle(config.tone)
  const responsibleLabel =
    currentEmployeeId && item.employeeId === currentEmployeeId
      ? 'Sua mesa'
      : item.employeeName?.trim()
        ? `Responsável ${item.employeeName}`
        : 'Responsável não identificado'

  return (
    <div className="rounded-[22px] border p-4" style={tonePanelStyle}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: config.colorVar }}>
              Mesa {item.mesaLabel}
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 text-[10px] font-semibold text-[var(--text-soft)]">
              {responsibleLabel}
            </span>
            {elapsed ? <span className="text-[10px] text-[var(--text-soft)]">{elapsed}</span> : null}
          </div>

          <p className="text-sm font-semibold leading-snug text-[var(--text-primary)]">
            {item.quantity}x {item.productName}
          </p>
          {item.notes ? <p className="mt-1 text-xs italic text-[var(--text-soft)]">{`"${item.notes}"`}</p> : null}

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                Próximo passo
              </p>
              <p className="mt-1 text-xs text-[var(--text-primary)]">{config.nextLabel}</p>
            </div>
            <span
              className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold"
              style={{ color: config.colorVar, background: config.chipBg }}
            >
              {config.label}
            </span>
          </div>
        </div>

        <button
          className="shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition-opacity active:opacity-70 disabled:opacity-40"
          disabled={isBusy}
          style={{ ...tonePanelStyle, color: config.colorVar }}
          type="button"
          onClick={() => onAdvance(item.itemId, config.nextStatus)}
        >
          {config.nextLabel}
        </button>
      </div>
    </div>
  )
}

export function KitchenOrdersView({
  data,
  queryKey,
  isLoading = false,
  isOffline = false,
  errorMessage = null,
  currentEmployeeId = null,
}: KitchenOrdersViewProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<KitchenTab>('QUEUED')
  const [error, setError] = useState<string | null>(null)

  const allItems = useMemo(() => data?.items ?? [], [data])
  const tabItems = useMemo(() => allItems.filter((item) => item.kitchenStatus === activeTab), [activeTab, allItems])
  const snapshot = useMemo(() => buildKitchenSnapshot(allItems, currentEmployeeId), [allItems, currentEmployeeId])
  const counts = snapshot.counts
  const hasItems = allItems.length > 0

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

  return (
    <div className="flex h-full flex-col">
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

      <section className="mx-4 mt-4 rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">
              Cozinha
            </p>
            <h1 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Fila compartilhada do salão</h1>
            <p className="mt-1 text-sm leading-6 text-[var(--text-soft,#7a8896)]">
              O foco aqui é tirar pedido da fila, acompanhar preparo e despachar pratos com responsável visível.
            </p>
          </div>
          <span
            className="shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{
              ...getTonePanelStyle(snapshot.pressureTone),
              color:
                snapshot.pressureTone === 'warning'
                  ? 'var(--warning)'
                  : snapshot.pressureTone === 'info'
                    ? 'var(--accent)'
                    : snapshot.pressureTone === 'success'
                      ? 'var(--success)'
                      : 'var(--text-soft)',
            }}
          >
            {snapshot.pressureLabel}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-px overflow-hidden rounded-[18px] bg-[var(--border)]">
          {[
            { label: 'Na fila', value: counts.QUEUED, tone: '#fb923c' },
            { label: 'Em preparo', value: counts.IN_PREPARATION, tone: '#60a5fa' },
            { label: 'Prontos', value: counts.READY, tone: '#36f57c' },
            { label: 'Mesas', value: snapshot.activeMesas, tone: '#c4b5fd' },
          ].map((item) => (
            <div className="bg-[var(--surface-muted)] px-3 py-3" key={item.label}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">{item.label}</p>
              <p className="mt-1 text-lg font-bold" style={{ color: item.tone }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-[18px] bg-[var(--border)]">
          {[
            { label: 'Próxima ação', value: snapshot.nextAction },
            { label: 'Fila mais antiga', value: snapshot.oldestQueuedLabel },
            { label: 'Sua pressão', value: currentEmployeeId ? String(snapshot.ownItems) : '—' },
          ].map((item) => (
            <div className="bg-[var(--surface-muted)] px-3 py-3" key={item.label}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">{item.label}</p>
              <p className="mt-1 text-xs font-semibold text-[var(--text-primary)]">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex shrink-0 gap-1 px-4 pb-3 pt-4">
        {(Object.entries(STATUS_CONFIG) as [KitchenTab, (typeof STATUS_CONFIG)[KitchenTab]][]).map(([tab, config]) => {
          const isActive = activeTab === tab
          const count = counts[tab]
          return (
            <button
              className="flex-1 rounded-xl py-2.5 text-[11px] font-bold uppercase tracking-wide transition-all active:scale-95"
              key={tab}
              style={{
                ...(isActive
                  ? getTonePanelStyle(config.tone)
                  : { backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }),
                color: isActive ? config.colorVar : 'var(--text-soft)',
                border: `1px solid ${isActive ? 'transparent' : 'var(--border)'}`,
              }}
              type="button"
              onClick={() => setActiveTab(tab)}
            >
              {config.label}
              {count > 0 ? (
                <span
                  className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full text-[10px]"
                  style={{ background: config.colorVar, color: 'var(--on-accent)' }}
                >
                  {count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {error ? (
        <div
          className="mx-4 mb-3 rounded-xl border px-4 py-2 text-sm text-[var(--danger)]"
          style={getTonePanelStyle('danger')}
        >
          {error}
          <button className="ml-3 text-xs font-semibold underline opacity-70" type="button" onClick={() => setError(null)}>
            OK
          </button>
        </div>
      ) : null}

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
                currentEmployeeId={currentEmployeeId}
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
