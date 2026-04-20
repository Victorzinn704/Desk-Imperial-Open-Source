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
      : 'Complete a localização para manter cadastro e atendimento consistentes',
    label: addressParts.length ? addressParts.join(', ') : 'Endereço não informado',
  }
}

export function AccountTab({ profileError, profileLoading, user, onProfileSubmit }: AccountTabProps) {
  const companyLocation = formatCompanyLocation(user)

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
        <div className="border-b border-[var(--border)] pb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
            Identidade ativa
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
            Nome exibido, responsável e localização principal da conta.
          </p>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <SettingsInfoCard hint="Identidade principal da conta" label="Responsável" value={user.fullName} />
          <SettingsInfoCard hint="Identificador seguro de acesso" label="Email" value={user.email} />
          <SettingsInfoCard hint={companyLocation.helper} label="Localização" value={companyLocation.label} />
        </div>
      </section>

      <AccountProfileCard error={profileError} loading={profileLoading} user={user} onSubmit={onProfileSubmit} />
    </div>
  )
}
