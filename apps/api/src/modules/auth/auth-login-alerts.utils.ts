import type { ConfigService } from '@nestjs/config'
import type { RequestContext } from '../../common/utils/request-context.util'
import type { PrismaService } from '../../database/prisma.service'
import type { MailerService } from '../mailer/mailer.service'
import type { AuditLogService } from '../monitoring/audit-log.service'
import { AuditSeverity } from '@prisma/client'
import { normalizeComparableValue, parseBoolean } from './auth-shared.util'

export async function sendLoginAlertIfEnabled(
  configService: ConfigService,
  prisma: PrismaService,
  mailerService: MailerService,
  auditLogService: AuditLogService,
  user: { id: string; email: string; fullName: string },
  context: RequestContext,
  currentSessionId: string,
) {
  if (!parseBoolean(configService.get<string>('LOGIN_ALERT_EMAILS_ENABLED'))) {
    return
  }

  const previousSessions = await prisma.session.findMany({
    where: { userId: user.id, id: { not: currentSessionId } },
    select: { id: true, ipAddress: true, userAgent: true },
    take: 12,
    orderBy: { createdAt: 'desc' },
  })

  if (previousSessions.length === 0) {
    return
  }

  const isKnownDevice = previousSessions.some(
    (session) =>
      normalizeComparableValue(session.ipAddress) === normalizeComparableValue(context.ipAddress) &&
      normalizeComparableValue(session.userAgent) === normalizeComparableValue(context.userAgent),
  )

  if (isKnownDevice) {
    return
  }

  try {
    const delivery = await mailerService.sendLoginAlertEmail({
      to: user.email,
      fullName: user.fullName,
      occurredAt: new Date(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    await auditLogService.record({
      actorUserId: user.id,
      event: 'auth.login.notification_sent',
      resource: 'session',
      metadata: { email: user.email, deliveryMode: delivery.mode },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  } catch {
    // Silently fail — alert is best-effort
  }
}

export async function sendFailedLoginAlertIfEnabled(
  configService: ConfigService,
  mailerService: MailerService,
  auditLogService: AuditLogService,
  user: { id: string; email: string; fullName: string },
  context: RequestContext,
  failedAttempts: number,
) {
  if (!parseBoolean(configService.get<string>('FAILED_LOGIN_ALERTS_ENABLED'))) {
    return
  }

  const threshold = Math.max(Number(configService.get<string>('FAILED_LOGIN_ALERT_THRESHOLD') ?? 3), 1)

  if (failedAttempts < threshold || failedAttempts > threshold) {
    return
  }

  try {
    const delivery = await mailerService.sendFailedLoginAlertEmail({
      to: user.email,
      fullName: user.fullName,
      occurredAt: new Date(),
      attemptCount: failedAttempts,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      locationSummary: context.ipAddress ? 'Local aproximado indisponivel no momento' : null,
    })

    await auditLogService.record({
      actorUserId: user.id,
      event: 'auth.login.failed_notification_sent',
      resource: 'session',
      metadata: { email: user.email, failedAttempts, deliveryMode: delivery.mode },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  } catch {
    // Silently fail — alert is best-effort
  }
}
