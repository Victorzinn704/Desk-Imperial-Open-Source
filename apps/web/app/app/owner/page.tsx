'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { fetchCurrentUser } from '@/lib/api'
import { OwnerMobileShell } from '@/components/owner-mobile/owner-mobile-shell'

export default function OwnerAppPage() {
  const router = useRouter()

  const sessionQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    retry: false,
  })

  const user = sessionQuery.data?.user
  const isOwner = user?.role === 'OWNER'

  // Redireciona se não autenticado ou se for staff
  useEffect(() => {
    if (sessionQuery.isError) {
      router.replace('/login')
    }
    if (user && !isOwner) {
      router.replace('/app/staff')
    }
  }, [sessionQuery.isError, user, isOwner, router])

  if (!user || !isOwner) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="size-8 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.1)] border-t-[var(--accent,#9b8460)]" />
      </div>
    )
  }

  return <OwnerMobileShell currentUser={{ name: user.fullName, fullName: user.fullName }} />
}
