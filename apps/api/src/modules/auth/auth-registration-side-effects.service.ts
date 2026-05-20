import { Inject, Injectable, Logger } from '@nestjs/common'
import type { RequestContext } from '../../common/utils/request-context.util'
import { ConsentService } from '../consent/consent.service'
import { AuditLogService } from '../monitoring/audit-log.service'
import { AuthEmailVerificationService } from './auth-email-verification.service'
import { AuthRegistrationPolicyService } from './auth-registration-policy.service'
import { withTimeout } from './auth-shared.util'

type RegisteredUser = {
  id: string
  email: string
  role: string
  companyCity: string | null
  companyState: string | null
  hasEmployees: boolean
  employeeCount: number
}

type CompanyLocationAudit = {
  precision?: string | null
} | null

type VerificationDelivery = Awaited<ReturnType<AuthEmailVerificationService['sendEmailVerificationCode']>> | null

@Injectable()
export class AuthRegistrationSideEffectsService {
  private readonly logger = new Logger(AuthRegistrationSideEffectsService.name)

  constructor(
    @Inject(ConsentService) private readonly consentService: ConsentService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject('AuthEmailVerificationService') private readonly emailVerificationService: AuthEmailVerificationService,
    @Inject(AuthRegistrationPolicyService) private readonly policy: AuthRegistrationPolicyService,
  ) {}

  async recordLegalConsent(params: {
    userId: string
    context: RequestContext
    analytics: boolean
    marketing: boolean
  }) {
    const version = this.policy.getConsentVersion()

    await this.consentService.recordLegalAcceptances({
      userId: params.userId,
      version,
      context: params.context,
    })

    await this.consentService.updateCookiePreferences({
      userId: params.userId,
      version,
      preferences: {
        analytics: params.analytics,
        marketing: params.marketing,
      },
      context: params.context,
    })
  }

  async sendVerificationCode(params: {
    userId: string
    email: string
    fullName: string
    context: RequestContext
  }): Promise<VerificationDelivery> {
    try {
      return await withTimeout(
        this.emailVerificationService.sendEmailVerificationCode({
          userId: params.userId,
          email: params.email,
          fullName: params.fullName,
          context: params.context,
          trigger: 'register',
          bypassRateLimit: true,
        }),
        this.policy.getVerificationDispatchTimeoutMs(),
      )
    } catch (error) {
      this.logger.warn(
        `Envio inicial de verificacao de email em cadastro ficou lento/indisponivel para ${params.email}: ${error instanceof Error ? error.message : 'unknown'}`,
      )
      return null
    }
  }

  async recordRegisteredUser(params: {
    user: RegisteredUser
    context: RequestContext
    companyLocation: CompanyLocationAudit
  }) {
    await this.auditLogService.record({
      actorUserId: params.user.id,
      event: 'auth.registered',
      resource: 'user',
      resourceId: params.user.id,
      metadata: {
        email: params.user.email,
        role: params.user.role,
        locationCaptured: Boolean(params.companyLocation),
        locationPrecision: params.companyLocation?.precision ?? 'manual',
        companyCity: params.user.companyCity,
        companyState: params.user.companyState,
        hasEmployees: params.user.hasEmployees,
        employeeCount: params.user.employeeCount,
      },
      ipAddress: params.context.ipAddress,
      userAgent: params.context.userAgent,
    })
  }
}

export function buildRegistrationResponse(params: { email: string; delivery: VerificationDelivery }) {
  return {
    success: true,
    requiresEmailVerification: true,
    email: params.email,
    deliveryMode: params.delivery?.deliveryMode,
    message: resolveRegistrationMessage(params.delivery),
  }
}

function resolveRegistrationMessage(delivery: VerificationDelivery) {
  if (delivery?.deliveryMode === 'preview') {
    return 'Cadastro concluido. O envio de email esta instavel no momento. Tente reenviar o codigo em instantes para concluir a verificacao.'
  }

  if (delivery) {
    return 'Cadastro concluido. Enviamos um codigo para confirmar seu email antes do primeiro acesso.'
  }

  return 'Cadastro concluido. O codigo de confirmacao esta sendo processado. Se nao chegar em instantes, use a opcao de reenviar codigo.'
}
