import type { CookieOptions } from 'express'

export const ADMIN_PIN_VERIFICATION_TTL_MS = 10 * 60 * 1000

export const DEV_ADMIN_PIN_COOKIE_NAME = 'partner_admin_pin'
export const PROD_ADMIN_PIN_COOKIE_NAME = '__Host-partner_admin_pin'

export function getAdminPinVerificationCookieName(isProduction: boolean) {
  return isProduction ? PROD_ADMIN_PIN_COOKIE_NAME : DEV_ADMIN_PIN_COOKIE_NAME
}

export function getAdminPinVerificationCookieOptions(options: {
  secure: boolean
  sameSite: 'lax' | 'strict' | 'none'
  expires?: Date
}): CookieOptions {
  return {
    httpOnly: true,
    secure: options.secure,
    sameSite: options.sameSite,
    path: '/',
    ...(options.expires ? { expires: options.expires } : {}),
  }
}
