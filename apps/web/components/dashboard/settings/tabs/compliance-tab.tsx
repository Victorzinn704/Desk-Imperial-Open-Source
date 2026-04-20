import type { CookiePreferencePayload, CookiePreferences } from '@/lib/api'
import { CheckboxField } from '@/components/shared/checkbox-field'
import { SettingsInfoCard } from '@/components/dashboard/settings/components/settings-info-card'

type ComplianceTabProps = Readonly<{
  consentQueryIsLoading: boolean
  cookiePreferences: CookiePreferences
  documentTitles: Map<string, string>
  legalAcceptances: Array<{
    key: string
    acceptedAt: string
  }>
  preferenceMutation: {
    error: unknown
    isPending: boolean
    mutate: (payload: CookiePreferencePayload) => void
  }
}>

function EmptyCard({ message }: Readonly<{ message: string }>) {
  return (
    <div className="rounded-[18px] border border-dashed border-[var(--border)] bg-[var(--surface)] px-5 py-8 text-center text-sm leading-7 text-[var(--text-soft)]">
      {message}
    </div>
  )
}

export function ComplianceTab({
  consentQueryIsLoading,
  cookiePreferences,
  documentTitles,
  legalAcceptances,
  preferenceMutation,
}: ComplianceTabProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="grid xl:grid-cols-[0.95fr_1.05fr] xl:items-start">
        <article className="p-6 md:p-8 xl:border-r xl:border-[var(--border)]">
          <div className="border-b border-[var(--border)] pb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Documentos aceitos
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
              Histórico de consentimento e leitura do que já foi aceito pela conta.
            </p>
          </div>
          <div className="mt-6 space-y-3">
            {legalAcceptances.length ? (
              legalAcceptances.map((acceptance) => (
                <SettingsInfoCard
                  hint={`Aceito em ${new Date(acceptance.acceptedAt).toLocaleString('pt-BR')}`}
                  key={acceptance.key}
                  label={documentTitles.get(acceptance.key) ?? acceptance.key}
                  value="Aceito"
                />
              ))
            ) : (
              <EmptyCard message="Os documentos aceitos aparecerão aqui assim que houver registros de consentimento." />
            )}
          </div>
        </article>

        <article className="border-t border-[var(--border)] p-6 md:p-8 xl:border-t-0">
          <div className="border-b border-[var(--border)] pb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Preferências de cookies
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
              Controle opcional de analytics e marketing sem esconder o estado atual.
            </p>
          </div>
          <div className="mt-6 grid gap-3">
            <CheckboxField
              checked={cookiePreferences.analytics}
              description="Mede uso e desempenho do portal para leitura de produto e melhoria operacional."
              disabled={preferenceMutation.isPending || consentQueryIsLoading}
              label="Cookies analíticos"
              onChange={(event) =>
                preferenceMutation.mutate({
                  analytics: event.currentTarget.checked,
                  marketing: cookiePreferences.marketing,
                })
              }
            />
            <CheckboxField
              checked={cookiePreferences.marketing}
              description="Mantém a base pronta para comunicações futuras com consentimento controlado."
              disabled={preferenceMutation.isPending || consentQueryIsLoading}
              label="Cookies de marketing"
              onChange={(event) =>
                preferenceMutation.mutate({
                  analytics: cookiePreferences.analytics,
                  marketing: event.currentTarget.checked,
                })
              }
            />
          </div>

          {preferenceMutation.error instanceof Error ? (
            <p className="mt-4 text-sm text-[var(--danger)]">{preferenceMutation.error.message}</p>
          ) : null}
        </article>
      </div>
    </section>
  )
}
