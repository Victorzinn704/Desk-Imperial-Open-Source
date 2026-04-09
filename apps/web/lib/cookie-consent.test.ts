import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  readCookieConsentChoice,
  persistCookieConsent,
  CONSENT_STORAGE_KEY,
  CONSENT_COOKIE_NAME,
  CONSENT_VERSION,
} from './cookie-consent'

// JSDOM on some Node versions breaks native localStorage — provide a working polyfill
function ensureLocalStorage() {
  try {
    window.localStorage.setItem('__probe__', '1')
    window.localStorage.removeItem('__probe__')
  } catch {
    const store = new Map<string, string>()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, String(v)),
        removeItem: (k: string) => store.delete(k),
        clear: () => store.clear(),
        get length() {
          return store.size
        },
        key: (i: number) => [...store.keys()][i] ?? null,
      },
    })
  }
}

function clearCookies() {
  document.cookie.split(';').forEach((c) => {
    document.cookie = c.replace(/^ +/, '').replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`)
  })
}

describe('cookie-consent', () => {
  beforeEach(() => {
    ensureLocalStorage()
    window.localStorage.clear()
    clearCookies()
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  describe('readCookieConsentChoice', () => {
    it('returns null when no consent data exists', () => {
      expect(readCookieConsentChoice()).toBeNull()
    })

    it('reads preferences from localStorage with matching version', () => {
      const stored = {
        preferences: { analytics: true, marketing: false },
        updatedAt: '2026-04-09T12:00:00Z',
        version: CONSENT_VERSION,
      }
      window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stored))

      const result = readCookieConsentChoice()
      expect(result).toEqual({ analytics: true, marketing: false })
    })

    it('returns null and clears localStorage when version does not match', () => {
      const stored = {
        preferences: { analytics: true, marketing: true },
        updatedAt: '2026-04-09T12:00:00Z',
        version: 'old.version',
      }
      window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stored))

      const result = readCookieConsentChoice()
      expect(result).toBeNull()
      expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull()
    })

    it('handles legacy "accepted" choice', () => {
      const stored = {
        choice: 'accepted',
        updatedAt: '2026-04-09T12:00:00Z',
        version: CONSENT_VERSION,
      }
      window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stored))

      const result = readCookieConsentChoice()
      expect(result).toEqual({ analytics: true, marketing: true })
    })

    it('handles legacy "rejected" choice', () => {
      const stored = {
        choice: 'rejected',
        updatedAt: '2026-04-09T12:00:00Z',
        version: CONSENT_VERSION,
      }
      window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stored))

      const result = readCookieConsentChoice()
      expect(result).toEqual({ analytics: false, marketing: false })
    })

    it('returns null for invalid JSON in localStorage', () => {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, 'not-valid-json')
      expect(readCookieConsentChoice()).toBeNull()
    })

    it('returns null when preferences are missing required fields', () => {
      const stored = {
        preferences: { analytics: true }, // missing marketing
        updatedAt: '2026-04-09T12:00:00Z',
        version: CONSENT_VERSION,
      }
      window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stored))
      // invalid preferences, falls through to legacy check which also fails, clears storage
      expect(readCookieConsentChoice()).toBeNull()
    })

    it('reads "accepted" cookie value when localStorage has no data', () => {
      document.cookie = `${CONSENT_COOKIE_NAME}=accepted; path=/`

      const result = readCookieConsentChoice()
      expect(result).toEqual({ analytics: true, marketing: true })
    })

    it('reads "rejected" cookie value', () => {
      document.cookie = `${CONSENT_COOKIE_NAME}=rejected; path=/`

      const result = readCookieConsentChoice()
      expect(result).toEqual({ analytics: false, marketing: false })
    })

    it('reads custom cookie value (analytics=1, marketing=0)', () => {
      document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent('custom:1:0')}; path=/`

      const result = readCookieConsentChoice()
      expect(result).toEqual({ analytics: true, marketing: false })
    })

    it('reads custom cookie value (analytics=0, marketing=1)', () => {
      document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent('custom:0:1')}; path=/`

      const result = readCookieConsentChoice()
      expect(result).toEqual({ analytics: false, marketing: true })
    })

    it('returns null for invalid cookie value', () => {
      document.cookie = `${CONSENT_COOKIE_NAME}=garbage; path=/`
      expect(readCookieConsentChoice()).toBeNull()
    })

    it('returns null for custom cookie with invalid flags', () => {
      document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent('custom:2:3')}; path=/`
      expect(readCookieConsentChoice()).toBeNull()
    })

    it('returns null for custom cookie with missing flags', () => {
      document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent('custom:1')}; path=/`
      expect(readCookieConsentChoice()).toBeNull()
    })

    it('prefers localStorage over cookie', () => {
      const stored = {
        preferences: { analytics: false, marketing: false },
        updatedAt: '2026-04-09T12:00:00Z',
        version: CONSENT_VERSION,
      }
      window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stored))
      document.cookie = `${CONSENT_COOKIE_NAME}=accepted; path=/`

      const result = readCookieConsentChoice()
      expect(result).toEqual({ analytics: false, marketing: false })
    })
  })

  describe('persistCookieConsent', () => {
    it('stores consent in localStorage and cookie', () => {
      persistCookieConsent({ analytics: true, marketing: true })

      const stored = JSON.parse(window.localStorage.getItem(CONSENT_STORAGE_KEY)!)
      expect(stored.preferences).toEqual({ analytics: true, marketing: true })
      expect(stored.version).toBe(CONSENT_VERSION)
      expect(stored.updatedAt).toBeDefined()

      expect(document.cookie).toContain(CONSENT_COOKIE_NAME)
    })

    it('serializes all-accept as "accepted" in cookie', () => {
      persistCookieConsent({ analytics: true, marketing: true })
      expect(document.cookie).toContain(`${CONSENT_COOKIE_NAME}=accepted`)
    })

    it('serializes all-reject as "rejected" in cookie', () => {
      persistCookieConsent({ analytics: false, marketing: false })
      expect(document.cookie).toContain(`${CONSENT_COOKIE_NAME}=rejected`)
    })

    it('serializes mixed choices as custom format in cookie', () => {
      persistCookieConsent({ analytics: true, marketing: false })
      expect(document.cookie).toContain(`${CONSENT_COOKIE_NAME}=${encodeURIComponent('custom:1:0')}`)
    })

    it('does nothing for invalid choice shape', () => {
      // @ts-expect-error testing runtime safety
      persistCookieConsent({ analytics: 'yes', marketing: 'no' })
      expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull()
    })

    it('does nothing for null choice', () => {
      // @ts-expect-error testing runtime safety
      persistCookieConsent(null)
      expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull()
    })
  })
})
