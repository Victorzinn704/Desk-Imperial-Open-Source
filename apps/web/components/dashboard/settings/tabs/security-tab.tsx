import { Lock } from 'lucide-react'
import type { ActivityFeedEntry } from '@/lib/api'
import { PinSetupCard } from '@/components/dashboard/settings/components/pin-setup-card'

type SecurityTabProps = Readonly<{
  activity: ActivityFeedEntry[]
  activityError: string | null
  activityLoading: boolean
}>

export function SecurityTab({ activity, activityError, activityLoading }: SecurityTabProps) {
  return (
    <>
      <article className="imperial-card p-7">
        <div className="flex items-start gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(52,242,127,0.18)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]">
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

      <PinSetupCard activity={activity} activityError={activityError} activityLoading={activityLoading} />
    </>
  )
}
