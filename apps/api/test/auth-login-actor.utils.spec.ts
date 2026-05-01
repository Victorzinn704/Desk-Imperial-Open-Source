import { UserRole, UserStatus } from '@prisma/client'
import {
  resolveDemoOwnerActor,
  resolveEmployeePasswordHash,
} from '../src/modules/auth/auth-login-actor.utils'

describe('auth-login-actor utils', () => {
  it('retorna null para demo owner quando o usuario nao e owner raiz', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'staff-1',
          role: UserRole.STAFF,
          companyOwnerId: 'owner-1',
          passwordHash: 'hash',
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date('2026-04-01T10:00:00.000Z'),
          fullName: 'Funcionario',
          cookiePreference: 'essentials',
          companyName: 'Desk Imperial',
          companyStreetLine1: null,
          companyStreetNumber: null,
          companyAddressComplement: null,
          companyDistrict: null,
          companyCity: null,
          companyState: null,
          companyPostalCode: null,
          companyCountry: null,
          companyLatitude: null,
          companyLongitude: null,
          hasEmployees: true,
          employeeCount: 1,
          preferredCurrency: 'BRL',
          employeeAccount: null,
        }),
      },
    }

    await expect(resolveDemoOwnerActor(prisma as never, 'demo@deskimperial.online')).resolves.toBeNull()
  })

  it('usa o hash do loginUser como fallback do funcionario', () => {
    expect(
      resolveEmployeePasswordHash({
        passwordHash: null,
        loginUser: { passwordHash: 'login-user-hash' },
      }),
    ).toBe('login-user-hash')
  })
})
