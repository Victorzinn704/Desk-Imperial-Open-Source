import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { UserRole, UserStatus } from '@prisma/client'
import { createHash, createHmac, randomBytes } from 'node:crypto'
import type { Response } from 'express'
import { CacheService } from '../../common/services/cache.service'
import { recordAuthSessionCacheLookup } from '../../common/observability/business-telemetry.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { PrismaService } from '../../database/prisma.service'
import { OperationsRealtimeSessionsService } from '../operations-realtime/operations-realtime-sessions.service'
import {
  DEV_CSRF_COOKIE_NAME,
  DEV_SESSION_COOKIE_NAME,
  PROD_CSRF_COOKIE_NAME,
  PROD_SESSION_COOKIE_NAME,
} from './auth.constants'
import type { AuthContext } from './auth.types'
import { DemoAccessService } from './demo-access.service'
import {
  authSessionEmployeeSelect,
  authSessionUserSelect,
  authSessionWorkspaceOwnerSelect,
  toAuthUser,
} from './auth-shared.util'

export const SESSION_CACHE_TTL_SECONDS = 300
export const SESSION_LAST_SEEN_UPDATE_MS = 15 * 60_000
export const NEGATIVE_SESSION_CACHE_TTL_SECONDS = 30

export type CachedAuthSession = {
  tokenHash: string
  expiresAt?: string
  auth: AuthContext
}

export type SessionCacheEntry = {
  id: string
  tokenHash: string
}

type NegativeAuthSessionCacheEntry = {
  tokenHash: string
  reason: 'missing' | 'revoked' | 'expired' | 'inactive' | 'orphaned'
  negative: true
}

function hashToken(rawToken: string) {
  return createHash('sha256').update(rawToken).digest('hex')
}

function parseBoolean(value: string | undefined) {
  if (value == null) {
    return false
  }
  return value === 'true'
}

