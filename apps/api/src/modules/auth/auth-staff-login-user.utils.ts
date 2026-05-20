import { type CurrencyCode, type Prisma, UserRole, UserStatus } from '@prisma/client'
import type { PrismaService } from '../../database/prisma.service'

export type StaffLoginUserWriter =
  | Pick<PrismaService, 'user' | 'employee'>
  | Pick<Prisma.TransactionClient, 'user' | 'employee'>

export type StaffLoginEmployeeRecord = {
  id: string
  active: boolean
  displayName: string
  passwordHash: string | null
  loginUser: { id: string; passwordHash: string } | null
}

export type StaffLoginOwnerUser = {
  id: string
  companyOwnerId: string | null
  fullName: string
  email: string
  emailVerifiedAt: Date | null
  status: UserStatus
  cookiePreference: { analytics: boolean; marketing: boolean } | null
  companyName: string | null
  companyStreetLine1: string | null
  companyStreetNumber: string | null
  companyAddressComplement: string | null
  companyDistrict: string | null
  companyCity: string | null
  companyState: string | null
  companyPostalCode: string | null
  companyCountry: string | null
  companyLatitude: number | null
  companyLongitude: number | null
  hasEmployees: boolean
  employeeCount: number
  preferredCurrency: CurrencyCode
}

export function resolveEmployeePasswordHash(employee: {
  passwordHash: string | null
  loginUser: { passwordHash: string } | null
}) {
  return employee.passwordHash ?? employee.loginUser?.passwordHash ?? null
}

export function buildSyntheticStaffEmail(employeeId: string) {
  return `staff-${employeeId}@desk-imperial.local`
}

export async function ensureEmployeeLoginUser(
  prisma: StaffLoginUserWriter,
  params: {
    employee: StaffLoginEmployeeRecord
    ownerUser: StaffLoginOwnerUser
    fallbackPasswordHash?: string | null
  },
) {
  const passwordHash = params.fallbackPasswordHash ?? resolveEmployeePasswordHash(params.employee)

  if (!passwordHash) {
    throw new Error(`Employee ${params.employee.id} is missing a password hash for STAFF login actor creation.`)
  }

  const email = buildSyntheticStaffEmail(params.employee.id)
  const sharedData = buildEmployeeLoginUserData({
    employee: params.employee,
    ownerUser: params.ownerUser,
    passwordHash,
  })
  const loginUser = await persistEmployeeLoginUser({ prisma, employee: params.employee, email, sharedData })

  await linkEmployeeLoginUserIfNeeded({ prisma, employee: params.employee, loginUserId: loginUser.id })

  return loginUser
}

function buildEmployeeLoginUserData(params: {
  employee: StaffLoginEmployeeRecord
  ownerUser: StaffLoginOwnerUser
  passwordHash: string
}) {
  const { employee, ownerUser } = params

  return {
    companyOwnerId: ownerUser.id,
    fullName: employee.displayName,
    companyName: ownerUser.companyName,
    companyStreetLine1: ownerUser.companyStreetLine1,
    companyStreetNumber: ownerUser.companyStreetNumber,
    companyAddressComplement: ownerUser.companyAddressComplement,
    companyDistrict: ownerUser.companyDistrict,
    companyCity: ownerUser.companyCity,
    companyState: ownerUser.companyState,
    companyPostalCode: ownerUser.companyPostalCode,
    companyCountry: ownerUser.companyCountry,
    companyLatitude: ownerUser.companyLatitude,
    companyLongitude: ownerUser.companyLongitude,
    hasEmployees: ownerUser.hasEmployees,
    employeeCount: ownerUser.employeeCount,
    role: UserRole.STAFF,
    passwordHash: params.passwordHash,
    status: employee.active ? UserStatus.ACTIVE : UserStatus.DISABLED,
    preferredCurrency: ownerUser.preferredCurrency,
    emailVerifiedAt: ownerUser.emailVerifiedAt,
  }
}

async function persistEmployeeLoginUser(params: {
  prisma: StaffLoginUserWriter
  employee: StaffLoginEmployeeRecord
  email: string
  sharedData: ReturnType<typeof buildEmployeeLoginUserData>
}) {
  const select = { id: true, passwordHash: true } as const

  if (params.employee.loginUser?.id) {
    return params.prisma.user.update({
      where: { id: params.employee.loginUser.id },
      data: {
        email: params.email,
        ...params.sharedData,
      },
      select,
    })
  }

  return params.prisma.user.upsert({
    where: { email: params.email },
    update: params.sharedData,
    create: {
      email: params.email,
      ...params.sharedData,
    },
    select,
  })
}

async function linkEmployeeLoginUserIfNeeded(params: {
  prisma: StaffLoginUserWriter
  employee: StaffLoginEmployeeRecord
  loginUserId: string
}) {
  if (params.employee.loginUser?.id === params.loginUserId) {
    return
  }

  await params.prisma.employee.update({
    where: { id: params.employee.id },
    data: { loginUserId: params.loginUserId },
  })
}
