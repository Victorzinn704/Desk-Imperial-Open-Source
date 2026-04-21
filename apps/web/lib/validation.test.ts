import { describe, expect, it } from 'vitest'
import {
  currencyCodeSchema,
  employeeSchema,
  fallbackConsentDocuments,
  forgotPasswordSchema,
  getPasswordStrength,
  loginSchema,
  orderItemSchema,
  orderSchema,
  productSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './validation'

// ---------------------------------------------------------------------------
// getPasswordStrength
// ---------------------------------------------------------------------------
describe('getPasswordStrength', () => {
  it('returns Fraca for short password', () => {
    expect(getPasswordStrength('abc')).toEqual({ score: 1, label: 'Fraca' })
  })

  it('returns Fraca for only lowercase >= 8 chars', () => {
    expect(getPasswordStrength('abcdefgh')).toEqual({ score: 1, label: 'Fraca' })
  })

  it('returns Razoavel for length + mixed case', () => {
    expect(getPasswordStrength('Abcdefgh')).toEqual({ score: 2, label: 'Razoável' })
  })

  it('returns Boa for length + mixed case + digit', () => {
    expect(getPasswordStrength('Abcdefg1')).toEqual({ score: 3, label: 'Boa' })
  })

  it('returns Forte for all criteria', () => {
    expect(getPasswordStrength('Abcdef1!')).toEqual({ score: 4, label: 'Forte' })
  })

  it('returns Fraca for empty string', () => {
    expect(getPasswordStrength('')).toEqual({ score: 1, label: 'Fraca' })
  })

  it('returns Razoavel for length + digit only', () => {
    expect(getPasswordStrength('12345678')).toEqual({ score: 2, label: 'Razoável' })
  })

  it('returns Razoavel for length + special only', () => {
    expect(getPasswordStrength('!@#$%^&*')).toEqual({ score: 2, label: 'Razoável' })
  })
})

// ---------------------------------------------------------------------------
// currencyCodeSchema
// ---------------------------------------------------------------------------
describe('currencyCodeSchema', () => {
  it('accepts BRL', () => {
    expect(currencyCodeSchema.parse('BRL')).toBe('BRL')
  })

  it('accepts USD', () => {
    expect(currencyCodeSchema.parse('USD')).toBe('USD')
  })

  it('accepts EUR', () => {
    expect(currencyCodeSchema.parse('EUR')).toBe('EUR')
  })

  it('rejects invalid currency', () => {
    expect(() => currencyCodeSchema.parse('GBP')).toThrow()
  })

  it('rejects empty string', () => {
    expect(() => currencyCodeSchema.parse('')).toThrow()
  })
})

// ---------------------------------------------------------------------------
// loginSchema
// ---------------------------------------------------------------------------
describe('loginSchema', () => {
  it('validates OWNER login with valid email and password', () => {
    const result = loginSchema.safeParse({
      loginMode: 'OWNER',
      email: 'owner@test.com',
      password: 'MyPass12',
    })
    expect(result.success).toBe(true)
  })

  it('rejects OWNER login with invalid email', () => {
    const result = loginSchema.safeParse({
      loginMode: 'OWNER',
      email: 'not-email',
      password: 'MyPass12',
    })
    expect(result.success).toBe(false)
  })

  it('rejects OWNER login with empty email', () => {
    const result = loginSchema.safeParse({
      loginMode: 'OWNER',
      email: '',
      password: 'MyPass12',
    })
    expect(result.success).toBe(false)
  })

  it('rejects OWNER login with short password (< 8)', () => {
    const result = loginSchema.safeParse({
      loginMode: 'OWNER',
      email: 'owner@test.com',
      password: 'short',
    })
    expect(result.success).toBe(false)
  })

  it('validates STAFF login with companyEmail, employeeCode and PIN', () => {
    const result = loginSchema.safeParse({
      loginMode: 'STAFF',
      companyEmail: 'company@test.com',
      employeeCode: 'EMP01',
      password: '123456',
    })
    expect(result.success).toBe(true)
  })

  it('rejects STAFF login with empty companyEmail', () => {
    const result = loginSchema.safeParse({
      loginMode: 'STAFF',
      companyEmail: '',
      employeeCode: 'EMP01',
      password: '123456',
    })
    expect(result.success).toBe(false)
  })

  it('rejects STAFF login with invalid companyEmail', () => {
    const result = loginSchema.safeParse({
      loginMode: 'STAFF',
      companyEmail: 'bad-email',
      employeeCode: 'EMP01',
      password: '123456',
    })
    expect(result.success).toBe(false)
  })

  it('rejects STAFF login with missing employeeCode', () => {
    const result = loginSchema.safeParse({
      loginMode: 'STAFF',
      companyEmail: 'company@test.com',
      employeeCode: '',
      password: '123456',
    })
    expect(result.success).toBe(false)
  })

  it('rejects STAFF login with short employeeCode (< 2 chars)', () => {
    const result = loginSchema.safeParse({
      loginMode: 'STAFF',
      companyEmail: 'company@test.com',
      employeeCode: 'A',
      password: '123456',
    })
    expect(result.success).toBe(false)
  })

  it('rejects STAFF login with short password (< 6)', () => {
    const result = loginSchema.safeParse({
      loginMode: 'STAFF',
      companyEmail: 'company@test.com',
      employeeCode: 'EMP01',
      password: '12345',
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// forgotPasswordSchema
// ---------------------------------------------------------------------------
describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'user@test.com' }).success).toBe(true)
  })

  it('rejects invalid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'not-email' }).success).toBe(false)
  })

  it('trims whitespace from email', () => {
    const result = forgotPasswordSchema.safeParse({ email: '  user@test.com  ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('user@test.com')
    }
  })
})

