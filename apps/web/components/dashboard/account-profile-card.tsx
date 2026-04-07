'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, CircleDot, Mail, Wallet } from 'lucide-react'
import type { AuthUser } from '@/lib/api'
import { currencyOptions } from '@/lib/currency'
import { profileSchema, type ProfileFormValues } from '@/lib/validation'
import { Button } from '@/components/shared/button'
import { InputField } from '@/components/shared/input-field'
import { SelectField } from '@/components/shared/select-field'
import { SettingsInfoCard } from '@/components/dashboard/settings/components/settings-info-card'

export function AccountProfileCard({
  error,
  loading,
  onSubmit,
  user,
}: Readonly<{
  error?: string | null
  loading?: boolean
  onSubmit: (values: ProfileFormValues) => void
  user: AuthUser
}>) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user.fullName,
      companyName: user.companyName ?? '',
      preferredCurrency: user.preferredCurrency,
    },
  })

  useEffect(() => {
    reset({
      fullName: user.fullName,
      companyName: user.companyName ?? '',
      preferredCurrency: user.preferredCurrency,
    })
  }, [reset, user.companyName, user.fullName, user.preferredCurrency])

  const companyLocation = [
    user.companyLocation.streetLine1,
    user.companyLocation.streetNumber,
    user.companyLocation.city,
    user.companyLocation.state,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <article className="imperial-card overflow-hidden">
      <div className="grid xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="border-b border-white/[0.06] p-7 xl:border-b-0 xl:border-r xl:border-white/[0.06] xl:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Perfil da empresa</p>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
            Edite os dados que definem o workspace.
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
            Este bloco sustenta identidade visual, moeda exibida e o contexto administrativo da conta.
          </p>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <InputField
              error={errors.companyName?.message}
              label="Nome da empresa"
              placeholder="Bar do Pedrao"
              {...register('companyName')}
            />

            <InputField
              error={errors.fullName?.message}
              label="Responsável pela conta"
              placeholder="Joao Vitor"
              {...register('fullName')}
            />

            <SelectField
              error={errors.preferredCurrency?.message}
              label="Moeda preferida do app"
              options={currencyOptions}
              {...register('preferredCurrency')}
            />

            <InputField
              disabled
              hint="O email segue como identificador seguro de acesso."
              label="Email de acesso"
              readOnly
              value={user.email}
            />

            {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

            <Button fullWidth loading={loading} size="lg" type="submit" disabled={!isDirty && !loading}>
              Salvar perfil
            </Button>
          </form>
        </div>

        <aside className="space-y-4 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-[14px] border border-white/8 bg-white/[0.03] text-[var(--accent)]">
              <Building2 className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Resumo imediato</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">
                O formulário à esquerda publica estes sinais para o restante do produto.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <SettingsInfoCard
              hint="Leitura pública exibida na navegação."
              label="Empresa"
              value={user.companyName || 'Não informado'}
            />
            <SettingsInfoCard hint="Moeda base usada no dashboard." label="Moeda" value={user.preferredCurrency} />
            <SettingsInfoCard
              hint={companyLocation || 'Preencha a localização para habilitar o contexto territorial.'}
              label="Localização"
              value={companyLocation || 'Não informada'}
            />
          </div>

          <div className="rounded-[18px] border border-white/6 bg-white/[0.02] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Este cadastro abastece
            </p>
            <div className="mt-4 grid gap-3">
              {[
                {
                  icon: CircleDot,
                  title: 'Sidebar e topbar',
                  description: 'identidade principal e contexto do workspace',
                },
                {
                  icon: Wallet,
                  title: 'Leitura financeira',
                  description: 'moeda padrão exibida nos painéis do dashboard',
                },
                {
                  icon: Mail,
                  title: 'Governança da conta',
                  description: 'email e rastreabilidade em sessão, consentimento e segurança',
                },
              ].map(({ description, icon: Icon, title }) => (
                <div className="flex items-start gap-3" key={title}>
                  <span className="mt-0.5 flex size-8 items-center justify-center rounded-[12px] border border-white/8 bg-white/[0.03] text-[var(--accent)]">
                    <Icon className="size-3.5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
                    <p className="mt-1 text-xs leading-6 text-[var(--text-soft)]">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </article>
  )
}
