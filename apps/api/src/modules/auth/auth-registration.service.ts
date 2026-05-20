import { BadRequestException, ConflictException, Inject, Injectable, Logger } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import * as argon2 from 'argon2'
import type { RequestContext } from '../../common/utils/request-context.util'
import { PrismaService } from '../../database/prisma.service'
import { GeocodingService } from '../geocoding/geocoding.service'
import type { RegisterDto } from './dto/register.dto'
import {
  assertRegistrationInput,
  buildRegistrationUserData,
  type SanitizedRegistrationInput,
  sanitizeRegistrationInput,
} from './auth-registration-input.utils'
import { AuthRegistrationPolicyService } from './auth-registration-policy.service'
import { AuthRegistrationSideEffectsService, buildRegistrationResponse } from './auth-registration-side-effects.service'
import { publicUserSelect, withTimeout } from './auth-shared.util'

@Injectable()
export class AuthRegistrationService {
  private readonly logger = new Logger(AuthRegistrationService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(GeocodingService) private readonly geocodingService: GeocodingService,
    @Inject(AuthRegistrationPolicyService) private readonly policy: AuthRegistrationPolicyService,
    @Inject(AuthRegistrationSideEffectsService)
    private readonly sideEffects: AuthRegistrationSideEffectsService,
  ) {}

  async register(dto: RegisterDto, context: RequestContext) {
    assertRegistrationInput(dto)
    const input = sanitizeRegistrationInput(dto)
    await this.ensureEmailAvailable(input.normalizedEmail)

    const companyLocation = await this.resolveRegistrationCompanyLocation(input)
    this.assertGeocodingPolicy(companyLocation)

    const user = await this.createOwnerUser({
      dto,
      input,
      companyLocation,
      passwordHash: await argon2.hash(dto.password, { type: argon2.argon2id }),
    })

    await this.sideEffects.recordLegalConsent({
      userId: user.id,
      context,
      analytics: dto.analyticsCookies ?? false,
      marketing: dto.marketingCookies ?? false,
    })

    const delivery = await this.sideEffects.sendVerificationCode({
      userId: user.id,
      email: user.email,
      fullName: input.fullName,
      context,
    })

    await this.sideEffects.recordRegisteredUser({ user, context, companyLocation })

    return buildRegistrationResponse({ email: user.email, delivery })
  }

  private async ensureEmailAvailable(normalizedEmail: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      throw new ConflictException('Nao foi possivel concluir o cadastro com os dados informados.')
    }
  }

  private async createOwnerUser(params: {
    dto: RegisterDto
    input: SanitizedRegistrationInput
    companyLocation: Awaited<ReturnType<AuthRegistrationService['resolveRegistrationCompanyLocation']>>
    passwordHash: string
  }) {
    try {
      return await this.prisma.user.create({
        data: buildRegistrationUserData(params),
        select: publicUserSelect,
      })
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('Nao foi possivel concluir o cadastro com os dados informados.')
      }

      throw error
    }
  }

  private assertGeocodingPolicy(
    companyLocation: Awaited<ReturnType<AuthRegistrationService['resolveRegistrationCompanyLocation']>>,
  ) {
    if (companyLocation || !this.policy.isGeocodingStrict()) {
      return
    }

    throw new BadRequestException(
      'Nao foi possivel validar o endereco da empresa com precisao. Revise rua, numero, bairro, cidade, estado e CEP.',
    )
  }

  private async resolveRegistrationCompanyLocation(input: SanitizedRegistrationInput) {
    try {
      return await withTimeout(
        this.geocodingService.geocodeAddressLocation({
          streetLine1: input.companyStreetLine1,
          streetNumber: input.companyStreetNumber,
          district: input.companyDistrict,
          city: input.companyCity,
          state: input.companyState,
          postalCode: input.companyPostalCode,
          country: input.companyCountry,
        }),
        this.policy.getGeocodingTimeoutMs(),
      )
    } catch (error) {
      this.logger.warn(
        `Geocodificacao do cadastro excedeu limite de tempo ou falhou: ${error instanceof Error ? error.message : 'unknown'}`,
      )
      return null
    }
  }
}

function isUniqueConstraintViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}
