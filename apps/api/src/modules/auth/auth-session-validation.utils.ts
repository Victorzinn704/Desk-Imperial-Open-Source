import { type Prisma, UserRole, UserStatus } from '@prisma/client'
import type { AuthContext } from './auth.types'
import {
  authSessionEmployeeSelect,
  authSessionUserSelect,
  authSessionWorkspaceOwnerSelect,
  toAuthUser,
} from './auth-shared.util'

export type AuthSessionRejectionReason = 'missing' | 'revoked' | 'expired' | 'inactive' | 'orphaned'

type AuthSessionUser = Prisma.UserGetPayload<{ select: typeof authSessionUserSelect }>
type AuthSessionEmployee = Prisma.EmployeeGetPayload<{ select: typeof authSessionEmployeeSelect }>
type AuthSessionWorkspaceOwner = Prisma.UserGetPayload<{ select: typeof authSessionWorkspaceOwnerSelect }>

export type AuthSessionRecord = {
  id: string
  tokenHash: string
  expiresAt: Date
  revokedAt: Date | null
  lastSeenAt: Date
  user: AuthSessionUser | null
  employee: AuthSessionEmployee | null
  workspaceOwner: AuthSessionWorkspaceOwner
}

type EvaluationAccessBuilder = (email: string, expiresAt: Date) => AuthContext['evaluationAccess']

const SESSION_LAST_SEEN_UPDATE_MS = 15 * 60_000

export function isCachedAuthSessionFresh(expiresAt: string | undefined, nowMs = Date.now()) {
  const parsedExpiresAt = parseCachedExpiration(expiresAt)
  return parsedExpiresAt === null || parsedExpiresAt.getTime() > nowMs
}

export function resolveSessionRejectionReason(session: AuthSessionRecord, now = new Date()) {
  if (session.revokedAt) {
    return 'revoked'
  }

  if (session.expiresAt <= now) {
    return 'expired'
  }

  if (resolveSessionUserStatus(session) !== UserStatus.ACTIVE) {
    return 'inactive'
  }

  return null
}

export function shouldRefreshSessionLastSeen(session: AuthSessionRecord, nowMs = Date.now()) {
  return nowMs - session.lastSeenAt.getTime() > SESSION_LAST_SEEN_UPDATE_MS
}

export function buildSessionAuthContext(params: {
  session: AuthSessionRecord
  buildEvaluationAccess: EvaluationAccessBuilder
}) {
  if (params.session.employee) {
    return buildEmployeeAuthContext(params)
  }

  if (params.session.user) {
    return buildUserAuthContext(params)
  }

  return null
}

function parseCachedExpiration(expiresAt: string | undefined) {
  if (!expiresAt) {
    return null
  }

  const parsedExpiresAt = new Date(expiresAt)
  return Number.isNaN(parsedExpiresAt.getTime()) ? null : parsedExpiresAt
}

function resolveSessionUserStatus(session: AuthSessionRecord) {
  if (session.employee) {
    return session.employee.active ? UserStatus.ACTIVE : UserStatus.DISABLED
  }

  return session.user?.status
}

function buildEmployeeAuthContext(params: {
  session: AuthSessionRecord
  buildEvaluationAccess: EvaluationAccessBuilder
}) {
  const { session } = params
  const employee = session.employee

  if (!employee) {
    return null
  }

  const actorUserId = session.user?.id ?? employee.loginUser?.id ?? session.workspaceOwner.id

  return toAuthUser(
    {
      ...session.workspaceOwner,
      id: actorUserId,
      fullName: employee.displayName,
      role: UserRole.STAFF,
      companyOwnerId: session.workspaceOwner.id,
      email: session.workspaceOwner.email,
    },
    {
      sessionId: session.id,
      actorUserId,
      analytics: session.workspaceOwner.cookiePreference?.analytics ?? false,
      marketing: session.workspaceOwner.cookiePreference?.marketing ?? false,
      evaluationAccess: params.buildEvaluationAccess(session.workspaceOwner.email, session.expiresAt),
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
    },
  )
}

function buildUserAuthContext(params: { session: AuthSessionRecord; buildEvaluationAccess: EvaluationAccessBuilder }) {
  const { session } = params

  if (!session.user) {
    return null
  }

  return toAuthUser(session.user, {
    sessionId: session.id,
    actorUserId: session.user.id,
    analytics: session.user.cookiePreference?.analytics ?? false,
    marketing: session.user.cookiePreference?.marketing ?? false,
    evaluationAccess: params.buildEvaluationAccess(session.user.email, session.expiresAt),
    employeeId: session.user.employeeAccount?.id ?? null,
    employeeCode: session.user.employeeAccount?.employeeCode ?? null,
  })
}
