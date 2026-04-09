'use client'

import {
  Activity,
  AlertTriangle,
  Ban,
  ClipboardList,
  LogIn,
  PackageOpen,
  ReceiptText,
  Shield,
  TrendingUp,
  UserRound,
  X,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { CardRowSkeleton } from '@/components/shared/skeleton'
import { fetchActivityFeed, type ActivityFeedEntry } from '@/lib/api'

const getRelativeTime = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'agora mesmo'
  if (minutes < 60) return `há ${minutes}m`
  if (hours < 24) return `há ${hours}h`
  if (days < 7) return `há ${days}d`
  return date.toLocaleDateString('pt-BR')
}

type ActivityViewModel = {
  id: string
  title: string
  description: string
  icon: typeof Activity
  color: string
  timestamp: Date
  ipAddress: string | null
}

export function ActivityTimeline({ onClose }: { onClose: () => void }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['auth', 'activity-feed'],
    queryFn: fetchActivityFeed,
    staleTime: 30_000,
    refetchInterval: 15_000,
  })

  const activities = (data ?? []).map(toActivityViewModel)

  return (
    <>
      <button
        aria-label="Fechar atividades"
        className="fixed inset-0 z-30 border-0 bg-black/40 p-0 backdrop-blur-sm"
        type="button"
        onClick={onClose}
      />

      <aside className="fixed right-0 top-0 z-40 h-screen w-[28rem] overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl border border-[rgba(212,177,106,0.2)] bg-[rgba(212,177,106,0.08)]">
            <Activity className="size-5 text-[var(--accent)]" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Pulso do workspace</h2>
            <p className="text-xs text-[var(--text-soft)]">
              Leitura manual das movimentações mais recentes, com atualização automática.
            </p>
          </div>
          <button
            className="flex size-8 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--text-soft)] transition-colors duration-200 hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--text-primary)]"
            type="button"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <CardRowSkeleton rows={5} />
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-[var(--danger)]">Não foi possível carregar o histórico operacional.</p>
        ) : null}

        {!isLoading && !error && activities.length === 0 ? (
          <p className="text-sm text-[var(--text-soft)]">Nenhuma atividade registrada ainda.</p>
        ) : null}

        {!isLoading && !error && activities.length > 0 ? (
          <div className="space-y-3">
            {activities.map((activity) => {
              const IconComponent = activity.icon

              return (
                <div
                  key={activity.id}
                  className="rounded-[18px] border border-white/6 bg-[rgba(255,255,255,0.02)] px-4 py-3"
                >
                  <div className="flex gap-3">
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-2xl border"
                      style={{ backgroundColor: `${activity.color}18`, borderColor: `${activity.color}36` }}
                    >
                      <IconComponent className="size-4" style={{ color: activity.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{activity.title}</p>
                          <p className="mt-1 text-xs leading-6 text-[var(--text-soft)]">{activity.description}</p>
                        </div>
                        <time className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                          {getRelativeTime(activity.timestamp)}
                        </time>
                      </div>
                      {activity.ipAddress ? (
                        <p className="mt-2 font-mono text-[11px] text-[var(--text-muted)]">{activity.ipAddress}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}

        <div className="mt-8 rounded-[18px] border border-[var(--border)] bg-[var(--bg)] p-3 text-center text-xs text-[var(--text-muted)]">
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="size-3" />
            <span>Painel sincronizado com a trilha real de auditoria a cada 15 segundos</span>
          </div>
        </div>
      </aside>
    </>
  )
}

function toActivityViewModel(entry: ActivityFeedEntry): ActivityViewModel {
  const actorName = entry.actorName ?? 'Sistema'
  const fallback = {
    title: 'Atividade registrada',
    description: `${actorName} executou ${entry.event}.`,
    icon: Activity,
    color: '#4ecdc4',
  }

  const mapping = resolveActivityPresentation(entry, actorName)

  return {
    id: entry.id,
    title: mapping.title,
    description: mapping.description,
    icon: mapping.icon,
    color: mapping.color,
    timestamp: new Date(entry.createdAt),
    ipAddress: entry.ipAddress,
  }

  function resolveActivityPresentation(activity: ActivityFeedEntry, actor: string) {
    if (activity.event === 'auth.login.succeeded') {
      return {
        title: 'Acesso autenticado',
        description: `${actor} iniciou uma nova sessão no sistema.`,
        icon: LogIn,
        color: '#36f57c',
      }
    }

    if (activity.event.startsWith('operations.cash_')) {
      return {
        title: 'Movimento de caixa',
        description: `${actor} atualizou o ciclo operacional do caixa.`,
        icon: Shield,
        color: '#d4b16a',
      }
    }

    if (activity.event.startsWith('operations.comanda')) {
      return {
        title: 'Comanda movimentada',
        description: `${actor} alterou uma comanda do salão.`,
        icon: ClipboardList,
        color: '#60a5fa',
      }
    }

    if (activity.event.startsWith('employee.')) {
      return {
        title: 'Equipe atualizada',
        description: `${actor} alterou um vínculo de funcionário.`,
        icon: UserRound,
        color: '#8fffb9',
      }
    }

    if (activity.event === 'product.stock.low') {
      const stock = activity.metadata?.stock as number | undefined
      const threshold = activity.metadata?.lowStockThreshold as number | undefined
      const name = activity.metadata?.name as string | undefined
      return {
        title: 'Estoque baixo',
        description: `${name ?? 'Produto'} com ${stock ?? 0} und — limite configurado: ${threshold ?? 0} und.`,
        icon: PackageOpen,
        color: '#f59e0b',
      }
    }

    if (activity.event === 'order.cancelled') {
      return {
        title: 'Pedido cancelado',
        description: `${actor} cancelou um pedido já registrado.`,
        icon: Ban,
        color: '#ff8c69',
      }
    }

    if (activity.event.startsWith('order.')) {
      return {
        title: 'Pedido registrado',
        description: `${actor} gerou ou atualizou um pedido comercial.`,
        icon: ReceiptText,
        color: '#8b5cf6',
      }
    }

    if (activity.severity === 'WARN' || activity.severity === 'ERROR') {
      return {
        title: 'Alerta operacional',
        description: `${actor} gerou um evento que merece revisão.`,
        icon: AlertTriangle,
        color: '#f59e0b',
      }
    }

    return fallback
  }
}
