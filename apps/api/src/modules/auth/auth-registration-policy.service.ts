import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { parseBoolean } from './auth-shared.util'

@Injectable()
export class AuthRegistrationPolicyService {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  getConsentVersion() {
    return this.configService.get<string>('CONSENT_VERSION') ?? '2026.03'
  }

  isGeocodingStrict() {
    return parseBoolean(this.configService.get<string>('REGISTRATION_GEOCODING_STRICT'))
  }

  getGeocodingTimeoutMs() {
    return this.clampConfiguredNumber({
      key: 'REGISTRATION_GEOCODING_TIMEOUT_MS',
      fallback: 1800,
      minimum: 300,
      maximum: 5000,
    })
  }

  getVerificationDispatchTimeoutMs() {
    return this.clampConfiguredNumber({
      key: 'REGISTRATION_VERIFICATION_DISPATCH_TIMEOUT_MS',
      fallback: 2500,
      minimum: 400,
      maximum: 7000,
    })
  }

  private clampConfiguredNumber(params: { key: string; fallback: number; minimum: number; maximum: number }) {
    const configuredValue = Number(this.configService.get<string>(params.key) ?? params.fallback)
    const value = Number.isFinite(configuredValue) ? configuredValue : params.fallback

    return Math.min(Math.max(value, params.minimum), params.maximum)
  }
}
