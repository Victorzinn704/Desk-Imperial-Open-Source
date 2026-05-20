import type { ConfigService } from '@nestjs/config'
import type { RequestContext } from '../../common/utils/request-context.util'
import type { PrismaService } from '../../database/prisma.service'
import type { MailerService } from '../mailer/mailer.service'
import type { AuditLogService } from '../monitoring/audit-log.service'
import { normalizeComparableValue, parseBoolean } from './auth-shared.util'

export type LoginAlertDependencies = {
  configService: ConfigService
  prisma: PrismaService
  mailerService: MailerService
  auditLogService: AuditLogService
}

type FailedLoginAlertDependencies = Omit<LoginAlertDependencies, 'prisma'>

type LoginAlertInput = {
  dependencies: LoginAlertDependencies
  user: { id: string; email: string; fullName: string }
  context: RequestContext
  currentSessionId: string
}

type FailedLoginAlertInput = {
  dependencies: FailedLoginAlertDependencies
  user: { id: string; email: string; fullName: string }
  context: RequestContext
  failedAttempts: number
}

export async function sendLoginAlertIfEnabled(input: LoginAlertInput) {
  const { auditLogService, configService, mailerService, prisma } = input.dependencies

  if (!parseBoolean(configService.get<string>('LOGIN_ALERT_EMAILS_ENABLED'))) {
    return
  }

  const previousSessions = await prisma.session.findMany({
    where: { userId: input.user.id, id: { not: input.currentSessionId } },
    select: { id: true, ipAddress: true, userAgent: true },
    take: 12,
    orderBy: { createdAt: 'desc' },
  })

  if (previousSessions.length === 0) {
    return
  }

  const isKnownDevice = previousSessions.some(
    (session) =>
      normalizeComparableValue(session.ipAddress) === normalizeComparableValue(input.context.ipAddress) &&
      normalizeComparableValue(session.userAgent) === normalizeComparableValue(input.context.userAgent),
  )

  if (isKnownDevice) {
    return
  }

  try {
    const delivery = await mailerService.sendLoginAlertEmail({
      to: input.user.email,
      fullName: input.user.fullName,
      occurredAt: new Date(),
      ipAddress: input.context.ipAddress,
      userAgent: input.context.userAgent,
    })

    await auditLogService.record({
      actorUserId: input.user.id,
      event: 'auth.login.notification_sent',
      resource: 'session',
      metadata: { email: input.user.email, deliveryMode: delivery.mode },
      ipAddress: input.context.ipAddress,
      userAgent: input.context.userAgent,
    })
  } catch {
    // Silently fail — alert is best-effort
  }
}

export async function sendFailedLoginAlertIfEnabled(input: FailedLoginAlertInput) {
  const { auditLogService, configService, mailerService } = input.dependencies

  if (!parseBoolean(configService.get<string>('FAILED_LOGIN_ALERTS_ENABLED'))) {
    return
  }

  const threshold = Math.max(Number(configService.get<string>('FAILED_LOGIN_ALERT_THRESHOLD') ?? 3), 1)

  if (input.failedAttempts < threshold || input.failedAttempts > threshold) {
    return
  }

  try {
    const delivery = await mailerService.sendFailedLoginAlertEmail({
      to: input.user.email,
      fullName: input.user.fullName,
      occurredAt: new Date(),
      attemptCount: input.failedAttempts,
      ipAddress: input.context.ipAddress,
      userAgent: input.context.userAgent,
      locationSummary: input.context.ipAddress ? 'Local aproximado indisponivel no momento' : null,
    })

    await auditLogService.record({
      actorUserId: input.user.id,
      event: 'auth.login.failed_notification_sent',
      resource: 'session',
      metadata: { email: input.user.email, failedAttempts: input.failedAttempts, deliveryMode: delivery.mode },
      ipAddress: input.context.ipAddress,
      userAgent: input.context.userAgent,
    })
  } catch {
    // Silently fail — alert is best-effort
  }
}
