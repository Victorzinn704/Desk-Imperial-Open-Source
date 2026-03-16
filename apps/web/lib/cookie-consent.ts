export type CookieConsentChoice = 'accepted' | 'rejected'

type StoredCookieConsent = {
  choice: CookieConsentChoice
  updatedAt: string
  version: string
}

export const CONSENT_STORAGE_KEY = 'partner-portal-cookie-consent'
export const CONSENT_COOKIE_NAME = 'partner_portal_cookie_consent'
export const CONSENT_VERSION = '2026.03.banner.v4'

export function readCookieConsentChoice() {
  if (typeof window === 'undefined') {
    return null
  }

  const localValue = window.localStorage.getItem(CONSENT_STORAGE_KEY)
  if (localValue) {
    try {
      const parsed = JSON.parse(localValue) as StoredCookieConsent
      if (parsed.version === CONSENT_VERSION) {
        return parsed.choice
      }

      window.localStorage.removeItem(CONSENT_STORAGE_KEY)
    } catch {
      return null
    }
  }

  const cookieValue = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${CONSENT_COOKIE_NAME}=`))

  if (!cookieValue) {
    return null
  }

  const value = cookieValue.split('=')[1]
  return value === 'accepted' || value === 'rejected' ? value : null
}

export function persistCookieConsent(choice: CookieConsentChoice) {
  if (typeof window === 'undefined') {
    return
  }

  const payload: StoredCookieConsent = {
    choice,
    updatedAt: new Date().toISOString(),
    version: CONSENT_VERSION,
  }

  window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(payload))
  document.cookie = `${CONSENT_COOKIE_NAME}=${choice}; Max-Age=31536000; Path=/; SameSite=Lax`
}
