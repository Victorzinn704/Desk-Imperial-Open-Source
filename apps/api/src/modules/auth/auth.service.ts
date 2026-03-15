import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AuditSeverity, UserStatus } from '@prisma/client'
import * as argon2 from 'argon2'
import { randomBytes, createHash } from 'node:crypto'
import type { Response } from 'express'
import type { RequestContext } from '../../common/utils/request-context.util'
import { PrismaService } from '../../database/prisma.service'
import { ConsentService } from '../consent/consent.service'
import { AuditLogService } from '../monitoring/audit-log.service'
import { DEV_SESSION_COOKIE_NAME, PROD_SESSION_COOKIE_NAME } from './auth.constants'
import type { AuthContext } from './auth.types'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly consentService: ConsentService,
    private readonly auditLogService: AuditLogService,
  ) {}

  getSessionCookieName() {
    return this.isProduction() ? PROD_SESSION_COOKIE_NAME : DEV_SESSION_COOKIE_NAME
  }

  async register(dto: RegisterDto, response: Response, context: RequestContext) {
    if (!dto.acceptTerms || !dto.acceptPrivacy) {
      throw new BadRequestException('Voce precisa aceitar os termos de uso e o aviso de privacidade.')
    }

    const normalizedEmail = normalizeEmail(dto.email)
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      throw new ConflictException('Ja existe uma conta com este email.')
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id })
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName.trim(),
        companyName: dto.companyName?.trim() || null,
        email: normalizedEmail,
        passwordHash,
      },
      select: publicUserSelect,
    })

    await this.consentService.recordLegalAcceptances({
      userId: user.id,
      version: this.getConsentVersion(),
      context,
    })

    await this.consentService.updateCookiePreferences({
      userId: user.id,
      version: this.getConsentVersion(),
      preferences: {
        analytics: dto.analyticsCookies ?? false,
        marketing: dto.marketingCookies ?? false,
      },
      context,
    })

    const session = await this.createSession(user.id, context)
    this.setSessionCookie(response, session.token, session.expiresAt)

    await this.auditLogService.record({
      actorUserId: user.id,
      event: 'auth.registered',
      resource: 'user',
      resourceId: user.id,
      metadata: {
        email: user.email,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return {
      user: toAuthUser(user, {
        sessionId: session.sessionId,
        analytics: dto.analyticsCookies ?? false,
        marketing: dto.marketingCookies ?? false,
      }),
      session: {
        expiresAt: session.expiresAt,
      },
    }
  }

  async login(dto: LoginDto, response: Response, context: RequestContext) {
    const normalizedEmail = normalizeEmail(dto.email)
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        cookiePreference: true,
      },
    })

    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.auditLogService.record({
        event: 'auth.login.failed',
        resource: 'session',
        severity: AuditSeverity.WARN,
        metadata: { email: normalizedEmail, reason: 'user_not_found_or_disabled' },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
      throw new UnauthorizedException('Credenciais invalidas.')
    }

    const isValidPassword = await argon2.verify(user.passwordHash, dto.password)

    if (!isValidPassword) {
      await this.auditLogService.record({
        actorUserId: user.id,
        event: 'auth.login.failed',
        resource: 'session',
        severity: AuditSeverity.WARN,
        metadata: { email: normalizedEmail, reason: 'invalid_password' },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
      throw new UnauthorizedException('Credenciais invalidas.')
    }

    const session = await this.createSession(user.id, context)
    this.setSessionCookie(response, session.token, session.expiresAt)

    await this.auditLogService.record({
      actorUserId: user.id,
      event: 'auth.login.succeeded',
      resource: 'session',
      resourceId: session.sessionId,
      metadata: { email: normalizedEmail },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return {
      user: toAuthUser(user, {
        sessionId: session.sessionId,
        analytics: user.cookiePreference?.analytics ?? false,
        marketing: user.cookiePreference?.marketing ?? false,
      }),
      session: {
        expiresAt: session.expiresAt,
      },
    }
  }

  async logout(auth: AuthContext, response: Response, context: RequestContext) {
    await this.prisma.session.updateMany({
      where: {
        id: auth.sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    })

    response.clearCookie(this.getSessionCookieName(), this.getSessionCookieBaseOptions())

    await this.auditLogService.record({
      actorUserId: auth.userId,
      event: 'auth.logout.succeeded',
      resource: 'session',
      resourceId: auth.sessionId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return {
      success: true,
    }
  }

  async validateSessionToken(rawToken: string): Promise<AuthContext | null> {
    const tokenHash = hashToken(rawToken)
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            cookiePreference: true,
          },
        },
      },
    })

    if (!session) {
      return null
    }

    if (session.revokedAt || session.expiresAt <= new Date() || session.user.status !== UserStatus.ACTIVE) {
      return null
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    })

    return toAuthUser(session.user, {
      sessionId: session.id,
      analytics: session.user.cookiePreference?.analytics ?? false,
      marketing: session.user.cookiePreference?.marketing ?? false,
    })
  }

  async getCurrentUser(auth: AuthContext) {
    return {
      user: auth,
    }
  }

  private async createSession(userId: string, context: RequestContext) {
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + this.getSessionMaxAgeMs())

    const session = await this.prisma.session.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    })

    return {
      token,
      expiresAt,
      sessionId: session.id,
    }
  }

  private setSessionCookie(response: Response, token: string, expiresAt: Date) {
    response.cookie(this.getSessionCookieName(), token, {
      ...this.getSessionCookieBaseOptions(),
      expires: expiresAt,
    })
  }

  private getSessionCookieBaseOptions() {
    return {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: 'lax' as const,
      path: '/',
    }
  }

  private getSessionMaxAgeMs() {
    const ttlHours = Number(this.configService.get<string>('SESSION_TTL_HOURS') ?? 24)
    return Math.max(ttlHours, 1) * 60 * 60 * 1000
  }

  private getConsentVersion() {
    return this.configService.get<string>('CONSENT_VERSION') ?? '2026.03'
  }

  private isProduction() {
    return this.configService.get<string>('NODE_ENV') === 'production'
  }
}

const publicUserSelect = {
  id: true,
  fullName: true,
  companyName: true,
  email: true,
  status: true,
} as const

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function hashToken(rawToken: string) {
  return createHash('sha256').update(rawToken).digest('hex')
}

function toAuthUser(
  user: {
    id: string
    fullName: string
    companyName: string | null
    email: string
    status: UserStatus
  },
  options: {
    sessionId?: string
    analytics: boolean
    marketing: boolean
  },
): AuthContext {
  return {
    userId: user.id,
    sessionId: options.sessionId ?? '',
    email: user.email,
    fullName: user.fullName,
    companyName: user.companyName,
    status: user.status,
    cookiePreferences: {
      necessary: true,
      analytics: options.analytics,
      marketing: options.marketing,
    },
  }
}
