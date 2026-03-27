'use client'

import {
  Activity,
  AlertTriangle,
  Ban,
  ClipboardList,
  LogIn,
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
  })

  const activities = (data ?? []).map(toActivityViewModel)

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <aside className="fixed right-0 top-0 z-40 h-screen w-96 overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl border border-[rgba(212,177,106,0.2)] bg-[rgba(212,177,106,0.08)]">
            <Activity className="size-5 text-[var(--accent)]" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-white">Atividades do workspace</h2>
            <p className="text-xs text-[var(--text-soft)]">Eventos reais de operação, autenticação e gestão</p>
          </div>
          <button
            className="flex size-8 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--text-soft)] transition-colors duration-200 hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
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
          <div className="space-y-4">
            {activities.map((activity, index) => {
              const isLast = index === activities.length - 1
              const IconComponent = activity.icon

              return (
                <div key={activity.id} className="relative">
                  {!isLast ? <div className="absolute left-4 top-10 h-8 w-0.5 bg-[var(--border)]" /> : null}

                  <div className="flex gap-4">
                    <div
                      className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-[rgba(255,255,255,0.1)]"
                      style={{ backgroundColor: `${activity.color}20`, borderColor: `${activity.color}40` }}
                    >
                      <IconComponent className="size-4" style={{ color: activity.color }} />
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-semibold text-white">{activity.title}</p>
                      <p className="text-xs text-[var(--text-soft)]">{activity.description}</p>
                      {activity.ipAddress ? (
                        <p className="mt-0.5 font-mono text-[11px] text-[var(--text-muted)]">{activity.ipAddress}</p>
                      ) : null}
                      <time className="mt-1 block text-xs text-[var(--text-muted)]">
                        {getRelativeTime(activity.timestamp)}
                      </time>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}

        <div className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-center text-xs text-[var(--text-muted)]">
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="size-3" />
            <span>Painel ligado à trilha real de auditoria</span>
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
