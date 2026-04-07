import { Building2, Mail, MapPin, ShieldCheck, UserRound, Users } from 'lucide-react'
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
  const operationalSummary = [
    {
      icon: Mail,
      label: 'Email de acesso',
      value: user.email,
      hint: user.emailVerified
        ? 'Conta validada para fluxos sensíveis.'
        : 'Validação pendente para liberar todas as ações.',
    },
    {
      icon: Users,
      label: 'Equipe',
      value: user.workforce.hasEmployees ? `${user.workforce.employeeCount} ativos` : 'Sem equipe cadastrada',
      hint: 'Funcionários e papéis usam este contexto como origem da operação.',
    },
    {
      icon: MapPin,
      label: 'Endereço-base',
      value: companyLocation.label,
      hint: companyLocation.helper,
    },
  ]

  return (
    <div className="space-y-6">
      <article className="imperial-card overflow-hidden">
        <div className="grid gap-6 px-6 py-6 md:px-8 md:py-7 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(37,99,235,0.18)] bg-[rgba(37,99,235,0.08)] text-[var(--accent)]">
                <UserRound className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                  Conta e identidade
                </p>
                <h2 className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">
                  Perfil do workspace em um painel contínuo
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
                  Nome exibido, responsável, moeda e contexto de operação passam a ser tratados como um único bloco
                  administrativo, sem cair em formulário solto.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-[var(--accent)]/18 bg-[var(--accent)]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                {user.companyName || 'Conta principal'}
              </span>
              <span className="inline-flex items-center rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                {user.role === 'OWNER' ? 'Administrador' : 'Operacional'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--success)]/18 bg-[var(--success)]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--success)]">
                <ShieldCheck className="size-3.5" />
                {user.emailVerified ? 'Email verificado' : 'Verificação pendente'}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {operationalSummary.map(({ hint, icon: Icon, label, value }) => (
              <div className="rounded-[20px] border border-white/6 bg-white/[0.02] px-4 py-4" key={label}>
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-[14px] border border-white/8 bg-white/[0.03] text-[var(--accent)]">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                      {label}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">{value}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-6 text-[var(--text-soft)]">{hint}</p>
              </div>
            ))}
          </div>
        </div>
      </article>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:items-start">
        <AccountProfileCard error={profileError} loading={profileLoading} onSubmit={onProfileSubmit} user={user} />

        <div className="space-y-6">
          <article className="imperial-card p-6 md:p-7">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-[var(--accent)]">
                <Building2 className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                  Impacto na interface
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                  O que este painel alimenta no produto
                </h3>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <SettingsInfoCard
                hint="Nome e moeda atualizam leitura executiva, cabeçalho e contexto visual do workspace."
                label="Leitura principal"
                value="Sidebar, topbar e visão geral"
              />
              <SettingsInfoCard
                hint="A localização entra nos módulos territoriais e ajuda a leitura operacional de mapa."
                label="Contexto operacional"
                value="Mapa, agenda e gestão"
              />
              <SettingsInfoCard
                hint="O responsável mantém rastreabilidade da conta e clareza em fluxos administrativos."
                label="Governança"
                value="Conta, consentimento e sessão"
              />
            </div>
          </article>

          <article className="imperial-card p-6 md:p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              Leitura do cadastro
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Resumo vivo da conta atual</h3>

            <div className="mt-5 grid gap-3">
              <SettingsInfoCard
                hint="Nome público mostrado no portal"
                label="Empresa"
                value={user.companyName || 'Não informado'}
              />
              <SettingsInfoCard hint="Responsável principal do workspace" label="Conta" value={user.fullName} />
              <SettingsInfoCard hint="Moeda usada na leitura financeira" label="Moeda" value={user.preferredCurrency} />
            </div>
          </article>
        </div>
      </div>
    </div>
  )
}
