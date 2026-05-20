import { AuditSeverity } from '@prisma/client'
import type { Logger } from '@nestjs/common'
import type { RequestContext } from '../../common/utils/request-context.util'
import type { PrismaService } from '../../database/prisma.service'
import type { MailerService } from '../mailer/mailer.service'
import type { AuditLogService } from '../monitoring/audit-log.service'
import { isServiceUnavailable } from './auth-shared.util'
import type { IssuedOneTimeCode } from './auth-one-time-code.utils'

export type EmailVerificationDeliveryResult = {
  deliveryMode: 'email' | 'preview'
  previewCode?: string
  previewExpiresAt?: Date
}

type VerificationDeliveryDependencies = {
  auditLogService: AuditLogService
  logger: Logger
  mailerService: MailerService
  prisma: PrismaService
}

type VerificationDeliveryInput = {
  dependencies: VerificationDeliveryDependencies
  params: {
    userId: string
    email: string
    fullName: string
    trigger: string
    context: RequestContext
  }
  verificationCode: IssuedOneTimeCode
  rateLimitMeta: Record<string, unknown>
  ttlMinutes: number
  portfolioFallbackEnabled: boolean
}

export async function deliverEmailVerificationCode(
  input: VerificationDeliveryInput,
): Promise<EmailVerificationDeliveryResult> {
  try {
    return await sendVerificationEmail(input)
  } catch (error) {
    return handleVerificationDeliveryError(input, error)
  }
}

async function sendVerificationEmail(input: VerificationDeliveryInput): Promise<EmailVerificationDeliveryResult> {
  const delivery = await input.dependencies.mailerService.sendEmailVerificationEmail({
    to: input.params.email,
    fullName: input.params.fullName,
    code: input.verificationCode.code,
    expiresInMinutes: input.ttlMinutes,
  })

  if (delivery.mode === 'log' && input.portfolioFallbackEnabled) {
    return recordVerificationPreview(input, {
      reason: 'log_delivery_mode',
      deliveryMode: delivery.mode,
      ...input.rateLimitMeta,
    })
  }

  await recordVerificationRequested(input, delivery.mode)
  return { deliveryMode: 'email' }
}

async function handleVerificationDeliveryError(
  input: VerificationDeliveryInput,
  error: unknown,
): Promise<EmailVerificationDeliveryResult> {
  if (isServiceUnavailable(error) && input.portfolioFallbackEnabled) {
    input.dependencies.logger.warn(
      `Entrega de email indisponivel para ${input.params.email}. Codigo de apoio liberado no modo portfolio.`,
    )
    return recordVerificationPreview(input, {
      reason: error instanceof Error ? error.message : 'unknown',
      ...input.rateLimitMeta,
    })
  }

  await input.dependencies.prisma.oneTimeCode.deleteMany({ where: { id: input.verificationCode.recordId } })
  await recordVerificationDeliveryFailed(input, error)
  throw error
}

async function recordVerificationRequested(input: VerificationDeliveryInput, deliveryMode: string) {
  await input.dependencies.auditLogService.record({
    actorUserId: input.params.userId,
    event: 'auth.email-verification.requested',
    resource: 'user',
    resourceId: input.params.userId,
    metadata: {
      email: input.params.email,
      trigger: input.params.trigger,
      deliveryMode,
      ...input.rateLimitMeta,
    },
    ipAddress: input.params.context.ipAddress,
    userAgent: input.params.context.userAgent,
  })
}

async function recordVerificationPreview(
  input: VerificationDeliveryInput,
  metadata: Record<string, unknown>,
): Promise<EmailVerificationDeliveryResult> {
  await input.dependencies.auditLogService.record({
    actorUserId: input.params.userId,
    event: 'auth.email-verification.preview_enabled',
    resource: 'user',
    resourceId: input.params.userId,
    severity: AuditSeverity.WARN,
    metadata: {
      email: input.params.email,
      trigger: input.params.trigger,
      ...metadata,
    },
    ipAddress: input.params.context.ipAddress,
    userAgent: input.params.context.userAgent,
  })

  return {
    deliveryMode: 'preview',
    previewCode: input.verificationCode.code,
    previewExpiresAt: input.verificationCode.expiresAt,
  }
}

async function recordVerificationDeliveryFailed(input: VerificationDeliveryInput, error: unknown) {
  await input.dependencies.auditLogService.record({
    actorUserId: input.params.userId,
    event: 'auth.email-verification.delivery_failed',
    resource: 'user',
    resourceId: input.params.userId,
    severity: AuditSeverity.ERROR,
    metadata: {
      email: input.params.email,
      trigger: input.params.trigger,
      reason: error instanceof Error ? error.message : 'unknown',
    },
    ipAddress: input.params.context.ipAddress,
    userAgent: input.params.context.userAgent,
  })
}
