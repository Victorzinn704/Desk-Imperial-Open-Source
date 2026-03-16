'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ApiError, requestEmailVerification, verifyEmail } from '@/lib/api'
import { type VerifyEmailFormValues, verifyEmailSchema } from '@/lib/validation'
import { Button } from '@/components/shared/button'
import { InputField } from '@/components/shared/input-field'

export function VerifyEmailForm({ email }: Readonly<{ email?: string }>) {
  const router = useRouter()
  const [isRouting, startTransition] = useTransition()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<VerifyEmailFormValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      email: email ?? '',
      code: '',
    },
  })

  const verifyMutation = useMutation({
    mutationFn: verifyEmail,
    onSuccess: (payload) => {
      setSuccessMessage(payload.message)
      startTransition(() => {
        router.push('/login')
      })
    },
  })

  const resendMutation = useMutation({
    mutationFn: requestEmailVerification,
    onSuccess: (payload) => {
      setSuccessMessage(payload.message)
    },
  })

  const onSubmit = handleSubmit((values) => {
    setSuccessMessage(null)
    verifyMutation.mutate(values)
  })

  const handleResend = () => {
    const currentEmail = getValues('email')
    if (!currentEmail) {
      return
    }

    setSuccessMessage(null)
    resendMutation.mutate({ email: currentEmail })
  }

  const errorMessage =
    verifyMutation.error instanceof ApiError
      ? verifyMutation.error.message
      : resendMutation.error instanceof ApiError
        ? resendMutation.error.message
        : 'Confirme o email para liberar o primeiro acesso ao portal.'

  return (
    <div>
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Confirmacao de email
        </p>
        <h2 className="text-3xl font-semibold text-white">Valide o codigo enviado para o seu email.</h2>
        <p className="text-sm leading-7 text-[var(--text-soft)]">
          A conta so e liberada depois da confirmacao. Se precisar, voce tambem pode reenviar o codigo. Vale conferir tambem spam, promocoes e atualizacoes.
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
          hint="Digite o codigo de 6 digitos recebido por email."
          label="Codigo de confirmacao"
          placeholder="482931"
          {...register('code')}
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

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text-soft)]">
          Dica: o codigo chega por email transacional. Se nao aparecer na caixa principal, procure por mensagens do Desk Imperial no spam ou na aba de promocoes.
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button fullWidth loading={verifyMutation.isPending || isRouting} size="lg" type="submit">
            Confirmar email
          </Button>
          <Button
            fullWidth
            loading={resendMutation.isPending}
            size="lg"
            type="button"
            variant="secondary"
            onClick={handleResend}
          >
            Reenviar codigo
          </Button>
        </div>
      </form>

      <div className="mt-6 flex flex-col gap-3 text-sm text-[var(--text-soft)] sm:flex-row sm:items-center sm:justify-between">
        <span>Ja concluiu a confirmacao?</span>
        <Link className="font-semibold text-[var(--accent)] transition hover:text-[var(--accent-strong)]" href="/login">
          Voltar para login
        </Link>
      </div>
    </div>
  )
}
