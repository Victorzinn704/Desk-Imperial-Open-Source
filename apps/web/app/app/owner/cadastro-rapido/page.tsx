'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ApiError, fetchCurrentUser } from '@/lib/api'
import { AuthShell } from '@/components/auth/auth-shell'
import { VerifyEmailForm } from '@/components/auth/verify-email-form'
import { Button } from '@/components/shared/button'
import { OwnerQuickRegisterView } from '@/components/owner-mobile/owner-quick-register-view'

export default function OwnerQuickRegisterPage() {
  const router = useRouter()

  const sessionQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const user = sessionQuery.data?.user
  const authError = sessionQuery.error instanceof ApiError ? sessionQuery.error : null
  const isUnauthorized = authError?.status === 401
  const hasSessionError = Boolean(authError && !isUnauthorized)
  const isOwner = user?.role === 'OWNER'
  const isVerified = Boolean(user?.emailVerified)

  useEffect(() => {
    if (isUnauthorized) {
      router.replace('/login')
    }
    if (!hasSessionError && user && isVerified && !isOwner) {
      router.replace('/app/staff')
    }
  }, [hasSessionError, isOwner, isUnauthorized, isVerified, router, user])

  if (user && !isVerified) {
    return (
      <AuthShell
        description="Antes de liberar o cadastro rápido, precisamos confirmar o email da conta."
        eyebrow="Confirmação"
        title="Valide seu acesso"
      >
        <VerifyEmailForm email={user.email} successRedirectTo="/app/owner/cadastro-rapido" />
      </AuthShell>
    )
  }

  if (hasSessionError && (!user || isVerified)) {
    return (
      <AuthShell
        description="A validação do acesso falhou por um problema temporário. Você pode tentar novamente sem sair da tela."
        eyebrow="Sessão"
        title="Não conseguimos carregar seu acesso"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-[rgba(212,115,115,0.22)] bg-[rgba(212,115,115,0.08)] px-4 py-3 text-sm leading-6 text-white/72">
            {authError?.message ?? 'Erro inesperado ao carregar a sessão.'}
          </div>
          <Button fullWidth size="lg" type="button" variant="secondary" onClick={() => void sessionQuery.refetch()}>
            Tentar novamente
          </Button>
        </div>
      </AuthShell>
    )
  }

  if (!(user && isOwner)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
        <div className="size-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent,#9b8460)]" />
      </div>
    )
  }

  return (
    <OwnerQuickRegisterView
      companyName={user.companyName ?? 'Desk Imperial'}
      displayName={user.fullName ?? user.email}
      onBack={() => router.push('/app/owner')}
    />
  )
}
