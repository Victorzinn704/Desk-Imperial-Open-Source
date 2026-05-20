import { AuthShell } from '@/components/auth/auth-shell'
import { VerifyEmailForm } from '@/components/auth/verify-email-form'
import { Button } from '@/components/shared/button'

export type OwnerMobileCurrentUser = {
  fullName: string
  name: string
  userId: string
}

export function OwnerEmailVerification({ email }: Readonly<{ email: string }>) {
  return (
    <AuthShell
      description="Antes de liberar a área do proprietário, precisamos confirmar o email da conta."
      eyebrow="Confirmação"
      title="Valide seu acesso"
    >
      <VerifyEmailForm email={email} successRedirectTo="/app/owner" />
    </AuthShell>
  )
}

export function OwnerSessionError({
  message,
  onRetry,
}: Readonly<{ message: string | undefined; onRetry: () => void }>) {
  return (
    <AuthShell
      description="A validação do acesso falhou por um problema temporário. Você pode tentar novamente sem sair da tela."
      eyebrow="Sessão"
      title="Não conseguimos carregar seu acesso"
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-[rgba(212,115,115,0.22)] bg-[rgba(212,115,115,0.08)] px-4 py-3 text-sm leading-6 text-white/72">
          {message ?? 'Erro inesperado ao carregar a sessão.'}
        </div>
        <Button fullWidth size="lg" type="button" variant="secondary" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    </AuthShell>
  )
}

export function OwnerAppLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
      <div className="size-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent,#9b8460)]" />
    </div>
  )
}
