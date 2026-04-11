import { BadRequestException, ConflictException, Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CurrencyCode, UserRole } from '@prisma/client'
import * as argon2 from 'argon2'
import type { RequestContext } from '../../common/utils/request-context.util'
import { PrismaService } from '../../database/prisma.service'
import { ConsentService } from '../consent/consent.service'
import { GeocodingService } from '../geocoding/geocoding.service'
import { MailerService } from '../mailer/mailer.service'
import { AuditLogService } from '../monitoring/audit-log.service'
import type { RegisterDto } from './dto/register.dto'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import { parseBoolean, publicUserSelect, sanitizePostalCode, withTimeout } from './auth-shared.util'
import type { AuthEmailVerificationService } from './auth-email-verification.service'

@Injectable()
export class AuthRegistrationService {
  private readonly logger = new Logger(AuthRegistrationService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(ConsentService) private readonly consentService: ConsentService,
    @Inject(GeocodingService) private readonly geocodingService: GeocodingService,
    @Inject(MailerService) private readonly mailerService: MailerService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject('AuthEmailVerificationService') private readonly emailVerificationService: AuthEmailVerificationService,
  ) {}

  async register(dto: RegisterDto, context: RequestContext) {
    if (!dto.acceptTerms || !dto.acceptPrivacy) {
      throw new BadRequestException('Voce precisa aceitar os termos de uso e o aviso de privacidade.')
    }

    if (dto.hasEmployees && dto.employeeCount < 1) {
      throw new BadRequestException('Informe quantos funcionarios a empresa possui.')
    }

    const normalizedEmail = dto.email.trim().toLowerCase()
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
    const companyName = sanitizePlainText(dto.companyName, 'Empresa', { allowEmpty: true, rejectFormula: true })
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
    const companyCity = sanitizePlainText(dto.companyCity, 'Cidade', { allowEmpty: false, rejectFormula: true })!
    const companyState = sanitizePlainText(dto.companyState, 'Estado', { allowEmpty: false, rejectFormula: true })!
    const companyPostalCode = sanitizePostalCode(dto.companyPostalCode)
    const companyCountry = sanitizePlainText(dto.companyCountry, 'Pais', { allowEmpty: false, rejectFormula: true })!
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
      message:
        verificationDelivery?.deliveryMode === 'preview'
          ? 'Cadastro concluido. O envio de email esta instavel no momento. Tente reenviar o codigo em instantes para concluir a verificacao.'
          : verificationDelivery
            ? 'Cadastro concluido. Enviamos um codigo para confirmar seu email antes do primeiro acesso.'
            : 'Cadastro concluido. O codigo de confirmacao esta sendo processado. Se nao chegar em instantes, use a opcao de reenviar codigo.',
    }
  }

  private getConsentVersion() {
    return this.configService.get<string>('CONSENT_VERSION') ?? '2026.03'
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
  }) {
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
        this.getRegistrationVerificationDispatchTimeoutMs(),
      )
    } catch (error) {
      this.logger.warn(
        `Envio inicial de verificacao de email em cadastro ficou lento/indisponivel para ${params.email}: ${error instanceof Error ? error.message : 'unknown'}`,
      )
      return null
    }
  }
}
