import { UserStatus, UserRole } from '@prisma/client'
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

    return {
      actorUserId: legacyLoginUser?.id ?? ownerUser.id,
      sessionUserId: legacyLoginUser?.id ?? null,
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

  if (!user || user.role !== UserRole.OWNER || user.companyOwnerId) {
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

  return {
    actorUserId: legacyLoginUser?.id ?? ownerUser.id,
    sessionUserId: legacyLoginUser?.id ?? null,
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
