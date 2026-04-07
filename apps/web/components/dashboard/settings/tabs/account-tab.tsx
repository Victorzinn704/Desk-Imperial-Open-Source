import { UserRound } from 'lucide-react'
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
    <>
      <article className="rounded-xl border border-white/5 bg-surface/50 p-6 md:p-8">
        <div className="flex items-start gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(37,99,235,0.18)] bg-[rgba(37,99,235,0.08)] text-[var(--accent)]">
            <UserRound className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Conta e identidade</p>
            <h2 className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">Dados principais da operação</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
              Nome da empresa, responsável e moeda principal passam a ser geridos dentro do mesmo ambiente do dashboard.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <SettingsInfoCard hint="Identidade principal da conta" label="Responsável" value={user.fullName} />
          <SettingsInfoCard hint="Identificador seguro de acesso" label="Email" value={user.email} />
          <SettingsInfoCard hint={companyLocation.helper} label="Localização" value={companyLocation.label} />
        </div>
      </article>

      <AccountProfileCard error={profileError} loading={profileLoading} onSubmit={onProfileSubmit} user={user} />
    </>
  )
}
