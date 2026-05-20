import { UserRole, UserStatus } from '@prisma/client'

export type AuthServiceSetupOptions = {
  configOverrides?: Record<string, string | undefined>
}

function makeRateLimitState(lockedUntil: number | null = null) {
  return { count: 1, firstAttemptAt: Date.now(), lockedUntil }
}

export function makeDefaultAuthConfigValues(options: AuthServiceSetupOptions = {}) {
  return {
    NODE_ENV: 'test',
    SESSION_TTL_HOURS: '24',
    PASSWORD_RESET_TTL_MINUTES: '30',
    EMAIL_VERIFICATION_TTL_MINUTES: '15',
    REGISTRATION_GEOCODING_STRICT: 'false',
    REGISTRATION_GEOCODING_TIMEOUT_MS: '1800',
    REGISTRATION_VERIFICATION_DISPATCH_TIMEOUT_MS: '2500',
    PORTFOLIO_EMAIL_FALLBACK: 'true',
    LOGIN_ALERT_EMAILS_ENABLED: 'false',
    FAILED_LOGIN_ALERTS_ENABLED: 'false',
    FAILED_LOGIN_ALERT_THRESHOLD: '3',
    COOKIE_SECURE: 'false',
    COOKIE_SAME_SITE: 'lax',
    CSRF_SECRET: 'csrf-secret-with-32-characters-123',
    COOKIE_SECRET: 'cookie-secret-fallback',
    CONSENT_VERSION: '2026.03',
    DEMO_ACCOUNT_EMAIL: 'demo@deskimperial.online',
    ...options.configOverrides,
  }
}

export function createAuthPrismaMock() {
  return {
    user: createUserModelMock(),
    session: createSessionModelMock(),
    employee: {
      findFirst: jest.fn(),
      update: jest.fn(async () => ({})),
    },
    oneTimeCode: createOneTimeCodeModelMock(),
    $transaction: jest.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
  }
}

function createUserModelMock() {
  return {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'user-new',
      ...data,
      role: data.role ?? UserRole.OWNER,
      status: UserStatus.ACTIVE,
    })),
    upsert: jest.fn(async ({ create }: { create: Record<string, unknown> }) => ({
      id: 'user-staff-1',
      ...create,
    })),
    update: jest.fn(async ({ where, data }: { where?: { id?: string }; data?: Record<string, unknown> }) => ({
      id: where?.id ?? 'user-updated',
      passwordHash: data?.passwordHash ?? '$argon2id$v=19$updated-hash',
      ...data,
    })),
  }
}

function createSessionModelMock() {
  return {
    findUnique: jest.fn(),
    findMany: jest.fn(async (): Promise<Array<Record<string, unknown>>> => []),
    create: jest.fn(async () => ({ id: 'session-created', tokenHash: 'hash-created' })),
    update: jest.fn(async () => ({})),
    updateMany: jest.fn(async () => ({ count: 1 })),
  }
}

function createOneTimeCodeModelMock() {
  return {
    updateMany: jest.fn(async () => ({ count: 0 })),
    create: jest.fn(async () => ({
      id: 'code-1',
      codeHash: 'hash',
      expiresAt: new Date(Date.now() + 15 * 60_000),
    })),
    deleteMany: jest.fn(async () => ({ count: 1 })),
    findFirst: jest.fn(),
    update: jest.fn(async () => ({})),
  }
}

export function createAuthSupportMocks(configValues: Record<string, string | undefined>) {
  return {
    config: { get: jest.fn((key: string) => configValues[key]) },
    consent: {
      recordLegalAcceptances: jest.fn(async () => {}),
      updateCookiePreferences: jest.fn(async () => {}),
      getVersion: jest.fn(() => '2026.03'),
    },
    geocoding: { geocodeAddressLocation: jest.fn(async () => null) },
    mailer: createMailerMock(),
    audit: { record: jest.fn(async () => {}) },
    rateLimit: createAuthRateLimitMock(),
    demo: createDemoAccessMock(),
    cache: createCacheMock(),
    realtimeSessions: { disconnectSessions: jest.fn() },
  }
}

function createMailerMock() {
  return {
    sendPasswordResetEmail: jest.fn(async () => ({ mode: 'email' as const })),
    sendEmailVerificationEmail: jest.fn(async () => ({ mode: 'email' as const })),
    sendPasswordChangedEmail: jest.fn(async () => ({ mode: 'email' as const })),
    sendLoginAlertEmail: jest.fn(async () => ({ mode: 'email' as const })),
    sendFailedLoginAlertEmail: jest.fn(async () => ({ mode: 'email' as const })),
  }
}

function createAuthRateLimitMock() {
  return {
    buildLoginKey: jest.fn((email: string, ip: string) => `rl:login:${email}:${ip}`),
    buildLoginEmailKey: jest.fn((email: string) => `rl:login:email:${email}`),
    buildPasswordResetKey: jest.fn((email: string, ip: string) => `rl:pr:${email}:${ip}`),
    buildPasswordResetEmailKey: jest.fn((email: string) => `rl:pr:email:${email}`),
    buildPasswordResetCodeKey: jest.fn((email: string, ip: string) => `rl:prc:${email}:${ip}`),
    buildPasswordResetCodeEmailKey: jest.fn((email: string) => `rl:prc:email:${email}`),
    buildEmailVerificationKey: jest.fn((email: string, ip: string) => `rl:ev:${email}:${ip}`),
    buildEmailVerificationEmailKey: jest.fn((email: string) => `rl:ev:email:${email}`),
    buildEmailVerificationCodeKey: jest.fn((email: string, ip: string) => `rl:evc:${email}:${ip}`),
    buildEmailVerificationCodeEmailKey: jest.fn((email: string) => `rl:evc:email:${email}`),
    assertLoginAllowed: jest.fn(async () => {}),
    assertPasswordResetAllowed: jest.fn(async () => {}),
    assertPasswordResetCodeAllowed: jest.fn(async () => {}),
    assertEmailVerificationAllowed: jest.fn(async () => {}),
    assertEmailVerificationCodeAllowed: jest.fn(async () => {}),
    recordFailure: jest.fn(async () => makeRateLimitState()),
    recordPasswordResetAttempt: jest.fn(async () => makeRateLimitState()),
    recordPasswordResetCodeAttempt: jest.fn(async () => makeRateLimitState()),
    recordEmailVerificationAttempt: jest.fn(async () => makeRateLimitState()),
    recordEmailVerificationCodeAttempt: jest.fn(async () => makeRateLimitState()),
    clear: jest.fn(async () => {}),
  }
}

function createDemoAccessMock() {
  return {
    isDemoAccount: jest.fn(() => false),
    reserveWindow: jest.fn(async (): Promise<unknown> => null),
    attachGrant: jest.fn(async () => {}),
    closeGrantForSession: jest.fn(async () => {}),
    closeGrantsForUser: jest.fn(async () => {}),
    buildEvaluationAccess: jest.fn(() => null),
    provisionDemoAccess: jest.fn(async () => {}),
  }
}

function createCacheMock() {
  return {
    set: jest.fn(async () => {}),
    get: jest.fn(async (): Promise<unknown> => null),
    del: jest.fn(async () => {}),
    isReady: jest.fn(() => true),
  }
}
