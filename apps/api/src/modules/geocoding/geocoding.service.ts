import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'

type NominatimResult = {
  lat: string
  lon: string
  address?: {
    road?: string
    house_number?: string
    suburb?: string
    neighbourhood?: string
    quarter?: string
    city_district?: string
    city?: string
    town?: string
    village?: string
    state?: string
    postcode?: string
    country?: string
  }
}

type GeocodeInput = {
  streetLine1?: string | null
  streetNumber?: string | null
  district?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
}

type ViaCepResult = {
  cep?: string
  logradouro?: string
  complemento?: string
  bairro?: string
  localidade?: string
  uf?: string
  estado?: string
  erro?: boolean
}

export type GeocodedLocation = {
  streetLine1: string | null
  streetNumber: string | null
  district: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
  latitude: number
  longitude: number
  label: string
  precision: 'city' | 'address'
}

export type PostalCodeLookupResult = {
  postalCode: string
  streetLine1: string | null
  addressComplement: string | null
  district: string | null
  city: string | null
  state: string | null
  stateName: string | null
  country: string
  source: 'viacep'
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name)
  private readonly cache = new Map<
    string,
    {
      expiresAt: number
      result: GeocodedLocation | null
    }
  >()
  private readonly postalCodeCache = new Map<
    string,
    {
      expiresAt: number
      result: PostalCodeLookupResult | null
    }
  >()
  private nextAllowedRequestAt = 0
  private nextPostalCodeLookupAt = 0

  constructor(private readonly configService: ConfigService) {}

  async lookupPostalCode(postalCode: string): Promise<PostalCodeLookupResult | null> {
    const normalizedPostalCode = normalizePostalCode(postalCode)

    if (!normalizedPostalCode) {
      return null
    }

    const now = Date.now()
    const cached = this.postalCodeCache.get(normalizedPostalCode)
    if (cached && cached.expiresAt > now) {
      return cached.result
    }

    const waitTime = this.nextPostalCodeLookupAt - now
    if (waitTime > 0) {
      await wait(waitTime)
    }

    this.nextPostalCodeLookupAt = Date.now() + 300

    try {
      const response = await fetch(`${this.getPostalLookupBaseUrl()}${normalizedPostalCode}/json/`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': this.getUserAgent(),
        },
      })

      if (response.status === 400) {
        this.postalCodeCache.set(normalizedPostalCode, {
          expiresAt: Date.now() + 5 * 60 * 1000,
          result: null,
        })
        return null
      }

      if (!response.ok) {
        throw new Error(`ViaCEP respondeu com status ${response.status}.`)
      }

      const payload = (await response.json()) as ViaCepResult

      if (payload.erro === true) {
        this.postalCodeCache.set(normalizedPostalCode, {
          expiresAt: Date.now() + 30 * 60 * 1000,
          result: null,
        })
        return null
      }

      const result = mapViaCepResult(payload, normalizedPostalCode)

      this.postalCodeCache.set(normalizedPostalCode, {
        expiresAt: Date.now() + this.getCacheTtlSeconds() * 1000,
        result,
      })

      return result
    } catch (error) {
      this.logger.warn(
        error instanceof Error
          ? `Falha ao consultar CEP "${normalizedPostalCode}": ${error.message}`
          : `Falha ao consultar CEP "${normalizedPostalCode}".`,
      )

      throw new ServiceUnavailableException('Nao foi possivel consultar o CEP agora. Tente novamente em instantes.')
    }
  }

  async geocodeCityLocation(input: {
    district?: string | null
    city?: string | null
    state?: string | null
    country?: string | null
  }): Promise<GeocodedLocation | null> {
    return this.geocodeQuery(buildCityQuery(input), input, 'city')
  }

  async geocodeAddressLocation(input: {
    streetLine1?: string | null
    streetNumber?: string | null
    district?: string | null
    city?: string | null
    state?: string | null
    postalCode?: string | null
    country?: string | null
  }): Promise<GeocodedLocation | null> {
    return this.geocodeQuery(buildAddressQuery(input), input, 'address')
  }

  private async geocodeQuery(query: string, fallback: GeocodeInput, precision: 'city' | 'address') {
    if (!query) {
      return null
    }

    const cacheKey = `${precision}:${query.toLowerCase()}`
    const now = Date.now()
    const cached = this.cache.get(cacheKey)
    if (cached && cached.expiresAt > now) {
      return cached.result
    }

    const waitTime = this.nextAllowedRequestAt - now
    if (waitTime > 0) {
      await wait(waitTime)
    }

    this.nextAllowedRequestAt = Date.now() + 1100

    try {
      const url = new URL(this.getBaseUrl())
      url.searchParams.set('format', 'jsonv2')
      url.searchParams.set('limit', '1')
      url.searchParams.set('addressdetails', '1')
      url.searchParams.set('q', query)

      const contactEmail = this.configService.get<string>('GEOCODING_CONTACT_EMAIL')?.trim()
      if (contactEmail) {
        url.searchParams.set('email', contactEmail)
      }

      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.7',
          'User-Agent': this.getUserAgent(),
        },
      })

      if (!response.ok) {
        throw new Error(`Nominatim respondeu com status ${response.status}.`)
      }

      const payload = (await response.json()) as NominatimResult[]
      const firstResult = payload[0]
      const result = firstResult ? mapNominatimResult(firstResult, fallback, precision) : null

      this.cache.set(cacheKey, {
        expiresAt: Date.now() + this.getCacheTtlSeconds() * 1000,
        result,
      })

      return result
    } catch (error) {
      this.logger.warn(
        error instanceof Error
          ? `Falha ao geocodificar "${query}": ${error.message}`
          : `Falha ao geocodificar "${query}".`,
      )

      this.cache.set(cacheKey, {
        expiresAt: Date.now() + 5 * 60 * 1000,
        result: null,
      })

      return null
    }
  }

  private getBaseUrl() {
    return this.configService.get<string>('GEOCODING_URL')?.trim() || 'https://nominatim.openstreetmap.org/search'
  }

  private getPostalLookupBaseUrl() {
    return this.configService.get<string>('POSTAL_CODE_LOOKUP_URL')?.trim() || 'https://viacep.com.br/ws/'
  }

  private getCacheTtlSeconds() {
    const configuredTtl = Number(this.configService.get<string>('GEOCODING_CACHE_SECONDS') ?? 86400)
    return Math.max(configuredTtl, 300)
  }

  private getUserAgent() {
    const appName = this.configService.get<string>('APP_NAME')?.trim() || 'partner-portal'
    return `${appName}/1.0 (partner-portal-geocoding)`
  }
}

