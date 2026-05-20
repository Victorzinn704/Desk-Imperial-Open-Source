import { AuditSeverity } from '@prisma/client'
import type { Logger } from '@nestjs/common'
import type { RequestContext } from '../../common/utils/request-context.util'
import type { PrismaService } from '../../database/prisma.service'
import type { MailerService } from '../mailer/mailer.service'
import type { AuditLogService } from '../monitoring/audit-log.service'
import { isServiceUnavailable } from './auth-shared.util'

type PasswordDeliveryDependencies = {
  auditLogService: AuditLogService
  logger: Logger
  mailerService: MailerService
  prisma: PrismaService
}

type PasswordResetDeliveryInput = {
  dependencies: PasswordDeliveryDependencies
  user: { id: string; email: string; fullName: string }
  resetCode: { code: string; recordId: string }
  rateLimitMeta: Record<string, unknown>
  context: RequestContext
  ttlMinutes: number
  portfolioFallbackEnabled: boolean
}

type PasswordChangedNoticeInput = {
  dependencies: Omit<PasswordDeliveryDependencies, 'prisma'>
  user: { id: string; email: string; fullName: string }
  context: RequestContext
  changedAt: Date
}

export async function deliverPasswordResetEmail(input: PasswordResetDeliveryInput) {
  try {
    await sendPasswordResetEmail(input)
  } catch (error) {
    await handlePasswordResetDeliveryError(input, error)
  }
}

export async function sendPasswordChangedNotice(input: PasswordChangedNoticeInput) {
  try {
    const delivery = await input.dependencies.mailerService.sendPasswordChangedEmail({
      to: input.user.email,
      fullName: input.user.fullName,
      changedAt: input.changedAt,
      ipAddress: input.context.ipAddress,
    })

    await input.dependencies.auditLogService.record({
      actorUserId: input.user.id,
      event: 'auth.password-reset.notification_sent',
      resource: 'user',
      resourceId: input.user.id,
      metadata: { email: input.user.email, deliveryMode: delivery.mode },
      ipAddress: input.context.ipAddress,
      userAgent: input.context.userAgent,
    })
  } catch (error) {
    input.dependencies.logger.warn(
      `Falha ao enviar notificacao de senha alterada para ${input.user.email}: ${errorMessage(error)}`,
    )
  }
}

async function sendPasswordResetEmail(input: PasswordResetDeliveryInput) {
  const delivery = await input.dependencies.mailerService.sendPasswordResetEmail({
    to: input.user.email,
    fullName: input.user.fullName,
    code: input.resetCode.code,
    expiresInMinutes: input.ttlMinutes,
  })

  await input.dependencies.auditLogService.record({
    actorUserId: input.user.id,
    event: 'auth.password-reset.requested',
    resource: 'password_reset',
    resourceId: input.resetCode.recordId,
    metadata: {
      email: input.user.email,
      deliveryMode: delivery.mode,
      ...input.rateLimitMeta,
    },
    ipAddress: input.context.ipAddress,
    userAgent: input.context.userAgent,
  })
}

async function handlePasswordResetDeliveryError(input: PasswordResetDeliveryInput, error: unknown) {
  if (isServiceUnavailable(error) && input.portfolioFallbackEnabled) {
    await recordPasswordResetPreview(input, error)
    input.dependencies.logger.warn(
      `Entrega de redefinicao indisponivel para ${input.user.email}. O envio sera reprocessado no modo local.`,
    )
    return
  }

  await input.dependencies.prisma.oneTimeCode.deleteMany({ where: { id: input.resetCode.recordId } })
  await recordPasswordResetDeliveryFailed(input, error)
  throw error
}

async function recordPasswordResetPreview(input: PasswordResetDeliveryInput, error: unknown) {
  await input.dependencies.auditLogService.record({
    actorUserId: input.user.id,
    event: 'auth.password-reset.preview_enabled',
    resource: 'password_reset',
    resourceId: input.resetCode.recordId,
    severity: AuditSeverity.WARN,
    metadata: {
      email: input.user.email,
      reason: errorMessage(error),
      ...input.rateLimitMeta,
    },
    ipAddress: input.context.ipAddress,
    userAgent: input.context.userAgent,
  })
}

async function recordPasswordResetDeliveryFailed(input: PasswordResetDeliveryInput, error: unknown) {
  await input.dependencies.auditLogService.record({
    actorUserId: input.user.id,
    event: 'auth.password-reset.delivery_failed',
    resource: 'password_reset',
    resourceId: input.resetCode.recordId,
    severity: AuditSeverity.ERROR,
    metadata: {
      email: input.user.email,
      reason: errorMessage(error),
    },
    ipAddress: input.context.ipAddress,
    userAgent: input.context.userAgent,
  })
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'unknown'
}
