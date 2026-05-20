'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ApiError, fetchCurrentUser } from '@/lib/api'
import { AuthShell } from '@/components/auth/auth-shell'
import { VerifyEmailForm } from '@/components/auth/verify-email-form'
import { Button } from '@/components/shared/button'

/**
 * Página raiz /app — redireciona automaticamente para /app/staff ou /app/owner
 * baseado no role do usuário autenticado.
 */
export default function AppEntryPage() {
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
  const isVerified = Boolean(user?.emailVerified)
  const isStaff = user?.role === 'STAFF'

  useEffect(() => {
    if (isUnauthorized) {
      router.replace('/login')
      return
    }
    if (!hasSessionError && user && isVerified) {
      router.replace(isStaff ? '/app/staff' : '/app/owner')
    }
  }, [hasSessionError, isStaff, isUnauthorized, isVerified, router, user])

  if (user && !isVerified) {
    return (
      <AuthShell
        description="Precisamos confirmar o email da conta antes de liberar a navegação do portal."
        eyebrow="Confirmação"
        title="Valide seu acesso"
      >
        <VerifyEmailForm email={user.email} successRedirectTo="/app" />
      </AuthShell>
    )
  }

  if (hasSessionError && (!user || isVerified)) {
    return (
      <AuthShell
        description="Houve uma falha temporária ao validar sua sessão. Tente novamente quando a conexão ou o serviço voltarem."
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
      <div className="flex flex-col items-center gap-4">
        <div className="size-10 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.1)] border-t-[var(--accent,#9b8460)]" />
        <p className="text-sm font-medium text-[#7a8896]">Carregando...</p>
      </div>
    </div>
  )
}
