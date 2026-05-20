import { describe, expect, it } from 'vitest'
import { __faroInternals } from './faro'

describe('faro internals', () => {
  it('sanitizePath removes query and normalizes dynamic segments', () => {
    const path = '/orders/123456/items/550e8400-e29b-41d4-a716-446655440000/token/ABCDEFGHIJKLMNOPQRSTUVWXYZ?secret=1'

    const sanitized = __faroInternals.sanitizePath(path)

    expect(sanitized).toBe('/orders/:id/items/:uuid/token/:token')
  })

  it('resolveCollectorUrl blocks insecure collector in production', () => {
    const resolved = __faroInternals.resolveCollectorUrl({
      rawUrl: 'http://collector.example.com/collect',
      allowInsecureCollector: false,
      nodeEnv: 'production',
    })

    expect(resolved).toBeNull()
  })

  it('resolveCollectorUrl allows localhost http collector in development', () => {
    const resolved = __faroInternals.resolveCollectorUrl({
      rawUrl: 'http://localhost:12347/collect',
      allowInsecureCollector: false,
      nodeEnv: 'development',
    })

    expect(resolved).toBe('http://localhost:12347/collect')
  })

  it('parseSampleRate falls back for invalid values', () => {
    expect(__faroInternals.parseSampleRate('invalid', 0.03)).toBe(0.03)
    expect(__faroInternals.parseSampleRate('-1', 0.03)).toBe(0.03)
    expect(__faroInternals.parseSampleRate('1.5', 0.03)).toBe(0.03)
  })

  it('parsePositiveInteger falls back for invalid values', () => {
    expect(__faroInternals.parsePositiveInteger(undefined, 30)).toBe(30)
    expect(__faroInternals.parsePositiveInteger('0', 30)).toBe(30)
    expect(__faroInternals.parsePositiveInteger('-5', 30)).toBe(30)
    expect(__faroInternals.parsePositiveInteger('2.4', 30)).toBe(30)
    expect(__faroInternals.parsePositiveInteger('45', 30)).toBe(45)
  })

  it('sanitizes transport payload objects in place', () => {
    const item = {
      payload: {
        context: {
          email: 'owner@example.com',
          path: '/orders/123456?secret=1',
        },
      },
    }

    __faroInternals.sanitizeTransportItemInPlace(item)

    expect(item.payload.context).toEqual({
      email: '[redacted]',
      path: '/orders/:id',
    })
  })

  it('ignores malformed transport payloads without throwing', () => {
    expect(() => __faroInternals.sanitizeTransportItemInPlace(undefined)).not.toThrow()
    expect(() => __faroInternals.sanitizeTransportItemInPlace({})).not.toThrow()
    expect(() =>
      __faroInternals.sanitizeTransportItemInPlace({
        payload: {
          attributes: {
            note: 'x'.repeat(300),
          },
        },
      }),
    ).not.toThrow()
  })
})
