import { HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common'
import { AuditSeverity } from '@prisma/client'
import type { RequestContext } from '../../common/utils/request-context.util'
import type { AuditLogService } from '../monitoring/audit-log.service'
import type { AuthRateLimitService } from './auth-rate-limit.service'
import { type LoginAlertDependencies, sendFailedLoginAlertIfEnabled } from './auth-login-alerts.utils'
import { pickMostRestrictiveRateLimitState, recordAttemptsForKeys } from './auth-login-rate-limit.utils'

export type FailedLoginDependencies = {
  auditLogService: AuditLogService
  authRateLimitService: AuthRateLimitService
  loginAlertDependencies: LoginAlertDependencies
}

type RejectFailedLoginInput = {
  dependencies: FailedLoginDependencies
  actorUserId?: string
  actorFullName?: string
  email: string
  reason: string
  rateLimitKeys: string[]
  context: RequestContext
}

export async function rejectFailedLogin(input: RejectFailedLoginInput): Promise<never> {
  const rateLimitState = pickMostRestrictiveRateLimitState(
    await recordAttemptsForKeys(input.rateLimitKeys, (key) =>
      input.dependencies.authRateLimitService.recordFailure(key),
    ),
  )

  await recordFailedLoginAudit(input, rateLimitState)
  dispatchFailedLoginAlert(input, rateLimitState.count)
  throwFailedLoginResponse(rateLimitState.lockedUntil)
}

async function recordFailedLoginAudit(
  input: RejectFailedLoginInput,
  rateLimitState: { count: number; lockedUntil?: number | null },
) {
  await input.dependencies.auditLogService.record({
    actorUserId: input.actorUserId,
    event: 'auth.login.failed',
    resource: 'session',
    severity: AuditSeverity.WARN,
    metadata: {
      email: input.email,
      reason: input.reason,
      failedAttempts: rateLimitState.count,
      lockedUntil: rateLimitState.lockedUntil ? new Date(rateLimitState.lockedUntil).toISOString() : null,
    },
    ipAddress: input.context.ipAddress,
    userAgent: input.context.userAgent,
  })
}

function dispatchFailedLoginAlert(input: RejectFailedLoginInput, failedAttempts: number) {
  if (!(input.actorUserId && input.actorFullName)) {
    return
  }

  void sendFailedLoginAlertIfEnabled({
    dependencies: input.dependencies.loginAlertDependencies,
    user: { id: input.actorUserId, email: input.email, fullName: input.actorFullName },
    context: input.context,
    failedAttempts,
  })
}

function throwFailedLoginResponse(lockedUntil: number | null | undefined): never {
  if (lockedUntil) {
    const retryAfterSeconds = Math.ceil((lockedUntil - Date.now()) / 1000)
    throw new HttpException(
      `Muitas tentativas de acesso. Tente novamente em ${retryAfterSeconds} segundo(s).`,
      HttpStatus.TOO_MANY_REQUESTS,
    )
  }

  throw new UnauthorizedException('Credenciais invalidas.')
}
