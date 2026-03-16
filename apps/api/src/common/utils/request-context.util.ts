import type { Request } from 'express'

export type RequestContext = {
  ipAddress: string | null
  userAgent: string | null
}

export function extractRequestContext(request: Request): RequestContext {
  const forwardedFor = request.headers['x-forwarded-for']
  const firstForwardedIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(',')[0]?.trim()
  const rawIp = request.ip ?? firstForwardedIp ?? null

  return {
    ipAddress: normalizeIpAddress(rawIp),
    userAgent: request.get('user-agent') ?? null,
  }
}

function normalizeIpAddress(ipAddress: string | null) {
  if (!ipAddress) {
    return null
  }

  const normalized = ipAddress.trim()
  if (!normalized) {
    return null
  }

  if (normalized === '::1') {
    return '127.0.0.1'
  }

  return normalized.startsWith('::ffff:') ? normalized.slice(7) : normalized
}
