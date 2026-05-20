import { CurrencyCode, UserRole, UserStatus } from '@prisma/client'

export const AUTH_TEST_EMAILS = {
  disabled: 'disabled@empresa.com',
  missing: 'missing@empresa.com',
  owner: 'owner@empresa.com',
  pending: 'pending@empresa.com',
} as const

export const INVALID_EMAIL_CODE = '000000'
export const VALID_EMAIL_CODE = '654321'
export const STAFF_EMPLOYEE_CODE = 'VD-001'
export const STAFF_PASSWORD = '12345678'

export function makeOwnerUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'owner-1',
    companyOwnerId: null,
    fullName: 'Owner User',
    companyName: 'Empresa Ltda',
    companyStreetLine1: 'Rua A',
    companyStreetNumber: '100',
    companyAddressComplement: null,
    companyDistrict: 'Centro',
    companyCity: 'Sao Paulo',
    companyState: 'SP',
    companyPostalCode: '01000-000',
    companyCountry: 'Brasil',
    companyLatitude: -23.55,
    companyLongitude: -46.63,
    hasEmployees: true,
    employeeCount: 3,
    role: UserRole.OWNER,
    email: AUTH_TEST_EMAILS.owner,
    emailVerifiedAt: new Date('2026-01-01T00:00:00Z'),
    preferredCurrency: CurrencyCode.BRL,
    status: UserStatus.ACTIVE,
    passwordHash: '$argon2id$v=19$stub',
    cookiePreference: { analytics: false, marketing: false },
    employeeAccount: null,
    ...overrides,
  }
}
