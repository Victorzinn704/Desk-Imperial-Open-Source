import type { ConfigService } from '@nestjs/config'
import { UserStatus } from '@prisma/client'
import * as argon2 from 'argon2'
import { AuthEmailVerificationService } from '../../src/modules/auth/auth-email-verification.service'
import { AuthLoginService } from '../../src/modules/auth/auth-login.service'
import { AuthPasswordService } from '../../src/modules/auth/auth-password.service'
import { AuthRegistrationPolicyService } from '../../src/modules/auth/auth-registration-policy.service'
import { AuthRegistrationSideEffectsService } from '../../src/modules/auth/auth-registration-side-effects.service'
import { AuthRegistrationService } from '../../src/modules/auth/auth-registration.service'
import { AuthSessionService } from '../../src/modules/auth/auth-session.service'
import { AuthService } from '../../src/modules/auth/auth.service'
import { LoginModeDto } from '../../src/modules/auth/dto/login.dto'
import {
  type AuthServiceSetupOptions,
  createAuthPrismaMock,
  createAuthSupportMocks,
  makeDefaultAuthConfigValues,
} from './auth-service-test-mocks'
import { AUTH_TEST_EMAILS, makeOwnerUser, STAFF_EMPLOYEE_CODE, STAFF_PASSWORD } from './auth-service-test-fixtures'
import { makeRequestContext } from './request-context.factory'

export {
  AUTH_TEST_EMAILS,
  INVALID_EMAIL_CODE,
  STAFF_EMPLOYEE_CODE,
  STAFF_PASSWORD,
  VALID_EMAIL_CODE,
  makeOwnerUser,
} from './auth-service-test-fixtures'

jest.mock('argon2', () => ({
  __esModule: true,
  default: {
    hash: jest.fn(async () => 'hashed-password-new'),
    verify: jest.fn(async () => false),
    argon2id: 2,
  },
  hash: jest.fn(async () => 'hashed-password-new'),
  verify: jest.fn(async () => false),
  argon2id: 2,
}))

export const mockArgon2Hash = argon2.hash as jest.Mock
export const mockArgon2Verify = argon2.verify as jest.Mock

export function createAuthServiceSetup(options: AuthServiceSetupOptions = {}) {
  const prisma = createAuthPrismaMock()
  const support = createAuthSupportMocks(makeDefaultAuthConfigValues(options))
  const services = createAuthServiceInstances(prisma, support)

  return {
    service: services.service,
    prisma,
    config: support.config,
    mailer: support.mailer,
    audit: support.audit,
    rateLimit: support.rateLimit,
    demo: support.demo,
    cache: support.cache,
    sessionService: services.sessionService,
    passwordService: services.passwordService,
    emailVerificationService: services.emailVerificationService,
  }
}

type AuthPrismaMock = ReturnType<typeof createAuthPrismaMock>
type AuthSupportMocks = ReturnType<typeof createAuthSupportMocks>

function createAuthServiceInstances(prisma: AuthPrismaMock, support: AuthSupportMocks) {
  const sessionService = createSessionService(prisma, support)
  const emailVerificationService = createEmailVerificationService(prisma, support)
  const registrationService = createRegistrationService(prisma, support, emailVerificationService)
  const passwordService = createPasswordService(prisma, support, sessionService)
  const loginService = createLoginService(prisma, support, sessionService, emailVerificationService)
  const service = createAuthFacade(prisma, support, {
    sessionService,
    registrationService,
    loginService,
    passwordService,
    emailVerificationService,
  })

  return { service, sessionService, passwordService, emailVerificationService }
}

function createSessionService(prisma: AuthPrismaMock, support: AuthSupportMocks) {
  return new AuthSessionService(
    prisma as never,
    support.config as unknown as ConfigService,
    support.demo as never,
    support.realtimeSessions as never,
    support.cache as never,
  )
}

function createEmailVerificationService(prisma: AuthPrismaMock, support: AuthSupportMocks) {
  return new AuthEmailVerificationService(
    prisma as never,
    support.config as unknown as ConfigService,
    support.mailer as never,
    support.audit as never,
    support.rateLimit as never,
  )
}

