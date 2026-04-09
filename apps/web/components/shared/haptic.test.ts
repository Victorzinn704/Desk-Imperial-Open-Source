import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { haptic } from './haptic'

describe('haptic', () => {
  let vibrateMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vibrateMock = vi.fn()
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('when vibrate API is available', () => {
    it('light() calls vibrate with 10ms', () => {
      haptic.light()
      expect(vibrateMock).toHaveBeenCalledWith(10)
    })

    it('medium() calls vibrate with 25ms', () => {
      haptic.medium()
      expect(vibrateMock).toHaveBeenCalledWith(25)
    })

    it('heavy() calls vibrate with pattern [30, 50, 30]', () => {
      haptic.heavy()
      expect(vibrateMock).toHaveBeenCalledWith([30, 50, 30])
    })

    it('success() calls vibrate with pattern [15, 80, 15]', () => {
      haptic.success()
      expect(vibrateMock).toHaveBeenCalledWith([15, 80, 15])
    })

    it('error() calls vibrate with 100ms', () => {
      haptic.error()
      expect(vibrateMock).toHaveBeenCalledWith(100)
    })
  })

  describe('when vibrate API is not available', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'vibrate', {
        value: undefined,
        writable: true,
        configurable: true,
      })
    })

    it('light() does not throw', () => {
      expect(() => haptic.light()).not.toThrow()
    })

    it('medium() does not throw', () => {
      expect(() => haptic.medium()).not.toThrow()
    })

    it('heavy() does not throw', () => {
      expect(() => haptic.heavy()).not.toThrow()
    })

    it('success() does not throw', () => {
      expect(() => haptic.success()).not.toThrow()
    })

    it('error() does not throw', () => {
      expect(() => haptic.error()).not.toThrow()
    })
  })
})
