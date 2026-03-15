import type { Request } from 'express'

export type AuthContext = {
  userId: string
  sessionId: string
  email: string
  fullName: string
  companyName: string | null
  status: string
  cookiePreferences: {
    necessary: true
    analytics: boolean
    marketing: boolean
  }
}

export type SessionRequest = Request & {
  auth?: AuthContext
}
