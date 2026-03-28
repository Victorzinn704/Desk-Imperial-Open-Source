/**
 * @file admin-pin.service.spec.ts
 * @module AdminPin
 *
 * Testes unitários do AdminPinService — módulo de PIN administrativo para operações sensíveis.
 *
 * Estratégia de teste:
 * - Todos os colaboradores externos (Prisma, Cache, argon2) são mockados
 * - Cada `describe` cobre um cenário de negócio completo com happy path + casos de borda
 * - Foco em segurança: hash, rate limiting, challenge-response, JWT
 *
 * Cobertura garantida:
 *   ✅ setupPin() — criação e alteração de PIN
 *   ✅ removePin() — remoção de PIN
 *   ✅ hasPinConfigured() — verificação de existência
 *   ✅ issueVerificationChallenge() — emissão de token de verificação
 *   ✅ validateVerificationProof() — validação de token
 *   ✅ Rate limiting de tentativas
 *   ✅ Lockout após 3 falhas
 */

import {
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { AdminPinService } from '../src/modules/admin-pin/admin-pin.service'
import type { PrismaService } from '../src/database/prisma.service'
import type { ConfigService } from '@nestjs/config'
import type { CacheService } from '../src/common/services/cache.service'
import * as argon2 from 'argon2'
import { createHash } from 'node:crypto'
import { makeAuthContext } from './helpers/auth-context.factory'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}

const mockConfigService = {
  get: jest.fn(),
}

const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  isReady: jest.fn(),
  ratelimitKey: jest.fn(),
}

// Mock do argon2
jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
  argon2id: 2,
}))

function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'user-1',
    email: 'owner@empresa.com',
    adminPinHash: '$argon2id$v=19$m=65536,t=3,p=4$mockedhash',
    ...overrides,
  }
}

// ── Setup ─────────────────────────────────────────────────────────────────────

let adminPinService: AdminPinService
let mockAuthContext: ReturnType<typeof makeAuthContext>

beforeEach(() => {
  jest.clearAllMocks()

  adminPinService = new AdminPinService(
    mockPrisma as unknown as PrismaService,
    mockConfigService as unknown as ConfigService,
    mockCache as unknown as CacheService,
  )

  mockAuthContext = makeAuthContext({
    userId: 'user-1',
    workspaceOwnerUserId: 'user-1',
  })

  // Defaults
  mockCache.isReady.mockReturnValue(true)
  mockCache.ratelimitKey.mockImplementation((prefix: string, key: string) => `ratelimit:${prefix}:${key}`)
  mockPrisma.user.findUnique.mockResolvedValue(makeUser())
})

