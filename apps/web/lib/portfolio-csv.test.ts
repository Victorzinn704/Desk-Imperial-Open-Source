import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProductRecord } from '@contracts/contracts'
import { downloadPortfolioCsv, downloadProductTemplateCsv } from './portfolio-csv'

describe('portfolio-csv', () => {
  let createObjectURLMock: ReturnType<typeof vi.fn>
  let revokeObjectURLMock: ReturnType<typeof vi.fn>
  let appendMock: ReturnType<typeof vi.fn>
  let removeMock: ReturnType<typeof vi.fn>
  let clickMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url')
    revokeObjectURLMock = vi.fn()
    appendMock = vi.fn()
    removeMock = vi.fn()
    clickMock = vi.fn()

    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    })

    vi.spyOn(document.body, 'append').mockImplementation(appendMock as () => void)
    vi.spyOn(document, 'createElement').mockReturnValue({
      set href(value: string) {
        ;(this as Record<string, unknown>)._href = value
      },
      get href(): string {
        return ((this as Record<string, unknown>)._href as string) ?? ''
      },
      _href: '',
      download: '',
      rel: '',
      click: clickMock,
      remove: removeMock,
    } as unknown as HTMLAnchorElement)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('downloadProductTemplateCsv', () => {
    it('creates a CSV blob and triggers download', () => {
      downloadProductTemplateCsv()

      expect(createObjectURLMock).toHaveBeenCalledTimes(1)
      const blob = createObjectURLMock.mock.calls[0][0] as Blob
      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('text/csv;charset=utf-8')

      expect(clickMock).toHaveBeenCalledTimes(1)
      expect(removeMock).toHaveBeenCalledTimes(1)
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url')
    })

    it('includes header row and example rows in CSV', async () => {
      downloadProductTemplateCsv()

      const blob = createObjectURLMock.mock.calls[0][0] as Blob
      const text = await blob.text()

      // Should contain header columns
      expect(text).toContain('"name"')
      expect(text).toContain('"brand"')
      expect(text).toContain('"category"')
      expect(text).toContain('"unitCost"')
      expect(text).toContain('"unitPrice"')
      expect(text).toContain('"stock"')
      expect(text).toContain('"currency"')

      // Should contain example data
      expect(text).toContain('"Refrigerante Cola 2L"')
      expect(text).toContain('"Coca-Cola"')
      expect(text).toContain('"Cerveja Lata 350ml"')
      expect(text).toContain('"Brahma"')

      // 3 rows (header + 2 examples), may have BOM prefix
      const csvBody = text.replace(/^\uFEFF/, '')
      const rows = csvBody.split('\r\n')
      expect(rows).toHaveLength(3)
    })
  })

  describe('downloadPortfolioCsv', () => {
    it('generates CSV with product data', async () => {
      const products = [
        {
          id: 'p1',
          name: 'Cafe',
          brand: 'Melitta',
          category: 'Bebidas',
          packagingClass: 'Pacote',
          measurementUnit: 'G',
          measurementValue: 500,
          unitsPerPackage: 1,
          description: 'Cafe moido',
          originalUnitCost: 15.5,
          originalUnitPrice: 22.9,
          stockPackages: 2,
          stockLooseUnits: 0,
          stock: 2,
          currency: 'BRL' as const,
          unitCost: 15.5,
          unitPrice: 22.9,
          isCombo: false,
          comboDescription: '',
          comboItems: [],
          active: true,
          requiresKitchen: false,
          lowStockThreshold: null,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
        {
          id: 'p2',
          name: 'Agua',
          brand: null,
          category: 'Bebidas',
          packagingClass: 'Fardo',
          measurementUnit: 'ML',
          measurementValue: 500,
          unitsPerPackage: 12,
          description: null,
          originalUnitCost: 1.2,
          originalUnitPrice: 3.0,
          stockPackages: 5,
          stockLooseUnits: 3,
          stock: 63,
          currency: 'BRL' as const,
          unitCost: 1.2,
          unitPrice: 3.0,
          isCombo: false,
          comboDescription: '',
          comboItems: [],
          active: true,
          requiresKitchen: false,
          lowStockThreshold: null,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ]

      downloadPortfolioCsv(products as unknown as ProductRecord[])

      const blob = createObjectURLMock.mock.calls[0][0] as Blob
      const text = await blob.text()

      // Header + 2 data rows
      const rows = text.slice(1).split('\r\n')
      expect(rows).toHaveLength(3)

      // Check product data appears
      expect(text).toContain('"Cafe"')
      expect(text).toContain('"Melitta"')
      expect(text).toContain('"15.50"')
      expect(text).toContain('"22.90"')

      // null brand should be empty string
      expect(text).toContain('"Agua"')
      expect(text).toContain('"1.20"')
      expect(text).toContain('"3.00"')
    })

    it('generates empty CSV with only headers when no products', async () => {
      downloadPortfolioCsv([])

      const blob = createObjectURLMock.mock.calls[0][0] as Blob
      const text = await blob.text()

      const rows = text.slice(1).split('\r\n')
      expect(rows).toHaveLength(1) // header only
    })
  })

  describe('CSV formula injection protection', () => {
    it('neutralizes values starting with dangerous characters', async () => {
      const products = [
        {
          id: 'p1',
          name: '=CMD()',
          brand: '+MALICIOUS',
          category: '-Evil',
          packagingClass: '@injection',
          measurementUnit: 'UN',
          measurementValue: 1,
          unitsPerPackage: 1,
          description: 'Normal desc',
          originalUnitCost: 0,
          originalUnitPrice: 0,
          stockPackages: 0,
          stockLooseUnits: 0,
          stock: 0,
          currency: 'BRL' as const,
          unitCost: 0,
          unitPrice: 0,
          isCombo: false,
          comboDescription: '',
          comboItems: [],
          active: true,
          requiresKitchen: false,
          lowStockThreshold: null,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ]

      downloadPortfolioCsv(products as unknown as ProductRecord[])

      const blob = createObjectURLMock.mock.calls[0][0] as Blob
      const text = await blob.text()

      // Formula-dangerous characters should be prefixed with '
      expect(text).toContain('"\'=CMD()"')
      expect(text).toContain('"\'+MALICIOUS"')
      expect(text).toContain('"\'-Evil"')
      expect(text).toContain('"\'@injection"')
    })

    it('escapes double quotes in values', async () => {
      const products = [
        {
          id: 'p1',
          name: 'Product "Special"',
          brand: '',
          category: 'Cat',
          packagingClass: 'Unit',
          measurementUnit: 'UN',
          measurementValue: 1,
          unitsPerPackage: 1,
          description: '',
          originalUnitCost: 0,
          originalUnitPrice: 0,
          stockPackages: 0,
          stockLooseUnits: 0,
          stock: 0,
          currency: 'BRL' as const,
          unitCost: 0,
          unitPrice: 0,
          isCombo: false,
          comboDescription: '',
          comboItems: [],
          active: true,
          requiresKitchen: false,
          lowStockThreshold: null,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ]

      downloadPortfolioCsv(products as unknown as ProductRecord[])

      const blob = createObjectURLMock.mock.calls[0][0] as Blob
      const text = await blob.text()

      // Double quotes inside values should be doubled
      expect(text).toContain('"Product ""Special"""')
    })
  })
})
