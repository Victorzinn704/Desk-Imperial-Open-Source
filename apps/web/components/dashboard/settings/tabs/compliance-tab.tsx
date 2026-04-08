import { ShieldCheck } from 'lucide-react'
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
    <>
      <article className="imperial-card p-7">
        <div className="flex items-start gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(52,242,127,0.18)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8fffb9]">
              Governança e consentimento
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">
              Conformidade integrada à central da conta
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
              O bloco de conformidade deixa a navegação principal mais limpa e passa a viver onde a governança realmente
              faz sentido.
            </p>
          </div>
        </div>
      </article>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr] xl:items-start">
        <article className="imperial-card p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Documentos aceitos</p>
          <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Histórico de consentimento</h3>

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

        <article className="imperial-card p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Preferências de cookies
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Controle de consentimento opcional</h3>

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
    </>
  )
}
