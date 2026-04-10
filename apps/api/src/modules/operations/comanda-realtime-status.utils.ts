const REALTIME_STATUS_MAP: Record<string, 'OPEN' | 'IN_PREPARATION' | 'READY' | 'CLOSED'> = {
  OPEN: 'OPEN',
  IN_PREPARATION: 'IN_PREPARATION',
  READY: 'READY',
}

export function toRealtimeStatus(status: string): 'OPEN' | 'IN_PREPARATION' | 'READY' | 'CLOSED' {
  return REALTIME_STATUS_MAP[status] ?? 'CLOSED'
}

export function toRealtimeOpenStatus(status: string): 'OPEN' | 'IN_PREPARATION' | 'READY' {
  return (REALTIME_STATUS_MAP[status] as 'OPEN' | 'IN_PREPARATION' | 'READY') ?? 'OPEN'
}
