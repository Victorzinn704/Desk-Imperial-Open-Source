import type {
  OperationCashSessionStatus,
  OperationComandaStatus,
  OperationTimelineItem,
  OperationTimelineResource,
} from './operations-types'

export function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  })
}

export function formatShortTime(value: string) {
  return new Date(value).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatLongDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getCashSessionTone(status: OperationCashSessionStatus) {
  if (status === 'open') {
    return {
      label: 'Aberto',
      className: 'border-[rgba(52,242,127,0.18)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]',
    }
  }

  if (status === 'closing') {
    return {
      label: 'Fechando',
      className: 'border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.08)] text-[#fbbf24]',
    }
  }

  return {
    label: 'Fechado',
    className: 'border-[rgba(122,136,150,0.18)] bg-[rgba(122,136,150,0.08)] text-[var(--text-soft)]',
  }
}

export function getComandaTone(status: OperationComandaStatus) {
  if (status === 'open') {
    return {
      label: 'Aberta',
      className: 'border-[rgba(96,165,250,0.2)] bg-[rgba(96,165,250,0.08)] text-[#93c5fd]',
    }
  }

  if (status === 'in_preparation') {
    return {
      label: 'Em preparo',
      className: 'border-[rgba(251,146,60,0.2)] bg-[rgba(251,146,60,0.08)] text-[#fb923c]',
    }
  }

  if (status === 'ready') {
    return {
      label: 'Pronta',
      className: 'border-[rgba(52,242,127,0.18)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]',
    }
  }

  return {
    label: 'Fechada',
    className: 'border-[rgba(122,136,150,0.18)] bg-[rgba(122,136,150,0.08)] text-[var(--text-soft)]',
  }
}

export function buildTimelineWindow(items: OperationTimelineItem[]) {
  const parsed = items.flatMap((item) => [new Date(item.start).getTime(), new Date(item.end).getTime()])
  if (parsed.length === 0) {
    const now = new Date()
    const start = new Date(now)
    start.setHours(8, 0, 0, 0)
    const end = new Date(now)
    end.setHours(23, 0, 0, 0)
    return { start, end, durationMinutes: (end.getTime() - start.getTime()) / 60000 }
  }

  const min = Math.min(...parsed)
  const max = Math.max(...parsed)
  const padMs = 45 * 60 * 1000
  const start = new Date(min - padMs)
  const end = new Date(max + padMs)

  return {
    start,
    end,
    durationMinutes: Math.max((end.getTime() - start.getTime()) / 60000, 60),
  }
}

export function getTimelinePlacement(window: { start: Date; durationMinutes: number }, item: OperationTimelineItem) {
  const itemStart = new Date(item.start).getTime()
  const itemEnd = new Date(item.end).getTime()
  const windowStart = window.start.getTime()
  const totalMs = window.durationMinutes * 60 * 1000
  const left = ((itemStart - windowStart) / totalMs) * 100
  const width = ((itemEnd - itemStart) / totalMs) * 100

  return {
    left: clamp(left, 0, 100),
    width: clamp(width, 6, 100),
  }
}

export function buildTimelineTicks(window: { start: Date; durationMinutes: number }) {
  const totalHours = Math.max(Math.round(window.durationMinutes / 60), 1)
  const ticks = Array.from({ length: totalHours + 1 }, (_, index) => {
    const tick = new Date(window.start.getTime() + index * 60 * 60 * 1000)
    return {
      key: tick.toISOString(),
      label: tick.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }
  })

  return ticks
}

export function groupItemsByResource(resources: OperationTimelineResource[], items: OperationTimelineItem[]) {
  return resources.map((resource) => ({
    resource,
    items: items.filter((item) => item.resourceId === resource.id),
  }))
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
