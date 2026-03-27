'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { UseMutationResult } from '@tanstack/react-query'

/**
 * Wraps the raw logout mutation with a route transition to `/login`.
 * Returns `startTransition` so the shell can share the routing state
 * with other transition-aware hooks (e.g. evaluation countdown).
 */
 
export function useDashboardLogout(rawMutation: UseMutationResult<any, Error, void>) {
  const router = useRouter()
  const [isRouting, startTransition] = useTransition()

  const logout = () =>
    rawMutation.mutate(undefined, {
      onSuccess: () => startTransition(() => router.push('/login')),
    })

  return {
    logout,
    isPending: rawMutation.isPending || isRouting,
    isRouting,
    startTransition,
  }
}
