import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AuditSeverity, CurrencyCode, OneTimeCodePurpose, UserRole, UserStatus } from '@prisma/client'
import * as argon2 from 'argon2'
import { createHash, createHmac, randomBytes, randomInt } from 'node:crypto'
import type { Response } from 'express'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { PrismaService } from '../../database/prisma.service'
import { ConsentService } from '../consent/consent.service'
import { GeocodingService } from '../geocoding/geocoding.service'
import { MailerService } from '../mailer/mailer.service'
import { AuditLogService } from '../monitoring/audit-log.service'
import {
  getAdminPinVerificationCookieName,
  getAdminPinVerificationCookieOptions,
} from '../admin-pin/admin-pin.constants'
import { AuthRateLimitService } from './auth-rate-limit.service'
import {
  DEV_CSRF_COOKIE_NAME,
  DEV_SESSION_COOKIE_NAME,
  PROD_CSRF_COOKIE_NAME,
  PROD_SESSION_COOKIE_NAME,
} from './auth.constants'
import type { AuthContext } from './auth.types'
import type { ForgotPasswordDto } from './dto/forgot-password.dto'
import type { DemoLoginDto } from './dto/demo-login.dto'
import type { LoginDto } from './dto/login.dto'
import { LoginModeDto } from './dto/login.dto'
import type { RegisterDto } from './dto/register.dto'
import type { ResetPasswordDto } from './dto/reset-password.dto'
import type { UpdateProfileDto } from './dto/update-profile.dto'
import type { VerifyEmailDto } from './dto/verify-email.dto'
import { DemoAccessService } from './demo-access.service'

const authCookiePreferenceSelect = {
  analytics: true,
  marketing: true,
} as const

const authWorkspaceUserSelect = {
  id: true,
  companyOwnerId: true,
  fullName: true,
  companyName: true,
  companyStreetLine1: true,
  companyStreetNumber: true,
  companyAddressComplement: true,
  companyDistrict: true,
  companyCity: true,
  companyState: true,
  companyPostalCode: true,
  companyCountry: true,
  companyLatitude: true,
  companyLongitude: true,
  hasEmployees: true,
  employeeCount: true,
  email: true,
  emailVerifiedAt: true,
  preferredCurrency: true,
  status: true,
} as const

const authSessionUserSelect = {
  ...authWorkspaceUserSelect,
  cookiePreference: {
    select: authCookiePreferenceSelect,
  },
  employeeAccount: {
    select: {
      id: true,
      employeeCode: true,
    },
  },
} as const

const authSessionWorkspaceOwnerSelect = {
  ...authWorkspaceUserSelect,
  cookiePreference: {
    select: authCookiePreferenceSelect,
  },
} as const