function normalizePostalCode(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  return /^\d{8}$/.test(digits) ? digits : null
}

function formatPostalCode(value: string) {
  return `${value.slice(0, 5)}-${value.slice(5)}`
}

function buildCityQuery(input: {
  district?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
}) {
  return [input.district, input.city, input.state, input.country]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(', ')
}

function buildAddressQuery(input: GeocodeInput) {
  const streetLabel = [input.streetLine1?.trim(), input.streetNumber?.trim()].filter(Boolean).join(', ')

  return [streetLabel, input.district, input.city, input.state, input.postalCode, input.country]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(', ')
}

function mapNominatimResult(
  result: NominatimResult,
  fallback: GeocodeInput,
  precision: 'city' | 'address',
): GeocodedLocation | null {
  const latitude = Number.parseFloat(result.lat)
  const longitude = Number.parseFloat(result.lon)

  if (!(Number.isFinite(latitude) && Number.isFinite(longitude))) {
    return null
  }

  const streetLine1 = result.address?.road || fallback.streetLine1?.trim() || null
  const streetNumber = result.address?.house_number || fallback.streetNumber?.trim() || null
  const district =
    result.address?.suburb ||
    result.address?.neighbourhood ||
    result.address?.quarter ||
    result.address?.city_district ||
    fallback.district?.trim() ||
    null
  const city = result.address?.city || result.address?.town || result.address?.village || fallback.city?.trim() || null
  const state = result.address?.state || fallback.state?.trim() || null
  const postalCode = result.address?.postcode || fallback.postalCode?.trim() || null
  const country = result.address?.country || fallback.country?.trim() || null
  const streetLabel = streetLine1 ? [streetLine1, streetNumber].filter(Boolean).join(', ') : null

  return {
    streetLine1,
    streetNumber,
    district,
    city,
    state,
    postalCode,
    country,
    latitude,
    longitude,
    label: [streetLabel, district, city, state, postalCode, country].filter(Boolean).join(', '),
    precision,
  }
}

function mapViaCepResult(payload: ViaCepResult, normalizedPostalCode: string): PostalCodeLookupResult {
  return {
    postalCode: payload.cep?.trim() || formatPostalCode(normalizedPostalCode),
    streetLine1: payload.logradouro?.trim() || null,
    addressComplement: payload.complemento?.trim() || null,
    district: payload.bairro?.trim() || null,
    city: payload.localidade?.trim() || null,
    state: payload.uf?.trim() || null,
    stateName: payload.estado?.trim() || null,
    country: 'Brasil',
    source: 'viacep',
  }
}

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}
