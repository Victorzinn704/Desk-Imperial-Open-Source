import { Activity, Lock, ShieldCheck } from 'lucide-react'
import type { ActivityFeedEntry } from '@/lib/api'
import { PinSetupCard } from '@/components/dashboard/settings/components/pin-setup-card'
import { SettingsInfoCard } from '@/components/dashboard/settings/components/settings-info-card'

type SecurityTabProps = Readonly<{
  activity: ActivityFeedEntry[]
  activityError: string | null
  activityLoading: boolean
}>

export function SecurityTab({ activity, activityError, activityLoading }: SecurityTabProps) {
  const latestActivity = activity[0]
  const latestActivityLabel = latestActivity
    ? new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(latestActivity.createdAt))
    : 'Sem leitura recente'

  return (
    <div className="space-y-6">
      <article className="imperial-card overflow-hidden">
        <div className="grid gap-6 px-6 py-6 md:px-8 md:py-7 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div>
            <div className="flex items-start gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,_var(--success)_18%,_transparent)] bg-[color-mix(in_srgb,_var(--success)_8%,_transparent)] text-[var(--success)]">
                <Lock className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--success)]">
                  Segurança operacional
                </p>
                <h2 className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">
                  Proteção das ações críticas do workspace
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
                  O PIN administrativo continua como confirmação curta para desconto elevado, exclusão e ajustes
                  sensíveis, agora dentro de uma leitura mais executiva do estado de segurança.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <SettingsInfoCard
              hint="Camada obrigatória para ações mais sensíveis do fluxo operacional."
              label="Proteção crítica"
              value="PIN administrativo"
            />
            <SettingsInfoCard
              hint={
                activityLoading
                  ? 'Lendo histórico recente…'
                  : activityError
                    ? activityError
                    : 'Último evento conhecido da conta.'
              }
              label="Último evento"
              value={latestActivityLabel}
            />
            <SettingsInfoCard
              hint="A trilha recente ajuda a confirmar acessos e alterações críticas."
              label="Histórico carregado"
              value={activityLoading ? 'Sincronizando' : `${activity.length} eventos`}
            />
          </div>
        </div>
      </article>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <PinSetupCard activity={activity} activityError={activityError} activityLoading={activityLoading} />

        <article className="imperial-card p-6 md:p-7">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-[var(--success)]">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--success)]">Camadas vivas</p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">O que esse painel está cobrindo</h3>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <SettingsInfoCard
              hint="Confirma descontos altos, exclusões e ajustes de caixa."
              label="Ações sensíveis"
              value="Protegidas"
            />
            <SettingsInfoCard
              hint="A trilha de atividade continua ligada à leitura de sessão e auditoria."
              label="Auditoria"
              value="Ativa"
            />
            <SettingsInfoCard
              hint="Bloqueios e tentativas são tratados no backend sem exigir nova tela."
              label="Resiliência"
              value="Proteção gradual"
            />
          </div>

          <div className="mt-6 rounded-[18px] border border-white/6 bg-white/[0.02] px-4 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-9 items-center justify-center rounded-[12px] border border-white/8 bg-white/[0.03] text-[var(--accent)]">
                <Activity className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Leitura curta do fluxo</p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">
                  Segurança aqui não vira uma aba técnica isolada; ela conversa com operação, sessão e governança.
                </p>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}
