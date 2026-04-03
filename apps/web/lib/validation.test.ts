import { describe, expect, it } from 'vitest'
import {
  fallbackConsentDocuments,
  getPasswordStrength,
  loginSchema,
  orderSchema,
  productSchema,
  registerSchema,
  resetPasswordSchema,
} from './validation'

describe('validation schemas', () => {
  it('validates owner login requirements', () => {
    const result = loginSchema.safeParse({
      loginMode: 'OWNER',
      email: 'owner@deskimperial.com',
      password: '12345678',
    })

    expect(result.success).toBe(true)
  })

  it('rejects invalid staff login payload', () => {
    const result = loginSchema.safeParse({
      loginMode: 'STAFF',
      companyEmail: 'invalid',
      employeeCode: 'A',
      password: '123',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join('.'))
      expect(paths).toContain('companyEmail')
      expect(paths).toContain('employeeCode')
      expect(paths).toContain('password')
    }
  })

  it('transforms register payload country and employee count', () => {
    const parsed = registerSchema.parse({
      fullName: 'Joao Victor',
      companyName: 'Desk Imperial',
      email: 'contato@deskimperial.com',
      companyStreetLine1: 'Rua Imperial',
      companyStreetNumber: '100',
      companyDistrict: 'Centro',
      companyCity: 'Joinville',
      companyState: 'SC',
      companyPostalCode: '89239-000',
      companyCountry: 'Brasil',
      hasEmployees: false,
      employeeCount: 12,
      password: 'SenhaMuito@123',
      acceptTerms: true,
      acceptPrivacy: true,
    })

    expect(parsed.companyCountry).toBe('Brasil')
    expect(parsed.employeeCount).toBe(0)
  })

  it('requires employee count when company has employees', () => {
    const result = registerSchema.safeParse({
      fullName: 'Joao Victor',
      companyName: 'Desk Imperial',
      email: 'contato@deskimperial.com',
      companyStreetLine1: 'Rua Imperial',
      companyStreetNumber: '100',
      companyDistrict: 'Centro',
      companyCity: 'Joinville',
      companyState: 'SC',
      companyPostalCode: '89239000',
      companyCountry: 'Brasil',
      hasEmployees: true,
      employeeCount: 0,
      password: 'Senha@123',
      acceptTerms: true,
      acceptPrivacy: true,
    })

    expect(result.success).toBe(false)
  })

  it('rejects reset password when confirmation differs', () => {
    const result = resetPasswordSchema.safeParse({
      email: 'owner@deskimperial.com',
      code: '123456',
      password: 'Senha@123',
      confirmPassword: 'Senha@456',
    })

    expect(result.success).toBe(false)
  })

  it('validates and transforms non-combo product stock', () => {
    const parsed = productSchema.parse({
      name: 'Cafe expresso',
      brand: 'Imperial',
      category: 'Bebidas',
      packagingClass: 'Pacote',
      measurementUnit: 'g',
      measurementValue: 250,
      unitsPerPackage: 10,
      isCombo: false,
      comboDescription: 'nao deve permanecer',
      comboItems: [{ productId: 'x', quantityPackages: 1, quantityUnits: 0 }],
      description: 'Tradicional',
      unitCost: 8,
      unitPrice: 15,
      currency: 'BRL',
      stockPackages: 3,
      stockLooseUnits: 2,
      requiresKitchen: false,
      lowStockThreshold: 1,
    })

    expect(parsed.stock).toBe(32)
    expect(parsed.comboDescription).toBe('')
    expect(parsed.comboItems).toEqual([])
  })

  it('rejects combo product with duplicate items and zero quantity', () => {
    const result = productSchema.safeParse({
      name: 'Combo cafe',
      category: 'Combos',
      packagingClass: 'Combo',
      measurementUnit: 'un',
      measurementValue: 1,
      unitsPerPackage: 1,
      isCombo: true,
      comboItems: [
        { productId: 'p-1', quantityPackages: 0, quantityUnits: 0 },
        { productId: 'p-1', quantityPackages: 1, quantityUnits: 0 },
      ],
      description: '',
      unitCost: 20,
      unitPrice: 30,
      currency: 'BRL',
      stockPackages: 0,
      stockLooseUnits: 0,
      requiresKitchen: true,
      lowStockThreshold: 0,
    })

    expect(result.success).toBe(false)
  })

  it('rejects loose units when they exceed units per package', () => {
    const result = productSchema.safeParse({
      name: 'Acucar',
      category: 'Mercearia',
      packagingClass: 'Pacote',
      measurementUnit: 'g',
      measurementValue: 500,
      unitsPerPackage: 12,
      unitCost: 5,
      unitPrice: 8,
      currency: 'BRL',
      stockPackages: 1,
      stockLooseUnits: 12,
      requiresKitchen: false,
    })

    expect(result.success).toBe(false)
  })

  it('validates order document by buyer type and defaults country', () => {
    const personOrder = orderSchema.safeParse({
      items: [{ productId: 'p-1', quantity: 1, unitPrice: 10 }],
      customerName: 'Cliente A',
      buyerType: 'PERSON',
      buyerDocument: '11111111111',
      buyerCity: 'Joinville',
      buyerState: 'SC',
      buyerCountry: '',
      currency: 'BRL',
    })
    expect(personOrder.success).toBe(false)

    const companyOrder = orderSchema.parse({
      items: [{ productId: 'p-1', quantity: 2, unitPrice: 10 }],
      customerName: 'Empresa B',
      buyerType: 'COMPANY',
      buyerDocument: '11.444.777/0001-61',
      buyerCity: 'Joinville',
      buyerState: 'SC',
      buyerCountry: '',
      currency: 'BRL',
    })

    expect(companyOrder.buyerCountry).toBe('Brasil')
  })

  it('computes password strength labels', () => {
    expect(getPasswordStrength('abc')).toEqual({ score: 1, label: 'Fraca' })
    expect(getPasswordStrength('abcdef12')).toEqual(expect.objectContaining({ score: 2 }))
    expect(getPasswordStrength('abcdef12').label).toMatch(/Razo/)
    expect(getPasswordStrength('Abcdef12')).toEqual({ score: 3, label: 'Boa' })
    expect(getPasswordStrength('Abcdef12!')).toEqual({ score: 4, label: 'Forte' })
  })

  it('exposes fallback consent documents', () => {
    expect(fallbackConsentDocuments).toHaveLength(4)
    expect(fallbackConsentDocuments.filter((doc) => doc.required)).toHaveLength(2)
  })
})
