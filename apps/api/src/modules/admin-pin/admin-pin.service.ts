import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as argon2 from 'argon2'
import { createHash, randomBytes } from 'node:crypto'
import type { Request } from 'express'
import type { Response } from 'express'
import { CacheService } from '../../common/services/cache.service'
import { resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import {
  ADMIN_PIN_VERIFICATION_TTL_MS,
  DEV_ADMIN_PIN_COOKIE_NAME,
  PROD_ADMIN_PIN_COOKIE_NAME,
} from './admin-pin.constants'

const PIN_MAX_ATTEMPTS = 3
const PIN_WINDOW_MS = 5 * 60 * 1000
const PIN_LOCK_MS = 5 * 60 * 1000

type PinAttemptEntry = {
  count: number
  firstAttemptAt: number
  lockedUntil: number | null
}

type AdminPinVerificationEntry = {
  challengeId: string
  workspaceOwnerUserId: string
  sessionId: string
  verifiedByUserId: string
  pinFingerprint: string
  issuedAt: string
  expiresAt: string
}

@Injectable()
export class AdminPinService {
  private readonly logger = new Logger(AdminPinService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    private readonly cache: CacheService,
  ) {}

  async setupPin(userId: string, pin: string, currentPin?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { adminPinHash: true },
    })

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado.')
    }

    if (user.adminPinHash) {
      if (!currentPin) {
        throw new ForbiddenException('PIN atual é necessário para alterar o PIN.')
      }

      const currentValid = await argon2.verify(user.adminPinHash, currentPin)
      if (!currentValid) {
        throw new UnauthorizedException('PIN atual incorreto.')
      }
    }

    const adminPinHash = await argon2.hash(pin, { type: argon2.argon2id })

    await this.prisma.user.update({
      where: { id: userId },
      data: { adminPinHash },
    })

    this.logger.log(`Admin PIN configurado para userId=${userId}`)
  }

  async removePin(userId: string, pin: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { adminPinHash: true },
    })

    if (!user || !user.adminPinHash) {
      throw new NotFoundException('Nenhum PIN configurado.')
    }

    const valid = await argon2.verify(user.adminPinHash, pin)
    if (!valid) {
      throw new UnauthorizedException('PIN inválido.')
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { adminPinHash: null },
    })

    this.logger.log(`Admin PIN removido para userId=${userId}`)
  }

  async hasPinConfigured(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { adminPinHash: true },
    })
    return !!user?.adminPinHash
  }

  async issueVerificationChallenge(
    auth: Pick<AuthContext, 'userId' | 'sessionId' | 'role' | 'companyOwnerUserId'>,
    pin: string,
  ) {
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)

    if (!auth.sessionId) {
      throw new ForbiddenException('Sessão inválida.')
    }

    const rateLimitKey = this.buildAttemptKey(workspaceOwnerUserId, auth.sessionId, auth.userId)

    if (!this.cache.isReady()) {
      throw new ServiceUnavailableException('Redis indisponível para emitir a validação segura do PIN.')
    }

    await this.assertPinAllowed(rateLimitKey)

    const owner = await this.prisma.user.findUnique({
      where: { id: workspaceOwnerUserId },
      select: { adminPinHash: true },
    })

    if (!owner || !owner.adminPinHash) {
      throw new NotFoundException('Nenhum PIN configurado.')
    }

    const valid = await argon2.verify(owner.adminPinHash, pin)

    if (!valid) {
      await this.recordPinFailure(rateLimitKey)
      throw new UnauthorizedException('PIN inválido.')
    }

    const challengeId = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + ADMIN_PIN_VERIFICATION_TTL_MS)
    const record: AdminPinVerificationEntry = {
      challengeId,
      workspaceOwnerUserId,
      sessionId: auth.sessionId,
      verifiedByUserId: auth.userId,
      pinFingerprint: fingerprintPinHash(owner.adminPinHash),
      issuedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    }

    await this.cache.set(
      this.buildChallengeKey(workspaceOwnerUserId, auth.sessionId, auth.userId),
      record,
      Math.ceil(ADMIN_PIN_VERIFICATION_TTL_MS / 1000),
    )
    await this.cache.del(CacheService.ratelimitKey('admin-pin', rateLimitKey))

    return {
      challengeId,
      expiresAt,
    }
  }

  async validateVerificationProof(
    auth: Pick<AuthContext, 'userId' | 'sessionId' | 'role' | 'companyOwnerUserId'>,
    proof?: string | null,
  ): Promise<boolean> {
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)

    if (!(await this.hasPinConfigured(workspaceOwnerUserId))) {
      return true
    }

    if (!proof?.trim() || !auth.sessionId) {
      return false
    }

    if (!this.cache.isReady()) {
      throw new ServiceUnavailableException('Redis indisponível para validar a autorização temporária do PIN.')
    }

    const challenge = await this.cache.get<AdminPinVerificationEntry>(
      this.buildChallengeKey(workspaceOwnerUserId, auth.sessionId, auth.userId),
    )

    if (!challenge || challenge.challengeId !== proof.trim()) {
      return false
    }

    if (
      challenge.workspaceOwnerUserId !== workspaceOwnerUserId ||
      challenge.sessionId !== auth.sessionId ||
      challenge.verifiedByUserId !== auth.userId
    ) {
      return false
    }

    if (Date.parse(challenge.expiresAt) <= Date.now()) {
      await this.cache.del(this.buildChallengeKey(workspaceOwnerUserId, auth.sessionId, auth.userId))
      return false
    }

    const owner = await this.prisma.user.findUnique({
      where: { id: workspaceOwnerUserId },
      select: { adminPinHash: true },
    })

    if (!owner?.adminPinHash) {
      await this.cache.del(this.buildChallengeKey(workspaceOwnerUserId, auth.sessionId, auth.userId))
      return false
    }

    if (challenge.pinFingerprint !== fingerprintPinHash(owner.adminPinHash)) {
      await this.cache.del(this.buildChallengeKey(workspaceOwnerUserId, auth.sessionId, auth.userId))
      return false
    }

    return true
  }

  extractVerificationProof(request: Pick<Request, 'cookies' | 'headers'>): string | null {
    const cookie = this.getVerificationCookieName()
    const cookies = request.cookies as Record<string, unknown> | undefined
    const cookieValue = cookies?.[cookie]

    if (typeof cookieValue === 'string' && cookieValue.trim()) {
      return cookieValue.trim()
    }

    return null
  }

  getVerificationCookieName() {
    return this.isProduction() ? PROD_ADMIN_PIN_COOKIE_NAME : DEV_ADMIN_PIN_COOKIE_NAME
  }

  getVerificationCookieBaseOptions() {
    return {
      httpOnly: true,
      secure: this.shouldUseSecureCookies(),
      sameSite: this.getCookieSameSitePolicy(),
      path: '/',
    } as const
  }

  getVerificationCookieOptions(expiresAt: Date) {
    return {
      ...this.getVerificationCookieBaseOptions(),
      expires: expiresAt,
    } as const
  }

  clearVerificationCookie(response: Response) {
    response.clearCookie(this.getVerificationCookieName(), this.getVerificationCookieBaseOptions())
  }

  setVerificationCookie(response: Response, challengeId: string, expiresAt: Date) {
    response.cookie(this.getVerificationCookieName(), challengeId, this.getVerificationCookieOptions(expiresAt))
  }

  private buildChallengeKey(workspaceOwnerUserId: string, sessionId: string, userId: string) {
    return CacheService.ratelimitKey('admin-pin-proof', `${workspaceOwnerUserId}:${sessionId}:${userId}`)
  }

  private buildAttemptKey(workspaceOwnerUserId: string, sessionId: string, userId: string) {
    return `${workspaceOwnerUserId}:${sessionId}:${userId}`
  }

  private async assertPinAllowed(key: string): Promise<void> {
    const redisKey = CacheService.ratelimitKey('admin-pin', key)
    const entry = await this.cache.get<PinAttemptEntry>(redisKey)
    if (!entry) return

    const now = Date.now()

    if (entry.lockedUntil && entry.lockedUntil > now) {
      const retryAfterMinutes = Math.ceil((entry.lockedUntil - now) / 60000)
      throw new HttpException(`Muitas tentativas. Tente em ${retryAfterMinutes} minuto(s).`, HttpStatus.LOCKED)
    }

    if (entry.firstAttemptAt + PIN_WINDOW_MS <= now) {
      await this.cache.del(redisKey)
    }
  }

  private async recordPinFailure(key: string): Promise<void> {
    const redisKey = CacheService.ratelimitKey('admin-pin', key)
    const now = Date.now()
    const existing = await this.cache.get<PinAttemptEntry>(redisKey)

    if (!existing || existing.firstAttemptAt + PIN_WINDOW_MS <= now) {
      const fresh: PinAttemptEntry = { count: 1, firstAttemptAt: now, lockedUntil: null }
      await this.cache.set(redisKey, fresh, Math.ceil(PIN_WINDOW_MS / 1000))
      return
    }

    const newCount = existing.count + 1
    const lockedUntil = newCount >= PIN_MAX_ATTEMPTS ? now + PIN_LOCK_MS : null
    const updated: PinAttemptEntry = { count: newCount, firstAttemptAt: existing.firstAttemptAt, lockedUntil }

    const ttlSeconds = lockedUntil
      ? Math.ceil(PIN_LOCK_MS / 1000)
      : Math.ceil((existing.firstAttemptAt + PIN_WINDOW_MS - now) / 1000)

    await this.cache.set(redisKey, updated, Math.max(ttlSeconds, 1))
  }

  private shouldUseSecureCookies() {
    if (this.isProduction()) {
      return true
    }

    return this.parseBoolean(this.configService.get<string>('COOKIE_SECURE'))
  }

  private getCookieSameSitePolicy(): 'lax' | 'strict' | 'none' {
    const configuredPolicy = this.configService.get<string>('COOKIE_SAME_SITE')?.trim().toLowerCase()

    if (configuredPolicy === 'strict') {
      return configuredPolicy
    }

    if (configuredPolicy === 'none') {
      if (!this.shouldUseSecureCookies()) {
        this.logger.warn('COOKIE_SAME_SITE=none sem cookie secure ativo. Aplicando fallback para SameSite=lax.')
        return 'lax'
      }

      return configuredPolicy
    }

    return 'lax'
  }

  private isProduction() {
    return this.configService.get<string>('NODE_ENV') === 'production'
  }

  private parseBoolean(value: string | undefined) {
    if (value == null) {
      return false
    }

    return value === 'true'
  }
}

function fingerprintPinHash(adminPinHash: string) {
  return createHash('sha256').update(adminPinHash).digest('base64url')
}
