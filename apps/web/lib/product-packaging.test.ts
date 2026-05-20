import { describe, expect, it } from 'vitest'
import {
  buildStockTotalUnits,
  findPackagingPresetByLabel,
  formatMeasurement,
  formatStockBreakdown,
  getMeasurementOption,
  getStockBreakdown,
} from './product-packaging'

describe('product-packaging', () => {
  describe('findPackagingPresetByLabel', () => {
    it('finds a preset by exact label', () => {
      const preset = findPackagingPresetByLabel('Lata - 12 und de 350ml')
      expect(preset).not.toBeNull()
    })

    it('returns null for unknown label', () => {
      expect(findPackagingPresetByLabel('Nonexistent')).toBeNull()
    })

    it('returns null for null', () => {
      expect(findPackagingPresetByLabel(null as unknown as string)).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(findPackagingPresetByLabel('')).toBeNull()
    })
  })

  describe('getMeasurementOption', () => {
    it('returns normalized value for known units', () => {
      expect(getMeasurementOption('ml')).toBe('ML')
      expect(getMeasurementOption('L')).toBe('L')
      expect(getMeasurementOption('g')).toBe('G')
      expect(getMeasurementOption('kg')).toBe('KG')
      expect(getMeasurementOption('un')).toBe('UN')
    })

    it('returns CUSTOM for unknown units', () => {
      expect(getMeasurementOption('oz')).toBe('CUSTOM')
    })
  })

  describe('formatMeasurement', () => {
    it('formats integer values', () => {
      expect(formatMeasurement(350, 'ML')).toBe('350ml')
    })

    it('formats decimal values', () => {
      expect(formatMeasurement(1.5, 'L')).toBe('1.50l')
    })

    it('replaces "un" with "und"', () => {
      expect(formatMeasurement(1, 'UN')).toBe('1 und')
    })
  })

  describe('getStockBreakdown', () => {
    it('calculates packages and loose units', () => {
      expect(getStockBreakdown(27, 6)).toEqual({
        stockPackages: 4,
        stockLooseUnits: 3,
        totalUnits: 27,
      })
    })

    it('returns all loose when unitsPerPackage is 1', () => {
      expect(getStockBreakdown(10, 1)).toEqual({
        stockPackages: 0,
        stockLooseUnits: 10,
        totalUnits: 10,
      })
    })
  })

  describe('buildStockTotalUnits', () => {
    it('calculates total from packages and loose', () => {
      expect(buildStockTotalUnits(4, 3, 6)).toBe(27)
    })
  })

  describe('formatStockBreakdown', () => {
    it('formats with packages and loose units', () => {
      const result = formatStockBreakdown(27, 6)
      expect(result).toContain('4')
      expect(result).toContain('3')
    })

    it('shows only loose units when unitsPerPackage is 1', () => {
      expect(formatStockBreakdown(10, 1)).toContain('10')
    })
  })
})
