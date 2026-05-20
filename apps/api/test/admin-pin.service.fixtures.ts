import type { ConfigService } from '@nestjs/config'
import { createHash } from 'node:crypto'
import { AdminPinService } from '../src/modules/admin-pin/admin-pin.service'
import type { CacheService } from '../src/common/services/cache.service'
import type { PrismaService } from '../src/database/prisma.service'

export const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}

export const mockConfigService = {
  get: jest.fn(),
}

export const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  isReady: jest.fn(),
  ratelimitKey: jest.fn(),
}

export function createAdminPinService() {
  return new AdminPinService(
    mockPrisma as unknown as PrismaService,
    mockConfigService as unknown as ConfigService,
    mockCache as unknown as CacheService,
  )
}

export function resetAdminPinTestDoubles() {
  jest.clearAllMocks()
  mockCache.isReady.mockReturnValue(true)
  mockCache.ratelimitKey.mockImplementation((prefix: string, key: string) => `ratelimit:${prefix}:${key}`)
  mockPrisma.user.findUnique.mockResolvedValue(makeUser())
}

export function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'user-1',
    email: 'owner@empresa.com',
    adminPinHash: '$argon2id$v=19$m=65536,t=3,p=4$mockedhash',
    ...overrides,
  }
}

export function makePinFingerprint() {
  return createHash('sha256').update(makeUser().adminPinHash).digest('base64url')
}

export function buildVerificationProof(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    challengeId: 'challenge-123',
    workspaceOwnerUserId: 'user-1',
    sessionId: 'session-1',
    verifiedByUserId: 'user-1',
    pinFingerprint: makePinFingerprint(),
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    ...overrides,
  }
}
