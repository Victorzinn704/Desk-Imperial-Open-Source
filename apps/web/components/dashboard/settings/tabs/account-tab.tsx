import type { ProfileFormValues } from '@/lib/validation'
import type { AuthUser } from '@/lib/api'
import { AccountProfileCard } from '@/components/dashboard/account-profile-card'
import { SettingsInfoCard } from '@/components/dashboard/settings/components/settings-info-card'

type AccountTabProps = Readonly<{
  profileError?: string | null
  profileLoading?: boolean
  user: AuthUser
  onProfileSubmit: (values: ProfileFormValues) => void
}>

function formatCompanyLocation(user: AuthUser) {
  const addressParts = [
    user.companyLocation.streetLine1,
    user.companyLocation.streetNumber,
    user.companyLocation.city,
    user.companyLocation.state,
  ].filter(Boolean)

  return {
    helper: user.companyLocation.postalCode
      ? `CEP ${user.companyLocation.postalCode}`
      : 'Complete a localização para alimentar mapa e operação',
    label: addressParts.length ? addressParts.join(', ') : 'Endereço não informado',
  }
}

export function AccountTab({ profileError, profileLoading, user, onProfileSubmit }: AccountTabProps) {
  const companyLocation = formatCompanyLocation(user)

  return (
    <section className="space-y-6">
      <article className="imperial-card flex flex-col gap-6 p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-soft)]">Conta e identidade</p>
            <h2 className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">Painel administrativo da conta</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
              Nome da empresa, responsável e moeda principal estão agora centralizados com o mesmo cuidado do dashboard financeiro.
            </p>
          </div>
          <div className="space-y-3 lg:max-w-sm">
            <SettingsInfoCard hint="Identificador seguro" label="Responsável" value={user.fullName} caption="Cargo principal" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SettingsInfoCard
            hint="Identidade eletrônica do workspace"
            label="Empresa"
            value={user.companyName || 'Não preenchido'}
            badge="Identidade"
          />
          <SettingsInfoCard hint="Email de contato administrativo" label="Email" value={user.email} />
          <SettingsInfoCard hint={companyLocation.helper} label="Endereço" value={companyLocation.label} />
        </div>
      </article>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(220px,1fr)]">
        <AccountProfileCard error={profileError} loading={profileLoading} onSubmit={onProfileSubmit} user={user} />

        <article className="imperial-card p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-soft)]">Insights rápidos</p>
          <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Status prioritários</h3>
          <p className="mt-2 text-sm text-[var(--text-soft)]">Esses indicadores ajudam a confirmar que a identidade da conta está pronta para operação.</p>
          <div className="mt-6 grid gap-4">
            <SettingsInfoCard hint="Plano administrativo" label="Plano ativo" value="Desk Imperial Plus" badge="Premium" />
            <SettingsInfoCard hint="Sessões resolvidas" label="Última autenticação" value="Agora" caption="Gerada automaticamente pelo feed" />
          </div>
        </article>
      </div>
    </section>
  )
}
