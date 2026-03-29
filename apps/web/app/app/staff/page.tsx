'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { fetchCurrentUser } from '@/lib/api'
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
  const isStaff = user?.role === 'STAFF'

  // Redireciona se não autenticado ou se for owner
  useEffect(() => {
    if (sessionQuery.isError) {
      router.replace('/login')
    }
    if (user && !isStaff) {
      router.replace('/app/owner')
    }
  }, [sessionQuery.isError, user, isStaff, router])

  if (!user || !isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="size-8 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.1)] border-t-[var(--accent,#9b8460)]" />
      </div>
    )
  }

  return (
    <StaffMobileShell
      currentUser={{ name: user.fullName, fullName: user.fullName, employeeId: user.employeeId }}
      produtos={[]}
    />
  )
}
