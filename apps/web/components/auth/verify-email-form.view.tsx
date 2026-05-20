import Link from 'next/link'
import type { FormEvent } from 'react'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { Button } from '@/components/shared/button'
import { InputField } from '@/components/shared/input-field'
import type { VerifyEmailFormValues } from '@/lib/validation'

export function VerifyEmailInboxState({ email, onCodeEntry }: Readonly<{ email?: string; onCodeEntry: () => void }>) {
  return (
    <div className="space-y-6">
      <VerifyEmailIcon />
      <div className="space-y-2 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Verifique seu email</p>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Enviamos um código para você</h2>
        <InboxInstruction email={email} />
      </div>
      <div className="imperial-card-soft space-y-3 px-4 py-4 text-sm text-[var(--text-soft)]">
        <p>O código expira em alguns minutos. Após confirmar, você será redirecionado para o login.</p>
      </div>
      <Button fullWidth size="lg" type="button" onClick={onCodeEntry}>
        Já tenho o código →
      </Button>
      <BackToLoginLink centered />
    </div>
  )
}

export function VerifyEmailHeader() {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Confirmacao de email</p>
      <h2 className="text-3xl font-semibold text-[var(--text-primary)]">Valide o codigo enviado para o seu email.</h2>
      <p className="text-sm leading-7 text-[var(--text-soft)]">
        A conta so e liberada depois da confirmacao. Se precisar, voce pode reenviar o codigo. Vale conferir spam,
        promocoes e atualizacoes.
      </p>
    </div>
  )
}

export function VerifyEmailCodeForm({
  errors,
  isResending,
  isVerifying,
  register,
  statusMessage,
  successMessage,
  onResend,
  onSubmit,
}: Readonly<{
  errors: FieldErrors<VerifyEmailFormValues>
  isResending: boolean
  isVerifying: boolean
  register: UseFormRegister<VerifyEmailFormValues>
  statusMessage: string
  successMessage: string | null
  onResend: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}>) {
  return (
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
      <VerifyEmailNotice message={successMessage ?? statusMessage} tone={successMessage ? 'success' : 'info'} />
      <VerifyEmailTip />
      <VerifyEmailActions isResending={isResending} isVerifying={isVerifying} onResend={onResend} />
    </form>
  )
}

export function VerifyEmailFooter() {
  return (
    <div className="mt-6 flex flex-col gap-3 text-sm text-[var(--text-soft)] sm:flex-row sm:items-center sm:justify-between">
      <span>Ja concluiu a confirmacao?</span>
      <BackToLoginLink />
    </div>
  )
}

function VerifyEmailIcon() {
  return (
    <div className="flex justify-center">
      <span className="flex size-16 items-center justify-center rounded-[24px] border border-[rgba(52,242,127,0.22)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]">
        <svg
          aria-hidden="true"
          className="size-7"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  )
}

function VerifyEmailNotice({ message, tone }: Readonly<{ message: string; tone: 'info' | 'success' }>) {
  const classes =
    tone === 'success'
      ? 'border-[rgba(52,242,127,0.22)] bg-[rgba(52,242,127,0.08)]'
      : 'border-[var(--border)] bg-[rgba(143,183,255,0.08)]'

  return <div className={`rounded-2xl border px-4 py-3 text-sm text-[var(--text-soft)] ${classes}`}>{message}</div>
}

function VerifyEmailTip() {
  return (
    <div className="imperial-card-soft px-4 py-3 text-sm text-[var(--text-soft)]">
      Dica: o codigo chega por email transacional. Se nao aparecer na caixa principal, procure por mensagens do DESK
      IMPERIAL no spam ou na aba de promocoes.
    </div>
  )
}

function VerifyEmailActions({
  isResending,
  isVerifying,
  onResend,
}: Readonly<{ isResending: boolean; isVerifying: boolean; onResend: () => void }>) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Button fullWidth loading={isVerifying} size="lg" type="submit">
        Confirmar email
      </Button>
      <Button fullWidth loading={isResending} size="lg" type="button" variant="secondary" onClick={onResend}>
        Reenviar codigo
      </Button>
    </div>
  )
}

function BackToLoginLink({ centered = false }: Readonly<{ centered?: boolean }>) {
  const link = (
    <Link className="font-semibold text-[var(--accent)] transition hover:text-[var(--accent-strong)]" href="/login">
      Voltar para login
    </Link>
  )

  return centered ? <div className="text-center text-sm">{link}</div> : link
}

function InboxInstruction({ email }: Readonly<{ email?: string }>) {
  return (
    <p className="text-sm leading-7 text-[var(--text-soft)]">
      Procure na caixa de entrada
      {email ? (
        <span className="font-semibold text-[var(--text-primary)]"> de {email}</span>
      ) : (
        ' do email usado no cadastro'
      )}
      . Se não encontrar, verifique spam e promoções.
    </p>
  )
}
