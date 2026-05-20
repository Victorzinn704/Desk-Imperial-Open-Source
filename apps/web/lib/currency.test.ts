import { describe, expect, it } from 'vitest'
import { formatBRL, formatCompactCurrency, formatCurrency, formatCurrencyComparison } from './currency'

describe('currency', () => {
  describe('formatCurrency', () => {
    it('formats BRL values', () => {
      expect(formatCurrency(10.5, 'BRL')).toContain('10,50')
    })

    it('formats USD values', () => {
      expect(formatCurrency(10.5, 'USD')).toContain('10.50')
    })

    it('formats EUR values', () => {
      expect(formatCurrency(10.5, 'EUR')).toContain('10,50')
    })
  })

  describe('formatCurrencyComparison', () => {
    it('returns only primary when currencies match', () => {
      const result = formatCurrencyComparison({
        originalValue: 100,
        originalCurrency: 'BRL',
        convertedValue: 100,
        displayCurrency: 'BRL',
      })
      expect(result.secondary).toBeNull()
      expect(result.primary).toContain('100')
    })

    it('returns both primary and secondary when currencies differ', () => {
      const result = formatCurrencyComparison({
        originalValue: 100,
        originalCurrency: 'BRL',
        convertedValue: 20,
        displayCurrency: 'USD',
      })
      expect(result.primary).toContain('100')
      expect(result.secondary).toBeTruthy()
    })
  })

  describe('formatBRL', () => {
    it('formats a normal value', () => {
      expect(formatBRL(12.5)).toContain('12,50')
    })

    it('treats NaN as 0', () => {
      expect(formatBRL(Number.NaN)).toContain('0,00')
    })

    it('treats Infinity as 0', () => {
      expect(formatBRL(Number.POSITIVE_INFINITY)).toContain('0,00')
    })

    it('formats zero', () => {
      expect(formatBRL(0)).toContain('0,00')
    })
  })

  describe('formatCompactCurrency', () => {
    it('formats large BRL values compactly', () => {
      const result = formatCompactCurrency(1500, 'BRL')
      expect(result).toBeTruthy()
    })
  })
})
