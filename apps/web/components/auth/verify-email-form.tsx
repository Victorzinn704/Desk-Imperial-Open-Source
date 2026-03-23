'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ApiError, requestEmailVerification, verifyEmail } from '@/lib/api'
import {
  clearEmailVerificationChallenge,
  readEmailVerificationChallenge,
  saveEmailVerificationChallenge,
  type StoredEmailVerificationChallenge,
} from '@/lib/auth-challenge-storage'
import { type VerifyEmailFormValues, verifyEmailSchema } from '@/lib/validation'
import { Button } from '@/components/shared/button'
import { InputField } from '@/components/shared/input-field'

export function VerifyEmailForm({ email, firstAccess }: Readonly<{ email?: string; firstAccess?: boolean }>) {
  const router = useRouter()
  const [isRouting, startTransition] = useTransition()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [previewChallenge, setPreviewChallenge] = useState<StoredEmailVerificationChallenge | null>(null)
  // When coming directly from registration, show the "check inbox" screen first
  const [showCheckInbox, setShowCheckInbox] = useState(Boolean(firstAccess && email))
  const {
    register,
    handleSubmit,
    getValues,
    control,
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
      const currentEmail = getValues('email')
      clearEmailVerificationChallenge(currentEmail)
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

      const currentEmail = getValues('email')

      if (payload.deliveryMode === 'preview' && payload.previewCode && payload.previewExpiresAt) {
        const challenge = {
          email: currentEmail,
          previewCode: payload.previewCode,
          previewExpiresAt: payload.previewExpiresAt,
          savedAt: new Date().toISOString(),
        }

        saveEmailVerificationChallenge(challenge)
        setPreviewChallenge(challenge)
        return
      }

      clearEmailVerificationChallenge(currentEmail)
      setPreviewChallenge(null)
    },
  })

  const currentEmail =
    useWatch({
      control,
      name: 'email',
    }) ?? ''

  useEffect(() => {
    setPreviewChallenge(readEmailVerificationChallenge(currentEmail))
  }, [currentEmail])

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

  if (showCheckInbox) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center">
          <span className="flex size-16 items-center justify-center rounded-[24px] border border-[rgba(52,242,127,0.22)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]">
            <svg className="size-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
        <div className="space-y-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Verifique seu email</p>
          <h2 className="text-2xl font-semibold text-white">Enviamos um código para você</h2>
          <p className="text-sm leading-7 text-[var(--text-soft)]">
            Procure na caixa de entrada de{' '}
            <span className="font-semibold text-white">{email}</span>
            . Se não encontrar, verifique spam e promoções.
          </p>
        </div>
        <div className="imperial-card-soft space-y-3 px-4 py-4 text-sm text-[var(--text-soft)]">
          <p>O código expira em alguns minutos. Após confirmar, você será redirecionado para o login.</p>
        </div>
        <Button fullWidth size="lg" type="button" onClick={() => setShowCheckInbox(false)}>
          Já tenho o código →
        </Button>
        <div className="text-center">
          <Link className="text-sm text-[var(--text-soft)] underline hover:text-white" href="/login">
            Voltar para login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Confirmacao de email
        </p>
        <h2 className="text-3xl font-semibold text-white">Valide o codigo enviado para o seu email.</h2>
        <p className="text-sm leading-7 text-[var(--text-soft)]">
          A conta so e liberada depois da confirmacao. Se precisar, voce pode reenviar o codigo. Vale conferir spam, promocoes e atualizacoes.
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

        {previewChallenge ? (
          <div className="rounded-2xl border border-[rgba(255,208,87,0.28)] bg-[rgba(255,208,87,0.08)] px-4 py-4 text-sm text-[var(--text-soft)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
              Codigo de apoio do modo portfolio
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-3xl font-semibold tracking-[0.28em] text-white">
                  {previewChallenge.previewCode}
                </p>
                <p className="mt-2 text-xs text-[var(--text-soft)]">
                  Use este codigo apenas neste navegador para concluir a verificacao enquanto o email esta indisponivel.
                </p>
              </div>
              <p className="text-xs text-[var(--text-soft)]">
                Expira em {formatPreviewExpiry(previewChallenge.previewExpiresAt)}
              </p>
            </div>
          </div>
        ) : null}

        <div className="imperial-card-soft px-4 py-3 text-sm text-[var(--text-soft)]">
          Dica: o codigo chega por email transacional. Se nao aparecer na caixa principal, procure por mensagens do DESK IMPERIAL no spam ou na aba de promocoes.
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

function formatPreviewExpiry(value: string) {
  const expiresAt = new Date(value)

  if (Number.isNaN(expiresAt.getTime())) {
    return 'alguns minutos'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(expiresAt)
}