function createRegistrationService(
  prisma: AuthPrismaMock,
  support: AuthSupportMocks,
  emailVerificationService: AuthEmailVerificationService,
) {
  const registrationPolicy = new AuthRegistrationPolicyService(support.config as unknown as ConfigService)
  const registrationSideEffects = new AuthRegistrationSideEffectsService(
    support.consent as never,
    support.audit as never,
    emailVerificationService,
    registrationPolicy,
  )

  return new AuthRegistrationService(
    prisma as never,
    support.geocoding as never,
    registrationPolicy,
    registrationSideEffects,
  )
}

function createPasswordService(prisma: AuthPrismaMock, support: AuthSupportMocks, sessionService: AuthSessionService) {
  return new AuthPasswordService(
    prisma as never,
    support.config as unknown as ConfigService,
    support.mailer as never,
    support.audit as never,
    support.rateLimit as never,
    sessionService,
    support.demo as never,
  )
}

function createLoginService(
  prisma: AuthPrismaMock,
  support: AuthSupportMocks,
  sessionService: AuthSessionService,
  emailVerificationService: AuthEmailVerificationService,
) {
  return new AuthLoginService(
    prisma as never,
    support.config as unknown as ConfigService,
    support.mailer as never,
    support.audit as never,
    support.rateLimit as never,
    support.demo as never,
    sessionService,
    emailVerificationService,
  )
}

function createAuthFacade(
  prisma: AuthPrismaMock,
  support: AuthSupportMocks,
  services: {
    sessionService: AuthSessionService
    registrationService: AuthRegistrationService
    loginService: AuthLoginService
    passwordService: AuthPasswordService
    emailVerificationService: AuthEmailVerificationService
  },
) {
  return new AuthService(
    prisma as never,
    support.config as unknown as ConfigService,
    support.mailer as never,
    support.audit as never,
    support.rateLimit as never,
    support.demo as never,
    services.sessionService,
    services.registrationService,
    services.loginService,
    services.passwordService,
    services.emailVerificationService,
  )
}

export type AuthCoverageSetup = ReturnType<typeof createAuthServiceSetup>

export function mockOwnerUserLookup(setup: AuthCoverageSetup, overrides: Record<string, unknown> = {}) {
  setup.prisma.user.findUnique.mockResolvedValue(makeOwnerUser(overrides))
}

export function mockActiveUnverifiedOwner(setup: AuthCoverageSetup, overrides: Record<string, unknown> = {}) {
  mockOwnerUserLookup(setup, {
    id: 'user-1',
    email: AUTH_TEST_EMAILS.owner,
    emailVerifiedAt: null,
    status: UserStatus.ACTIVE,
    ...overrides,
  })
}

export function mockInactiveUserLookup(input: { setup: AuthCoverageSetup; email?: string }) {
  mockOwnerUserLookup(input.setup, {
    id: 'user-disabled',
    fullName: 'Disabled User',
    email: input.email ?? AUTH_TEST_EMAILS.disabled,
    status: UserStatus.DISABLED,
  })
}

export function mockMissingOneTimeCode(setup: AuthCoverageSetup) {
  setup.prisma.oneTimeCode.findFirst.mockResolvedValue(null)
}

export function mockEmailVerificationAttempt(input: { setup: AuthCoverageSetup; lockedUntil: number | null }) {
  input.setup.rateLimit.recordEmailVerificationCodeAttempt.mockResolvedValue({
    count: input.lockedUntil ? 5 : 2,
    firstAttemptAt: Date.now(),
    lockedUntil: input.lockedUntil,
  })
}

export function makeStaffLoginDto(overrides: Record<string, unknown> = {}) {
  return {
    loginMode: LoginModeDto.STAFF,
    email: AUTH_TEST_EMAILS.owner,
    companyEmail: AUTH_TEST_EMAILS.owner,
    employeeCode: STAFF_EMPLOYEE_CODE,
    password: STAFF_PASSWORD,
    ...overrides,
  }
}

export function serviceLogin(setup: AuthCoverageSetup, dto: Record<string, unknown>) {
  return setup.service.login(dto as never, {} as never, makeRequestContext())
}

export async function expectStaffLoginRejected(setup: AuthCoverageSetup, overrides: Record<string, unknown> = {}) {
  await expect(serviceLogin(setup, makeStaffLoginDto(overrides))).rejects.toBeDefined()
}
