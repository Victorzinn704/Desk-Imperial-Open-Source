import { type Prisma, UserStatus, UserRole } from '@prisma/client'
import type { PrismaService } from '../../database/prisma.service'
import {
  authSessionUserSelect,
  authSessionWorkspaceOwnerSelect,
  hashToken,
  sanitizeEmployeeCodeForLogin,
  normalizeEmail,
} from './auth-shared.util'

export async function resolveLoginActor(
  prisma: PrismaService,
  dto: {
    loginMode: string
    email?: string
    companyEmail?: string
    employeeCode?: string
  },
) {
  if (dto.loginMode === 'STAFF') {
    const companyEmail = normalizeEmail(dto.companyEmail ?? '')
    const employeeCode = sanitizeEmployeeCodeForLogin(dto.employeeCode ?? '')

    const owner = await prisma.user.findFirst({
      where: { email: companyEmail, companyOwnerId: null, role: UserRole.OWNER },
      select: { id: true },
    })

    if (!owner) {
      return null
    }

    const employee = await findActiveEmployeeLoginActor(prisma, owner.id, employeeCode)

    if (!employee) {
      return null
    }

    const ownerUser = employee.user
    const legacyLoginUser = employee.loginUser
    const passwordHash = resolveEmployeePasswordHash(employee)

    if (!passwordHash || ownerUser.status !== UserStatus.ACTIVE) {
      return null
    }

    const loginUser = await ensureEmployeeLoginUser(prisma, {
      employee: {
        id: employee.id,
        active: employee.active,
        displayName: employee.displayName,
        passwordHash: employee.passwordHash,
        loginUser: legacyLoginUser,
      },
      ownerUser,
      fallbackPasswordHash: passwordHash,
    })

    return {
      actorUserId: loginUser.id,
      sessionUserId: loginUser.id,
      workspaceOwnerUserId: ownerUser.id,
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      passwordHash,
      status: employee.active ? UserStatus.ACTIVE : UserStatus.DISABLED,
      emailVerifiedAt: ownerUser.emailVerifiedAt,
      fullName: employee.displayName,
      cookiePreference: ownerUser.cookiePreference,
      ownerUser,
      authUser: {
        ...ownerUser,
        id: loginUser.id,
        fullName: employee.displayName,
        role: UserRole.STAFF,
        companyOwnerId: ownerUser.id,
        email: ownerUser.email,
      },
    }
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(dto.email ?? '') },
    select: { ...authSessionUserSelect, passwordHash: true, role: true },
  })

  if (!user) {
    return null
  }

  return {
    actorUserId: user.id,
    sessionUserId: user.id,
    workspaceOwnerUserId: user.id,
    employeeId: user.employeeAccount?.id ?? null,
    employeeCode: user.employeeAccount?.employeeCode ?? null,
    passwordHash: user.passwordHash,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    fullName: user.fullName,
    cookiePreference: user.cookiePreference,
    ownerUser: user,
    authUser: user,
  }
}

export async function resolveDemoOwnerActor(prisma: PrismaService, demoEmail: string) {
  const user = await prisma.user.findUnique({
    where: { email: demoEmail },
    select: { ...authSessionUserSelect, passwordHash: true, role: true },
  })

  if (user?.role !== UserRole.OWNER || user.companyOwnerId) {
    return null
  }

  return {
    actorUserId: user.id,
    sessionUserId: user.id,
    workspaceOwnerUserId: user.id,
    employeeId: user.employeeAccount?.id ?? null,
    employeeCode: user.employeeAccount?.employeeCode ?? null,
    passwordHash: user.passwordHash,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    fullName: user.fullName,
    cookiePreference: user.cookiePreference,
    ownerUser: user,
    authUser: user,
  }
}

