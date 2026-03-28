import type { Request } from 'express'

export type AuthContext = {
  userId: string
  sessionId: string
  role: 'OWNER' | 'STAFF'
  workspaceOwnerUserId?: string
  companyOwnerUserId: string | null
  employeeId?: string | null
  employeeCode?: string | null
  email: string
  fullName: string
  companyName: string | null
  companyLocation: {
    streetLine1: string | null
    streetNumber: string | null
    addressComplement: string | null
    district: string | null
    city: string | null
    state: string | null
    postalCode: string | null
    country: string | null
    latitude: number | null
    longitude: number | null
    precision: 'city' | 'address'
  }
  workforce: {
    hasEmployees: boolean
    employeeCount: number
  }
  emailVerified: boolean
  preferredCurrency: 'BRL' | 'USD' | 'EUR'
  status: string
  evaluationAccess: {
    dailyLimitMinutes: number
    remainingSeconds: number
    sessionExpiresAt: string
  } | null
  cookiePreferences: {
    necessary: true
    analytics: boolean
    marketing: boolean
  }
}

export type WorkspaceScopedAuthContext = Pick<
  AuthContext,
  'userId' | 'role' | 'workspaceOwnerUserId' | 'companyOwnerUserId'
>

export type ActiveWorkspaceScopedAuthContext = Pick<
  AuthContext,
  'userId' | 'role' | 'status' | 'workspaceOwnerUserId' | 'companyOwnerUserId'
>

export type SessionRequest = Request & {
  auth?: AuthContext
}
