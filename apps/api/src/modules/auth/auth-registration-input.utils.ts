import { BadRequestException } from '@nestjs/common'
import { CurrencyCode, UserRole } from '@prisma/client'
import type { RegisterDto } from './dto/register.dto'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import { sanitizePostalCode } from './auth-shared.util'

export type SanitizedRegistrationInput = {
  fullName: string
  companyName: string | null
  companyStreetLine1: string
  companyStreetNumber: string
  companyAddressComplement: string | null
  companyDistrict: string
  companyCity: string
  companyState: string
  companyPostalCode: string
  companyCountry: string
  employeeCount: number
  normalizedEmail: string
}

type CompanyLocation = {
  streetLine1?: string | null
  streetNumber?: string | null
  district?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
  latitude?: number | null
  longitude?: number | null
}

type ResolvedCompanyAddress = {
  companyStreetLine1: string
  companyStreetNumber: string
  companyDistrict: string
  companyCity: string
  companyState: string
  companyPostalCode: string
  companyCountry: string
  companyLatitude: number | null
  companyLongitude: number | null
}

const EMPTY_COMPANY_LOCATION: Required<CompanyLocation> = {
  streetLine1: null,
  streetNumber: null,
  district: null,
  city: null,
  state: null,
  postalCode: null,
  country: null,
  latitude: null,
  longitude: null,
}

export function assertRegistrationInput(dto: RegisterDto) {
  if (!dto.acceptTerms || !dto.acceptPrivacy) {
    throw new BadRequestException('Voce precisa aceitar os termos de uso e o aviso de privacidade.')
  }

  if (dto.hasEmployees && dto.employeeCount < 1) {
    throw new BadRequestException('Informe quantos funcionarios a empresa possui.')
  }
}

export function sanitizeRegistrationInput(dto: RegisterDto): SanitizedRegistrationInput {
  return {
    fullName: sanitizeRequiredRegistrationText(dto.fullName, 'Nome completo'),
    companyName: sanitizePlainText(dto.companyName, 'Empresa', { allowEmpty: true, rejectFormula: true }),
    companyStreetLine1: sanitizeRequiredRegistrationText(dto.companyStreetLine1, 'Rua ou avenida'),
    companyStreetNumber: sanitizeRequiredRegistrationText(dto.companyStreetNumber, 'Numero'),
    companyAddressComplement: sanitizePlainText(dto.companyAddressComplement, 'Complemento', {
      allowEmpty: true,
      rejectFormula: true,
    }),
    companyDistrict: sanitizeRequiredRegistrationText(dto.companyDistrict, 'Bairro ou regiao'),
    companyCity: sanitizeRequiredRegistrationText(dto.companyCity, 'Cidade'),
    companyState: sanitizeRequiredRegistrationText(dto.companyState, 'Estado'),
    companyPostalCode: sanitizePostalCode(dto.companyPostalCode),
    companyCountry: sanitizeRequiredRegistrationText(dto.companyCountry, 'Pais'),
    employeeCount: dto.hasEmployees ? dto.employeeCount : 0,
    normalizedEmail: dto.email.trim().toLowerCase(),
  }
}

export function buildRegistrationUserData(params: {
  dto: RegisterDto
  input: SanitizedRegistrationInput
  passwordHash: string
  companyLocation: CompanyLocation | null
}) {
  const { dto, input, passwordHash, companyLocation } = params
  const address = resolveCompanyAddress({ input, companyLocation })

  return {
    fullName: input.fullName,
    companyOwnerId: null,
    companyName: input.companyName,
    ...address,
    companyAddressComplement: input.companyAddressComplement,
    hasEmployees: dto.hasEmployees,
    employeeCount: input.employeeCount,
    role: UserRole.OWNER,
    email: input.normalizedEmail,
    passwordHash,
    preferredCurrency: CurrencyCode.BRL,
    emailVerifiedAt: null,
  }
}

function resolveCompanyAddress(params: {
  input: SanitizedRegistrationInput
  companyLocation: CompanyLocation | null
}): ResolvedCompanyAddress {
  const { input } = params
  const location = params.companyLocation ?? EMPTY_COMPANY_LOCATION

  return {
    companyStreetLine1: preferGeocodedValue(location.streetLine1, input.companyStreetLine1),
    companyStreetNumber: preferGeocodedValue(location.streetNumber, input.companyStreetNumber),
    companyDistrict: preferGeocodedValue(location.district, input.companyDistrict),
    companyCity: preferGeocodedValue(location.city, input.companyCity),
    companyState: preferGeocodedValue(location.state, input.companyState),
    companyPostalCode: preferGeocodedValue(location.postalCode, input.companyPostalCode),
    companyCountry: preferGeocodedValue(location.country, input.companyCountry),
    companyLatitude: resolveGeocodedNumber(location.latitude),
    companyLongitude: resolveGeocodedNumber(location.longitude),
  }
}

function preferGeocodedValue(geocodedValue: string | null | undefined, fallbackValue: string) {
  return geocodedValue ?? fallbackValue
}

function resolveGeocodedNumber(geocodedValue: number | null | undefined) {
  return geocodedValue ?? null
}

function sanitizeRequiredRegistrationText(value: string, fieldLabel: string) {
  const sanitized = sanitizePlainText(value, fieldLabel, { allowEmpty: false, rejectFormula: true })

  if (!sanitized) {
    throw new BadRequestException(`${fieldLabel} e obrigatorio.`)
  }

  return sanitized
}
