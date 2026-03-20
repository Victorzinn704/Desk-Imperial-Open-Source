'use client'

import { LogIn, Monitor, Smartphone, Activity, TrendingUp, Users, Package, AlertTriangle, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchLastLogins, type LastLoginEntry } from '@/lib/api'

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

const MOBILE_OS = ['iPhone', 'iPad', 'Android']

// Tipos de atividades do SaaS
type ActivityType = 'login' | 'order_created' | 'product_updated' | 'finance_alert' | 'user_action'

interface SaaSActivity {
  id: string
  type: ActivityType
  title: string
  description: string
  timestamp: Date
  metadata?: Record<string, any>
}

const getActivityIcon = (type: ActivityType) => {
  switch (type) {
    case 'login':
      return LogIn
    case 'order_created':
      return Package
    case 'product_updated':
      return TrendingUp
    case 'finance_alert':
      return AlertTriangle
    case 'user_action':
      return Users
    default:
      return Activity
  }
}

const getActivityColor = (type: ActivityType) => {
  switch (type) {
    case 'login':
      return '#36f57c'
    case 'order_created':
      return '#8fffb9'
    case 'product_updated':
      return '#d4b16a'
    case 'finance_alert':
      return '#ff6b6b'
    case 'user_action':
      return '#4ecdc4'
    default:
      return '#36f57c'
  }
}

// Mock de atividades reais do SaaS (substituir por dados reais da API)
const generateMockActivities = (): SaaSActivity[] => {
  const now = new Date()
  return [
    {
      id: '1',
      type: 'login',
      title: 'Novo acesso realizado',
      description: 'Usuário fez login no sistema',
      timestamp: new Date(now.getTime() - 5 * 60000), // 5 minutos atrás
    },
    {
      id: '2',
      type: 'order_created',
      title: 'Pedido criado',
      description: 'Novo pedido #1234 foi registrado',
      timestamp: new Date(now.getTime() - 15 * 60000), // 15 minutos atrás
    },
    {
      id: '3',
      type: 'product_updated',
      title: 'Produto atualizado',
      description: 'Estoque do produto "Hambúrguer Premium" foi ajustado',
      timestamp: new Date(now.getTime() - 30 * 60000), // 30 minutos atrás
    },
    {
      id: '4',
      type: 'finance_alert',
      title: 'Alerta financeiro',
      description: 'Receita do dia superou meta em 15%',
      timestamp: new Date(now.getTime() - 45 * 60000), // 45 minutos atrás
    },
    {
      id: '5',
      type: 'user_action',
      title: 'Ação do usuário',
      description: 'Perfil do funcionário João Silva foi atualizado',
      timestamp: new Date(now.getTime() - 60 * 60000), // 1 hora atrás
    },
  ]
}

export function ActivityTimeline({ onClose }: { onClose: () => void }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['auth', 'activity'],
    queryFn: fetchLastLogins,
    staleTime: 5 * 60 * 1000,
  })

  // Combinar logins com atividades do SaaS
  const mockActivities = generateMockActivities()
  const combinedActivities = [
    ...(data?.map((login: LastLoginEntry) => ({
      id: `login-${login.id}`,
      type: 'login' as ActivityType,
      title: 'Acesso realizado',
      description: `Login via ${login.browser} no ${login.os}`,
      timestamp: new Date(login.createdAt),
      metadata: { ipAddress: login.ipAddress },
    })) || []),
    ...mockActivities,
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <aside className="fixed right-0 top-0 z-40 h-screen w-96 overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl border border-[rgba(212,177,106,0.2)] bg-[rgba(212,177,106,0.08)]">
            <Activity className="size-5 text-[var(--accent)]" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-white">Atividades do SaaS</h2>
            <p className="text-xs text-[var(--text-soft)]">Histórico real de ações e eventos</p>
          </div>
          <button
            className="flex size-8 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--text-soft)] transition-all hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
            type="button"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>

      {isLoading && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="size-8 animate-pulse rounded-full bg-[rgba(255,255,255,0.06)]" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-2/3 animate-pulse rounded bg-[rgba(255,255,255,0.06)]" />
                <div className="h-2.5 w-1/2 animate-pulse rounded bg-[rgba(255,255,255,0.04)]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-[var(--danger)]">Não foi possível carregar o histórico.</p>
      )}

      {combinedActivities.length === 0 && (
        <p className="text-sm text-[var(--text-soft)]">Nenhuma atividade registrada ainda.</p>
      )}

      {combinedActivities.length > 0 && (
        <div className="space-y-4">
          {combinedActivities.map((activity, index) => {
            const isMobile = activity.type === 'login' && activity.metadata?.ipAddress
            const isLast = index === combinedActivities.length - 1
            const IconComponent = getActivityIcon(activity.type)
            const iconColor = getActivityColor(activity.type)

            return (
              <div key={activity.id} className="relative">
                {!isLast && (
                  <div className="absolute left-4 top-10 h-8 w-0.5 bg-[var(--border)]" />
                )}
                <div className="flex gap-4">
                  <div
                    className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-[rgba(255,255,255,0.1)]"
                    style={{ backgroundColor: `${iconColor}20`, borderColor: `${iconColor}40` }}
                  >
                    <IconComponent className="size-4" style={{ color: iconColor }} />
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm font-semibold text-white">{activity.title}</p>
                    <p className="text-xs text-[var(--text-soft)]">
                      {activity.description}
                    </p>
                    {activity.metadata?.ipAddress && (
                      <p className="mt-0.5 font-mono text-[11px] text-[var(--text-muted)]">
                        {activity.metadata.ipAddress}
                      </p>
                    )}
                    <time className="mt-1 block text-xs text-[var(--text-muted)]">
                      {getRelativeTime(activity.timestamp)}
                    </time>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-center text-xs text-[var(--text-muted)]">
        <div className="flex items-center justify-center gap-2">
          <TrendingUp className="size-3" />
          <span>Monitoramento em tempo real</span>
        </div>
      </div>
      </aside>
    </>
  )
}
