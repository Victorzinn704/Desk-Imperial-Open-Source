import type { Request } from 'express'

export type AuthContext = {
  userId: string
  sessionId: string
  email: string
  fullName: string
  companyName: string | null
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

export type SessionRequest = Request & {
  auth?: AuthContext
}
