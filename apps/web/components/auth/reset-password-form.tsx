'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ApiError, resetPassword } from '@/lib/api'
import {
  getPasswordStrength,
  type ResetPasswordFormValues,
  resetPasswordSchema,
} from '@/lib/validation'
import { Button } from '@/components/shared/button'
import { InputField } from '@/components/shared/input-field'

export function ResetPasswordForm({ email }: Readonly<{ email?: string }>) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: email ?? '',
      code: '',
      password: '',
      confirmPassword: '',
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: resetPassword,
    onSuccess: (payload) => {
      setSuccessMessage(payload.message)
      reset()
    },
  })

  const password = useWatch({
    control,
    name: 'password',
  }) ?? ''
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])

  const onSubmit = handleSubmit((values) => {
    setSuccessMessage(null)
    resetPasswordMutation.mutate({
      email: values.email,
      code: values.code,
      password: values.password,
    })
  })

  const errorMessage =
    resetPasswordMutation.error instanceof ApiError
      ? resetPasswordMutation.error.message
      : 'Digite o email, o codigo recebido e uma nova senha forte para concluir a redefinicao.'

  return (
    <div>
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Redefinir senha
        </p>
        <h2 className="text-3xl font-semibold text-white">Escolha uma nova senha para sua conta.</h2>
        <p className="text-sm leading-7 text-[var(--text-soft)]">
          O codigo enviado por email tem expiracao curta e invalida as sessoes anteriores depois da troca.
        </p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        <InputField
          autoComplete="email"
          error={errors.email?.message}
          label="Email cadastrado"
          placeholder="ceo@empresa.com"
          {...register('email')}
        />

        <InputField
          autoComplete="one-time-code"
          error={errors.code?.message}
          hint="Digite o codigo de 6 digitos enviado para o email cadastrado."
          label="Codigo de verificacao"
          placeholder="482931"
          {...register('code')}
        />

        <InputField
          autoComplete="new-password"
          error={errors.password?.message}
          hint="Use letra maiuscula, minuscula, numero e caractere especial."
          label="Nova senha"
          placeholder="Defina uma nova senha"
          type="password"
          {...register('password')}
        />

        <InputField
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          label="Confirmar senha"
          placeholder="Repita a nova senha"
          type="password"
          {...register('confirmPassword')}
        />

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-soft)]">Forca da senha</span>
            <span className="font-semibold text-[var(--text-primary)]">{passwordStrength.label}</span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <span
                className={`h-2 rounded-full ${
                  index < passwordStrength.score ? 'bg-[var(--accent)]' : 'bg-[rgba(255,255,255,0.08)]'
                }`}
                key={index}
              />
            ))}
          </div>
        </div>

        {successMessage ? (
          <div className="rounded-2xl border border-[rgba(52,242,127,0.22)] bg-[rgba(52,242,127,0.08)] px-4 py-3 text-sm text-[var(--text-soft)]">
            {successMessage}
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--border)] bg-[rgba(143,183,255,0.08)] px-4 py-3 text-sm text-[var(--text-soft)]">
            {errorMessage}
          </div>
        )}

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text-soft)]">
          Se o codigo venceu ou nao chegou, volte para recuperar a senha e gere um novo envio.
        </div>

        <Button fullWidth loading={resetPasswordMutation.isPending} size="lg" type="submit">
          Salvar nova senha
        </Button>
      </form>

      <div className="mt-6 flex flex-col gap-3 text-sm text-[var(--text-soft)] sm:flex-row sm:items-center sm:justify-between">
        <span>Ja terminou a redefinicao?</span>
        <Link className="font-semibold text-[var(--accent)] transition hover:text-[var(--accent-strong)]" href="/login">
          Voltar para login
        </Link>
      </div>
    </div>
  )
}
