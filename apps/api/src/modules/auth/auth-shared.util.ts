import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common'
import { createHash, randomInt } from 'node:crypto'
import { isEmail } from 'class-validator'
import type { AuthContext } from './auth.types'
import type { RequestContext } from '../../common/utils/request-context.util'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
export { toAuthUser } from './auth-user.mapper'

const AUTH_EMAIL_MAX_LENGTH = 254
const EMPLOYEE_CODE_MAX_LENGTH = 32
const EMPLOYEE_CODE_PATTERN = /^[A-Z0-9][A-Z0-9._-]*$/
const ONE_TIME_CODE_PATTERN = /^\d{6}$/

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
  loginUser: {
    select: {
      id: true,
    },
  },
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

export function normalizeAuthEmail(email: string | null | undefined, fieldLabel = 'Email') {
  const sanitized = sanitizePlainText(email, fieldLabel, {
    allowEmpty: false,
    rejectFormula: true,
  })
  const normalized = normalizeEmail(sanitized ?? '')

  if (normalized.length > AUTH_EMAIL_MAX_LENGTH || !isEmail(normalized, { require_tld: true })) {
    throw new BadRequestException(`${fieldLabel} invalido.`)
  }

  return normalized
}

export function sanitizeEmployeeCodeForLogin(value: string) {
  const sanitized = sanitizePlainText(value, 'Codigo do funcionario', {
    allowEmpty: false,
    rejectFormula: true,
  })
  const normalized = (sanitized ?? '').toUpperCase().replace(/\s+/g, '-')

  if (
    normalized.length > EMPLOYEE_CODE_MAX_LENGTH ||
    normalized.length < 2 ||
    !EMPLOYEE_CODE_PATTERN.test(normalized)
  ) {
    throw new BadRequestException('Codigo do funcionario invalido.')
  }

  return normalized
}

export function normalizeOneTimeCode(value: string | null | undefined, fieldLabel = 'Codigo') {
  const normalized = sanitizePlainText(value, fieldLabel, {
    allowEmpty: false,
    rejectFormula: true,
  })

  if (!ONE_TIME_CODE_PATTERN.test(normalized ?? '')) {
    throw new BadRequestException(`${fieldLabel} invalido ou expirado.`)
  }

  return normalized ?? ''
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
  })

  if (!normalized) {
    throw new BadRequestException('Informe um CEP valido para localizar a empresa com precisao.')
  }

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

export function resolveAuthActorUserId(auth: Pick<AuthContext, 'userId'> & Partial<Pick<AuthContext, 'actorUserId'>>) {
  return auth.actorUserId ?? auth.userId
}
