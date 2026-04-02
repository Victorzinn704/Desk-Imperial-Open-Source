import type { ConfigService } from '@nestjs/config'

export function normalizeOrigin(value?: string | null) {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.replace(/\/$/, '')
  }

  return `https://${trimmed}`.replace(/\/$/, '')
}

export function getAllowedOrigins(configService: ConfigService) {
  return getAllowedOriginsFromValues({
    APP_URL: configService.get<string>('APP_URL'),
    NEXT_PUBLIC_APP_URL: configService.get<string>('NEXT_PUBLIC_APP_URL'),
    RAILWAY_SERVICE_IMPERIAL_DESK_WEB_URL: configService.get<string>('RAILWAY_SERVICE_IMPERIAL_DESK_WEB_URL'),
    NODE_ENV: configService.get<string>('NODE_ENV'),
  })
}

export function getAllowedOriginsFromValues(values: {
  APP_URL?: string
  NEXT_PUBLIC_APP_URL?: string
  RAILWAY_SERVICE_IMPERIAL_DESK_WEB_URL?: string
  NODE_ENV?: string
}) {
  const allowed = new Set<string>()
  const appUrl = normalizeOrigin(values.APP_URL)
  const publicAppUrl = normalizeOrigin(values.NEXT_PUBLIC_APP_URL)
  const railwayWebUrl = normalizeOrigin(values.RAILWAY_SERVICE_IMPERIAL_DESK_WEB_URL)
  const isProduction = values.NODE_ENV === 'production'

  ;[appUrl, publicAppUrl, railwayWebUrl, !isProduction ? 'http://localhost:3000' : null].forEach((origin) => {
    if (origin) {
      allowed.add(origin)
    }
  })

  return Array.from(allowed)
}

export function isAllowedOrigin(origin: string, allowedOrigins: string[]) {
  const normalizedOrigin = normalizeOrigin(origin)
  return normalizedOrigin ? allowedOrigins.includes(normalizedOrigin) : false
}