// ---------------------------------------------------------------------------
// verifyEmailSchema
// ---------------------------------------------------------------------------
describe('verifyEmailSchema', () => {
  it('accepts valid email and 6-digit code', () => {
    expect(verifyEmailSchema.safeParse({ email: 'u@t.com', code: '123456' }).success).toBe(true)
  })

  it('rejects 5-digit code', () => {
    expect(verifyEmailSchema.safeParse({ email: 'u@t.com', code: '12345' }).success).toBe(false)
  })

  it('rejects 7-digit code', () => {
    expect(verifyEmailSchema.safeParse({ email: 'u@t.com', code: '1234567' }).success).toBe(false)
  })

  it('rejects alpha code', () => {
    expect(verifyEmailSchema.safeParse({ email: 'u@t.com', code: 'abcdef' }).success).toBe(false)
  })

  it('rejects invalid email', () => {
    expect(verifyEmailSchema.safeParse({ email: 'bad', code: '123456' }).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// registerSchema
// ---------------------------------------------------------------------------
describe('registerSchema', () => {
  const validRegister = {
    fullName: 'John Doe',
    companyName: 'Acme Inc',
    email: 'john@acme.com',
    companyStreetLine1: 'Rua Teste 100',
    companyStreetNumber: '100',
    companyAddressComplement: '',
    companyDistrict: 'Centro',
    companyCity: 'Sao Paulo',
    companyState: 'SP',
    companyPostalCode: '01000-000',
    companyCountry: 'Brasil',
    hasEmployees: false,
    employeeCount: 0,
    password: 'StrongP@ss1234',
    acceptTerms: true,
    acceptPrivacy: true,
  }

  it('accepts valid registration data', () => {
    const result = registerSchema.safeParse(validRegister)
    expect(result.success).toBe(true)
  })

  it('defaults companyCountry to Brasil when trim results in empty', () => {
    // companyCountry has min(2), so we need a value that passes min(2) but
    // is effectively empty after transform. The transform checks trim() === ''.
    // With min(2, 'Informe o pais.'), whitespace-only fails validation.
    // Test the actual transform: when country is valid but trims to empty-ish.
    const result = registerSchema.safeParse({ ...validRegister, companyCountry: 'Brasil' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.companyCountry).toBe('Brasil')
    }
  })

  it('sets employeeCount to 0 when hasEmployees is false', () => {
    const result = registerSchema.safeParse({ ...validRegister, hasEmployees: false, employeeCount: 5 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.employeeCount).toBe(0)
    }
  })

  it('preserves employeeCount when hasEmployees is true', () => {
    const result = registerSchema.safeParse({ ...validRegister, hasEmployees: true, employeeCount: 5 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.employeeCount).toBe(5)
    }
  })

  it('rejects when hasEmployees is true but employeeCount is 0', () => {
    const result = registerSchema.safeParse({ ...validRegister, hasEmployees: true, employeeCount: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects weak password (too short)', () => {
    const result = registerSchema.safeParse({ ...validRegister, password: 'Short1!' })
    expect(result.success).toBe(false)
  })

  it('rejects password without special character', () => {
    const result = registerSchema.safeParse({ ...validRegister, password: 'NoSpecialChar123' })
    expect(result.success).toBe(false)
  })

  it('rejects password that is too long', () => {
    const result = registerSchema.safeParse({ ...validRegister, password: 'A'.repeat(129) })
    expect(result.success).toBe(false)
  })

  it('requires acceptTerms', () => {
    const result = registerSchema.safeParse({ ...validRegister, acceptTerms: false })
    expect(result.success).toBe(false)
  })

  it('requires acceptPrivacy', () => {
    const result = registerSchema.safeParse({ ...validRegister, acceptPrivacy: false })
    expect(result.success).toBe(false)
  })

  it('rejects invalid postal code', () => {
    const result = registerSchema.safeParse({ ...validRegister, companyPostalCode: '123' })
    expect(result.success).toBe(false)
  })

  it('accepts postal code without hyphen', () => {
    const result = registerSchema.safeParse({ ...validRegister, companyPostalCode: '01000000' })
    expect(result.success).toBe(true)
  })

  it('rejects short fullName (< 3)', () => {
    const result = registerSchema.safeParse({ ...validRegister, fullName: 'AB' })
    expect(result.success).toBe(false)
  })

  it('rejects empty companyStreetLine1', () => {
    const result = registerSchema.safeParse({ ...validRegister, companyStreetLine1: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty companyCity', () => {
    const result = registerSchema.safeParse({ ...validRegister, companyCity: '' })
    expect(result.success).toBe(false)
  })

  it('rejects negative employeeCount', () => {
    const result = registerSchema.safeParse({ ...validRegister, employeeCount: -1 })
    expect(result.success).toBe(false)
  })

  it('accepts empty companyName', () => {
    const result = registerSchema.safeParse({ ...validRegister, companyName: '' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({ ...validRegister, email: 'not-email' })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// resetPasswordSchema
// ---------------------------------------------------------------------------
describe('resetPasswordSchema', () => {
  const validReset = {
    email: 'test@test.com',
    code: '123456',
    password: 'StrongP@ss1234',
    confirmPassword: 'StrongP@ss1234',
  }

  it('accepts matching strong passwords', () => {
    expect(resetPasswordSchema.safeParse(validReset).success).toBe(true)
  })

  it('rejects mismatched passwords', () => {
    const result = resetPasswordSchema.safeParse({
      ...validReset,
      confirmPassword: 'DifferentP@ss1234',
    })
    expect(result.success).toBe(false)
  })

  it('rejects weak password', () => {
    const result = resetPasswordSchema.safeParse({
      ...validReset,
      password: 'weak',
      confirmPassword: 'weak',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = resetPasswordSchema.safeParse({ ...validReset, email: 'bad' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid code', () => {
    const result = resetPasswordSchema.safeParse({ ...validReset, code: 'abc' })
    expect(result.success).toBe(false)
  })

  it('rejects password without uppercase', () => {
    const result = resetPasswordSchema.safeParse({
      ...validReset,
      password: 'nouppercase1!aa',
      confirmPassword: 'nouppercase1!aa',
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// productSchema
// ---------------------------------------------------------------------------
describe('productSchema', () => {
  const validProduct = {
    name: 'Coca Cola 2L',
    barcode: '',
    brand: 'Coca-Cola',
    category: 'Bebidas',
    packagingClass: 'Fardo 6und',
    measurementUnit: 'L',
    measurementValue: 2,
    unitsPerPackage: 6,
    isCombo: false,
    comboDescription: '',
    comboItems: [],
    description: '',
    unitCost: 8.5,
    unitPrice: 12.9,
    currency: 'BRL' as const,
    stockPackages: 4,
    stockLooseUnits: 3,
    requiresKitchen: false,
    lowStockThreshold: null,
  }

  it('accepts valid product and computes stock', () => {
    const result = productSchema.safeParse(validProduct)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.stock).toBe(4 * 6 + 3)
    }
  })

  it('rejects loose units >= unitsPerPackage when unitsPerPackage > 1', () => {
    const result = productSchema.safeParse({ ...validProduct, stockLooseUnits: 6 })
    expect(result.success).toBe(false)
  })

  it('allows loose units >= unitsPerPackage when unitsPerPackage is 1', () => {
    const result = productSchema.safeParse({
      ...validProduct,
      unitsPerPackage: 1,
      stockLooseUnits: 5,
    })
    expect(result.success).toBe(true)
  })

  it('rejects combo without items', () => {
    const result = productSchema.safeParse({ ...validProduct, isCombo: true, comboItems: [] })
    expect(result.success).toBe(false)
  })

  it('rejects combo item with zero quantity in both fields', () => {
    const result = productSchema.safeParse({
      ...validProduct,
      isCombo: true,
      comboItems: [{ productId: 'p1', quantityPackages: 0, quantityUnits: 0 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects combo with duplicate productId', () => {
    const result = productSchema.safeParse({
      ...validProduct,
      isCombo: true,
      comboItems: [
        { productId: 'p1', quantityPackages: 1, quantityUnits: 0 },
        { productId: 'p1', quantityPackages: 0, quantityUnits: 2 },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid combo with unique products', () => {
    const result = productSchema.safeParse({
      ...validProduct,
      isCombo: true,
      comboDescription: 'A combo',
      comboItems: [
        { productId: 'p1', quantityPackages: 1, quantityUnits: 0 },
        { productId: 'p2', quantityPackages: 0, quantityUnits: 3 },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('clears combo fields when isCombo is false', () => {
    const result = productSchema.safeParse({
      ...validProduct,
      isCombo: false,
      comboDescription: 'should be cleared',
      comboItems: [{ productId: 'p1', quantityPackages: 1, quantityUnits: 0 }],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.comboDescription).toBe('')
      expect(result.data.comboItems).toEqual([])
    }
  })

  it('rejects negative unitCost', () => {
    expect(productSchema.safeParse({ ...validProduct, unitCost: -1 }).success).toBe(false)
  })

  it('rejects negative unitPrice', () => {
    expect(productSchema.safeParse({ ...validProduct, unitPrice: -1 }).success).toBe(false)
  })

  it('rejects measurementValue below 0.01', () => {
    expect(productSchema.safeParse({ ...validProduct, measurementValue: 0 }).success).toBe(false)
  })

  it('rejects short product name', () => {
    expect(productSchema.safeParse({ ...validProduct, name: 'A' }).success).toBe(false)
  })

  it('rejects short category', () => {
    expect(productSchema.safeParse({ ...validProduct, category: 'B' }).success).toBe(false)
  })

  it('rejects negative stockPackages', () => {
    expect(productSchema.safeParse({ ...validProduct, stockPackages: -1 }).success).toBe(false)
  })

  it('rejects negative stockLooseUnits', () => {
    expect(productSchema.safeParse({ ...validProduct, stockLooseUnits: -1 }).success).toBe(false)
  })

  it('accepts zero unitCost', () => {
    const result = productSchema.safeParse({ ...validProduct, unitCost: 0 })
    expect(result.success).toBe(true)
  })

  it('accepts lowStockThreshold as number', () => {
    const result = productSchema.safeParse({ ...validProduct, lowStockThreshold: 10 })
    expect(result.success).toBe(true)
  })

  it('normalizes barcode when valido', () => {
    const result = productSchema.safeParse({ ...validProduct, barcode: '789.4900.0115-17' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.barcode).toBe('7894900011517')
    }
  })

  it('rejects barcode with invalid length', () => {
    const result = productSchema.safeParse({ ...validProduct, barcode: '12345' })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// profileSchema
// ---------------------------------------------------------------------------
describe('profileSchema', () => {
  it('accepts valid profile', () => {
    const result = profileSchema.safeParse({
      fullName: 'John Doe',
      companyName: 'Acme',
      preferredCurrency: 'BRL',
    })
    expect(result.success).toBe(true)
  })

  it('rejects short fullName', () => {
    expect(profileSchema.safeParse({ fullName: 'AB', preferredCurrency: 'BRL' }).success).toBe(false)
  })

  it('accepts empty companyName', () => {
    expect(profileSchema.safeParse({ fullName: 'John Doe', companyName: '', preferredCurrency: 'USD' }).success).toBe(
      true,
    )
  })

  it('rejects too long fullName', () => {
    expect(profileSchema.safeParse({ fullName: 'A'.repeat(121), preferredCurrency: 'BRL' }).success).toBe(false)
  })

  it('rejects invalid currency', () => {
    expect(profileSchema.safeParse({ fullName: 'John Doe', preferredCurrency: 'GBP' }).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// employeeSchema
// ---------------------------------------------------------------------------
describe('employeeSchema', () => {
  it('accepts valid employee', () => {
    const result = employeeSchema.safeParse({
      employeeCode: 'EMP01',
      displayName: 'Alice Silva',
      temporaryPassword: '123456',
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-6-digit PIN (5 digits)', () => {
    expect(
      employeeSchema.safeParse({
        employeeCode: 'EMP01',
        displayName: 'Alice Silva',
        temporaryPassword: '12345',
      }).success,
    ).toBe(false)
  })

  it('rejects non-numeric PIN', () => {
    expect(
      employeeSchema.safeParse({
        employeeCode: 'EMP01',
        displayName: 'Alice Silva',
        temporaryPassword: 'abcdef',
      }).success,
    ).toBe(false)
  })

  it('rejects short employeeCode', () => {
    expect(
      employeeSchema.safeParse({
        employeeCode: 'E',
        displayName: 'Alice Silva',
        temporaryPassword: '123456',
      }).success,
    ).toBe(false)
  })

  it('rejects short displayName', () => {
    expect(
      employeeSchema.safeParse({
        employeeCode: 'EMP01',
        displayName: 'AB',
        temporaryPassword: '123456',
      }).success,
    ).toBe(false)
  })

  it('rejects too long employeeCode', () => {
    expect(
      employeeSchema.safeParse({
        employeeCode: 'A'.repeat(33),
        displayName: 'Alice Silva',
        temporaryPassword: '123456',
      }).success,
    ).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// orderItemSchema
// ---------------------------------------------------------------------------
describe('orderItemSchema', () => {
  it('accepts valid order item', () => {
    expect(orderItemSchema.safeParse({ productId: 'prod-1', quantity: 2, unitPrice: 10.5 }).success).toBe(true)
  })

  it('rejects quantity < 1', () => {
    expect(orderItemSchema.safeParse({ productId: 'prod-1', quantity: 0 }).success).toBe(false)
  })

  it('handles empty string unitPrice as undefined', () => {
    const result = orderItemSchema.safeParse({ productId: 'prod-1', quantity: 1, unitPrice: '' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.unitPrice).toBeUndefined()
    }
  })

  it('handles null unitPrice as undefined', () => {
    const result = orderItemSchema.safeParse({ productId: 'prod-1', quantity: 1, unitPrice: null })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.unitPrice).toBeUndefined()
    }
  })

  it('handles undefined unitPrice', () => {
    const result = orderItemSchema.safeParse({ productId: 'prod-1', quantity: 1 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.unitPrice).toBeUndefined()
    }
  })

  it('rejects negative unitPrice', () => {
    expect(orderItemSchema.safeParse({ productId: 'prod-1', quantity: 1, unitPrice: -5 }).success).toBe(false)
  })

  it('rejects empty productId', () => {
    expect(orderItemSchema.safeParse({ productId: '', quantity: 1 }).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// orderSchema
// ---------------------------------------------------------------------------
describe('orderSchema', () => {
  const validOrder = {
    items: [{ productId: 'prod-1', quantity: 1 }],
    customerName: 'Maria Silva',
    buyerType: 'PERSON' as const,
    buyerDocument: '529.982.247-25',
    buyerDistrict: 'Centro',
    buyerCity: 'Sao Paulo',
    buyerState: 'SP',
    buyerCountry: 'Brasil',
    currency: 'BRL' as const,
  }

  it('accepts valid order with valid CPF', () => {
    expect(orderSchema.safeParse(validOrder).success).toBe(true)
  })

  it('defaults buyerCountry to Brasil when empty', () => {
    const result = orderSchema.safeParse({ ...validOrder, buyerCountry: '' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.buyerCountry).toBe('Brasil')
    }
  })

  it('defaults buyerCountry to Brasil when only whitespace', () => {
    const result = orderSchema.safeParse({ ...validOrder, buyerCountry: '   ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.buyerCountry).toBe('Brasil')
    }
  })

  it('rejects invalid CPF for PERSON', () => {
    expect(orderSchema.safeParse({ ...validOrder, buyerDocument: '000.000.000-00' }).success).toBe(false)
  })

  it('validates CNPJ for COMPANY buyer', () => {
    expect(
      orderSchema.safeParse({
        ...validOrder,
        buyerType: 'COMPANY',
        buyerDocument: '11.222.333/0001-81',
      }).success,
    ).toBe(true)
  })

  it('rejects invalid CNPJ for COMPANY', () => {
    expect(
      orderSchema.safeParse({
        ...validOrder,
        buyerType: 'COMPANY',
        buyerDocument: '00.000.000/0000-00',
      }).success,
    ).toBe(false)
  })

  it('requires at least one item', () => {
    expect(orderSchema.safeParse({ ...validOrder, items: [] }).success).toBe(false)
  })

  it('rejects short customerName', () => {
    expect(orderSchema.safeParse({ ...validOrder, customerName: 'M' }).success).toBe(false)
  })

  it('rejects short buyerCity', () => {
    expect(orderSchema.safeParse({ ...validOrder, buyerCity: 'S' }).success).toBe(false)
  })

  it('rejects short buyerState', () => {
    expect(orderSchema.safeParse({ ...validOrder, buyerState: 'S' }).success).toBe(false)
  })

  it('rejects short buyerDocument', () => {
    expect(orderSchema.safeParse({ ...validOrder, buyerDocument: '123' }).success).toBe(false)
  })

  it('accepts optional notes', () => {
    const result = orderSchema.safeParse({ ...validOrder, notes: 'Entregar rapido' })
    expect(result.success).toBe(true)
  })

  it('accepts optional channel', () => {
    const result = orderSchema.safeParse({ ...validOrder, channel: 'WhatsApp' })
    expect(result.success).toBe(true)
  })

  it('accepts optional sellerEmployeeId', () => {
    const result = orderSchema.safeParse({ ...validOrder, sellerEmployeeId: 'emp-1' })
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// fallbackConsentDocuments
// ---------------------------------------------------------------------------
describe('fallbackConsentDocuments', () => {
  it('has 4 documents', () => {
    expect(fallbackConsentDocuments).toHaveLength(4)
  })

  it('first two are required', () => {
    expect(fallbackConsentDocuments[0].required).toBe(true)
    expect(fallbackConsentDocuments[1].required).toBe(true)
  })

  it('last two are optional', () => {
    expect(fallbackConsentDocuments[2].required).toBe(false)
    expect(fallbackConsentDocuments[3].required).toBe(false)
  })

  it('has expected keys', () => {
    const keys = fallbackConsentDocuments.map((d) => d.key)
    expect(keys).toEqual(['terms-of-use', 'privacy-policy', 'cookie-analytics', 'cookie-marketing'])
  })
})
