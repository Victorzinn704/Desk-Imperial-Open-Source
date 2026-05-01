import type { CurrencyCode } from '@contracts/contracts'

import {
  type ApiBody,
  ApiError,
  apiFetch,
  AUTH_API_TIMEOUT_MS,
  clearPersistedAdminPinHint,
  clearPersistedCsrfToken,
  isLegacyOwnerLoginContractError,
} from './api-core'

export type CookiePreferences = {
  necessary: boolean
  analytics: boolean
  marketing: boolean
}

export type EvaluationAccess = {
  dailyLimitMinutes: number
  remainingSeconds: number
  sessionExpiresAt: string
}

export type AuthUser = {
  userId: string
  sessionId: string
  role: 'OWNER' | 'STAFF'
  workspaceOwnerUserId: string
  companyOwnerUserId: string | null
  employeeId: string | null
  employeeCode: string | null
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
  email: string
  emailVerified: boolean
  preferredCurrency: CurrencyCode
  status: string
  evaluationAccess: EvaluationAccess | null
  cookiePreferences: CookiePreferences
}

export type AuthResponse = {
  user: AuthUser
  csrfToken?: string
  session: {
    expiresAt: string
  }
}

export type SimpleMessageResponse = {
  success: boolean
  message: string
  email?: string
  deliveryMode?: 'email' | 'preview'
}

export type VerificationChallengeResponse = {
  success: boolean
  requiresEmailVerification?: boolean
  email: string
  message: string
  deliveryMode?: 'email' | 'preview'
}

export type ProfilePayload = {
  fullName: string
  companyName?: string
  preferredCurrency: CurrencyCode
}

export type LoginPayload = {
  loginMode: 'OWNER' | 'STAFF'
  email?: string
  companyEmail?: string
  employeeCode?: string
  password: string
}

export type ForgotPasswordPayload = {
  email: string
}

export type ResetPasswordPayload = {
  email: string
  code: string
  password: string
}

export type RegisterPayload = {
  fullName: string
  companyName?: string
  email: string
  companyStreetLine1: string
  companyStreetNumber: string
  companyAddressComplement?: string
  companyDistrict: string
  companyCity: string
  companyState: string
  companyPostalCode: string
  companyCountry: string
  hasEmployees: boolean
  employeeCount: number
  password: string
  acceptTerms: boolean
  acceptPrivacy: boolean
  analyticsCookies?: boolean
  marketingCookies?: boolean
}

function normalizeLoginPayload(payload: LoginPayload) {
  const password = payload.password

  if (payload.loginMode === 'STAFF') {
    return {
      loginMode: 'STAFF' as const,
      companyEmail: payload.companyEmail?.trim(),
      employeeCode: payload.employeeCode?.trim().toUpperCase(),
      password,
    }
  }

  return {
    loginMode: 'OWNER' as const,
    email: payload.email?.trim(),
    password,
  }
}

export async function login(payload: LoginPayload, maxRetries = 2) {
  clearPersistedAdminPinHint()
  const normalizedPayload = normalizeLoginPayload(payload)

  let attempt = 0
  while (attempt <= maxRetries) {
    try {
      return await apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: normalizedPayload as ApiBody,
        skipCsrf: true,
        timeoutMs: AUTH_API_TIMEOUT_MS,
      })
    } catch (error) {
      if (payload.loginMode === 'OWNER' && error instanceof ApiError && isLegacyOwnerLoginContractError(error)) {
        return apiFetch<AuthResponse>('/auth/login', {
          method: 'POST',
          body: {
            email: normalizedPayload.email,
            password: normalizedPayload.password,
          } as ApiBody,
          skipCsrf: true,
          timeoutMs: AUTH_API_TIMEOUT_MS,
        })
      }

      const isNetworkError = error instanceof ApiError && error.status === 0
      const isTimeoutError = error instanceof ApiError && error.status === 504
      if ((isNetworkError || isTimeoutError) && attempt < maxRetries) {
        attempt++
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
        continue
      }

      throw error
    }
  }

  throw new ApiError('Nao foi possivel conectar com o servidor apos varias tentativas.', 0)
}

export type DemoLoginPayload = {
  loginMode: 'OWNER' | 'STAFF'
  employeeCode?: string
}

export async function loginDemo(payload: DemoLoginPayload) {
  clearPersistedAdminPinHint()
  return apiFetch<AuthResponse>('/auth/demo', {
    method: 'POST',
    body: payload as ApiBody,
    skipCsrf: true,
    timeoutMs: AUTH_API_TIMEOUT_MS,
  })
}

export async function register(payload: RegisterPayload) {
  return apiFetch<VerificationChallengeResponse>('/auth/register', {
    method: 'POST',
    body: payload as ApiBody,
    timeoutMs: AUTH_API_TIMEOUT_MS,
  })
}

export async function logout() {
  const response = await apiFetch<{ success: boolean }>('/auth/logout', {
    method: 'POST',
  })
  clearPersistedCsrfToken()
  clearPersistedAdminPinHint()
  return response
}

export async function forgotPassword(payload: ForgotPasswordPayload) {
  return apiFetch<SimpleMessageResponse>('/auth/forgot-password', {
    method: 'POST',
    body: payload as ApiBody,
  })
}

export async function requestEmailVerification(payload: ForgotPasswordPayload) {
  return apiFetch<SimpleMessageResponse>('/auth/verify-email/request', {
    method: 'POST',
    body: payload as ApiBody,
  })
}

export async function verifyEmail(payload: { email: string; code: string }) {
  return apiFetch<SimpleMessageResponse>('/auth/verify-email/confirm', {
    method: 'POST',
    body: payload as ApiBody,
  })
}

export async function resetPassword(payload: ResetPasswordPayload) {
  return apiFetch<SimpleMessageResponse>('/auth/reset-password', {
    method: 'POST',
    body: payload as ApiBody,
  })
}

export async function fetchCurrentUser() {
  return apiFetch<{ user: AuthUser; csrfToken?: string }>('/auth/me', {
    method: 'GET',
  })
}

export async function updateProfile(payload: ProfilePayload) {
  return apiFetch<{ user: AuthUser; csrfToken?: string }>('/auth/profile', {
    method: 'PATCH',
    body: payload as ApiBody,
  })
}
