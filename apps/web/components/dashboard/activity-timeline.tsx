'use client'

import { Clock, LogIn, Monitor, Smartphone } from 'lucide-react'
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

export function ActivityTimeline() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['auth', 'activity'],
    queryFn: fetchLastLogins,
    staleTime: 5 * 60 * 1000,
  })

  return (
    <aside className="fixed right-0 top-0 z-40 h-screen w-96 overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
      <div className="mb-6 flex items-center gap-3">
        <Clock className="size-6 text-[var(--accent)]" />
        <div>
          <h2 className="text-xl font-semibold text-white">Atividades</h2>
          <p className="text-xs text-[var(--text-soft)]">Histórico real de acessos</p>
        </div>
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

      {data && data.length === 0 && (
        <p className="text-sm text-[var(--text-soft)]">Nenhum acesso registrado ainda.</p>
      )}

      {data && data.length > 0 && (
        <div className="space-y-4">
          {data.map((entry: LastLoginEntry, index: number) => {
            const isMobile = MOBILE_OS.includes(entry.os)
            const isLast = index === data.length - 1
            return (
              <div key={entry.id} className="relative">
                {!isLast && (
                  <div className="absolute left-4 top-10 h-8 w-0.5 bg-[var(--border)]" />
                )}
                <div className="flex gap-4">
                  <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-[rgba(52,242,127,0.1)] border border-[rgba(52,242,127,0.2)]">
                    {isMobile
                      ? <Smartphone className="size-4 text-[#36f57c]" />
                      : <Monitor className="size-4 text-[#36f57c]" />
                    }
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm font-semibold text-white">Acesso realizado</p>
                    <p className="text-xs text-[var(--text-soft)]">
                      {entry.browser} no {entry.os}
                    </p>
                    {entry.ipAddress && (
                      <p className="mt-0.5 font-mono text-[11px] text-[var(--text-muted)]">
                        {entry.ipAddress}
                      </p>
                    )}
                    <time className="mt-1 block text-xs text-[var(--text-muted)]">
                      {getRelativeTime(new Date(entry.createdAt))}
                    </time>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-center text-xs text-[var(--text-muted)]">
        <LogIn className="mx-auto mb-1 size-3.5" />
        Últimos 10 acessos reais da sua conta
      </div>
    </aside>
  )
}
