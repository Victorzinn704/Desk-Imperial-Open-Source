import { type CurrencyCode, UserRole, type UserStatus } from '@prisma/client'
import type { AuthContext } from './auth.types'

type AuthUserSource = {
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
}

type ToAuthUserOptions = {
  sessionId?: string
  actorUserId?: string | null
  analytics: boolean
  marketing: boolean
  evaluationAccess: AuthContext['evaluationAccess']
  employeeId?: string | null
  employeeCode?: string | null
}

type AuthUserMappingInput = {
  user: AuthUserSource
  options: ToAuthUserOptions
}

export function toAuthUser(user: AuthUserSource, options: ToAuthUserOptions): AuthContext {
  const role = user.role ?? UserRole.OWNER
  const employee = resolveEmployeeIdentity({ user, options })

  return {
    userId: user.id,
    actorUserId: options.actorUserId ?? user.id,
    sessionId: options.sessionId ?? '',
    role,
    workspaceOwnerUserId: resolveWorkspaceOwnerUserId(user, role),
    companyOwnerUserId: user.companyOwnerId,
    employeeId: employee.employeeId,
    employeeCode: employee.employeeCode,
    email: user.email,
    fullName: user.fullName,
    companyName: user.companyName,
    companyLocation: toCompanyLocation(user),
    workforce: toWorkforce(user),
    emailVerified: Boolean(user.emailVerifiedAt),
    preferredCurrency: user.preferredCurrency,
    status: user.status,
    evaluationAccess: options.evaluationAccess,
    cookiePreferences: toCookiePreferences(options),
  }
}

function resolveWorkspaceOwnerUserId(user: AuthUserSource, role: UserRole) {
  if (role === UserRole.STAFF) {
    return user.companyOwnerId ?? user.id
  }

  return user.id
}

function resolveEmployeeIdentity({ user, options }: AuthUserMappingInput) {
  return {
    employeeId: options.employeeId ?? user.employeeAccount?.id ?? null,
    employeeCode: options.employeeCode ?? user.employeeAccount?.employeeCode ?? null,
  }
}

function toCompanyLocation(user: AuthUserSource): AuthContext['companyLocation'] {
  return {
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
    precision: hasPreciseCompanyLocation(user) ? 'address' : 'city',
  }
}

function hasPreciseCompanyLocation(user: AuthUserSource) {
  return user.companyLatitude != null && user.companyLongitude != null
}

function toWorkforce(user: AuthUserSource): AuthContext['workforce'] {
  return {
    hasEmployees: user.hasEmployees ?? false,
    employeeCount: user.employeeCount ?? 0,
  }
}

function toCookiePreferences(options: ToAuthUserOptions): AuthContext['cookiePreferences'] {
  return {
    necessary: true,
    analytics: options.analytics,
    marketing: options.marketing,
  }
}