function makePinFingerprint() {
  return createHash('sha256').update(makeUser().adminPinHash).digest('base64url')
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AdminPinService', () => {
  describe('setupPin', () => {
    it('deve configurar PIN quando usuário não tem PIN', async () => {
      const userWithoutPin = makeUser({ adminPinHash: null })
      mockPrisma.user.findUnique.mockResolvedValue(userWithoutPin)
      mockPrisma.user.update.mockResolvedValue({})
      ;(argon2.hash as jest.Mock).mockResolvedValue('$argon2id$hashed')

      await adminPinService.setupPin('user-1', '1234')

      expect(argon2.hash).toHaveBeenCalledWith('1234', { type: argon2.argon2id })
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { adminPinHash: '$argon2id$hashed' },
      })
    })

    it('deve alterar PIN quando usuário já tem PIN e fornece PIN atual', async () => {
      const userWithPin = makeUser()
      mockPrisma.user.findUnique.mockResolvedValue(userWithPin)
      mockPrisma.user.update.mockResolvedValue({})
      ;(argon2.verify as jest.Mock).mockResolvedValue(true)
      ;(argon2.hash as jest.Mock).mockResolvedValue('$argon2id$newhash')

      await adminPinService.setupPin('user-1', '5678', '1234')

      expect(argon2.verify).toHaveBeenCalledWith('$argon2id$v=19$m=65536,t=3,p=4$mockedhash', '1234')
      expect(argon2.hash).toHaveBeenCalledWith('5678', { type: argon2.argon2id })
    })

    it('deve rejeitar alteração de PIN sem fornecer PIN atual', async () => {
      const userWithPin = makeUser()
      mockPrisma.user.findUnique.mockResolvedValue(userWithPin)

      await expect(adminPinService.setupPin('user-1', '5678')).rejects.toThrow(ForbiddenException)
      await expect(adminPinService.setupPin('user-1', '5678')).rejects.toThrow('PIN atual é necessário')
    })

    it('deve rejeitar alteração de PIN com PIN atual incorreto', async () => {
      const userWithPin = makeUser()
      mockPrisma.user.findUnique.mockResolvedValue(userWithPin)
      ;(argon2.verify as jest.Mock).mockResolvedValue(false)

      await expect(adminPinService.setupPin('user-1', '5678', 'wrong')).rejects.toThrow(UnauthorizedException)
      await expect(adminPinService.setupPin('user-1', '5678', 'wrong')).rejects.toThrow('PIN atual incorreto')
    })

    it('deve rejeitar setup para usuário inexistente', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(adminPinService.setupPin('user-inexistente', '1234')).rejects.toThrow(UnauthorizedException)
      await expect(adminPinService.setupPin('user-inexistente', '1234')).rejects.toThrow('Usuário não encontrado')
    })
  })

  describe('removePin', () => {
    it('deve remover PIN quando PIN está configurado e válido', async () => {
      const userWithPin = makeUser()
      mockPrisma.user.findUnique.mockResolvedValue(userWithPin)
      mockPrisma.user.update.mockResolvedValue({})
      ;(argon2.verify as jest.Mock).mockResolvedValue(true)

      await adminPinService.removePin('user-1', '1234')

      expect(argon2.verify).toHaveBeenCalledWith('$argon2id$v=19$m=65536,t=3,p=4$mockedhash', '1234')
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { adminPinHash: null },
      })
    })

    it('deve rejeitar remoção quando usuário não tem PIN', async () => {
      const userWithoutPin = makeUser({ adminPinHash: null })
      mockPrisma.user.findUnique.mockResolvedValue(userWithoutPin)

      await expect(adminPinService.removePin('user-1', '1234')).rejects.toThrow(NotFoundException)
      await expect(adminPinService.removePin('user-1', '1234')).rejects.toThrow('Nenhum PIN configurado')
    })

    it('deve rejeitar remoção com PIN inválido', async () => {
      const userWithPin = makeUser()
      mockPrisma.user.findUnique.mockResolvedValue(userWithPin)
      ;(argon2.verify as jest.Mock).mockResolvedValue(false)

      await expect(adminPinService.removePin('user-1', 'wrong')).rejects.toThrow(UnauthorizedException)
      await expect(adminPinService.removePin('user-1', 'wrong')).rejects.toThrow('PIN inválido')
    })

    it('deve rejeitar remoção para usuário inexistente', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(adminPinService.removePin('user-inexistente', '1234')).rejects.toThrow(NotFoundException)
    })
  })

  describe('hasPinConfigured', () => {
    it('deve retornar true quando usuário tem PIN', async () => {
      const userWithPin = makeUser()
      mockPrisma.user.findUnique.mockResolvedValue(userWithPin)

      const result = await adminPinService.hasPinConfigured('user-1')

      expect(result).toBe(true)
    })

    it('deve retornar false quando usuário não tem PIN', async () => {
      const userWithoutPin = makeUser({ adminPinHash: null })
      mockPrisma.user.findUnique.mockResolvedValue(userWithoutPin)

      const result = await adminPinService.hasPinConfigured('user-1')

      expect(result).toBe(false)
    })

    it('deve retornar false para usuário inexistente', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await adminPinService.hasPinConfigured('user-inexistente')

      expect(result).toBe(false)
    })
  })

  describe('issueVerificationChallenge', () => {
    it('deve emitir challenge quando PIN é válido', async () => {
      const userWithPin = makeUser()
      mockPrisma.user.findUnique.mockResolvedValue(userWithPin)
      ;(argon2.verify as jest.Mock).mockResolvedValue(true)
      mockCache.set.mockResolvedValue(undefined)

      const result = await adminPinService.issueVerificationChallenge(mockAuthContext, '1234')

      expect(argon2.verify).toHaveBeenCalled()
      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('admin-pin-proof:'),
        expect.objectContaining({
          challengeId: expect.any(String),
          workspaceOwnerUserId: 'user-1',
          sessionId: 'session-1',
        }),
        expect.any(Number),
      )
      expect(result.challengeId).toBeDefined()
    })

    it('deve rejeitar quando sessão é inválida', async () => {
      const invalidAuth = makeAuthContext({ sessionId: undefined as any })

      await expect(adminPinService.issueVerificationChallenge(invalidAuth, '1234')).rejects.toThrow(ForbiddenException)
      await expect(adminPinService.issueVerificationChallenge(invalidAuth, '1234')).rejects.toThrow('Sessão inválida')
    })

    it('deve rejeitar quando Redis não está disponível', async () => {
      mockCache.isReady.mockReturnValue(false)
      const userWithPin = makeUser()
      mockPrisma.user.findUnique.mockResolvedValue(userWithPin)

      await expect(adminPinService.issueVerificationChallenge(mockAuthContext, '1234')).rejects.toThrow(
        ServiceUnavailableException,
      )
      await expect(adminPinService.issueVerificationChallenge(mockAuthContext, '1234')).rejects.toThrow(
        'Redis indisponível',
      )
    })

    it('deve rejeitar quando usuário não tem PIN configurado', async () => {
      const userWithoutPin = makeUser({ adminPinHash: null })
      mockPrisma.user.findUnique.mockResolvedValue(userWithoutPin)

      await expect(adminPinService.issueVerificationChallenge(mockAuthContext, '1234')).rejects.toThrow(
        NotFoundException,
      )
      await expect(adminPinService.issueVerificationChallenge(mockAuthContext, '1234')).rejects.toThrow(
        'Nenhum PIN configurado',
      )
    })

    it('deve rejeitar quando PIN é inválido', async () => {
      const userWithPin = makeUser()
      mockPrisma.user.findUnique.mockResolvedValue(userWithPin)
      ;(argon2.verify as jest.Mock).mockResolvedValue(false)

      await expect(adminPinService.issueVerificationChallenge(mockAuthContext, 'wrong')).rejects.toThrow(
        UnauthorizedException,
      )
      await expect(adminPinService.issueVerificationChallenge(mockAuthContext, 'wrong')).rejects.toThrow('PIN inválido')
    })

    it('deve registrar falha de tentativa e aplicar rate limiting', async () => {
      const userWithPin = makeUser()
      mockPrisma.user.findUnique.mockResolvedValue(userWithPin)
      ;(argon2.verify as jest.Mock).mockResolvedValue(false)
      mockCache.get.mockResolvedValue({
        count: 2,
        firstAttemptAt: Date.now(),
        lockedUntil: null,
      })
      mockCache.set.mockResolvedValue(undefined)

      await expect(adminPinService.issueVerificationChallenge(mockAuthContext, 'wrong')).rejects.toThrow(
        UnauthorizedException,
      )

      expect(mockCache.set).toHaveBeenCalledWith(
        'ratelimit:admin-pin:user-1:session-1:user-1',
        expect.objectContaining({
          count: 3,
        }),
        expect.any(Number),
      )
    })

    it('deve bloquear após 3 tentativas falhas', async () => {
      mockCache.get.mockResolvedValue({
        count: 3,
        firstAttemptAt: Date.now(),
        lockedUntil: Date.now() + 5 * 60 * 1000, // 5 minutos
      })

      await expect(adminPinService.issueVerificationChallenge(mockAuthContext, '1234')).rejects.toThrow(
        'Muitas tentativas',
      )
    })
  })

  describe('validateVerificationProof', () => {
    it('deve retornar true quando proof é válido', async () => {
      mockCache.get.mockResolvedValue({
        challengeId: 'challenge-123',
        workspaceOwnerUserId: 'user-1',
        sessionId: 'session-1',
        verifiedByUserId: 'user-1',
        pinFingerprint: makePinFingerprint(),
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      })

      const result = await adminPinService.validateVerificationProof(mockAuthContext, 'challenge-123')

      expect(result).toBe(true)
    })

    it('deve retornar false quando proof é inexistente', async () => {
      mockCache.get.mockResolvedValue(null)

      const result = await adminPinService.validateVerificationProof(mockAuthContext, 'invalid')

      expect(result).toBe(false)
    })

    it('deve retornar false quando proof expirou', async () => {
      mockCache.get.mockResolvedValue({
        challengeId: 'challenge-123',
        workspaceOwnerUserId: 'user-1',
        sessionId: 'session-1',
        verifiedByUserId: 'user-1',
        pinFingerprint: makePinFingerprint(),
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString(), // Expirado
      })

      const result = await adminPinService.validateVerificationProof(mockAuthContext, 'challenge-123')

      expect(result).toBe(false)
    })

    it('deve retornar false quando sessionId não corresponde', async () => {
      mockCache.get.mockResolvedValue({
        challengeId: 'challenge-123',
        workspaceOwnerUserId: 'user-1',
        sessionId: 'session-different',
        verifiedByUserId: 'user-1',
        pinFingerprint: makePinFingerprint(),
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      })

      const result = await adminPinService.validateVerificationProof(mockAuthContext, 'challenge-123')

      expect(result).toBe(false)
    })

    it('deve retornar false quando challengeId não corresponde', async () => {
      mockCache.get.mockResolvedValue({
        challengeId: 'challenge-123',
        workspaceOwnerUserId: 'user-1',
        sessionId: 'session-1',
        verifiedByUserId: 'user-1',
        pinFingerprint: makePinFingerprint(),
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      })

      const result = await adminPinService.validateVerificationProof(mockAuthContext, 'challenge-999')

      expect(result).toBe(false)
    })
  })

  describe('extractVerificationProof', () => {
    it('deve extrair proof dos cookies', () => {
      const mockRequest = {
        cookies: {
          partner_admin_pin: 'challenge-123',
        },
        headers: {},
      }

      const result = adminPinService.extractVerificationProof(mockRequest as any)

      expect(result).toBe('challenge-123')
    })

    it('deve retornar null quando cookie não existe', () => {
      const mockRequest = {
        cookies: {},
        headers: {},
      }

      const result = adminPinService.extractVerificationProof(mockRequest as any)

      expect(result).toBeNull()
    })

    it('deve retornar null quando cookie é inválido', () => {
      const mockRequest = {
        cookies: {
          partner_admin_pin: '   ',
        },
        headers: {},
      }

      const result = adminPinService.extractVerificationProof(mockRequest as any)

      expect(result).toBeNull()
    })
  })
})
