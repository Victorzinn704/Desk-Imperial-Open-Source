import { Lock } from 'lucide-react'
import type { ActivityFeedEntry } from '@/lib/api'
import { SettingsInfoCard } from '@/components/dashboard/settings/components/settings-info-card'
import { PinSetupCard } from '@/components/dashboard/settings/components/pin-setup-card'

type SecurityTabProps = Readonly<{
  activity: ActivityFeedEntry[]
  activityError: string | null
  activityLoading: boolean
}>

export function SecurityTab({ activity, activityError, activityLoading }: SecurityTabProps) {
  const latestActivity = activity[0]

  return (
    <section className="space-y-6">
      <article className="imperial-card p-7">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(52,242,127,0.25)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]">
            <Lock className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8fffb9]">Segurança operacional</p>
            <h2 className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">Proteção das ações críticas</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
              O PIN administrativo segue como confirmação curta para desconto elevado, exclusão e ajustes sensíveis do
              workspace.
            </p>
          </div>
        </div>
      </article>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,1fr)]">
        <PinSetupCard activity={activity} activityError={activityError} activityLoading={activityLoading} />

        <article className="imperial-card p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-soft)]">Resumo de segurança</p>
          <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Níveis e tendências</h3>
          <p className="mt-2 text-sm text-[var(--text-soft)]">
            Esses indicadores mostram o pulso imediato da segurança e ajudam a priorizar auditorias.
          </p>

          <div className="mt-6 space-y-4">
            <SettingsInfoCard
              hint="PIN administrativo, e-mail e recarga de credenciais"
              label="Ações protegidas"
              value="Fluxo crítico"
              caption="Controle rígido com múltiplos gates"
            />
            <SettingsInfoCard
              hint="O feed gera a última leitura mesmo sem históricos extensos"
              label="Último acesso"
              value={
                latestActivity
                  ? new Intl.DateTimeFormat('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(latestActivity.createdAt))
                  : 'Sincronização pendente'
              }
              badge={latestActivity ? 'Atualizado' : 'Sem dados'}
            />
          </div>
        </article>
      </div>
    </section>
  )
}
