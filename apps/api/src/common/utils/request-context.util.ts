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

  return {
    ipAddress: firstForwardedIp ?? request.ip ?? null,
    userAgent: request.get('user-agent') ?? null,
  }
}
