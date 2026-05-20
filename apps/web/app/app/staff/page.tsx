'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ApiError, fetchCurrentUser } from '@/lib/api'
import { AuthShell } from '@/components/auth/auth-shell'
import { VerifyEmailForm } from '@/components/auth/verify-email-form'
import { Button } from '@/components/shared/button'
import { StaffMobileShell } from '@/components/staff-mobile'

export default function StaffAppPage() {
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
  const isStaff = user?.role === 'STAFF'
  const isVerified = Boolean(user?.emailVerified)

  // Redireciona se não autenticado ou se for owner
  useEffect(() => {
    if (isUnauthorized) {
      router.replace('/login')
    }
    if (!hasSessionError && user && isVerified && !isStaff) {
      router.replace('/app/owner')
    }
  }, [hasSessionError, isStaff, isUnauthorized, isVerified, router, user])

  if (user && !isVerified) {
    return (
      <AuthShell
        description="O acesso da equipe fica disponível depois da confirmação do email cadastrado."
        eyebrow="Confirmação"
        title="Valide seu acesso"
      >
        <VerifyEmailForm email={user.email} successRedirectTo="/app/staff" />
      </AuthShell>
    )
  }

  if (hasSessionError && (!user || isVerified)) {
    return (
      <AuthShell
        description="Houve uma falha temporária ao validar sua sessão. Você pode tentar novamente sem sair desta tela."
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

  if (!(user && isStaff)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
        <div className="size-8 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.1)] border-t-[var(--accent,#9b8460)]" />
      </div>
    )
  }

  return (
    <StaffMobileShell
      currentUser={{ userId: user.userId, name: user.fullName, fullName: user.fullName, employeeId: user.employeeId }}
    />
  )
}
