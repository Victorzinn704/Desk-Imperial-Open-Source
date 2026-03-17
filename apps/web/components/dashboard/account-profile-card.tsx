'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { AuthUser } from '@/lib/api'
import { currencyOptions } from '@/lib/currency'
import { profileSchema, type ProfileFormValues } from '@/lib/validation'
import { Button } from '@/components/shared/button'
import { InputField } from '@/components/shared/input-field'
import { SelectField } from '@/components/shared/select-field'

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

  return (
    <article className="imperial-card p-7">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
        Perfil da empresa
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-white">Edite o nome exibido no portal.</h2>
      <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
        Esse bloco alimenta a sidebar, o cabeçalho executivo e a identificação principal da conta.
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
    </article>
  )
}