@Injectable()
export class AuthSessionService {
  private readonly cache: CacheService

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(DemoAccessService) private readonly demoAccessService: DemoAccessService,
    @Inject(OperationsRealtimeSessionsService)
    private readonly realtimeSessions: OperationsRealtimeSessionsService,
    @Inject(CacheService) cache?: CacheService,
  ) {
    this.cache = cache ?? new CacheService()
  }

  getSessionCookieName() {
    return this.isProduction() ? PROD_SESSION_COOKIE_NAME : DEV_SESSION_COOKIE_NAME
  }

  getCsrfCookieName() {
    return this.isProduction() ? PROD_CSRF_COOKIE_NAME : DEV_CSRF_COOKIE_NAME
  }

  buildCsrfToken(sessionId: string) {
    return createHmac('sha256', this.getCsrfSecret()).update(`csrf:${sessionId}`).digest('hex')
  }

  async createSession(
    user: {
      userId: string | null
      employeeId: string | null
      workspaceOwnerUserId: string
      email: string
    },
    context: RequestContext,
  ) {
    const token = randomBytes(32).toString('hex')
    const sessionTtlMs = this.getSessionMaxAgeMs()
    const demoReservation = await this.demoAccessService.reserveWindow({
      email: user.email,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionTtlMs,
    })
    const expiresAt = demoReservation?.expiresAt ?? new Date(Date.now() + sessionTtlMs)

    const session = await this.prisma.session.create({
      data: {
        userId: user.userId,
        employeeId: user.employeeId,
        workspaceOwnerUserId: user.workspaceOwnerUserId,
        tokenHash: hashToken(token),
        expiresAt,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    })

    if (demoReservation) {
      await this.demoAccessService.attachGrant({
        userId: user.workspaceOwnerUserId,
        sessionId: session.id,
        reservation: demoReservation,
      })
    }

    return {
      token,
      expiresAt,
      sessionId: session.id,
      evaluationAccess: this.demoAccessService.buildEvaluationAccess(user.email, expiresAt),
    }
  }

  async validateSessionToken(rawToken: string): Promise<AuthContext | null> {
    const tokenHash = hashToken(rawToken)
    const cached = await this.cache.get<CachedAuthSession>(this.sessionTokenCacheKey(tokenHash))

    if (cached?.auth) {
      const cachedExpiresAt = cached.expiresAt ? new Date(cached.expiresAt) : null
      if (!cachedExpiresAt || Number.isNaN(cachedExpiresAt.getTime()) || cachedExpiresAt.getTime() > Date.now()) {
        recordAuthSessionCacheLookup('hit', {
          'desk.auth.session.cache_scope': 'token',
        })
        return cached.auth
      }

      recordAuthSessionCacheLookup('expired', {
        'desk.auth.session.cache_scope': 'token',
      })
      await Promise.all([
        this.cache.del(this.sessionTokenCacheKey(cached.tokenHash)),
        this.cache.del(this.sessionIdCacheKey(cached.auth.sessionId)),
      ])

      return null
    }

    const cachedNegative = await this.cache.get<NegativeAuthSessionCacheEntry>(this.negativeSessionTokenCacheKey(tokenHash))
    if (cachedNegative?.negative) {
      recordAuthSessionCacheLookup('negative_hit', {
        'desk.auth.session.cache_scope': 'token',
        'desk.auth.session.negative_reason': cachedNegative.reason,
      })
      return null
    }

    recordAuthSessionCacheLookup(this.cache.isReady() ? 'miss' : 'bypass', {
      'desk.auth.session.cache_scope': 'token',
    })

    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        tokenHash: true,
        expiresAt: true,
        revokedAt: true,
        lastSeenAt: true,
        user: { select: authSessionUserSelect },
        employee: { select: authSessionEmployeeSelect },
        workspaceOwner: { select: authSessionWorkspaceOwnerSelect },
      },
    })

    if (!session) {
      await this.cacheNegativeSessionToken(tokenHash, 'missing')
      return null
    }

    const sessionUserStatus = session.employee
      ? session.employee.active
        ? UserStatus.ACTIVE
        : UserStatus.DISABLED
      : session.user?.status
    if (session.revokedAt || session.expiresAt <= new Date() || sessionUserStatus !== UserStatus.ACTIVE) {
      await this.cacheNegativeSessionToken(
        tokenHash,
        session.revokedAt ? 'revoked' : session.expiresAt <= new Date() ? 'expired' : 'inactive',
      )
      await this.demoAccessService.closeGrantForSession(session.id)
      return null
    }

    if (Date.now() - session.lastSeenAt.getTime() > SESSION_LAST_SEEN_UPDATE_MS) {
      void this.prisma.session.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date() },
      })
    }

    const auth = session.employee
      ? (() => {
          const actorUserId = session.user?.id ?? session.employee.loginUser?.id ?? session.workspaceOwner.id

          return toAuthUser(
            {
              ...session.workspaceOwner,
              id: actorUserId,
              fullName: session.employee.displayName,
              role: UserRole.STAFF,
              companyOwnerId: session.workspaceOwner.id,
              email: session.workspaceOwner.email,
            },
            {
              sessionId: session.id,
              actorUserId,
              analytics: session.workspaceOwner.cookiePreference?.analytics ?? false,
              marketing: session.workspaceOwner.cookiePreference?.marketing ?? false,
              evaluationAccess: this.demoAccessService.buildEvaluationAccess(
                session.workspaceOwner.email,
                session.expiresAt,
              ),
              employeeId: session.employee.id,
              employeeCode: session.employee.employeeCode,
            },
          )
        })()
      : session.user
        ? toAuthUser(session.user, {
            sessionId: session.id,
            actorUserId: session.user.id,
            analytics: session.user.cookiePreference?.analytics ?? false,
            marketing: session.user.cookiePreference?.marketing ?? false,
            evaluationAccess: this.demoAccessService.buildEvaluationAccess(session.user.email, session.expiresAt),
            employeeId: session.user.employeeAccount?.id ?? null,
            employeeCode: session.user.employeeAccount?.employeeCode ?? null,
          })
        : null

    if (!auth) {
      await this.cacheNegativeSessionToken(tokenHash, 'orphaned')
      return null
    }

    await this.cache.del(this.negativeSessionTokenCacheKey(tokenHash))
    await this.cacheAuthSession({ tokenHash: session.tokenHash, auth }, session.expiresAt)

    return auth
  }

  async cacheAuthSession(cacheEntry: Omit<CachedAuthSession, 'expiresAt'>, expiresAt: Date) {
    const ttlSeconds = Math.min(SESSION_CACHE_TTL_SECONDS, Math.ceil((expiresAt.getTime() - Date.now()) / 1000))
    if (ttlSeconds <= 0) {
      return
    }

    const cachedEntry = {
      ...cacheEntry,
      expiresAt: expiresAt.toISOString(),
    }

    await Promise.all([
      this.cache.set(this.sessionTokenCacheKey(cacheEntry.tokenHash), cachedEntry, ttlSeconds),
      this.cache.set(this.sessionIdCacheKey(cacheEntry.auth.sessionId), cachedEntry, ttlSeconds),
    ])
  }

  async refreshWorkspaceSessionCaches(workspaceOwnerUserId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { workspaceOwnerUserId, revokedAt: null },
      select: { id: true, tokenHash: true },
    })
    if (sessions.length === 0) {
      return
    }
    await this.invalidateSessionCacheEntries(sessions)
  }

  async refreshEmployeeSessionCaches(employeeId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { employeeId, revokedAt: null },
      select: { id: true, tokenHash: true },
    })
    if (sessions.length === 0) {
      return
    }
    await this.invalidateSessionCacheEntries(sessions)
  }

  async revokeEmployeeSessions(employeeId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { employeeId, revokedAt: null },
      select: { id: true, tokenHash: true },
    })
    if (sessions.length === 0) {
      return
    }

    await Promise.all([
      this.prisma.session.updateMany({
        where: { employeeId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.invalidateSessionCacheEntries(sessions),
      this.disconnectTrackedSessions(sessions.map((session) => session.id)),
      ...sessions.map((session) => this.demoAccessService.closeGrantForSession(session.id)),
    ])
  }

  async invalidateWorkspaceDerivedCaches(workspaceOwnerUserId: string) {
    await Promise.all([
      this.cache.del(CacheService.financeKey(workspaceOwnerUserId)),
      this.cache.del(`finance:pillars:${workspaceOwnerUserId}`),
      this.cache.del(CacheService.productsKey(workspaceOwnerUserId, 'active')),
      this.cache.del(CacheService.productsKey(workspaceOwnerUserId, 'all')),
      this.cache.del(CacheService.ordersKey(workspaceOwnerUserId)),
      this.cache.delByPrefix(`gemini:insight:${workspaceOwnerUserId}:`),
      this.cache.delByPrefix(`operations:live:${workspaceOwnerUserId}:`),
      this.cache.delByPrefix(`operations:kitchen:${workspaceOwnerUserId}:`),
      this.cache.delByPrefix(`operations:summary:${workspaceOwnerUserId}:`),
    ])
  }

  async forgetSessionCache(sessionId: string) {
    const cached = await this.cache.get<CachedAuthSession>(this.sessionIdCacheKey(sessionId))
    if (cached?.tokenHash) {
      await Promise.all([
        this.cache.del(this.sessionTokenCacheKey(cached.tokenHash)),
        this.cache.del(this.sessionIdCacheKey(sessionId)),
        this.cache.del(this.negativeSessionTokenCacheKey(cached.tokenHash)),
      ])
      return
    }

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { tokenHash: true },
    })
    if (!session) {
      return
    }

    await Promise.all([
      this.cache.del(this.sessionTokenCacheKey(session.tokenHash)),
      this.cache.del(this.sessionIdCacheKey(sessionId)),
      this.cache.del(this.negativeSessionTokenCacheKey(session.tokenHash)),
    ])
  }

  async disconnectTrackedSessions(sessionIds: string[]) {
    this.realtimeSessions.disconnectSessions(sessionIds)
  }

  setSessionCookies(response: Response, token: string, sessionId: string, expiresAt: Date) {
    this.setSessionCookie(response, token, expiresAt)
    this.setCsrfCookie(response, sessionId, expiresAt)
  }

  setCsrfCookie(response: Response, sessionId: string, expiresAt?: Date) {
    response.cookie(this.getCsrfCookieName(), this.buildCsrfToken(sessionId), {
      ...this.getCsrfCookieBaseOptions(),
      ...(expiresAt ? { expires: expiresAt } : {}),
    })
  }

  getSessionCookieBaseOptions() {
    return this.buildCookieBaseOptions(true)
  }

  getCsrfCookieBaseOptions() {
    return this.buildCookieBaseOptions(false)
  }

  private setSessionCookie(response: Response, token: string, expiresAt: Date) {
    response.cookie(this.getSessionCookieName(), token, {
      ...this.getSessionCookieBaseOptions(),
      expires: expiresAt,
    })
  }

  private buildCookieBaseOptions(httpOnly: boolean) {
    return {
      httpOnly,
      secure: this.shouldUseSecureCookies(),
      sameSite: this.getCookieSameSitePolicy(),
      path: '/',
    }
  }

  private getSessionMaxAgeMs() {
    const ttlHours = Number(this.configService.get<string>('SESSION_TTL_HOURS') ?? 24)
    return Math.max(ttlHours, 1) * 60 * 60 * 1000
  }

  private shouldUseSecureCookies() {
    if (this.isProduction()) {
      return true
    }
    return parseBoolean(this.configService.get<string>('COOKIE_SECURE'))
  }

  private getCookieSameSitePolicy(): 'lax' | 'strict' | 'none' {
    const configuredPolicy = this.configService.get<string>('COOKIE_SAME_SITE')?.trim().toLowerCase()
    if (configuredPolicy === 'strict') {
      return configuredPolicy
    }
    if (configuredPolicy === 'none') {
      if (!this.shouldUseSecureCookies()) {
        return 'lax'
      }
      return configuredPolicy
    }
    return 'lax'
  }

  private getCsrfSecret() {
    const csrfSecret = this.readConfiguredSecret('CSRF_SECRET')
    if (csrfSecret) {
      return csrfSecret
    }
    const cookieSecret = this.readConfiguredSecret('COOKIE_SECRET')
    if (cookieSecret) {
      return cookieSecret
    }
    throw new InternalServerErrorException(
      'Configuracao insegura: defina CSRF_SECRET (ou COOKIE_SECRET valido) para emissao de token CSRF.',
    )
  }

  private readConfiguredSecret(key: 'CSRF_SECRET' | 'COOKIE_SECRET') {
    const value = this.configService.get<string>(key)?.trim()
    if (!value) {
      return null
    }
    if (value.toLowerCase() === 'change-me') {
      return null
    }
    return value
  }

  private isProduction() {
    return this.configService.get<string>('NODE_ENV') === 'production'
  }

  private sessionTokenCacheKey(tokenHash: string) {
    return `auth:session:token:${tokenHash}`
  }

  private sessionIdCacheKey(sessionId: string) {
    return `auth:session:id:${sessionId}`
  }

  private negativeSessionTokenCacheKey(tokenHash: string) {
    return `auth:session:negative:${tokenHash}`
  }

  private async invalidateSessionCacheEntries(sessions: SessionCacheEntry[]) {
    await Promise.all(
      sessions.flatMap((session) => [
        this.cache.del(this.sessionTokenCacheKey(session.tokenHash)),
        this.cache.del(this.sessionIdCacheKey(session.id)),
        this.cache.set(
          this.negativeSessionTokenCacheKey(session.tokenHash),
          {
            tokenHash: session.tokenHash,
            reason: 'revoked',
            negative: true,
          } satisfies NegativeAuthSessionCacheEntry,
          NEGATIVE_SESSION_CACHE_TTL_SECONDS,
        ),
      ]),
    )
  }

  private async cacheNegativeSessionToken(
    tokenHash: string,
    reason: NegativeAuthSessionCacheEntry['reason'],
  ) {
    await this.cache.set(
      this.negativeSessionTokenCacheKey(tokenHash),
      {
        tokenHash,
        reason,
        negative: true,
      } satisfies NegativeAuthSessionCacheEntry,
      NEGATIVE_SESSION_CACHE_TTL_SECONDS,
    )
  }
}
