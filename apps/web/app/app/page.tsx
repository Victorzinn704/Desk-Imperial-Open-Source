'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { fetchCurrentUser } from '@/lib/api'

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

  useEffect(() => {
    if (sessionQuery.isError) {
      router.replace('/login')
      return
    }
    if (user) {
      router.replace(user.role === 'STAFF' ? '/app/staff' : '/app/owner')
    }
  }, [sessionQuery.isError, user, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
      <div className="flex flex-col items-center gap-4">
        <div className="size-10 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.1)] border-t-[var(--accent,#9b8460)]" />
        <p className="text-sm font-medium text-[#7a8896]">Carregando...</p>
      </div>
    </div>
  )
}
