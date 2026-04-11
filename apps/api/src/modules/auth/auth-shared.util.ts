import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common'
import { CurrencyCode, UserRole, UserStatus } from '@prisma/client'
import { createHash, randomInt } from 'node:crypto'
import type { AuthContext } from './auth.types'
import type { RequestContext } from '../../common/utils/request-context.util'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'

export const authCookiePreferenceSelect = {
  analytics: true,
  marketing: true,
} as const

export const authWorkspaceUserSelect = {
  id: true,
  companyOwnerId: true,
  fullName: true,
  companyName: true,
  companyStreetLine1: true,
  companyStreetNumber: true,
  companyAddressComplement: true,
  companyDistrict: true,
  companyCity: true,
  companyState: true,
  companyPostalCode: true,
  companyCountry: true,
  companyLatitude: true,
  companyLongitude: true,
  hasEmployees: true,
  employeeCount: true,
  email: true,
  emailVerifiedAt: true,
  preferredCurrency: true,
  status: true,
} as const

export const authSessionUserSelect = {
  ...authWorkspaceUserSelect,
  cookiePreference: {
    select: authCookiePreferenceSelect,
  },
  employeeAccount: {
    select: {
      id: true,
      employeeCode: true,
    },
  },
} as const

export const authSessionWorkspaceOwnerSelect = {
  ...authWorkspaceUserSelect,
  cookiePreference: {
    select: authCookiePreferenceSelect,
  },
} as const

export const authSessionEmployeeSelect = {
  id: true,
  active: true,
  employeeCode: true,
  displayName: true,
} as const

export const publicUserSelect = {
  id: true,
  companyOwnerId: true,
  fullName: true,
  companyName: true,
  companyStreetLine1: true,
  companyStreetNumber: true,
  companyAddressComplement: true,
  companyDistrict: true,
  companyCity: true,
  companyState: true,
  companyPostalCode: true,
  companyCountry: true,
  companyLatitude: true,
  companyLongitude: true,
  hasEmployees: true,
  employeeCount: true,
  role: true,
  email: true,
  emailVerifiedAt: true,
  preferredCurrency: true,
  status: true,
} as const

export function hashToken(rawToken: string) {
  return createHash('sha256').update(rawToken).digest('hex')
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function sanitizeEmployeeCodeForLogin(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '-')
}

export function parseBoolean(value: string | undefined) {
  if (value == null) {
    return false
  }
  return value === 'true'
}

export function normalizeComparableValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

export function isServiceUnavailable(error: unknown) {
  return (
    error instanceof HttpException &&
    (error as { getStatus?: () => number }).getStatus?.() === HttpStatus.SERVICE_UNAVAILABLE
  )
}

export function sanitizePostalCode(value: string) {
  const normalized = sanitizePlainText(value, 'CEP', {
    allowEmpty: false,
    rejectFormula: true,
  })!
  const digits = normalized.replaceAll(/\D/g, '')

  if (digits.length !== 8) {
    throw new BadRequestException('Informe um CEP valido para localizar a empresa com precisao.')
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function generateNumericCode() {
  return randomInt(100000, 1000000).toString()
}

export function extractHostCandidate(value: string | null | undefined) {
  if (!value) {
    return null
  }
  return value.trim().split(':')[0]?.toLowerCase() ?? null
}

export function extractHostFromUrlCandidate(value: string | null | undefined) {
  if (!value) {
    return null
  }
  try {
    return new URL(value).hostname.toLowerCase()
  } catch {
    return null
  }
}

export function isLoopbackIp(value: string) {
  return value === '127.0.0.1' || value === '::1' || value === 'localhost'
}

export function isLocalHost(value: string) {
  return value === 'localhost' || value === '127.0.0.1'
}

export function isStrictlyLocalRequestContext(context: RequestContext) {
  const ipAddress = normalizeComparableValue(context.ipAddress)
  const host = extractHostCandidate(context.host)
  const originHost = extractHostFromUrlCandidate(context.origin)
  const refererHost = extractHostFromUrlCandidate(context.referer)
  const hostCandidates = [host, originHost, refererHost].filter((value): value is string => Boolean(value))
  return isLoopbackIp(ipAddress) && hostCandidates.every(isLocalHost)
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null
  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle)
    }
  }
}

export function toAuthUser(
  user: {
    id: string
    companyOwnerId: string | null
    fullName: string
    companyName: string | null
    companyStreetLine1?: string | null
    companyStreetNumber?: string | null
    companyAddressComplement?: string | null
    companyDistrict?: string | null
    companyCity?: string | null
    companyState?: string | null
    companyPostalCode?: string | null
    companyCountry?: string | null
    companyLatitude?: number | null
    companyLongitude?: number | null
    hasEmployees?: boolean
    employeeCount?: number
    employeeAccount?: {
      id: string
      employeeCode: string
    } | null
    role?: UserRole
    email: string
    emailVerifiedAt?: Date | null
    preferredCurrency: CurrencyCode
    status: UserStatus
  },
  options: {
    sessionId?: string
    analytics: boolean
    marketing: boolean
    evaluationAccess: AuthContext['evaluationAccess']
    employeeId?: string | null
    employeeCode?: string | null
  },
): AuthContext {
  const workspaceOwnerUserId = user.role === UserRole.STAFF ? (user.companyOwnerId ?? user.id) : user.id
  const employeeId = options.employeeId ?? user.employeeAccount?.id ?? null
  const employeeCode = options.employeeCode ?? user.employeeAccount?.employeeCode ?? null

  return {
    userId: user.id,
    sessionId: options.sessionId ?? '',
    role: user.role ?? UserRole.OWNER,
    workspaceOwnerUserId,
    companyOwnerUserId: user.companyOwnerId,
    employeeId,
    employeeCode,
    email: user.email,
    fullName: user.fullName,
    companyName: user.companyName,
    companyLocation: {
      streetLine1: user.companyStreetLine1 ?? null,
      streetNumber: user.companyStreetNumber ?? null,
      addressComplement: user.companyAddressComplement ?? null,
      district: user.companyDistrict ?? null,
      city: user.companyCity ?? null,
      state: user.companyState ?? null,
      postalCode: user.companyPostalCode ?? null,
      country: user.companyCountry ?? null,
      latitude: user.companyLatitude ?? null,
      longitude: user.companyLongitude ?? null,
      precision: user.companyLatitude != null && user.companyLongitude != null ? 'address' : 'city',
    },
    workforce: {
      hasEmployees: user.hasEmployees ?? false,
      employeeCount: user.employeeCount ?? 0,
    },
    emailVerified: Boolean((user as { emailVerifiedAt?: Date | null }).emailVerifiedAt),
    preferredCurrency: user.preferredCurrency,
    status: user.status,
    evaluationAccess: options.evaluationAccess,
    cookiePreferences: {
      necessary: true,
      analytics: options.analytics,
      marketing: options.marketing,
    },
  }
}
