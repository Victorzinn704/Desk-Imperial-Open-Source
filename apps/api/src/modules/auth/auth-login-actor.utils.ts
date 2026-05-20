import { type Prisma, UserRole, UserStatus } from '@prisma/client'
import type { PrismaService } from '../../database/prisma.service'
import {
  authSessionUserSelect,
  authSessionWorkspaceOwnerSelect,
  hashToken,
  normalizeAuthEmail,
  sanitizeEmployeeCodeForLogin,
} from './auth-shared.util'
import {
  ensureEmployeeLoginUser,
  resolveEmployeePasswordHash,
  type StaffLoginEmployeeRecord,
  type StaffLoginOwnerUser,
} from './auth-staff-login-user.utils'

export {
  buildSyntheticStaffEmail,
  ensureEmployeeLoginUser,
  resolveEmployeePasswordHash,
} from './auth-staff-login-user.utils'

const ownerLoginActorSelect = { ...authSessionUserSelect, passwordHash: true, role: true } as const

type OwnerLoginActorUser = Prisma.UserGetPayload<{ select: typeof ownerLoginActorSelect }>

export async function resolveLoginActor(
  prisma: PrismaService,
  dto: {
    loginMode: string
    email?: string
    companyEmail?: string
    employeeCode?: string
  },
) {
  return dto.loginMode === 'STAFF' ? resolveStaffLoginActor(prisma, dto) : resolveOwnerLoginActor(prisma, dto)
}

async function resolveStaffLoginActor(
  prisma: PrismaService,
  dto: {
    companyEmail?: string
    employeeCode?: string
  },
) {
  const owner = await prisma.user.findFirst({
    where: {
      email: normalizeAuthEmail(dto.companyEmail, 'Email da empresa'),
      companyOwnerId: null,
      role: UserRole.OWNER,
    },
    select: { id: true },
  })

  if (!owner) {
    return null
  }

  const employee = await findActiveEmployeeLoginActor(
    prisma,
    owner.id,
    sanitizeEmployeeCodeForLogin(dto.employeeCode ?? ''),
  )

  if (!employee) {
    return null
  }

  const ownerUser = employee.user
  const passwordHash = resolveEmployeePasswordHash(employee)

  if (!passwordHash || ownerUser.status !== UserStatus.ACTIVE) {
    return null
  }

  const loginUser = await ensureEmployeeLoginUser(prisma, {
    employee: toEmployeeLoginRecord(employee),
    ownerUser,
    fallbackPasswordHash: passwordHash,
  })

  return buildStaffLoginActor({ employee, ownerUser, loginUserId: loginUser.id, passwordHash })
}

async function resolveOwnerLoginActor(
  prisma: PrismaService,
  dto: {
    email?: string
  },
) {
  const user = await prisma.user.findUnique({
    where: { email: normalizeAuthEmail(dto.email) },
    select: ownerLoginActorSelect,
  })

  if (!user) {
    return null
  }

  return buildOwnerLoginActor(user)
}

function buildOwnerLoginActor(user: OwnerLoginActorUser) {
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
    select: ownerLoginActorSelect,
  })

  if (user?.role !== UserRole.OWNER || user.companyOwnerId) {
    return null
  }

  return buildOwnerLoginActor(user)
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

  if (ownerUser.status !== UserStatus.ACTIVE) {
    return null
  }

  const demoPasswordHash = hashToken(`demo-session:${ownerUser.id}:${employee.id}:${employee.employeeCode}`)
  const loginUser = await ensureEmployeeLoginUser(prisma, {
    employee: toEmployeeLoginRecord(employee),
    ownerUser,
    fallbackPasswordHash: resolveEmployeePasswordHash(employee) ?? demoPasswordHash,
  })

  return buildStaffLoginActor({ employee, ownerUser, loginUserId: loginUser.id, passwordHash: demoPasswordHash })
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

type EmployeeLoginActor = NonNullable<Awaited<ReturnType<typeof findActiveEmployeeLoginActor>>>

function toEmployeeLoginRecord(employee: EmployeeLoginActor): StaffLoginEmployeeRecord {
  return {
    id: employee.id,
    active: employee.active,
    displayName: employee.displayName,
    passwordHash: employee.passwordHash,
    loginUser: employee.loginUser,
  }
}

function buildStaffLoginActor(params: {
  employee: EmployeeLoginActor
  ownerUser: StaffLoginOwnerUser
  loginUserId: string
  passwordHash: string
}) {
  const { employee, ownerUser, loginUserId, passwordHash } = params

  return {
    actorUserId: loginUserId,
    sessionUserId: loginUserId,
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
      id: loginUserId,
      fullName: employee.displayName,
      role: UserRole.STAFF,
      companyOwnerId: ownerUser.id,
      email: ownerUser.email,
    },
  }
}
