import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

type NominatimResult = {
  lat: string
  lon: string
  address?: {
    suburb?: string
    neighbourhood?: string
    quarter?: string
    city_district?: string
    city?: string
    town?: string
    village?: string
    state?: string
    country?: string
  }
}

export type GeocodedLocation = {
  district: string | null
  city: string | null
  state: string | null
  country: string | null
  latitude: number
  longitude: number
  label: string
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
  private nextAllowedRequestAt = 0

  constructor(private readonly configService: ConfigService) {}

  async geocodeCityLocation(input: {
    district?: string | null
    city?: string | null
    state?: string | null
    country?: string | null
  }): Promise<GeocodedLocation | null> {
    const query = buildLocationQuery(input)
    if (!query) {
      return null
    }

    const cacheKey = query.toLowerCase()
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
      const result = firstResult ? mapNominatimResult(firstResult, input) : null

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
    return (
      this.configService.get<string>('GEOCODING_URL')?.trim() ||
      'https://nominatim.openstreetmap.org/search'
    )
  }

  private getCacheTtlSeconds() {
    const configuredTtl = Number(this.configService.get<string>('GEOCODING_CACHE_SECONDS') ?? 86400)
    return Math.max(configuredTtl, 300)
  }

  private getUserAgent() {
    const appName = this.configService.get<string>('APP_NAME')?.trim() || 'partner-portal'
    return `${appName}/1.0 (sales-map-dashboard)`
  }
}

function buildLocationQuery(input: {
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

function mapNominatimResult(
  result: NominatimResult,
  fallback: {
    district?: string | null
    city?: string | null
    state?: string | null
    country?: string | null
  },
): GeocodedLocation | null {
  const latitude = Number.parseFloat(result.lat)
  const longitude = Number.parseFloat(result.lon)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  const district =
    result.address?.suburb ||
    result.address?.neighbourhood ||
    result.address?.quarter ||
    result.address?.city_district ||
    fallback.district?.trim() ||
    null
  const city = result.address?.city || result.address?.town || result.address?.village || fallback.city?.trim() || null
  const state = result.address?.state || fallback.state?.trim() || null
  const country = result.address?.country || fallback.country?.trim() || null

  return {
    district,
    city,
    state,
    country,
    latitude,
    longitude,
    label: [district, city, state, country].filter(Boolean).join(', '),
  }
}

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}
