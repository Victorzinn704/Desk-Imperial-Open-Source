import type { OperationsKitchenItemRecord } from '@contracts/contracts'
import { CheckCircle2, Clock, Flame, type LucideIcon } from 'lucide-react'
import type { LabStatusTone } from '@/components/design-lab/lab-primitives'
import type { KitchenTab } from './kitchen-orders-view.types'

export const STATUS_CONFIG: Record<
  KitchenTab,
  {
    label: string
    Icon: LucideIcon
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

export function getTonePanelStyle(tone: LabStatusTone) {
  switch (tone) {
    case 'success':
      return {
        backgroundColor: 'color-mix(in srgb, var(--success) 8%, var(--surface))',
        borderColor: 'color-mix(in srgb, var(--success) 22%, var(--border))',
      }
    case 'warning':
      return {
        backgroundColor: 'color-mix(in srgb, var(--warning) 8%, var(--surface))',
        borderColor: 'color-mix(in srgb, var(--warning) 22%, var(--border))',
      }
    case 'danger':
      return {
        backgroundColor: 'color-mix(in srgb, var(--danger) 8%, var(--surface))',
        borderColor: 'color-mix(in srgb, var(--danger) 22%, var(--border))',
      }
    case 'info':
      return {
        backgroundColor: 'color-mix(in srgb, var(--accent) 8%, var(--surface))',
        borderColor: 'color-mix(in srgb, var(--accent) 22%, var(--border))',
      }
    default:
      return {
        backgroundColor: 'color-mix(in srgb, var(--surface-muted) 34%, var(--surface))',
        borderColor: 'var(--border)',
      }
  }
}

export function resolveToneColor(tone: LabStatusTone) {
  switch (tone) {
    case 'warning':
      return 'var(--warning)'
    case 'info':
      return 'var(--accent)'
    case 'success':
      return 'var(--success)'
    default:
      return 'var(--text-soft)'
  }
}

export function elapsedLabel(isoDate: string | null) {
  if (!isoDate) {
    return ''
  }
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) {
    return 'agora'
  }
  if (mins === 1) {
    return '1 min'
  }
  return `${mins} min`
}

export function buildStatusCounts(items: OperationsKitchenItemRecord[]) {
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
    { IN_PREPARATION: 0, QUEUED: 0, READY: 0 },
  )
}

export function buildKitchenSnapshot(items: OperationsKitchenItemRecord[], currentEmployeeId: string | null) {
  const counts = buildStatusCounts(items)
  const activeMesas = new Set(items.map((item) => item.mesaLabel)).size
  const ownItems = currentEmployeeId ? items.filter((item) => item.employeeId === currentEmployeeId).length : 0
  const oldestQueuedItem = resolveOldestQueuedItem(items)

  return {
    activeMesas,
    counts,
    nextAction: resolveNextAction(counts.QUEUED, counts.READY),
    oldestQueuedItem,
    oldestQueuedLabel: oldestQueuedItem?.kitchenQueuedAt ? elapsedLabel(oldestQueuedItem.kitchenQueuedAt) : 'agora',
    ownItems,
    pressureLabel: resolvePressureLabel(counts.QUEUED, counts.IN_PREPARATION, counts.READY),
    pressureTone: resolvePressureTone(counts.QUEUED, counts.IN_PREPARATION, counts.READY),
  }
}

function resolveOldestQueuedItem(items: OperationsKitchenItemRecord[]) {
  return (
    [...items]
      .filter((item) => item.kitchenQueuedAt)
      .sort(
        (left, right) => new Date(left.kitchenQueuedAt ?? 0).getTime() - new Date(right.kitchenQueuedAt ?? 0).getTime(),
      )[0] ?? null
  )
}

function resolvePressureTone(queued: number, inPreparation: number, ready: number): LabStatusTone {
  if (queued > inPreparation) {
    return 'warning'
  }
  if (inPreparation > 0) {
    return 'info'
  }
  if (ready > 0) {
    return 'success'
  }
  return 'neutral'
}

function resolvePressureLabel(queued: number, inPreparation: number, ready: number) {
  if (queued > inPreparation) {
    return 'fila puxando'
  }
  if (ready > 0) {
    return 'saída pendente'
  }
  if (inPreparation > 0) {
    return 'cozinha rodando'
  }
  return 'cozinha livre'
}

function resolveNextAction(queued: number, ready: number) {
  if (queued > 0) {
    return 'Iniciar preparo'
  }
  if (ready > 0) {
    return 'Despachar pratos'
  }
  return 'Manter fluxo'
}

export function resolveKitchenContentState({
  errorMessage,
  hasItems,
  isLoading,
  isOffline,
  tabItemsCount,
}: Readonly<{
  errorMessage: string | null
  hasItems: boolean
  isLoading: boolean
  isOffline: boolean
  tabItemsCount: number
}>) {
  if (!hasItems) {
    return resolveKitchenEmptyState({ errorMessage, isLoading, isOffline })
  }
  if (hasItems && tabItemsCount === 0) {
    return 'empty-tab'
  }
  return 'items'
}

function resolveKitchenEmptyState({
  errorMessage,
  isLoading,
  isOffline,
}: Readonly<{
  errorMessage: string | null
  isLoading: boolean
  isOffline: boolean
}>) {
  if (isLoading) {
    return 'loading'
  }
  if (errorMessage) {
    return 'error'
  }
  if (isOffline) {
    return 'offline'
  }
  return 'free'
}
