import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./api', () => ({
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.name = 'ApiError'
      this.status = status
    }
  },
}))

const ADMIN_PIN_HINT_KEY = 'desk_imperial_admin_pin_hint'

describe('admin-pin', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-09T12:00:00.000Z'))
    window.sessionStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('rememberAdminPinVerification', () => {
    it('stores hint with explicit verifiedUntil string', async () => {
      const { rememberAdminPinVerification } = await import('./admin-pin')
      rememberAdminPinVerification('2026-04-09T12:15:00.000Z')
      const stored = JSON.parse(window.sessionStorage.getItem(ADMIN_PIN_HINT_KEY)!)
      expect(stored.verifiedUntil).toBe('2026-04-09T12:15:00.000Z')
      expect(stored.verifiedAt).toBeTruthy()
    })

    it('stores hint with Date object', async () => {
      const { rememberAdminPinVerification } = await import('./admin-pin')
      const futureDate = new Date('2026-04-09T12:20:00.000Z')
      rememberAdminPinVerification(futureDate)
      const stored = JSON.parse(window.sessionStorage.getItem(ADMIN_PIN_HINT_KEY)!)
      expect(stored.verifiedUntil).toBe(futureDate.toISOString())
    })

    it('defaults to 10-minute TTL when verifiedUntil is null', async () => {
      const { rememberAdminPinVerification } = await import('./admin-pin')
      rememberAdminPinVerification(null)
      const stored = JSON.parse(window.sessionStorage.getItem(ADMIN_PIN_HINT_KEY)!)
      expect(stored.verifiedUntil).toBe(new Date(Date.now() + 10 * 60 * 1000).toISOString())
    })

    it('defaults to 10-minute TTL when verifiedUntil is undefined', async () => {
      const { rememberAdminPinVerification } = await import('./admin-pin')
      rememberAdminPinVerification()
      const stored = JSON.parse(window.sessionStorage.getItem(ADMIN_PIN_HINT_KEY)!)
      expect(stored.verifiedUntil).toBe(new Date(Date.now() + 10 * 60 * 1000).toISOString())
    })
  })

  describe('clearAdminPinVerification', () => {
    it('removes hint from sessionStorage', async () => {
      const { rememberAdminPinVerification, clearAdminPinVerification } = await import('./admin-pin')
      rememberAdminPinVerification()
      expect(window.sessionStorage.getItem(ADMIN_PIN_HINT_KEY)).not.toBeNull()
      clearAdminPinVerification()
      expect(window.sessionStorage.getItem(ADMIN_PIN_HINT_KEY)).toBeNull()
    })
  })

  describe('hasRecentAdminPinVerification', () => {
    it('returns false when no hint is stored', async () => {
      const { hasRecentAdminPinVerification } = await import('./admin-pin')
      expect(hasRecentAdminPinVerification()).toBe(false)
    })

    it('returns true when verifiedUntil is in the future', async () => {
      const { rememberAdminPinVerification, hasRecentAdminPinVerification } = await import('./admin-pin')
      rememberAdminPinVerification(new Date(Date.now() + 5 * 60 * 1000))
      expect(hasRecentAdminPinVerification()).toBe(true)
    })

    it('returns false when both timestamps are expired', async () => {
      const { hasRecentAdminPinVerification } = await import('./admin-pin')
      window.sessionStorage.setItem(
        ADMIN_PIN_HINT_KEY,
        JSON.stringify({
          verifiedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
          verifiedUntil: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        }),
      )
      expect(hasRecentAdminPinVerification()).toBe(false)
    })

    it('returns true when verifiedAt is within default TTL', async () => {
      const { hasRecentAdminPinVerification } = await import('./admin-pin')
      window.sessionStorage.setItem(
        ADMIN_PIN_HINT_KEY,
        JSON.stringify({
          verifiedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          verifiedUntil: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
        }),
      )
      expect(hasRecentAdminPinVerification()).toBe(true)
    })

    it('clears storage and returns false for malformed JSON', async () => {
      const { hasRecentAdminPinVerification } = await import('./admin-pin')
      window.sessionStorage.setItem(ADMIN_PIN_HINT_KEY, 'invalid-json{{')
      expect(hasRecentAdminPinVerification()).toBe(false)
      expect(window.sessionStorage.getItem(ADMIN_PIN_HINT_KEY)).toBeNull()
    })
  })
})
