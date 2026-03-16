'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ApiError, forgotPassword } from '@/lib/api'
import { type ForgotPasswordFormValues, forgotPasswordSchema } from '@/lib/validation'
import { Button } from '@/components/shared/button'
import { InputField } from '@/components/shared/input-field'

export function ForgotPasswordForm() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState<string>('')
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const forgotPasswordMutation = useMutation({
    mutationFn: forgotPassword,
    onSuccess: (payload) => {
      setSuccessMessage(payload.message)
      setSubmittedEmail(payload.email ?? '')
      reset()
    },
  })

  const onSubmit = handleSubmit((values) => {
    setSuccessMessage(null)
    forgotPasswordMutation.mutate(values)
  })

  const errorMessage =
    forgotPasswordMutation.error instanceof ApiError
      ? forgotPasswordMutation.error.message
      : 'Informe o email da conta para receber o codigo de redefinicao.'

  return (
    <div>
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Recuperacao de acesso
        </p>
        <h2 className="text-3xl font-semibold text-white">Receba um codigo seguro para redefinir a senha.</h2>
        <p className="text-sm leading-7 text-[var(--text-soft)]">
          O portal envia um codigo de verificacao com expiracao curta para o email cadastrado e aplica limite contra abuso de requisicoes.
        </p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        <InputField
          autoComplete="email"
          error={errors.email?.message}
          label="Email da conta"
          placeholder="ceo@empresa.com"
          {...register('email')}
        />

        {successMessage ? (
          <div className="rounded-2xl border border-[rgba(52,242,127,0.22)] bg-[rgba(52,242,127,0.08)] px-4 py-3 text-sm text-[var(--text-soft)]">
            {successMessage}
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--border)] bg-[rgba(143,183,255,0.08)] px-4 py-3 text-sm text-[var(--text-soft)]">
            {errorMessage}
          </div>
        )}

        <Button fullWidth loading={forgotPasswordMutation.isPending} size="lg" type="submit">
          Enviar codigo de redefinicao
        </Button>
      </form>

      {successMessage && submittedEmail ? (
        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[rgba(143,183,255,0.08)] px-4 py-3 text-sm text-[var(--text-soft)]">
          Ja recebeu o codigo?{' '}
          <Link
            className="font-semibold text-[var(--accent)] transition hover:text-[var(--accent-strong)]"
            href={`/redefinir-senha?email=${encodeURIComponent(submittedEmail)}`}
          >
            Continuar para redefinir a senha
          </Link>
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text-soft)]">
        Nao chegou ainda? Verifique spam, promocoes e atualizacoes. O codigo sempre expira rapido para evitar abuso.
      </div>

      <div className="mt-6 flex flex-col gap-3 text-sm text-[var(--text-soft)] sm:flex-row sm:items-center sm:justify-between">
        <span>Lembrou a senha ou quer voltar?</span>
        <Link className="font-semibold text-[var(--accent)] transition hover:text-[var(--accent-strong)]" href="/login">
          Voltar para login
        </Link>
      </div>
    </div>
  )
}