export async function resolveDemoStaffActor(prisma: PrismaService, demoEmail: string, employeeCode?: string) {
  const owner = await prisma.user.findFirst({
    where: { email: demoEmail, companyOwnerId: null, role: UserRole.OWNER },
    select: { id: true },
  })

  if (!owner) {
    return null
  }

  const safeEmployeeCode = sanitizeEmployeeCodeForLogin(employeeCode ?? 'VD-001')
  const employee = await findActiveEmployeeLoginActor(prisma, owner.id, safeEmployeeCode)

  if (!employee) {
    return null
  }

  const ownerUser = employee.user
  const legacyLoginUser = employee.loginUser

  if (ownerUser.status !== UserStatus.ACTIVE) {
    return null
  }

  const loginUser = await ensureEmployeeLoginUser(prisma, {
    employee: {
      id: employee.id,
      active: employee.active,
      displayName: employee.displayName,
      passwordHash: employee.passwordHash,
      loginUser: legacyLoginUser,
    },
    ownerUser,
    fallbackPasswordHash:
      resolveEmployeePasswordHash(employee) ??
      hashToken(`demo-session:${ownerUser.id}:${employee.id}:${employee.employeeCode}`),
  })

  return {
    actorUserId: loginUser.id,
    sessionUserId: loginUser.id,
    workspaceOwnerUserId: ownerUser.id,
    employeeId: employee.id,
    employeeCode: employee.employeeCode,
    passwordHash: hashToken(`demo-session:${ownerUser.id}:${employee.id}:${employee.employeeCode}`),
    status: employee.active ? UserStatus.ACTIVE : UserStatus.DISABLED,
    emailVerifiedAt: ownerUser.emailVerifiedAt,
    fullName: employee.displayName,
    cookiePreference: ownerUser.cookiePreference,
    ownerUser,
    authUser: {
      ...ownerUser,
      id: loginUser.id,
      fullName: employee.displayName,
      role: UserRole.STAFF,
      companyOwnerId: ownerUser.id,
      email: ownerUser.email,
    },
  }
}

export function findActiveEmployeeLoginActor(prisma: PrismaService, ownerUserId: string, employeeCode: string) {
  return prisma.employee.findFirst({
    where: { userId: ownerUserId, employeeCode, active: true },
    select: {
      id: true,
      active: true,
      employeeCode: true,
      displayName: true,
      passwordHash: true,
      user: { select: authSessionWorkspaceOwnerSelect },
      loginUser: { select: { id: true, passwordHash: true } },
    },
  })
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

type EmployeeLoginActorUser =
  Awaited<ReturnType<typeof findActiveEmployeeLoginActor>> extends infer T
    ? T extends { user: infer U }
      ? U
      : never
    : never

type EmployeeLoginActorRecord =
  Awaited<ReturnType<typeof findActiveEmployeeLoginActor>> extends infer T
    ? T extends {
        id: string
        active: boolean
        displayName: string
        passwordHash: string | null
        loginUser: infer L
      }
      ? {
          id: string
          active: boolean
          displayName: string
          passwordHash: string | null
          loginUser: L
        }
      : never
    : never

type StaffLoginUserWriter =
  | Pick<PrismaService, 'user' | 'employee'>
  | Pick<Prisma.TransactionClient, 'user' | 'employee'>

export async function ensureEmployeeLoginUser(
  prisma: StaffLoginUserWriter,
  params: {
    employee: EmployeeLoginActorRecord
    ownerUser: EmployeeLoginActorUser
    fallbackPasswordHash?: string | null
  },
) {
  const passwordHash = params.fallbackPasswordHash ?? resolveEmployeePasswordHash(params.employee)

  if (!passwordHash) {
    throw new Error(`Employee ${params.employee.id} is missing a password hash for STAFF login actor creation.`)
  }

  const email = buildSyntheticStaffEmail(params.employee.id)
  const sharedData = {
    companyOwnerId: params.ownerUser.id,
    fullName: params.employee.displayName,
    companyName: params.ownerUser.companyName,
    companyStreetLine1: params.ownerUser.companyStreetLine1,
    companyStreetNumber: params.ownerUser.companyStreetNumber,
    companyAddressComplement: params.ownerUser.companyAddressComplement,
    companyDistrict: params.ownerUser.companyDistrict,
    companyCity: params.ownerUser.companyCity,
    companyState: params.ownerUser.companyState,
    companyPostalCode: params.ownerUser.companyPostalCode,
    companyCountry: params.ownerUser.companyCountry,
    companyLatitude: params.ownerUser.companyLatitude,
    companyLongitude: params.ownerUser.companyLongitude,
    hasEmployees: params.ownerUser.hasEmployees,
    employeeCount: params.ownerUser.employeeCount,
    role: UserRole.STAFF,
    passwordHash,
    status: params.employee.active ? UserStatus.ACTIVE : UserStatus.DISABLED,
    preferredCurrency: params.ownerUser.preferredCurrency,
    emailVerifiedAt: params.ownerUser.emailVerifiedAt,
  }

  const loginUser = params.employee.loginUser?.id
    ? await prisma.user.update({
        where: { id: params.employee.loginUser.id },
        data: {
          email,
          ...sharedData,
        },
        select: {
          id: true,
          passwordHash: true,
        },
      })
    : await prisma.user.upsert({
        where: { email },
        update: sharedData,
        create: {
          email,
          ...sharedData,
        },
        select: {
          id: true,
          passwordHash: true,
        },
      })

  if (params.employee.loginUser?.id !== loginUser.id) {
    await prisma.employee.update({
      where: { id: params.employee.id },
      data: { loginUserId: loginUser.id },
    })
  }

  return loginUser
}
