import { describe, expect, it } from 'vitest'
import { getPinRateStatus, recordPinFailure, recordPinSuccess, resetPinAttempts } from './pin-rate-limiter'

describe('pin-rate-limiter (deprecated no-ops)', () => {
  it('getPinRateStatus returns unblocked status', () => {
    const status = getPinRateStatus()
    expect(status).toEqual({ blocked: false, attemptsLeft: 3 })
  })

  it('recordPinFailure returns unblocked status', () => {
    const status = recordPinFailure()
    expect(status).toEqual({ blocked: false, attemptsLeft: 3 })
  })

  it('recordPinSuccess is a no-op', () => {
    expect(() => recordPinSuccess()).not.toThrow()
  })

  it('resetPinAttempts is a no-op', () => {
    expect(() => resetPinAttempts()).not.toThrow()
  })
})
