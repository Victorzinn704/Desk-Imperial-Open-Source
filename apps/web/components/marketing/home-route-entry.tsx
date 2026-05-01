'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ApiError, fetchCurrentUser } from '@/lib/api'
import { isMobileViewport, resolveAuthenticatedRoute } from '@/lib/authenticated-route'
import { LandingPage } from '@/components/marketing/landing-page'
import { useClientViewportWidth } from '@/hooks/use-client-viewport-width'

export function HomeRouteEntry() {
  const router = useRouter()
  const viewportWidth = useClientViewportWidth()
  const sessionQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const authError = sessionQuery.error instanceof ApiError ? sessionQuery.error : null
  const user = sessionQuery.data?.user
  const isUnauthorized = authError?.status === 401
  const canRoute = Boolean(user?.emailVerified) && viewportWidth !== null
  const isResolvingSession = viewportWidth !== null && sessionQuery.isPending

  useEffect(() => {
    if (isUnauthorized || !canRoute || !user) {
      return
    }

    router.replace(resolveAuthenticatedRoute(user.role, viewportWidth))
  }, [canRoute, isUnauthorized, router, user, viewportWidth])

  if (isResolvingSession || (canRoute && user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.1)] border-t-[var(--accent,#008cff)]" />
          <p className="text-sm font-medium text-[#7a8896]">
            {isMobileViewport(viewportWidth)
              ? 'Abrindo o app do Desk Imperial...'
              : 'Abrindo o painel do Desk Imperial...'}
          </p>
        </div>
      </div>
    )
  }

  return <LandingPage />
}
