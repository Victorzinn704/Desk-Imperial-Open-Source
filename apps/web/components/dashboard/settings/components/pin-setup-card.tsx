'use client'

import Link from 'next/link'
import { KeyRound, ShieldCheck } from 'lucide-react'
import type { ActivityFeedEntry } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/shared/button'
import { PinRemoveConfirmation } from './pin-remove-confirmation'
import { PinSetupForm } from './pin-setup-form'
import { RecentAccessSummary } from './recent-access-summary'
import { usePinSetupCardController } from './use-pin-setup-card-controller'

type PinSetupCardProps = Readonly<{
  activity: ActivityFeedEntry[]
  activityError: string | null
  activityLoading: boolean
}>

export function PinSetupCard({ activity, activityError, activityLoading }: PinSetupCardProps) {
  const controller = usePinSetupCardController()

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="grid xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <article className="p-6 md:p-8 xl:border-r xl:border-[var(--border)]">
          <PinSetupIntro />
          <div className="mt-6 border-t border-[var(--border)] pt-6">
            <PinStateSummary pinActive={controller.pinActive} />
            <PinSetupControls controller={controller} />
          </div>
        </article>

        <aside className="border-t border-[var(--border)] p-6 md:p-8 xl:border-t-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
            Recuperação e revisão
          </p>
          <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
            Recuperação de senha por email e leitura recente do acesso mais novo da conta.
          </p>

          <div className="mt-6">
            <Link href="/recuperar-senha">
              <Button fullWidth type="button" variant="secondary">
                Abrir recuperação por email
              </Button>
            </Link>
          </div>

          <div className="mt-6 border-t border-[var(--border)] pt-6">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Leitura recente</p>
            <RecentAccessSummary activity={activity} activityError={activityError} activityLoading={activityLoading} />
          </div>
        </aside>
      </div>
    </section>
  )
}

function PinSetupIntro() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(52,242,127,0.18)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]">
        <KeyRound className="size-5" />
      </span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
          PIN administrativo
        </p>
        <h3 className="text-xl font-semibold text-[var(--text-primary)]">Controle fino das ações sensíveis</h3>
      </div>
    </div>
  )
}

function PinStateSummary({ pinActive }: Readonly<{ pinActive: boolean }>) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">Estado atual</p>
        <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
          {pinActive
            ? 'O fluxo sensível do PDV está protegido por confirmação administrativa.'
            : 'Ative o PIN para endurecer desconto, exclusão e ações críticas do ambiente.'}
        </p>
      </div>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
          pinActive
            ? 'border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.08)] text-[#8fffb9]'
            : 'border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-soft)]',
        )}
      >
        <ShieldCheck className="size-3" />
        {pinActive ? 'Ativo' : 'Inativo'}
      </span>
    </div>
  )
}

function PinSetupControls({ controller }: Readonly<{ controller: ReturnType<typeof usePinSetupCardController> }>) {
  if (!controller.pinActive) {
    return (
      <PinSetupForm
        pinDigits={controller.pinDigits}
        pinSaveError={controller.pinSaveError}
        pinSaved={controller.pinSaved}
        pinSaving={controller.pinSaving}
        setPinDigits={controller.setPinDigits}
        setPinSaveError={controller.setPinSaveError}
        onSave={() => void controller.handleSavePin()}
      />
    )
  }

  return (
    <div className="mt-5 space-y-3">
      {!controller.showConfirmRemove ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-[var(--text-soft)]">O PIN está valendo para o fluxo sensível do workspace.</p>
          <button
            className="rounded-[12px] border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-3 py-2 text-xs font-semibold text-[#fca5a5] transition hover:bg-[rgba(239,68,68,0.14)]"
            type="button"
            onClick={controller.openRemoveConfirmation}
          >
            Remover PIN
          </button>
        </div>
      ) : (
        <PinRemoveConfirmation controller={controller} />
      )}
    </div>
  )
}
