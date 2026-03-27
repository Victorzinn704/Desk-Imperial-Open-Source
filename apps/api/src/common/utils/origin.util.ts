import type { ConfigService } from '@nestjs/config'

function normalizeOrigin(value?: string | null) {
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
  const allowed = new Set<string>()

  const appUrl = normalizeOrigin(configService.get<string>('APP_URL'))
  const publicAppUrl = normalizeOrigin(configService.get<string>('NEXT_PUBLIC_APP_URL'))
  const railwayWebUrl = normalizeOrigin(configService.get<string>('RAILWAY_SERVICE_IMPERIAL_DESK_WEB_URL'))

  ;[appUrl, publicAppUrl, railwayWebUrl, 'http://localhost:3000'].forEach((origin) => {
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
