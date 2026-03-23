import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as argon2 from 'argon2'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { PrismaService } from '../../database/prisma.service'
import { CacheService } from '../../common/services/cache.service'

const PIN_MAX_ATTEMPTS = 3
const PIN_WINDOW_MS = 5 * 60 * 1000
const PIN_LOCK_MS = 5 * 60 * 1000
const ADMIN_PIN_TOKEN_TTL_MS = 10 * 60 * 1000

type PinAttemptEntry = {
  count: number
  firstAttemptAt: number
  lockedUntil: number | null
}

@Injectable()
export class AdminPinService {
  private readonly logger = new Logger(AdminPinService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly cache: CacheService,
  ) {}

  // ─── Setup / Change PIN ──────────────────────────────────────────────────────

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

  // ─── Remove PIN ──────────────────────────────────────────────────────────────

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

  // ─── Verify PIN (com rate limit embutido) ────────────────────────────────────

  async verifyPin(userId: string, pin: string): Promise<boolean> {
    const rateLimitKey = `admin-pin:${userId}`

    await this.assertPinAllowed(rateLimitKey)

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { adminPinHash: true },
    })

    if (!user || !user.adminPinHash) {
      throw new NotFoundException('Nenhum PIN configurado.')
    }

    const valid = await argon2.verify(user.adminPinHash, pin)

    if (!valid) {
      await this.recordPinFailure(rateLimitKey)
      return false
    }

    await this.cache.del(this.cache.ratelimitKey('admin-pin', rateLimitKey))
    return true
  }

  // ─── Verificar se usuário tem PIN configurado ────────────────────────────────

  async hasPinConfigured(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { adminPinHash: true },
    })
    return !!user?.adminPinHash
  }

  // ─── JWT de curta duração para Admin PIN ─────────────────────────────────────

  generateAdminPinToken(userId: string): string {
    const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = base64url(
      JSON.stringify({
        sub: userId,
        purpose: 'admin_pin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor((Date.now() + ADMIN_PIN_TOKEN_TTL_MS) / 1000),
        jti: randomBytes(16).toString('hex'),
      }),
    )

    const signature = createHmac('sha256', this.getAdminPinSecret())
      .update(`${header}.${payload}`)
      .digest('base64url')

    return `${header}.${payload}.${signature}`
  }

  validateAdminPinToken(token: string): string | null {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) return null

      const [header, payload, signature] = parts

      const expectedSig = createHmac('sha256', this.getAdminPinSecret())
        .update(`${header}.${payload}`)
        .digest('base64url')

      const sigBuf = Buffer.from(signature)
      const expBuf = Buffer.from(expectedSig)

      if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
        return null
      }

      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))

      if (claims.purpose !== 'admin_pin') return null
      if (typeof claims.sub !== 'string') return null
      if (typeof claims.exp !== 'number' || Math.floor(Date.now() / 1000) > claims.exp) return null

      return claims.sub as string
    } catch {
      return null
    }
  }

  // ─── Rate limit via Redis ─────────────────────────────────────────────────────

  private async assertPinAllowed(key: string): Promise<void> {
    const redisKey = this.cache.ratelimitKey('admin-pin', key)
    const entry = await this.cache.get<PinAttemptEntry>(redisKey)
    if (!entry) return

    const now = Date.now()

    if (entry.lockedUntil && entry.lockedUntil > now) {
      const retryAfterMinutes = Math.ceil((entry.lockedUntil - now) / 60000)
      throw new HttpException(
        `Muitas tentativas. Tente em ${retryAfterMinutes} minuto(s).`,
        HttpStatus.LOCKED,
      )
    }

    if (entry.firstAttemptAt + PIN_WINDOW_MS <= now) {
      await this.cache.del(redisKey)
    }
  }

  private async recordPinFailure(key: string): Promise<void> {
    const redisKey = this.cache.ratelimitKey('admin-pin', key)
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

  private getAdminPinSecret(): string {
    const secret = this.configService.get<string>('ADMIN_PIN_JWT_SECRET')
    if (!secret) {
      throw new Error('ADMIN_PIN_JWT_SECRET não configurado.')
    }
    return secret
  }
}

function base64url(input: string): string {
  return Buffer.from(input).toString('base64url')
}