const authSessionEmployeeSelect = {
  id: true,
  active: true,
  employeeCode: true,
  displayName: true,
} as const

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(ConsentService) private readonly consentService: ConsentService,
    @Inject(GeocodingService) private readonly geocodingService: GeocodingService,
    @Inject(MailerService) private readonly mailerService: MailerService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(AuthRateLimitService) private readonly authRateLimitService: AuthRateLimitService,
    @Inject(DemoAccessService) private readonly demoAccessService: DemoAccessService,
  ) {}

  getSessionCookieName() {
    return this.isProduction() ? PROD_SESSION_COOKIE_NAME : DEV_SESSION_COOKIE_NAME
  }

  getCsrfCookieName() {
    return this.isProduction() ? PROD_CSRF_COOKIE_NAME : DEV_CSRF_COOKIE_NAME
  }

  buildCsrfToken(sessionId: string) {
    return createHmac('sha256', this.getCsrfSecret()).update(`csrf:${sessionId}`).digest('hex')
  }

  async register(dto: RegisterDto, context: RequestContext) {
    if (!dto.acceptTerms || !dto.acceptPrivacy) {
      throw new BadRequestException('Voce precisa aceitar os termos de uso e o aviso de privacidade.')
    }

    if (dto.hasEmployees && dto.employeeCount < 1) {
      throw new BadRequestException('Informe quantos funcionarios a empresa possui.')
    }

    const normalizedEmail = normalizeEmail(dto.email)
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      throw new ConflictException('Nao foi possivel concluir o cadastro com os dados informados.')
    }

    const fullName = sanitizePlainText(dto.fullName, 'Nome completo', {
      allowEmpty: false,
      rejectFormula: true,
    })!
    const companyName = sanitizePlainText(dto.companyName, 'Empresa', {
      allowEmpty: true,
      rejectFormula: true,
    })
    const companyStreetLine1 = sanitizePlainText(dto.companyStreetLine1, 'Rua ou avenida', {
      allowEmpty: false,
      rejectFormula: true,
    })!
    const companyStreetNumber = sanitizePlainText(dto.companyStreetNumber, 'Numero', {
      allowEmpty: false,
      rejectFormula: true,
    })!
    const companyAddressComplement = sanitizePlainText(dto.companyAddressComplement, 'Complemento', {
      allowEmpty: true,
      rejectFormula: true,
    })
    const companyDistrict = sanitizePlainText(dto.companyDistrict, 'Bairro ou regiao', {
      allowEmpty: false,
      rejectFormula: true,
    })!
    const companyCity = sanitizePlainText(dto.companyCity, 'Cidade', {
      allowEmpty: false,
      rejectFormula: true,
    })!
    const companyState = sanitizePlainText(dto.companyState, 'Estado', {
      allowEmpty: false,
      rejectFormula: true,
    })!
    const companyPostalCode = sanitizePostalCode(dto.companyPostalCode)
    const companyCountry = sanitizePlainText(dto.companyCountry, 'Pais', {
      allowEmpty: false,
      rejectFormula: true,
    })!
    const employeeCount = dto.hasEmployees ? dto.employeeCount : 0
    const companyLocation = await this.resolveRegistrationCompanyLocation({
      streetLine1: companyStreetLine1,
      streetNumber: companyStreetNumber,
      district: companyDistrict,
      city: companyCity,
      state: companyState,
      postalCode: companyPostalCode,
      country: companyCountry,
    })

    if (!companyLocation && this.isRegistrationGeocodingStrict()) {
      throw new BadRequestException(
        'Nao foi possivel validar o endereco da empresa com precisao. Revise rua, numero, bairro, cidade, estado e CEP.',
      )
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id })
    const user = await this.prisma.user.create({
      data: {
        fullName,
        companyOwnerId: null,
        companyName,
        companyStreetLine1: companyLocation?.streetLine1 ?? companyStreetLine1,
        companyStreetNumber: companyLocation?.streetNumber ?? companyStreetNumber,
        companyAddressComplement,
        companyDistrict: companyLocation?.district ?? companyDistrict,
        companyCity: companyLocation?.city ?? companyCity,
        companyState: companyLocation?.state ?? companyState,
        companyPostalCode: companyLocation?.postalCode ?? companyPostalCode,
        companyCountry: companyLocation?.country ?? companyCountry,
        companyLatitude: companyLocation?.latitude ?? null,
        companyLongitude: companyLocation?.longitude ?? null,
        hasEmployees: dto.hasEmployees,
        employeeCount,
        role: UserRole.OWNER,
        email: normalizedEmail,
        passwordHash,
        preferredCurrency: CurrencyCode.BRL,
        emailVerifiedAt: null,
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

    const verificationDelivery = await this.sendRegistrationVerificationCodeWithTimeout({
      userId: user.id,
      email: user.email,
      fullName,
      context,
    })

    await this.auditLogService.record({
      actorUserId: user.id,
      event: 'auth.registered',
      resource: 'user',
      resourceId: user.id,
      metadata: {
        email: user.email,
        role: user.role,
        locationCaptured: Boolean(companyLocation),
        locationPrecision: companyLocation?.precision ?? 'manual',
        companyCity: user.companyCity,
        companyState: user.companyState,
        hasEmployees: user.hasEmployees,
        employeeCount: user.employeeCount,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return {
      success: true,
      requiresEmailVerification: true,
      email: user.email,
      deliveryMode: verificationDelivery?.deliveryMode,
      previewCode: verificationDelivery?.previewCode,
      previewExpiresAt: verificationDelivery?.previewExpiresAt?.toISOString(),
      message:
        verificationDelivery?.deliveryMode === 'preview'
          ? 'Cadastro concluido. Como o email esta indisponivel agora, liberamos um codigo de apoio para voce concluir a verificacao neste navegador.'
          : verificationDelivery
            ? 'Cadastro concluido. Enviamos um codigo para confirmar seu email antes do primeiro acesso.'
            : 'Cadastro concluido. O codigo de confirmacao esta sendo processado. Se nao chegar em instantes, use a opcao de reenviar codigo.',
    }
  }

  async login(dto: LoginDto, response: Response, context: RequestContext) {
    const normalizedEmail =
      dto.loginMode === LoginModeDto.STAFF
        ? `staff:${normalizeEmail(dto.companyEmail ?? '')}:${sanitizeEmployeeCodeForLogin(dto.employeeCode ?? '')}`
        : normalizeEmail(dto.email ?? '')
    const rateLimitKeys = [
      this.authRateLimitService.buildLoginKey(normalizedEmail, context.ipAddress),
      this.authRateLimitService.buildLoginEmailKey(normalizedEmail),
    ]

    try {
      await this.assertAllowedForKeys(rateLimitKeys, (key) => this.authRateLimitService.assertLoginAllowed(key))
    } catch (error) {
      await this.auditLogService.record({
        event: 'auth.login.blocked',
        resource: 'session',
        severity: AuditSeverity.WARN,
        metadata: { email: normalizedEmail, reason: 'rate_limit' },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      throw error
    }

    const actor = await this.resolveLoginActor(dto)

    if (!actor || actor.status !== UserStatus.ACTIVE) {
      await this.handleFailedLogin({
        email: normalizedEmail,
        reason: 'user_not_found_or_disabled',
        rateLimitKeys,
        context,
      })
    }

    const activeActor = actor!
    const isValidPassword = await argon2.verify(activeActor.passwordHash, dto.password)

    if (!isValidPassword) {
      await this.handleFailedLogin({
        actorUserId: activeActor.actorUserId,
        actorFullName: activeActor.fullName,
        email: normalizedEmail,
        reason: 'invalid_password',
        rateLimitKeys,
        context,
      })
    }

    if (!activeActor.emailVerifiedAt) {
      await this.clearRateLimitKeys(rateLimitKeys)
      const verificationMessage = await this.handleUnverifiedLogin(activeActor.ownerUser, context)
      throw new ForbiddenException(verificationMessage)
    }

    await this.clearRateLimitKeys(rateLimitKeys)

    let session: Awaited<ReturnType<AuthService['createSession']>>

    try {
      session = await this.createSession(
        {
          userId: activeActor.sessionUserId,
          employeeId: activeActor.employeeId,
          workspaceOwnerUserId: activeActor.workspaceOwnerUserId,
          email: activeActor.ownerUser.email,
        },
        context,
      )
    } catch (error) {
      if (this.demoAccessService.isDemoAccount(activeActor.ownerUser.email)) {
        await this.auditLogService.record({
          actorUserId: activeActor.actorUserId,
          event: 'auth.demo.blocked',
          resource: 'session',
          severity: AuditSeverity.WARN,
          metadata: {
            email: normalizedEmail,
            reason: error instanceof Error ? error.message : 'unknown',
          },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        })
      }

      throw error
    }

    this.setSessionCookies(response, session.token, session.sessionId, session.expiresAt)

    await this.auditLogService.record({
      actorUserId: activeActor.actorUserId,
      event: 'auth.login.succeeded',
      resource: 'session',
      resourceId: session.sessionId,
      metadata: { email: normalizedEmail, loginMode: dto.loginMode },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    void this.sendLoginAlertIfEnabled(activeActor.ownerUser, context, session.sessionId)

    return {
      user: toAuthUser(activeActor.authUser, {
        sessionId: session.sessionId,
        analytics: activeActor.cookiePreference?.analytics ?? false,
        marketing: activeActor.cookiePreference?.marketing ?? false,
        evaluationAccess: session.evaluationAccess,
        employeeId: activeActor.employeeId,
        employeeCode: activeActor.employeeCode,
      }),
      csrfToken: this.buildCsrfToken(session.sessionId),
      session: {
        expiresAt: session.expiresAt,
      },
    }
  }

  async loginDemo(dto: DemoLoginDto, response: Response, context: RequestContext) {
    const demoEmail = normalizeEmail(this.configService.get<string>('DEMO_ACCOUNT_EMAIL') ?? 'demo@deskimperial.online')

    if (!this.demoAccessService.isDemoAccount(demoEmail)) {
      throw new BadRequestException('Modo demo não está configurado nesta instância.')
    }

    const normalizedEmail =
      dto.loginMode === LoginModeDto.STAFF
        ? `demo:staff:${demoEmail}:${sanitizeEmployeeCodeForLogin(dto.employeeCode ?? 'VD-001')}`
        : `demo:owner:${demoEmail}`
    const rateLimitKeys = [
      this.authRateLimitService.buildLoginKey(normalizedEmail, context.ipAddress),
      this.authRateLimitService.buildLoginEmailKey(normalizedEmail),
    ]

    if (!dto.bypassRateLimit) {
      try {
        await this.assertAllowedForKeys(rateLimitKeys, (key) => this.authRateLimitService.assertLoginAllowed(key))
      } catch (error) {
        await this.auditLogService.record({
          event: 'auth.login.blocked',
          resource: 'session',
          severity: AuditSeverity.WARN,
          metadata: { email: normalizedEmail, reason: 'rate_limit', demo: true },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        })

        throw error
      }
    }

    const actor =
      dto.loginMode === LoginModeDto.STAFF
        ? await this.resolveDemoStaffActor(demoEmail, dto.employeeCode)
        : await this.resolveDemoOwnerActor(demoEmail)

    if (!actor || actor.status !== UserStatus.ACTIVE) {
      await this.handleFailedLogin({
        email: normalizedEmail,
        reason: 'user_not_found_or_disabled',
        rateLimitKeys,
        context,
      })
    }

    const activeActor = actor!

    if (!activeActor.emailVerifiedAt) {
      await this.clearRateLimitKeys(rateLimitKeys)
      const verificationMessage = await this.handleUnverifiedLogin(activeActor.ownerUser, context)
      throw new ForbiddenException(verificationMessage)
    }

    await this.clearRateLimitKeys(rateLimitKeys)

    const session = await this.createSession(
      {
        userId: activeActor.sessionUserId,
        employeeId: activeActor.employeeId,
        workspaceOwnerUserId: activeActor.workspaceOwnerUserId,
        email: activeActor.ownerUser.email,
      },
      context,
    )

    this.setSessionCookies(response, session.token, session.sessionId, session.expiresAt)

    await this.auditLogService.record({
      actorUserId: activeActor.actorUserId,
      event: 'auth.login.succeeded',
      resource: 'session',
      resourceId: session.sessionId,
      metadata: { email: normalizedEmail, loginMode: dto.loginMode, demo: true },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    void this.sendLoginAlertIfEnabled(activeActor.ownerUser, context, session.sessionId)

    return {
      user: toAuthUser(activeActor.authUser, {
        sessionId: session.sessionId,
        analytics: activeActor.cookiePreference?.analytics ?? false,
        marketing: activeActor.cookiePreference?.marketing ?? false,
        evaluationAccess: session.evaluationAccess,
        employeeId: activeActor.employeeId,
        employeeCode: activeActor.employeeCode,
      }),
      csrfToken: this.buildCsrfToken(session.sessionId),
      session: {
        expiresAt: session.expiresAt,
      },
    }
  }

  private async resolveDemoOwnerActor(demoEmail: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: demoEmail },
      select: {
        ...authSessionUserSelect,
        passwordHash: true,
        role: true,
      },
    })

    if (!user || user.role !== UserRole.OWNER || user.companyOwnerId) {
      return null
    }

    return {
      actorUserId: user.id,
      sessionUserId: user.id,
      workspaceOwnerUserId: user.id,
      employeeId: user.employeeAccount?.id ?? null,
      employeeCode: user.employeeAccount?.employeeCode ?? null,
      passwordHash: user.passwordHash,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      fullName: user.fullName,
      cookiePreference: user.cookiePreference,
      ownerUser: user,
      authUser: user,
    }
  }

  private async resolveDemoStaffActor(demoEmail: string, employeeCode?: string) {
    const owner = await this.prisma.user.findFirst({
      where: {
        email: demoEmail,
        companyOwnerId: null,
        role: UserRole.OWNER,
      },
      select: {
        id: true,
      },
    })

    if (!owner) {
      return null
    }

    const safeEmployeeCode = sanitizeEmployeeCodeForLogin(employeeCode ?? 'VD-001')
    const employee = await this.findActiveEmployeeLoginActor(owner.id, safeEmployeeCode)

    if (!employee) {
      return null
    }

    const ownerUser = employee.user
    const legacyLoginUser = employee.loginUser

    if (ownerUser.status !== UserStatus.ACTIVE) {
      return null
    }

    return {
      actorUserId: legacyLoginUser?.id ?? ownerUser.id,
      sessionUserId: legacyLoginUser?.id ?? null,
      workspaceOwnerUserId: ownerUser.id,
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      passwordHash: 'demo-bypass',
      status: employee.active ? UserStatus.ACTIVE : UserStatus.DISABLED,
      emailVerifiedAt: ownerUser.emailVerifiedAt,
      fullName: employee.displayName,
      cookiePreference: ownerUser.cookiePreference,
      ownerUser,
      authUser: {
        ...ownerUser,
        fullName: employee.displayName,
        role: UserRole.STAFF,
        companyOwnerId: ownerUser.id,
        email: ownerUser.email,
      },
    }
  }

  private async resolveLoginActor(dto: LoginDto) {
    if (dto.loginMode === LoginModeDto.STAFF) {
      const companyEmail = normalizeEmail(dto.companyEmail ?? '')
      const employeeCode = sanitizeEmployeeCodeForLogin(dto.employeeCode ?? '')

      const owner = await this.prisma.user.findFirst({
        where: {
          email: companyEmail,
          companyOwnerId: null,
          role: UserRole.OWNER,
        },
        select: {
          id: true,
        },
      })

      if (!owner) {
        return null
      }

      const employee = await this.findActiveEmployeeLoginActor(owner.id, employeeCode)

      if (!employee) {
        return null
      }

      const ownerUser = employee.user
      const legacyLoginUser = employee.loginUser
      const passwordHash = this.resolveEmployeePasswordHash(employee)

      if (!passwordHash || ownerUser.status !== UserStatus.ACTIVE) {
        return null
      }

      return {
        actorUserId: legacyLoginUser?.id ?? ownerUser.id,
        sessionUserId: legacyLoginUser?.id ?? null,
        workspaceOwnerUserId: ownerUser.id,
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        passwordHash,
        status: employee.active ? UserStatus.ACTIVE : UserStatus.DISABLED,
        emailVerifiedAt: ownerUser.emailVerifiedAt,
        fullName: employee.displayName,
        cookiePreference: ownerUser.cookiePreference,
        ownerUser,
        authUser: {
          ...ownerUser,
          fullName: employee.displayName,
          role: UserRole.STAFF,
          companyOwnerId: ownerUser.id,
          email: ownerUser.email,
        },
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(dto.email ?? '') },
      select: {
        ...authSessionUserSelect,
        passwordHash: true,
        role: true,
      },
    })

    if (!user) {
      return null
    }

    return {
      actorUserId: user.id,
      sessionUserId: user.id,
      workspaceOwnerUserId: user.id,
      employeeId: user.employeeAccount?.id ?? null,
      employeeCode: user.employeeAccount?.employeeCode ?? null,
      passwordHash: user.passwordHash,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      fullName: user.fullName,
      cookiePreference: user.cookiePreference,
      ownerUser: user,
      authUser: user,
    }
  }

  private findActiveEmployeeLoginActor(ownerUserId: string, employeeCode: string) {
    return this.prisma.employee.findFirst({
      where: {
        userId: ownerUserId,
        employeeCode,
        active: true,
      },
      select: {
        id: true,
        active: true,
        employeeCode: true,
        displayName: true,
        passwordHash: true,
        user: {
          select: authSessionWorkspaceOwnerSelect,
        },
        loginUser: {
          select: {
            id: true,
            passwordHash: true,
          },
        },
      },
    })
  }

  private resolveEmployeePasswordHash(employee: {
    passwordHash: string | null
    loginUser: {
      passwordHash: string
    } | null
  }) {
    return employee.passwordHash ?? employee.loginUser?.passwordHash ?? null
  }

  async requestPasswordReset(dto: ForgotPasswordDto, context: RequestContext) {
    const normalizedEmail = normalizeEmail(dto.email)
    const rateLimitKeys = [
      this.authRateLimitService.buildPasswordResetKey(normalizedEmail, context.ipAddress),
      this.authRateLimitService.buildPasswordResetEmailKey(normalizedEmail),
    ]

    await this.assertAllowedForKeys(rateLimitKeys, (key) => this.authRateLimitService.assertPasswordResetAllowed(key))
    const rateLimitState = this.pickMostRestrictiveRateLimitState(
      await this.recordAttemptsForKeys(rateLimitKeys, (key) =>
        this.authRateLimitService.recordPasswordResetAttempt(key),
      ),
    )
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.auditLogService.record({
        event: 'auth.password-reset.requested',
        resource: 'password_reset',
        severity: AuditSeverity.WARN,
        metadata: {
          email: normalizedEmail,
          userFound: false,
          attempts: rateLimitState.count,
          lockedUntil: rateLimitState.lockedUntil ? new Date(rateLimitState.lockedUntil).toISOString() : null,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      throw new BadRequestException('Email invalido ou nao cadastrado.')
    }

    if (!user.emailVerifiedAt) {
      throw new BadRequestException('Confirme seu email antes de redefinir a senha.')
    }

    const resetCode = await this.issueOneTimeCode({
      userId: user.id,
      email: user.email,
      purpose: OneTimeCodePurpose.PASSWORD_RESET,
      ttlMinutes: this.getPasswordResetTtlMinutes(),
      context,
    })

    try {
      const delivery = await this.mailerService.sendPasswordResetEmail({
        to: user.email,
        fullName: user.fullName,
        code: resetCode.code,
        expiresInMinutes: this.getPasswordResetTtlMinutes(),
      })

      await this.auditLogService.record({
        actorUserId: user.id,
        event: 'auth.password-reset.requested',
        resource: 'password_reset',
        resourceId: resetCode.recordId,
        metadata: {
          email: user.email,
          deliveryMode: delivery.mode,
          attempts: rateLimitState.count,
          lockedUntil: rateLimitState.lockedUntil ? new Date(rateLimitState.lockedUntil).toISOString() : null,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
    } catch (error) {
      if (isServiceUnavailable(error) && this.shouldUsePortfolioEmailFallback(context)) {
        await this.auditLogService.record({
          actorUserId: user.id,
          event: 'auth.password-reset.preview_enabled',
          resource: 'password_reset',
          resourceId: resetCode.recordId,
          severity: AuditSeverity.WARN,
          metadata: {
            email: user.email,
            reason: error instanceof Error ? error.message : 'unknown',
            attempts: rateLimitState.count,
            lockedUntil: rateLimitState.lockedUntil ? new Date(rateLimitState.lockedUntil).toISOString() : null,
          },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        })

        this.logger.warn(
          `Entrega de redefinicao indisponivel para ${user.email}. Codigo de apoio liberado no modo local.`,
        )

        return {
          success: true,
          email: user.email,
          deliveryMode: 'preview',
          previewCode: resetCode.code,
          previewExpiresAt: resetCode.expiresAt.toISOString(),
          message:
            'O email de redefinicao esta indisponivel neste ambiente. Liberamos um codigo de apoio para concluir a troca de senha neste navegador.',
        }
      }

      await this.prisma.oneTimeCode.deleteMany({
        where: {
          id: resetCode.recordId,
        },
      })

      await this.auditLogService.record({
        actorUserId: user.id,
        event: 'auth.password-reset.delivery_failed',
        resource: 'password_reset',
        resourceId: resetCode.recordId,
        severity: AuditSeverity.ERROR,
        metadata: {
          email: user.email,
          reason: error instanceof Error ? error.message : 'unknown',
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      throw error
    }

    return {
      success: true,
      email: user.email,
      message: 'Enviamos um codigo de verificacao para redefinir sua senha.',
    }
  }

  async resetPassword(dto: ResetPasswordDto, context: RequestContext) {
    const normalizedEmail = normalizeEmail(dto.email)
    const rateLimitKeys = [
      this.authRateLimitService.buildPasswordResetCodeKey(normalizedEmail, context.ipAddress),
      this.authRateLimitService.buildPasswordResetCodeEmailKey(normalizedEmail),
    ]

    await this.assertAllowedForKeys(rateLimitKeys, (key) =>
      this.authRateLimitService.assertPasswordResetCodeAllowed(key),
    )
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.recordAttemptsForKeys(rateLimitKeys, (key) =>
        this.authRateLimitService.recordPasswordResetCodeAttempt(key),
      )
      throw new BadRequestException('Email invalido ou nao cadastrado.')
    }

    const resetCode = await this.prisma.oneTimeCode.findFirst({
      where: {
        userId: user.id,
        email: normalizedEmail,
        purpose: OneTimeCodePurpose.PASSWORD_RESET,
        codeHash: hashToken(dto.code.trim()),
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!resetCode) {
      const rateLimitState = this.pickMostRestrictiveRateLimitState(
        await this.recordAttemptsForKeys(rateLimitKeys, (key) =>
          this.authRateLimitService.recordPasswordResetCodeAttempt(key),
        ),
      )

      await this.auditLogService.record({
        actorUserId: user.id,
        event: 'auth.password-reset.code_failed',
        resource: 'password_reset',
        severity: AuditSeverity.WARN,
        metadata: {
          email: normalizedEmail,
          failedAttempts: rateLimitState.count,
          lockedUntil: rateLimitState.lockedUntil ? new Date(rateLimitState.lockedUntil).toISOString() : null,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      if (rateLimitState.lockedUntil) {
        const retryAfterSeconds = Math.ceil((rateLimitState.lockedUntil - Date.now()) / 1000)
        throw new HttpException(
          `Muitas tentativas de validar o codigo. Tente novamente em ${retryAfterSeconds} segundo(s).`,
          HttpStatus.TOO_MANY_REQUESTS,
        )
      }

      throw new BadRequestException('Codigo invalido ou expirado.')
    }

    const isSamePassword = await argon2.verify(user.passwordHash, dto.password)
    if (isSamePassword) {
      throw new BadRequestException('Escolha uma senha diferente da senha atual.')
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id })
    const now = new Date()

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          passwordHash,
          passwordChangedAt: now,
        },
      }),
      this.prisma.oneTimeCode.update({
        where: {
          id: resetCode.id,
        },
        data: {
          usedAt: now,
        },
      }),
      this.prisma.oneTimeCode.updateMany({
        where: {
          userId: user.id,
          purpose: OneTimeCodePurpose.PASSWORD_RESET,
          usedAt: null,
          id: {
            not: resetCode.id,
          },
        },
        data: {
          usedAt: now,
        },
      }),
      this.prisma.session.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      }),
    ])

    await this.clearRateLimitKeys(rateLimitKeys)

    await this.auditLogService.record({
      actorUserId: user.id,
      event: 'auth.password-reset.completed',
      resource: 'user',
      resourceId: user.id,
      metadata: {
        email: user.email,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    void this.sendPasswordChangedNotice(user, context, now)
    await this.demoAccessService.closeGrantsForUser(user.id, now)

    return {
      success: true,
      message: 'Senha redefinida com sucesso. Entre novamente para continuar.',
    }
  }

  async requestEmailVerification(dto: ForgotPasswordDto, context: RequestContext) {
    const normalizedEmail = normalizeEmail(dto.email)
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('Email invalido ou nao cadastrado.')
    }

    if (user.emailVerifiedAt) {
      return {
        success: true,
        message: 'Este email ja foi confirmado. Agora voce pode entrar normalmente.',
      }
    }

    const verificationDelivery = await this.sendEmailVerificationCode({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      context,
      trigger: 'manual',
    })

    return {
      success: true,
      email: user.email,
      deliveryMode: verificationDelivery.deliveryMode,
      previewCode: verificationDelivery.previewCode,
      previewExpiresAt: verificationDelivery.previewExpiresAt?.toISOString(),
      message:
        verificationDelivery.deliveryMode === 'preview'
          ? 'O email ainda esta indisponivel, entao exibimos um novo codigo de apoio para voce concluir a verificacao.'
          : 'Enviamos um novo codigo de confirmacao para o email cadastrado.',
    }
  }

  async verifyEmail(dto: VerifyEmailDto, context: RequestContext) {
    const normalizedEmail = normalizeEmail(dto.email)
    const rateLimitKeys = [
      this.authRateLimitService.buildEmailVerificationCodeKey(normalizedEmail, context.ipAddress),
      this.authRateLimitService.buildEmailVerificationCodeEmailKey(normalizedEmail),
    ]

    await this.assertAllowedForKeys(rateLimitKeys, (key) =>
      this.authRateLimitService.assertEmailVerificationCodeAllowed(key),
    )
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        cookiePreference: true,
      },
    })

    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.recordAttemptsForKeys(rateLimitKeys, (key) =>
        this.authRateLimitService.recordEmailVerificationCodeAttempt(key),
      )
      throw new BadRequestException('Email invalido ou nao cadastrado.')
    }

    if (user.emailVerifiedAt) {
      await this.clearRateLimitKeys(rateLimitKeys)
      return {
        success: true,
        message: 'Email ja confirmado. Agora voce pode entrar normalmente.',
      }
    }

    const verificationCode = await this.prisma.oneTimeCode.findFirst({
      where: {
        userId: user.id,
        email: normalizedEmail,
        purpose: OneTimeCodePurpose.EMAIL_VERIFICATION,
        codeHash: hashToken(dto.code.trim()),
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!verificationCode) {
      const rateLimitState = this.pickMostRestrictiveRateLimitState(
        await this.recordAttemptsForKeys(rateLimitKeys, (key) =>
          this.authRateLimitService.recordEmailVerificationCodeAttempt(key),
        ),
      )

      await this.auditLogService.record({
        actorUserId: user.id,
        event: 'auth.email-verification.failed',
        resource: 'user',
        resourceId: user.id,
        severity: AuditSeverity.WARN,
        metadata: {
          email: normalizedEmail,
          failedAttempts: rateLimitState.count,
          lockedUntil: rateLimitState.lockedUntil ? new Date(rateLimitState.lockedUntil).toISOString() : null,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      if (rateLimitState.lockedUntil) {
        const retryAfterSeconds = Math.ceil((rateLimitState.lockedUntil - Date.now()) / 1000)
        throw new HttpException(
          `Muitas tentativas de validar o codigo. Tente novamente em ${retryAfterSeconds} segundo(s).`,
          HttpStatus.TOO_MANY_REQUESTS,
        )
      }

      throw new BadRequestException('Codigo invalido ou expirado.')
    }

    const now = new Date()
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerifiedAt: now,
        },
      }),
      this.prisma.oneTimeCode.update({
        where: { id: verificationCode.id },
        data: { usedAt: now },
      }),
      this.prisma.oneTimeCode.updateMany({
        where: {
          userId: user.id,
          purpose: OneTimeCodePurpose.EMAIL_VERIFICATION,
          usedAt: null,
          id: {
            not: verificationCode.id,
          },
        },
        data: {
          usedAt: now,
        },
      }),
    ])

    await this.clearRateLimitKeys(rateLimitKeys)

    await this.auditLogService.record({
      actorUserId: user.id,
      event: 'auth.email-verification.completed',
      resource: 'user',
      resourceId: user.id,
      metadata: {
        email: user.email,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return {
      success: true,
      message: 'Email confirmado com sucesso. Agora voce pode entrar no portal.',
    }
  }

  async logout(auth: AuthContext, response: Response, context: RequestContext) {
    await this.demoAccessService.closeGrantForSession(auth.sessionId)

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
    response.clearCookie(this.getCsrfCookieName(), this.getCsrfCookieBaseOptions())
    response.clearCookie(
      getAdminPinVerificationCookieName(this.isProduction()),
      getAdminPinVerificationCookieOptions({
        secure: this.shouldUseSecureCookies(),
        sameSite: this.getCookieSameSitePolicy(),
      }),
    )

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
      select: {
        id: true,
        expiresAt: true,
        revokedAt: true,
        lastSeenAt: true,
        user: {
          select: authSessionUserSelect,
        },
        employee: {
          select: authSessionEmployeeSelect,
        },
        workspaceOwner: {
          select: authSessionWorkspaceOwnerSelect,
        },
      },
    })

    if (!session) {
      return null
    }

    const sessionUserStatus = session.employee
      ? session.employee.active
        ? UserStatus.ACTIVE
        : UserStatus.DISABLED
      : session.user?.status
    if (session.revokedAt || session.expiresAt <= new Date() || sessionUserStatus !== UserStatus.ACTIVE) {
      await this.demoAccessService.closeGrantForSession(session.id)
      return null
    }

    const ONE_MINUTE = 60_000
    if (Date.now() - session.lastSeenAt.getTime() > ONE_MINUTE) {
      void this.prisma.session.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date() },
      })
    }

    if (session.employee) {
      return toAuthUser(
        {
          ...session.workspaceOwner,
          fullName: session.employee.displayName,
          role: UserRole.STAFF,
          companyOwnerId: session.workspaceOwner.id,
          email: session.workspaceOwner.email,
        },
        {
          sessionId: session.id,
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
    }

    if (!session.user) {
      return null
    }

    return toAuthUser(session.user, {
      sessionId: session.id,
      analytics: session.user.cookiePreference?.analytics ?? false,
      marketing: session.user.cookiePreference?.marketing ?? false,
      evaluationAccess: this.demoAccessService.buildEvaluationAccess(session.user.email, session.expiresAt),
      employeeId: session.user.employeeAccount?.id ?? null,
      employeeCode: session.user.employeeAccount?.employeeCode ?? null,
    })
  }
  async getCurrentUser(auth: AuthContext, response: Response) {
    this.setCsrfCookie(response, auth.sessionId)

    return {
      user: auth,
      csrfToken: this.buildCsrfToken(auth.sessionId),
    }
  }

  async updateProfile(auth: AuthContext, dto: UpdateProfileDto, context: RequestContext) {
    const user = await this.prisma.user.update({
      where: {
        id: auth.userId,
      },
      data: {
        fullName: sanitizePlainText(dto.fullName, 'Nome do responsavel', {
          allowEmpty: false,
          rejectFormula: true,
        })!,
        companyName: sanitizePlainText(dto.companyName, 'Nome da empresa', {
          allowEmpty: true,
          rejectFormula: true,
        }),
        preferredCurrency: dto.preferredCurrency,
      },
      include: {
        cookiePreference: true,
      },
    })

    await this.auditLogService.record({
      actorUserId: auth.userId,
      event: 'auth.profile.updated',
      resource: 'user',
      resourceId: auth.userId,
      metadata: {
        fullName: user.fullName,
        companyName: user.companyName,
        preferredCurrency: user.preferredCurrency,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return {
      user: toAuthUser(user, {
        sessionId: auth.sessionId,
        analytics: user.cookiePreference?.analytics ?? false,
        marketing: user.cookiePreference?.marketing ?? false,
        evaluationAccess: auth.evaluationAccess,
        employeeId: auth.employeeId,
        employeeCode: auth.employeeCode,
      }),
    }
  }

  private async createSession(
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

  private setSessionCookies(response: Response, token: string, sessionId: string, expiresAt: Date) {
    this.setSessionCookie(response, token, expiresAt)
    this.setCsrfCookie(response, sessionId, expiresAt)
  }

  private setSessionCookie(response: Response, token: string, expiresAt: Date) {
    response.cookie(this.getSessionCookieName(), token, {
      ...this.getSessionCookieBaseOptions(),
      expires: expiresAt,
    })
  }

  private setCsrfCookie(response: Response, sessionId: string, expiresAt?: Date) {
    response.cookie(this.getCsrfCookieName(), this.buildCsrfToken(sessionId), {
      ...this.getCsrfCookieBaseOptions(),
      ...(expiresAt ? { expires: expiresAt } : {}),
    })
  }

  private getSessionCookieBaseOptions() {
    return this.buildCookieBaseOptions(true)
  }

  private getCsrfCookieBaseOptions() {
    return this.buildCookieBaseOptions(false)
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

  private getConsentVersion() {
    return this.configService.get<string>('CONSENT_VERSION') ?? '2026.03'
  }

  private getPasswordResetTtlMinutes() {
    const ttlMinutes = Number(this.configService.get<string>('PASSWORD_RESET_TTL_MINUTES') ?? 30)
    return Math.max(ttlMinutes, 5)
  }

  private getEmailVerificationTtlMinutes() {
    const ttlMinutes = Number(this.configService.get<string>('EMAIL_VERIFICATION_TTL_MINUTES') ?? 15)
    return Math.max(ttlMinutes, 5)
  }

  private isRegistrationGeocodingStrict() {
    return parseBoolean(this.configService.get<string>('REGISTRATION_GEOCODING_STRICT'))
  }

  private getRegistrationGeocodingTimeoutMs() {
    const configuredTimeout = Number(this.configService.get<string>('REGISTRATION_GEOCODING_TIMEOUT_MS') ?? 1800)
    if (!Number.isFinite(configuredTimeout)) {
      return 1800
    }

    return Math.min(Math.max(configuredTimeout, 300), 5000)
  }

  private getRegistrationVerificationDispatchTimeoutMs() {
    const configuredTimeout = Number(
      this.configService.get<string>('REGISTRATION_VERIFICATION_DISPATCH_TIMEOUT_MS') ?? 2500,
    )
    if (!Number.isFinite(configuredTimeout)) {
      return 2500
    }

    return Math.min(Math.max(configuredTimeout, 400), 7000)
  }

  private async resolveRegistrationCompanyLocation(input: {
    streetLine1: string
    streetNumber: string
    district: string
    city: string
    state: string
    postalCode: string
    country: string
  }) {
    try {
      return await withTimeout(
        this.geocodingService.geocodeAddressLocation(input),
        this.getRegistrationGeocodingTimeoutMs(),
      )
    } catch (error) {
      this.logger.warn(
        `Geocodificacao do cadastro excedeu limite de tempo ou falhou: ${error instanceof Error ? error.message : 'unknown'}`,
      )
      return null
    }
  }

  private async sendRegistrationVerificationCodeWithTimeout(params: {
    userId: string
    email: string
    fullName: string
    context: RequestContext
  }): Promise<EmailVerificationDeliveryResult | null> {
    try {
      return await withTimeout(
        this.sendEmailVerificationCode({
          userId: params.userId,
          email: params.email,
          fullName: params.fullName,
          context: params.context,
          trigger: 'register',
          bypassRateLimit: true,
        }),
        this.getRegistrationVerificationDispatchTimeoutMs(),
      )
    } catch (error) {
      this.logger.warn(
        `Envio inicial de verificacao de email em cadastro ficou lento/indisponivel para ${params.email}: ${error instanceof Error ? error.message : 'unknown'}`,
      )

      await this.auditLogService.record({
        actorUserId: params.userId,
        event: 'auth.email-verification.deferred',
        resource: 'user',
        resourceId: params.userId,
        severity: AuditSeverity.WARN,
        metadata: {
          email: params.email,
          reason: error instanceof Error ? error.message : 'unknown',
        },
        ipAddress: params.context.ipAddress,
        userAgent: params.context.userAgent,
      })

      return null
    }
  }

  private shouldUsePortfolioEmailFallback(context: RequestContext) {
    return (
      !this.isProduction() &&
      parseBoolean(this.configService.get<string>('PORTFOLIO_EMAIL_FALLBACK') ?? 'true') &&
      isStrictlyLocalRequestContext(context)
    )
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
        this.logger.warn('COOKIE_SAME_SITE=none sem cookie secure ativo. Aplicando fallback para SameSite=lax.')
        return 'lax'
      }

      return configuredPolicy
    }

    return 'lax'
  }

  private getCsrfSecret() {
    return (
      this.configService.get<string>('CSRF_SECRET') ?? this.configService.get<string>('COOKIE_SECRET') ?? 'change-me'
    )
  }

  private isProduction() {
    return this.configService.get<string>('NODE_ENV') === 'production'
  }

  private async handleFailedLogin(params: {
    actorUserId?: string
    actorFullName?: string
    email: string
    reason: string
    rateLimitKeys: string[]
    context: RequestContext
  }): Promise<never> {
    const rateLimitState = this.pickMostRestrictiveRateLimitState(
      await this.recordAttemptsForKeys(params.rateLimitKeys, (key) => this.authRateLimitService.recordFailure(key)),
    )

    await this.auditLogService.record({
      actorUserId: params.actorUserId,
      event: 'auth.login.failed',
      resource: 'session',
      severity: AuditSeverity.WARN,
      metadata: {
        email: params.email,
        reason: params.reason,
        failedAttempts: rateLimitState.count,
        lockedUntil: rateLimitState.lockedUntil ? new Date(rateLimitState.lockedUntil).toISOString() : null,
      },
      ipAddress: params.context.ipAddress,
      userAgent: params.context.userAgent,
    })

    if (params.actorUserId && params.actorFullName) {
      void this.sendFailedLoginAlertIfEnabled(
        {
          id: params.actorUserId,
          email: params.email,
          fullName: params.actorFullName,
        },
        params.context,
        rateLimitState.count,
      )
    }

    if (rateLimitState.lockedUntil) {
      const retryAfterSeconds = Math.ceil((rateLimitState.lockedUntil - Date.now()) / 1000)
      throw new HttpException(
        `Muitas tentativas de acesso. Tente novamente em ${retryAfterSeconds} segundo(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    throw new UnauthorizedException('Credenciais invalidas.')
  }

  private async handleUnverifiedLogin(
    user: {
      id: string
      email: string
      fullName: string
    },
    context: RequestContext,
  ) {
    try {
      const verificationDelivery = await this.sendEmailVerificationCode({
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        context,
        trigger: 'login',
      })

      if (verificationDelivery.deliveryMode === 'preview') {
        return 'Seu email ainda nao foi confirmado. Abra a tela de verificacao para usar o codigo de apoio liberado neste navegador.'
      }

      return 'Seu email ainda nao foi confirmado. Enviamos um codigo para liberar o primeiro acesso.'
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
        return 'Seu email ainda nao foi confirmado. Aguarde alguns minutos antes de solicitar um novo codigo.'
      }

      if (isServiceUnavailable(error)) {
        return 'Seu email ainda nao foi confirmado. A validacao foi aberta, mas o envio do codigo esta indisponivel no momento. Tente reenviar em alguns instantes.'
      }

      throw error
    }
  }

  private async sendEmailVerificationCode(params: {
    userId: string
    email: string
    fullName: string
    context: RequestContext
    trigger: 'register' | 'login' | 'manual'
    bypassRateLimit?: boolean
  }): Promise<EmailVerificationDeliveryResult> {
    const rateLimitKeys = [
      this.authRateLimitService.buildEmailVerificationKey(params.email, params.context.ipAddress),
      this.authRateLimitService.buildEmailVerificationEmailKey(params.email),
    ]

    if (!params.bypassRateLimit) {
      await this.assertAllowedForKeys(rateLimitKeys, (key) =>
        this.authRateLimitService.assertEmailVerificationAllowed(key),
      )
    }

    const rateLimitState = params.bypassRateLimit
      ? null
      : this.pickMostRestrictiveRateLimitState(
          await this.recordAttemptsForKeys(rateLimitKeys, (key) =>
            this.authRateLimitService.recordEmailVerificationAttempt(key),
          ),
        )

    const verificationCode = await this.issueOneTimeCode({
      userId: params.userId,
      email: params.email,
      purpose: OneTimeCodePurpose.EMAIL_VERIFICATION,
      ttlMinutes: this.getEmailVerificationTtlMinutes(),
      context: params.context,
    })

    try {
      const delivery = await this.mailerService.sendEmailVerificationEmail({
        to: params.email,
        fullName: params.fullName,
        code: verificationCode.code,
        expiresInMinutes: this.getEmailVerificationTtlMinutes(),
      })

      if (delivery.mode === 'log' && this.shouldUsePortfolioEmailFallback(params.context)) {
        await this.auditLogService.record({
          actorUserId: params.userId,
          event: 'auth.email-verification.preview_enabled',
          resource: 'user',
          resourceId: params.userId,
          severity: AuditSeverity.WARN,
          metadata: {
            email: params.email,
            trigger: params.trigger,
            reason: 'log_delivery_mode',
            deliveryMode: delivery.mode,
            attempts: rateLimitState?.count ?? null,
            lockedUntil: rateLimitState?.lockedUntil ? new Date(rateLimitState.lockedUntil).toISOString() : null,
          },
          ipAddress: params.context.ipAddress,
          userAgent: params.context.userAgent,
        })

        return {
          deliveryMode: 'preview',
          previewCode: verificationCode.code,
          previewExpiresAt: verificationCode.expiresAt,
        }
      }

      await this.auditLogService.record({
        actorUserId: params.userId,
        event: 'auth.email-verification.requested',
        resource: 'user',
        resourceId: params.userId,
        metadata: {
          email: params.email,
          trigger: params.trigger,
          deliveryMode: delivery.mode,
          attempts: rateLimitState?.count ?? null,
          lockedUntil: rateLimitState?.lockedUntil ? new Date(rateLimitState.lockedUntil).toISOString() : null,
        },
        ipAddress: params.context.ipAddress,
        userAgent: params.context.userAgent,
      })

      return {
        deliveryMode: 'email',
      }
    } catch (error) {
      if (isServiceUnavailable(error) && this.shouldUsePortfolioEmailFallback(params.context)) {
        await this.auditLogService.record({
          actorUserId: params.userId,
          event: 'auth.email-verification.preview_enabled',
          resource: 'user',
          resourceId: params.userId,
          severity: AuditSeverity.WARN,
          metadata: {
            email: params.email,
            trigger: params.trigger,
            reason: error instanceof Error ? error.message : 'unknown',
            attempts: rateLimitState?.count ?? null,
            lockedUntil: rateLimitState?.lockedUntil ? new Date(rateLimitState.lockedUntil).toISOString() : null,
          },
          ipAddress: params.context.ipAddress,
          userAgent: params.context.userAgent,
        })

        this.logger.warn(
          `Entrega de email indisponivel para ${params.email}. Codigo de apoio liberado no modo portfolio.`,
        )

        return {
          deliveryMode: 'preview',
          previewCode: verificationCode.code,
          previewExpiresAt: verificationCode.expiresAt,
        }
      }

      await this.prisma.oneTimeCode.deleteMany({
        where: {
          id: verificationCode.recordId,
        },
      })

      await this.auditLogService.record({
        actorUserId: params.userId,
        event: 'auth.email-verification.delivery_failed',
        resource: 'user',
        resourceId: params.userId,
        severity: AuditSeverity.ERROR,
        metadata: {
          email: params.email,
          trigger: params.trigger,
          reason: error instanceof Error ? error.message : 'unknown',
        },
        ipAddress: params.context.ipAddress,
        userAgent: params.context.userAgent,
      })

      throw error
    }
  }

  private async issueOneTimeCode(params: {
    userId: string
    email: string
    purpose: OneTimeCodePurpose
    ttlMinutes: number
    context: RequestContext
  }) {
    const code = generateNumericCode()
    const expiresAt = new Date(Date.now() + params.ttlMinutes * 60 * 1000)

    await this.prisma.oneTimeCode.updateMany({
      where: {
        userId: params.userId,
        purpose: params.purpose,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    })

    const record = await this.prisma.oneTimeCode.create({
      data: {
        userId: params.userId,
        email: params.email,
        purpose: params.purpose,
        codeHash: hashToken(code),
        expiresAt,
        ipAddress: params.context.ipAddress,
        userAgent: params.context.userAgent,
      },
    })

    return {
      recordId: record.id,
      code,
      expiresAt,
    }
  }

  private async sendPasswordChangedNotice(
    user: {
      id: string
      email: string
      fullName: string
    },
    context: RequestContext,
    changedAt: Date,
  ) {
    try {
      const delivery = await this.mailerService.sendPasswordChangedEmail({
        to: user.email,
        fullName: user.fullName,
        changedAt,
        ipAddress: context.ipAddress,
      })

      await this.auditLogService.record({
        actorUserId: user.id,
        event: 'auth.password-reset.notification_sent',
        resource: 'user',
        resourceId: user.id,
        metadata: {
          email: user.email,
          deliveryMode: delivery.mode,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
    } catch (error) {
      this.logger.warn(
        `Falha ao enviar notificacao de senha alterada para ${user.email}: ${error instanceof Error ? error.message : 'unknown'}`,
      )
    }
  }

  private async sendLoginAlertIfEnabled(
    user: {
      id: string
      email: string
      fullName: string
    },
    context: RequestContext,
    currentSessionId: string,
  ) {
    if (!parseBoolean(this.configService.get<string>('LOGIN_ALERT_EMAILS_ENABLED'))) {
      return
    }

    const previousSessions = await this.prisma.session.findMany({
      where: {
        userId: user.id,
        id: {
          not: currentSessionId,
        },
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
      },
      take: 12,
      orderBy: {
        createdAt: 'desc',
      },
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
      const delivery = await this.mailerService.sendLoginAlertEmail({
        to: user.email,
        fullName: user.fullName,
        occurredAt: new Date(),
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      await this.auditLogService.record({
        actorUserId: user.id,
        event: 'auth.login.notification_sent',
        resource: 'session',
        metadata: {
          email: user.email,
          deliveryMode: delivery.mode,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
    } catch (error) {
      this.logger.warn(
        `Falha ao enviar alerta de login para ${user.email}: ${error instanceof Error ? error.message : 'unknown'}`,
      )
    }
  }

  private async sendFailedLoginAlertIfEnabled(
    user: {
      id: string
      email: string
      fullName: string
    },
    context: RequestContext,
    failedAttempts: number,
  ) {
    if (!parseBoolean(this.configService.get<string>('FAILED_LOGIN_ALERTS_ENABLED'))) {
      return
    }

    const threshold = Math.max(Number(this.configService.get<string>('FAILED_LOGIN_ALERT_THRESHOLD') ?? 3), 1)

    if (failedAttempts < threshold) {
      return
    }

    if (failedAttempts > threshold) {
      return
    }

    try {
      const delivery = await this.mailerService.sendFailedLoginAlertEmail({
        to: user.email,
        fullName: user.fullName,
        occurredAt: new Date(),
        attemptCount: failedAttempts,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        locationSummary: context.ipAddress ? 'Local aproximado indisponivel no momento' : null,
      })

      await this.auditLogService.record({
        actorUserId: user.id,
        event: 'auth.login.failed_notification_sent',
        resource: 'session',
        metadata: {
          email: user.email,
          failedAttempts,
          deliveryMode: delivery.mode,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
    } catch (error) {
      this.logger.warn(
        `Falha ao enviar alerta de tentativas suspeitas para ${user.email}: ${error instanceof Error ? error.message : 'unknown'}`,
      )
    }
  }

  private async assertAllowedForKeys(keys: string[], assertion: (key: string) => Promise<void>) {
    await Promise.all(keys.map((key) => assertion(key)))
  }

  private async recordAttemptsForKeys(keys: string[], recorder: (key: string) => Promise<RateLimitState>) {
    return Promise.all(keys.map((key) => recorder(key)))
  }

  private async clearRateLimitKeys(keys: string[]) {
    await Promise.all(keys.map((key) => this.authRateLimitService.clear(key)))
  }

  private pickMostRestrictiveRateLimitState(states: RateLimitState[]): RateLimitState {
    return states.reduce((current, candidate) => {
      const currentLockedUntil = current.lockedUntil ?? 0
      const candidateLockedUntil = candidate.lockedUntil ?? 0

      if (candidateLockedUntil > currentLockedUntil) {
        return candidate
      }

      if (candidateLockedUntil === currentLockedUntil && candidate.count > current.count) {
        return candidate
      }

      return current
    })
  }
}

const publicUserSelect = {
  id: true,
  companyOwnerId: true,
  fullName: true,
  companyName: true,
  companyStreetLine1: true,
  companyStreetNumber: true,
  companyAddressComplement: true,
  companyDistrict: true,
  companyCity: true,
  companyState: true,
  companyPostalCode: true,
  companyCountry: true,
  companyLatitude: true,
  companyLongitude: true,
  hasEmployees: true,
  employeeCount: true,
  role: true,
  email: true,
  emailVerifiedAt: true,
  preferredCurrency: true,
  status: true,
} as const

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function sanitizeEmployeeCodeForLogin(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '-')
}

function hashToken(rawToken: string) {
  return createHash('sha256').update(rawToken).digest('hex')
}

function toAuthUser(
  user: {
    id: string
    companyOwnerId: string | null
    fullName: string
    companyName: string | null
    companyStreetLine1?: string | null
    companyStreetNumber?: string | null
    companyAddressComplement?: string | null
    companyDistrict?: string | null
    companyCity?: string | null
    companyState?: string | null
    companyPostalCode?: string | null
    companyCountry?: string | null
    companyLatitude?: number | null
    companyLongitude?: number | null
    hasEmployees?: boolean
    employeeCount?: number
    employeeAccount?: {
      id: string
      employeeCode: string
    } | null
    role?: UserRole
    email: string
    emailVerifiedAt?: Date | null
    preferredCurrency: CurrencyCode
    status: UserStatus
  },
  options: {
    sessionId?: string
    analytics: boolean
    marketing: boolean
    evaluationAccess: AuthContext['evaluationAccess']
    employeeId?: string | null
    employeeCode?: string | null
  },
): AuthContext {
  const workspaceOwnerUserId = user.role === UserRole.STAFF ? (user.companyOwnerId ?? user.id) : user.id
  const employeeId = options.employeeId ?? user.employeeAccount?.id ?? null
  const employeeCode = options.employeeCode ?? user.employeeAccount?.employeeCode ?? null

  return {
    userId: user.id,
    sessionId: options.sessionId ?? '',
    role: user.role ?? UserRole.OWNER,
    workspaceOwnerUserId,
    companyOwnerUserId: user.companyOwnerId,
    employeeId,
    employeeCode,
    email: user.email,
    fullName: user.fullName,
    companyName: user.companyName,
    companyLocation: {
      streetLine1: user.companyStreetLine1 ?? null,
      streetNumber: user.companyStreetNumber ?? null,
      addressComplement: user.companyAddressComplement ?? null,
      district: user.companyDistrict ?? null,
      city: user.companyCity ?? null,
      state: user.companyState ?? null,
      postalCode: user.companyPostalCode ?? null,
      country: user.companyCountry ?? null,
      latitude: user.companyLatitude ?? null,
      longitude: user.companyLongitude ?? null,
      precision: user.companyLatitude != null && user.companyLongitude != null ? 'address' : 'city',
    },
    workforce: {
      hasEmployees: user.hasEmployees ?? false,
      employeeCount: user.employeeCount ?? 0,
    },
    emailVerified: Boolean((user as { emailVerifiedAt?: Date | null }).emailVerifiedAt),
    preferredCurrency: user.preferredCurrency,
    status: user.status,
    evaluationAccess: options.evaluationAccess,
    cookiePreferences: {
      necessary: true,
      analytics: options.analytics,
      marketing: options.marketing,
    },
  }
}

function generateNumericCode() {
  return randomInt(100000, 1000000).toString()
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null

  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle)
    }
  }
}

function parseBoolean(value: string | undefined) {
  if (value == null) {
    return false
  }

  return value === 'true'
}

function sanitizePostalCode(value: string) {
  const normalized = sanitizePlainText(value, 'CEP', {
    allowEmpty: false,
    rejectFormula: true,
  })!
  const digits = normalized.replace(/\D/g, '')

  if (digits.length !== 8) {
    throw new BadRequestException('Informe um CEP valido para localizar a empresa com precisao.')
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

function normalizeComparableValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

function isStrictlyLocalRequestContext(context: RequestContext) {
  const ipAddress = normalizeComparableValue(context.ipAddress)
  const host = extractHostCandidate(context.host)
  const originHost = extractHostFromUrlCandidate(context.origin)
  const refererHost = extractHostFromUrlCandidate(context.referer)

  const hostCandidates = [host, originHost, refererHost].filter((value): value is string => Boolean(value))

  return isLoopbackIp(ipAddress) && hostCandidates.every(isLocalHost)
}

function extractHostCandidate(value: string | null | undefined) {
  if (!value) {
    return null
  }

  return value.trim().split(':')[0]?.toLowerCase() ?? null
}

function extractHostFromUrlCandidate(value: string | null | undefined) {
  if (!value) {
    return null
  }

  try {
    return new URL(value).hostname.toLowerCase()
  } catch {
    return null
  }
}

function isLoopbackIp(value: string) {
  return value === '127.0.0.1' || value === '::1' || value === 'localhost'
}

function isLocalHost(value: string) {
  return value === 'localhost' || value === '127.0.0.1'
}

function isServiceUnavailable(error: unknown) {
  return error instanceof HttpException && error.getStatus() === HttpStatus.SERVICE_UNAVAILABLE
}

type EmailVerificationDeliveryResult = {
  deliveryMode: 'email' | 'preview'
  previewCode?: string
  previewExpiresAt?: Date
}

type RateLimitState = Awaited<ReturnType<AuthRateLimitService['recordFailure']>>
