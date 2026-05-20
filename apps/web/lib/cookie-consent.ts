export type CookieConsentChoice = {
  analytics: boolean
  marketing: boolean
}

type LegacyCookieConsentChoice = 'accepted' | 'rejected'

type StoredCookieConsent = {
  preferences: CookieConsentChoice
  updatedAt: string
  version: string
}

type LegacyStoredCookieConsent = {
  choice: LegacyCookieConsentChoice
  updatedAt: string
  version: string
}

export const CONSENT_STORAGE_KEY = 'partner-portal-cookie-consent'
export const CONSENT_COOKIE_NAME = 'partner_portal_cookie_consent'
export const CONSENT_VERSION = '2026.03.banner.v4'

const CONSENT_COOKIE_CUSTOM_PREFIX = 'custom:'

export function readCookieConsentChoice() {
  if (typeof globalThis.window === 'undefined') {
    return null
  }

  const localValue = globalThis.localStorage.getItem(CONSENT_STORAGE_KEY)
  if (localValue) {
    try {
      const parsed = JSON.parse(localValue) as Partial<StoredCookieConsent & LegacyStoredCookieConsent>
      if (parsed.version === CONSENT_VERSION) {
        const normalizedPreferences = normalizeCookieConsentChoice(parsed.preferences)
        if (normalizedPreferences) {
          return normalizedPreferences
        }

        const legacyPreferences = legacyChoiceToPreferences(parsed.choice)
        if (legacyPreferences) {
          return legacyPreferences
        }
      }

      globalThis.localStorage.removeItem(CONSENT_STORAGE_KEY)
    } catch {
      return null
    }
  }

  const cookieValue = document.cookie.split('; ').find((item) => item.startsWith(`${CONSENT_COOKIE_NAME}=`))

  if (!cookieValue) {
    return null
  }

  const value = cookieValue.split('=')[1]
  if (!value) {
    return null
  }

  return parseConsentCookieValue(decodeURIComponent(value))
}

export function persistCookieConsent(choice: CookieConsentChoice) {
  if (typeof globalThis.window === 'undefined') {
    return
  }

  const normalizedChoice = normalizeCookieConsentChoice(choice)
  if (!normalizedChoice) {
    return
  }

  const payload: StoredCookieConsent = {
    preferences: normalizedChoice,
    updatedAt: new Date().toISOString(),
    version: CONSENT_VERSION,
  }

  globalThis.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(payload))
  const cookieValue = encodeURIComponent(serializeConsentCookieValue(normalizedChoice))
  document.cookie = `${CONSENT_COOKIE_NAME}=${cookieValue}; Max-Age=31536000; Path=/; SameSite=Lax`
}

function normalizeCookieConsentChoice(value: unknown): CookieConsentChoice | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<CookieConsentChoice>
  if (typeof candidate.analytics !== 'boolean' || typeof candidate.marketing !== 'boolean') {
    return null
  }

  return {
    analytics: candidate.analytics,
    marketing: candidate.marketing,
  }
}

function legacyChoiceToPreferences(choice: unknown): CookieConsentChoice | null {
  if (choice === 'accepted') {
    return {
      analytics: true,
      marketing: true,
    }
  }

  if (choice === 'rejected') {
    return {
      analytics: false,
      marketing: false,
    }
  }

  return null
}

function serializeConsentCookieValue(choice: CookieConsentChoice) {
  if (choice.analytics && choice.marketing) {
    return 'accepted'
  }

  if (!(choice.analytics || choice.marketing)) {
    return 'rejected'
  }

  return `${CONSENT_COOKIE_CUSTOM_PREFIX}${choice.analytics ? '1' : '0'}:${choice.marketing ? '1' : '0'}`
}

function parseConsentCookieValue(value: string): CookieConsentChoice | null {
  const legacyPreferences = legacyChoiceToPreferences(value)
  if (legacyPreferences) {
    return legacyPreferences
  }

  if (!value.startsWith(CONSENT_COOKIE_CUSTOM_PREFIX)) {
    return null
  }

  const [analyticsFlag, marketingFlag] = value.slice(CONSENT_COOKIE_CUSTOM_PREFIX.length).split(':')
  if (!(analyticsFlag && marketingFlag)) {
    return null
  }

  if (!(['0', '1'].includes(analyticsFlag) && ['0', '1'].includes(marketingFlag))) {
    return null
  }

  return {
    analytics: analyticsFlag === '1',
    marketing: marketingFlag === '1',
  }
}
