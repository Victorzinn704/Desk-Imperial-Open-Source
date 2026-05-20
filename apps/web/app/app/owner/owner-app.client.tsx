'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo } from 'react'
import { ApiError, fetchCurrentUser } from '@/lib/api'
import { OwnerMobileShell } from '@/components/owner-mobile/owner-mobile-shell'
import {
  OwnerAppLoading,
  OwnerEmailVerification,
  type OwnerMobileCurrentUser,
  OwnerSessionError,
} from './owner-app.states'

type OwnerSessionView =
  | { kind: 'loading' }
  | { kind: 'verify-email'; email: string }
  | { kind: 'session-error'; message: string | undefined }
  | { kind: 'ready'; currentUser: OwnerMobileCurrentUser }

type OwnerSessionFlags = {
  hasSessionError: boolean
  isOwner: boolean
  isUnauthorized: boolean
  isVerified: boolean
  userLoaded: boolean
}

type OwnerSessionStatus = 'loading' | 'ready' | 'session-error' | 'staff' | 'unauthorized' | 'verify-email'

type OwnerSessionUser = Awaited<ReturnType<typeof fetchCurrentUser>>['user'] | undefined

type OwnerSessionInput = {
  authError: ApiError | null
  flags: OwnerSessionFlags
  user: OwnerSessionUser
}

type OwnerSessionRule = {
  matches: (input: OwnerSessionInput) => boolean
  status: OwnerSessionStatus
}

const OWNER_SESSION_REDIRECTS: Partial<Record<OwnerSessionStatus, string>> = {
  staff: '/app/staff',
  unauthorized: '/login',
}

const OWNER_SESSION_RULES: OwnerSessionRule[] = [
  { matches: isUnauthorizedOwnerSession, status: 'unauthorized' },
  { matches: isStaffOwnerSession, status: 'staff' },
  { matches: isUnverifiedOwnerSession, status: 'verify-email' },
  { matches: hasVisibleOwnerSessionError, status: 'session-error' },
  { matches: isReadyOwnerSession, status: 'ready' },
]

export function OwnerAppClient() {
  const router = useRouter()
  const sessionQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
  const retryOwnerSession = useCallback(() => {
    void sessionQuery.refetch()
  }, [sessionQuery])
  const sessionState = useMemo(() => buildOwnerSessionState(sessionQuery), [sessionQuery])

  useOwnerSessionRedirect(sessionState.redirectPath, router.replace)

  return renderOwnerSessionView(sessionState.view, retryOwnerSession)
}

function renderOwnerSessionView(view: OwnerSessionView, retryOwnerSession: () => void) {
  switch (view.kind) {
    case 'verify-email':
      return <OwnerEmailVerification email={view.email} />
    case 'session-error':
      return <OwnerSessionError message={view.message} onRetry={retryOwnerSession} />
    case 'ready':
      return <OwnerMobileShell currentUser={view.currentUser} />
    default:
      return <OwnerAppLoading />
  }
}

function useOwnerSessionRedirect(redirectPath: string | null, replace: (href: string) => void) {
  useEffect(() => {
    if (!redirectPath) {
      return
    }

    replace(redirectPath)
  }, [redirectPath, replace])
}

function buildOwnerSessionState(
  sessionQuery: ReturnType<typeof useQuery<Awaited<ReturnType<typeof fetchCurrentUser>>>>,
) {
  const user = sessionQuery.data?.user
  const authError = sessionQuery.error instanceof ApiError ? sessionQuery.error : null
  const flags = {
    hasSessionError: Boolean(authError && authError.status !== 401),
    isOwner: user?.role === 'OWNER',
    isUnauthorized: authError?.status === 401,
    isVerified: Boolean(user?.emailVerified),
    userLoaded: Boolean(user),
  }
  const sessionInput = { authError, flags, user }
  const status = resolveOwnerSessionStatus(sessionInput)

  return {
    redirectPath: resolveOwnerRedirectPath(status),
    view: resolveOwnerSessionView(status, sessionInput),
  }
}

function resolveOwnerSessionStatus(input: OwnerSessionInput): OwnerSessionStatus {
  return OWNER_SESSION_RULES.find((rule) => rule.matches(input))?.status ?? 'loading'
}

function resolveOwnerRedirectPath(status: OwnerSessionStatus) {
  return OWNER_SESSION_REDIRECTS[status] ?? null
}

function resolveOwnerSessionView(status: OwnerSessionStatus, input: OwnerSessionInput): OwnerSessionView {
  switch (status) {
    case 'verify-email':
      return buildVerifyEmailView(input)
    case 'session-error':
      return { kind: 'session-error', message: input.authError?.message }
    case 'ready':
      return buildReadyOwnerSessionView(input)
    default:
      return { kind: 'loading' }
  }
}

function isUnauthorizedOwnerSession({ flags }: OwnerSessionInput) {
  return flags.isUnauthorized
}

function isStaffOwnerSession({ flags }: OwnerSessionInput) {
  return flags.userLoaded && flags.isVerified && !flags.isOwner && !flags.hasSessionError
}

function isUnverifiedOwnerSession({ flags, user }: OwnerSessionInput) {
  return Boolean(user) && !flags.isVerified
}

function hasVisibleOwnerSessionError({ flags }: OwnerSessionInput) {
  return flags.hasSessionError && (!flags.userLoaded || flags.isVerified)
}

function isReadyOwnerSession({ flags, user }: OwnerSessionInput) {
  return Boolean(user) && flags.isOwner
}

function buildVerifyEmailView({ user }: OwnerSessionInput): OwnerSessionView {
  return user ? { kind: 'verify-email', email: user.email } : { kind: 'loading' }
}

function buildReadyOwnerSessionView({ user }: OwnerSessionInput): OwnerSessionView {
  const currentUser = buildOwnerMobileUser(user)
  return currentUser ? { kind: 'ready', currentUser } : { kind: 'loading' }
}

function buildOwnerMobileUser(user: OwnerSessionUser) {
  if (!user) {
    return null
  }

  return { userId: user.userId, name: user.fullName, fullName: user.fullName }
}
