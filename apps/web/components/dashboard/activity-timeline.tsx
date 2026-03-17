'use client'

import { Clock, LogIn, Package, ShoppingCart, Cog, Star } from 'lucide-react'

interface Activity {
  id: string
  type: 'login' | 'product_created' | 'order_placed' | 'config_change' | 'event_created'
  title: string
  description: string
  timestamp: Date
  icon: React.ReactNode
  details?: string
}

const getRelativeTime = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 60) return `há ${minutes}m`
  if (hours < 24) return `há ${hours}h`
  if (days < 7) return `há ${days}d`
  return date.toLocaleDateString('pt-BR')
}

const getActivityIcon = (type: Activity['type']) => {
  switch (type) {
    case 'login':
      return <LogIn className="size-4 text-blue-400" />
    case 'product_created':
      return <Package className="size-4 text-green-400" />
    case 'order_placed':
      return <ShoppingCart className="size-4 text-purple-400" />
    case 'config_change':
      return <Cog className="size-4 text-yellow-400" />
    case 'event_created':
      return <Star className="size-4 text-pink-400" />
  }
}

export function ActivityTimeline() {
  // Mock data - em produção vem do backend
  const activities: Activity[] = [
    {
      id: '1',
      type: 'login',
      title: 'Acesso realizado',
      description: 'Chrome no Windows',
      timestamp: new Date(Date.now() - 30 * 60000), // 30 min atrás
      icon: getActivityIcon('login'),
      details: '14.30.45',
    },
    {
      id: '2',
      type: 'order_placed',
      title: 'Novo pedido registrado',
      description: 'Mesa 5 - Vendedor Ana Maria',
      timestamp: new Date(Date.now() - 2 * 60 * 60000), // 2h atrás
      icon: getActivityIcon('order_placed'),
      details: 'R$ 47,50',
    },
    {
      id: '3',
      type: 'product_created',
      title: 'Produto criado',
      description: 'Whisky Premium - R$ 15,00',
      timestamp: new Date(Date.now() - 5 * 60 * 60000), // 5h atrás
      icon: getActivityIcon('product_created'),
    },
    {
      id: '4',
      type: 'config_change',
      title: 'Configuração alterada',
      description: 'Horário de eventos atualizado',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60000), // ontem
      icon: getActivityIcon('config_change'),
    },
    {
      id: '5',
      type: 'event_created',
      title: 'Evento criado',
      description: 'Noite Forró - Sexta',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60000), // 2 dias atrás
      icon: getActivityIcon('event_created'),
      details: 'Evento especial',
    },
    {
      id: '6',
      type: 'login',
      title: 'Acesso realizado',
      description: 'Safari no macOS',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60000), // 3 dias atrás
      icon: getActivityIcon('login'),
    },
  ]

  return (
    <aside className="fixed right-0 top-0 z-40 h-screen w-96 overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
      <div className="mb-6 flex items-center gap-3">
        <Clock className="size-6 text-[var(--accent)]" />
        <h2 className="text-xl font-semibold text-white">Atividades</h2>
      </div>

      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div key={activity.id} className="relative">
            {/* Timeline line */}
            {index !== activities.length - 1 && (
              <div className="absolute left-4 top-10 h-8 w-0.5 bg-[var(--border)]" />
            )}

            {/* Activity item */}
            <div className="flex gap-4">
              {/* Icon circle */}
              <div className="relative z-10 flex size-8 items-center justify-center rounded-full bg-[var(--bg)] p-1.5">
                {activity.icon}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <p className="text-sm font-semibold text-white">{activity.title}</p>
                <p className="text-xs text-[var(--text-soft)]">{activity.description}</p>

                {activity.details && (
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{activity.details}</p>
                )}

                <time className="mt-1 block text-xs text-[var(--text-muted)]">
                  {getRelativeTime(activity.timestamp)}
                </time>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer message */}
      <div className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-center text-xs text-[var(--text-muted)]">
        Últimas atividades dos últimos 7 dias
      </div>
    </aside>
  )
}
