import { LogOut, Monitor, Smartphone } from 'lucide-react'
import type { ActivityFeedEntry, AuthUser } from '@/lib/api'
import { formatAccountStatus } from '@/lib/dashboard-format'
import { Button } from '@/components/shared/button'
import { SettingsInfoCard } from '@/components/dashboard/settings/components/settings-info-card'

type SessionTabProps = Readonly<{
  activity: ActivityFeedEntry[]
  activityError: string | null
  activityLoading: boolean
  logoutBusy: boolean
  onLogout: () => void
  user: AuthUser
}>

function EmptyCard({ message }: Readonly<{ message: string }>) {
  return (
    <div className="rounded-[18px] border border-dashed border-[var(--border)] bg-[var(--surface)] px-5 py-8 text-center text-sm leading-7 text-[var(--text-soft)]">
      {message}
    </div>
  )
}

function formatActivityTitle(entry: ActivityFeedEntry) {
  const actorName = entry.actorName ?? 'Sistema'

  if (entry.event === 'auth.login.succeeded') {
    return `${actorName} iniciou uma sessão`
  }

  if (entry.event.startsWith('operations.cash_')) {
    return `${actorName} movimentou o caixa`
  }

  if (entry.event.startsWith('operations.comanda')) {
    return `${actorName} atualizou uma comanda`
  }

  if (entry.event.startsWith('employee.')) {
    return `${actorName} alterou a equipe`
  }

  if (entry.event === 'order.cancelled') {
    return `${actorName} cancelou um pedido`
  }

  if (entry.event.startsWith('order.')) {
    return `${actorName} registrou um pedido`
  }

  return `${actorName} gerou atividade`
}

function formatActivityDescription(entry: ActivityFeedEntry) {
  if (entry.event === 'auth.login.succeeded') {
    return 'Acesso autenticado no portal'
  }

  if (entry.event.startsWith('operations.cash_')) {
    return 'Fluxo operacional de caixa'
  }

  if (entry.event.startsWith('operations.comanda')) {
    return 'Movimento operacional do salão'
  }

  if (entry.event.startsWith('employee.')) {
    return 'Gestão de vínculo e acesso'
  }

  if (entry.event.startsWith('order.')) {
    return 'Registro comercial auditado'
  }

  return entry.resource ? `${entry.resource} · ${entry.event}` : entry.event
}

function RecentAccessList({
  activity,
  activityError,
  activityLoading,
}: Readonly<{
  activity: ActivityFeedEntry[]
  activityError: string | null
  activityLoading: boolean
}>) {
  if (activityLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="h-12 animate-pulse rounded-xl bg-[var(--surface-muted)]" key={index} />
        ))}
      </div>
    )
  }

  if (activityError) {
    return <p className="text-sm text-[var(--danger)]">{activityError}</p>
  }

  if (!activity.length) {
    return <EmptyCard message="Nenhum acesso recente foi registrado ainda." />
  }

  return (
    <div className="space-y-3">
      {activity.map((entry) => {
        return (
          <div
            className="flex items-center gap-3 rounded-[16px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
            key={entry.id}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-soft)]">
              {entry.event === 'auth.login.succeeded' ? (
                <Monitor className="size-4" />
              ) : (
                <Smartphone className="size-4" />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{formatActivityTitle(entry)}</p>
              <p className="mt-1 truncate text-xs text-[var(--text-soft)]">
                {formatActivityDescription(entry)}
                {entry.ipAddress ? ` · ${entry.ipAddress}` : ''}
              </p>
            </div>

            <p className="shrink-0 text-xs text-[var(--text-soft)]">
              {new Intl.DateTimeFormat('pt-BR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              }).format(new Date(entry.createdAt))}
            </p>
          </div>
        )
      })}
    </div>
  )
}

export function SessionTab({ activity, activityError, activityLoading, logoutBusy, onLogout, user }: SessionTabProps) {
  return (
    <>
      <article className="imperial-card p-7">
        <div className="flex items-start gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-primary)]">
            <LogOut className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Sessão e rastreabilidade
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">
              Acessos recentes e controle da sessão ativa
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
              Toda leitura relevante da conta passa por aqui: dispositivo, histórico recente e encerramento manual da
              sessão.
            </p>
          </div>
        </div>
      </article>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <article className="imperial-card p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Últimos acessos</p>
          <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Leitura recente da conta</h3>
          <div className="mt-6">
            <RecentAccessList activity={activity} activityError={activityError} activityLoading={activityLoading} />
          </div>
        </article>

        <article className="imperial-card p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Sessão atual</p>
          <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Encerramento seguro</h3>

          <div className="mt-6 space-y-4">
            <SettingsInfoCard hint="Conta autenticada neste dispositivo" label="Usuário" value={user.fullName} />
            <SettingsInfoCard
              hint="Escopo atual de acesso"
              label="Perfil"
              value={user.role === 'OWNER' ? 'Administrador' : 'Operacional'}
            />
            <SettingsInfoCard
              hint="Estado da identidade no portal"
              label="Status"
              value={formatAccountStatus(user.status)}
            />
          </div>

          <div className="mt-8">
            <Button fullWidth loading={logoutBusy} type="button" onClick={onLogout}>
              <LogOut className="size-4" />
              Encerrar sessão
            </Button>
          </div>
        </article>
      </div>
    </>
  )
}
