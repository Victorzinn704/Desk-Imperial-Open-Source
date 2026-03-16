import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHash } from 'node:crypto'
import { PrismaService } from '../../database/prisma.service'

type DemoReservation = {
  dailyLimitMinutes: number
  dayKey: string
  expiresAt: Date
  ipHash: string
  remainingSeconds: number
}

type EvaluationAccess = {
  dailyLimitMinutes: number
  remainingSeconds: number
  sessionExpiresAt: string
}

@Injectable()
export class DemoAccessService {
  private readonly timezone = 'America/Sao_Paulo'

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  isDemoAccount(email: string) {
    return normalizeEmail(email) === normalizeEmail(this.getDemoAccountEmail())
  }

  async reserveWindow(params: {
    email: string
    ipAddress: string | null
    userAgent: string | null
    sessionTtlMs: number
  }): Promise<DemoReservation | null> {
    if (!this.isDemoAccount(params.email)) {
      return null
    }

    const ipAddress = normalizeIpAddress(params.ipAddress)
    if (!ipAddress) {
      throw new BadRequestException(
        'Nao foi possivel validar o IP deste dispositivo para liberar o modo avaliacao.',
      )
    }

    const now = new Date()
    const dayKey = this.getDayKey(now)
    const ipHash = this.hashDeviceSignature(ipAddress, params.userAgent)
    const grants = await this.prisma.demoAccessGrant.findMany({
      where: {
        dayKey,
        ipHash,
      },
      select: {
        startedAt: true,
        expiresAt: true,
        endedAt: true,
      },
    })

    const dailyLimitMinutes = this.getDailyLimitMinutes()
    const dailyLimitSeconds = dailyLimitMinutes * 60
    const allocatedSeconds = grants.reduce<number>((total, grant) => {
      const effectiveEnd = grant.endedAt ?? grant.expiresAt
      return total + diffSeconds(grant.startedAt, effectiveEnd)
    }, 0)
    const remainingSeconds = dailyLimitSeconds - allocatedSeconds

    if (remainingSeconds <= 0) {
      throw new HttpException(
        `O modo avaliacao ja consumiu ${dailyLimitMinutes} minuto(s) hoje neste dispositivo. Tente novamente amanha ou crie sua propria conta.`,
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    const ttlSeconds = Math.max(1, Math.floor(params.sessionTtlMs / 1000))
    const allowedSeconds = Math.min(remainingSeconds, ttlSeconds)

    return {
      dailyLimitMinutes,
      dayKey,
      expiresAt: new Date(now.getTime() + allowedSeconds * 1000),
      ipHash,
      remainingSeconds: allowedSeconds,
    }
  }

  async attachGrant(params: {
    userId: string
    sessionId: string
    reservation: DemoReservation
  }) {
    await this.prisma.demoAccessGrant.create({
      data: {
        userId: params.userId,
        sessionId: params.sessionId,
        dayKey: params.reservation.dayKey,
        ipHash: params.reservation.ipHash,
        expiresAt: params.reservation.expiresAt,
      },
    })
  }

  async closeGrantForSession(sessionId: string, endedAt = new Date()) {
    const grant = await this.prisma.demoAccessGrant.findUnique({
      where: {
        sessionId,
      },
    })

    if (!grant || grant.endedAt) {
      return
    }

    const safeEndTime = Math.min(
      Math.max(endedAt.getTime(), grant.startedAt.getTime()),
      grant.expiresAt.getTime(),
    )

    await this.prisma.demoAccessGrant.update({
      where: {
        sessionId,
      },
      data: {
        endedAt: new Date(safeEndTime),
      },
    })
  }

  async closeGrantsForUser(userId: string, endedAt = new Date()) {
    const grants = await this.prisma.demoAccessGrant.findMany({
      where: {
        userId,
        endedAt: null,
      },
      select: {
        sessionId: true,
      },
    })

    await Promise.all(
      grants.map((grant: { sessionId: string }) => this.closeGrantForSession(grant.sessionId, endedAt)),
    )
  }

  buildEvaluationAccess(email: string, sessionExpiresAt: Date): EvaluationAccess | null {
    if (!this.isDemoAccount(email)) {
      return null
    }

    return {
      dailyLimitMinutes: this.getDailyLimitMinutes(),
      remainingSeconds: Math.max(0, Math.ceil((sessionExpiresAt.getTime() - Date.now()) / 1000)),
      sessionExpiresAt: sessionExpiresAt.toISOString(),
    }
  }

  private getDailyLimitMinutes() {
    const configuredLimit = Number(this.configService.get<string>('DEMO_DAILY_LIMIT_MINUTES') ?? 20)
    return Math.max(configuredLimit, 1)
  }

  private getDemoAccountEmail() {
    return this.configService.get<string>('DEMO_ACCOUNT_EMAIL') ?? 'demo@partnerportal.com'
  }

  private hashDeviceSignature(ipAddress: string, userAgent: string | null) {
    const normalizedUserAgent = normalizeUserAgent(userAgent)
    return createHash('sha256')
      .update(`demo-device:${ipAddress}:${normalizedUserAgent}`)
      .digest('hex')
  }

  private getDayKey(date: Date) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: this.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const parts = formatter.formatToParts(date)
    const year = parts.find((part) => part.type === 'year')?.value ?? '0000'
    const month = parts.find((part) => part.type === 'month')?.value ?? '00'
    const day = parts.find((part) => part.type === 'day')?.value ?? '00'
    return `${year}-${month}-${day}`
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function normalizeIpAddress(ipAddress: string | null) {
  if (!ipAddress) {
    return null
  }

  const normalized = ipAddress.trim()
  if (!normalized) {
    return null
  }

  if (normalized === '::1') {
    return '127.0.0.1'
  }

  return normalized.startsWith('::ffff:') ? normalized.slice(7) : normalized
}

function diffSeconds(start: Date, end: Date) {
  return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 1000))
}

function normalizeUserAgent(userAgent: string | null) {
  if (!userAgent) {
    return 'unknown-device'
  }

  return userAgent.trim().toLowerCase().replaceAll(/\s+/g, ' ').slice(0, 240) || 'unknown-device'
}
