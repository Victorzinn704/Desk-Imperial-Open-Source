import { CurrencyCode } from '@prisma/client'
import type { AuthContext } from '../../src/modules/auth/auth.types'

type AuthContextOverrides = Partial<AuthContext>

export function makeAuthContext(overrides: AuthContextOverrides = {}): AuthContext {
  return {
    userId: 'owner-1',
    actorUserId: 'owner-1',
    sessionId: 'session-1',
    role: 'OWNER',
    workspaceOwnerUserId: 'owner-1',
    companyOwnerUserId: null,
    employeeId: null,
    employeeCode: null,
    email: 'owner@empresa.com',
    fullName: 'Owner da Empresa',
    companyName: 'Empresa Ltda',
    companyLocation: {
      streetLine1: 'Rua Principal',
      streetNumber: '123',
      addressComplement: 'Sala 1',
      district: 'Centro',
      city: 'Sao Paulo',
      state: 'SP',
      postalCode: '01000-000',
      country: 'Brasil',
      latitude: -23.5505,
      longitude: -46.6333,
      precision: 'address',
    },
    workforce: {
      hasEmployees: true,
      employeeCount: 5,
    },
    emailVerified: true,
    preferredCurrency: CurrencyCode.BRL,
    status: 'ACTIVE',
    evaluationAccess: null,
    cookiePreferences: {
      necessary: true,
      analytics: false,
      marketing: false,
    },
    ...overrides,
  }
}

export function makeOwnerAuthContext(overrides: AuthContextOverrides = {}): AuthContext {
  return makeAuthContext(overrides)
}

export function makeStaffAuthContext(overrides: AuthContextOverrides = {}): AuthContext {
  return makeAuthContext({
    userId: 'staff-session-user',
    actorUserId: 'staff-actor-1',
    role: 'STAFF',
    workspaceOwnerUserId: 'owner-1',
    companyOwnerUserId: 'owner-1',
    employeeId: 'employee-1',
    employeeCode: '001',
    fullName: 'Funcionario 001',
    email: 'owner@empresa.com',
    ...overrides,
  })
}
