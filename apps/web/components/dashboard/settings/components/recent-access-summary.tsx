import type { ActivityFeedEntry } from '@/lib/api'
import { formatActivityDescription, formatActivityTitle } from './pin-setup-card.model'

export function RecentAccessSummary({
  activity,
  activityError,
  activityLoading,
}: Readonly<{
  activity: ActivityFeedEntry[]
  activityError: string | null
  activityLoading: boolean
}>) {
  if (activityLoading) {
    return <p className="mt-3 text-sm text-[var(--text-soft)]">Carregando histórico recente...</p>
  }

  if (activityError) {
    return <p className="mt-3 text-sm text-[var(--danger)]">{activityError}</p>
  }

  const latest = activity[0]
  if (!latest) {
    return <p className="mt-3 text-sm text-[var(--text-soft)]">Ainda não há acessos suficientes para leitura.</p>
  }

  return (
    <div className="mt-3 border-l-2 border-[var(--border)] pl-4">
      <p className="text-sm font-semibold text-[var(--text-primary)]">{formatActivityTitle(latest)}</p>
      <p className="mt-1 text-xs text-[var(--text-soft)]">
        {new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(latest.createdAt))}
        {' · '}
        {formatActivityDescription(latest)}
      </p>
    </div>
  )
}
