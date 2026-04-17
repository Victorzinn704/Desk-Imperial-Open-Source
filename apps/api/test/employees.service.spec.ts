/**
 * @file employees.service.spec.ts
 * @module Employees
 *
 * Testes unitários do EmployeesService — módulo de gestão de funcionários.
 *
 * Cobertura garantida:
 *   ✅ listForUser() — listagem de funcionários
 *   ✅ createForUser() — criação com hash de senha
 *   ✅ updateForUser() — atualização de dados
 *   ✅ Vínculo empresa-funcionário
 *   ✅ Validação de role (OWNER apenas)
 */

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { Prisma, UserRole, UserStatus } from '@prisma/client'
import { EmployeesService } from '../src/modules/employees/employees.service'
import type { AuthService } from '../src/modules/auth/auth.service'
import type { PrismaService } from '../src/database/prisma.service'
import type { AuditLogService } from '../src/modules/monitoring/audit-log.service'
import type { CacheService } from '../src/common/services/cache.service'
import * as argon2 from 'argon2'
import { makeAuthContext } from './helpers/auth-context.factory'
import { makeRequestContext } from './helpers/request-context.factory'

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
  argon2id: 2,
}))

const mockPrisma = {
  employee: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  user: {
    upsert: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
}

const mockAuditLogService = {
  record: jest.fn(),
}

const mockAuthService = {
  refreshEmployeeSessionCaches: jest.fn(),
  revokeEmployeeSessions: jest.fn(),
}

const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  employeesKey: jest.fn(),
}

// ── Factories ─────────────────────────────────────────────────────────────────

function makeEmployee(overrides: object = {}) {
  return {
    id: 'employee-1',
    userId: 'owner-1',
    passwordHash: '$argon2id$hashed',
    loginUserId: 'user-employee-1',
    employeeCode: '001',
    displayName: 'João Funcionário',
    active: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    loginUser: {
      id: 'user-employee-1',
      email: 'func001@empresa.com',
      role: UserRole.STAFF,
      status: UserStatus.ACTIVE,
    },
    ...overrides,
  }
}

// ── Setup ─────────────────────────────────────────────────────────────────────

let employeesService: EmployeesService
let mockAuthContext: ReturnType<typeof makeAuthContext>

beforeEach(() => {
  jest.resetAllMocks()

  employeesService = new EmployeesService(
    mockPrisma as unknown as PrismaService,
    mockAuditLogService as unknown as AuditLogService,
    mockCache as unknown as CacheService,
    mockAuthService as unknown as AuthService,
  )

  mockAuthContext = makeAuthContext()

  // Defaults
  mockCache.employeesKey.mockReturnValue('employees:list:owner-1')
  ;(argon2.hash as jest.Mock).mockResolvedValue('$argon2id$hashed')
  mockPrisma.user.findUnique.mockResolvedValue({
    id: 'owner-1',
    companyName: 'Empresa Imperial',
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
    employeeCount: 1,
    email: 'owner@empresa.com',
    emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    preferredCurrency: 'BRL',
    status: UserStatus.ACTIVE,
    cookiePreference: { analytics: false, marketing: false },
  })
  mockPrisma.user.upsert.mockResolvedValue({
    id: 'user-employee-1',
    passwordHash: '$argon2id$hashed',
  })
  mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      user: mockPrisma.user,
      employee: mockPrisma.employee,
    }),
  )
})

function makePrismaUniqueError() {
  const error = new Error('Unique constraint failed')
  Object.setPrototypeOf(error, Prisma.PrismaClientKnownRequestError.prototype)
  ;(error as any).code = 'P2002'
  return error
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EmployeesService', () => {
  describe('listForUser', () => {
    it('deve retornar lista de funcionários com cache', async () => {
      const cachedResponse = {
        items: [makeEmployee()],
        totals: { totalEmployees: 1, activeEmployees: 1 },
      }
      mockCache.get.mockResolvedValue(cachedResponse)

      const result = await employeesService.listForUser(mockAuthContext)

      expect(result).toEqual(cachedResponse)
      expect(mockCache.get).toHaveBeenCalledWith('employees:list:owner-1')
      expect(mockPrisma.employee.findMany).not.toHaveBeenCalled()
    })

    it('deve buscar funcionários do banco quando cache não disponível', async () => {
      mockCache.get.mockResolvedValue(null)

      const employees = [
        makeEmployee({ employeeCode: '001', active: true }),
        makeEmployee({ employeeCode: '002', active: false }),
      ]
      mockPrisma.employee.findMany.mockResolvedValue(employees)

      const result = await employeesService.listForUser(mockAuthContext)

      expect(mockPrisma.employee.findMany).toHaveBeenCalledWith({
        where: { userId: 'owner-1' },
        orderBy: [{ active: 'desc' }, { employeeCode: 'asc' }],
      })
      expect(result.items).toHaveLength(2)
      expect(result.totals.activeEmployees).toBe(1)
    })

    it('deve fazer cache do resultado', async () => {
      mockCache.get.mockResolvedValue(null)
      mockPrisma.employee.findMany.mockResolvedValue([makeEmployee()])

      await employeesService.listForUser(mockAuthContext)

      expect(mockCache.set).toHaveBeenCalledWith('employees:list:owner-1', expect.any(Object), 600)
    })

    it('deve rejeitar listagem para role STAFF', async () => {
      const staffContext = makeAuthContext({ role: 'STAFF' })

      await expect(employeesService.listForUser(staffContext)).rejects.toThrow(
        'Apenas o dono pode listar e gerenciar funcionarios.',
      )
    })
  })

  describe('createForUser', () => {
    const mockContext = makeRequestContext()

    it('deve criar funcionário com credencial operacional no employee', async () => {
      const createdEmployee = makeEmployee({
        loginUserId: null,
        loginUser: null,
        employeeCode: '002',
        displayName: 'Maria Funcionária',
      })

      mockPrisma.employee.create.mockResolvedValue(createdEmployee)

      const result = await employeesService.createForUser(
        mockAuthContext,
        {
          employeeCode: '002',
          displayName: 'Maria Funcionária',
          temporaryPassword: 'Temp@123',
        },
        mockContext,
      )

      expect(argon2.hash).toHaveBeenCalledWith('Temp@123', { type: argon2.argon2id })
      expect(mockPrisma.employee.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'owner-1',
            employeeCode: '002',
            displayName: 'Maria Funcionária',
            passwordHash: '$argon2id$hashed',
            active: true,
          }),
        }),
      )
      expect(mockPrisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            email: 'staff-employee-1@desk-imperial.local',
          },
          create: expect.objectContaining({
            companyOwnerId: 'owner-1',
            fullName: 'Maria Funcionária',
            role: UserRole.STAFF,
          }),
        }),
      )
      expect(mockPrisma.employee.update).toHaveBeenCalledWith({
        where: { id: 'employee-1' },
        data: { loginUserId: 'user-employee-1' },
      })
      expect(result.employee).toBeDefined()
    })

    it('deve rejeitar payload com HTML em campos sensíveis', async () => {
      await expect(
        employeesService.createForUser(
          mockAuthContext,
          {
            employeeCode: '<script>003</script>',
            displayName: 'Nome <b>Teste</b>',
            temporaryPassword: 'Temp@123',
          },
          mockContext,
        ),
      ).rejects.toThrow(BadRequestException)
    })

    it('deve registrar audit log após criação', async () => {
      const createdEmployee = makeEmployee({ employeeCode: '002', displayName: 'Novo Funcionário' })

      mockPrisma.employee.create.mockResolvedValue(createdEmployee)

      await employeesService.createForUser(
        mockAuthContext,
        {
          employeeCode: '002',
          displayName: 'Novo Funcionário',
          temporaryPassword: 'Temp@123',
        },
        mockContext,
      )

      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'employee.created',
          resource: 'employee',
          metadata: expect.objectContaining({
            employeeCode: '002',
            displayName: 'Novo Funcionário',
          }),
        }),
      )
    })

    it('deve invalidar cache de funcionários após criação', async () => {
      const createdEmployee = makeEmployee()

      mockPrisma.employee.create.mockResolvedValue(createdEmployee)

      await employeesService.createForUser(
        mockAuthContext,
        {
          employeeCode: '002',
          displayName: 'Novo Funcionário',
          temporaryPassword: 'Temp@123',
        },
        mockContext,
      )

      expect(mockCache.del).toHaveBeenCalledWith('employees:list:owner-1')
    })

    it('deve lançar ConflictException em caso de duplicate employeeCode', async () => {
      mockPrisma.employee.create.mockRejectedValue(makePrismaUniqueError())

      await expect(
        employeesService.createForUser(
          mockAuthContext,
          {
            employeeCode: '001',
            displayName: 'Funcionário',
            temporaryPassword: 'Temp@123',
          },
          mockContext,
        ),
      ).rejects.toThrow(ConflictException)
    })

    it('deve rejeitar criação para role STAFF', async () => {
      const staffContext = makeAuthContext({ role: 'STAFF' })

      await expect(
        employeesService.createForUser(
          staffContext,
          {
            employeeCode: '002',
            displayName: 'Funcionário',
            temporaryPassword: 'Temp@123',
          },
          mockContext,
        ),
      ).rejects.toThrow('Apenas o dono pode cadastrar funcionarios')
    })
  })

  describe('updateForUser', () => {
    const mockContext = makeRequestContext()

    it('deve atualizar funcionário existente', async () => {
      const existingEmployee = makeEmployee()
      const updatedEmployee = { ...existingEmployee, displayName: 'Nome Atualizado' }

      mockPrisma.employee.findFirst = jest.fn().mockResolvedValue(existingEmployee)
      mockPrisma.employee.update.mockResolvedValue(updatedEmployee)
      mockPrisma.$transaction.mockImplementation(async (fn) =>
        fn({
          user: mockPrisma.user,
          employee: mockPrisma.employee,
        }),
      )

      const result = await employeesService.updateForUser(
        mockAuthContext,
        'employee-1',
        {
          displayName: 'Nome Atualizado',
        },
        mockContext,
      )

      expect(mockPrisma.employee.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            displayName: 'Nome Atualizado',
          }),
        }),
      )
      expect(result.employee.displayName).toBe('Nome Atualizado')
      expect(mockAuthService.refreshEmployeeSessionCaches).toHaveBeenCalledWith('employee-1')
    })

    it('deve atualizar apenas campos fornecidos', async () => {
      const existingEmployee = makeEmployee()
      const updatedEmployee = { ...existingEmployee, active: false }

      mockPrisma.employee.findFirst = jest.fn().mockResolvedValue(existingEmployee)
      mockPrisma.employee.update.mockResolvedValue(updatedEmployee)
      mockPrisma.$transaction.mockImplementation(async (fn) =>
        fn({
          user: mockPrisma.user,
          employee: mockPrisma.employee,
        }),
      )

      await employeesService.updateForUser(
        mockAuthContext,
        'employee-1',
        {
          active: false,
        },
        mockContext,
      )

      expect(mockPrisma.employee.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            active: false,
          }),
        }),
      )
      expect(mockAuthService.revokeEmployeeSessions).toHaveBeenCalledWith('employee-1')
    })

    it('deve lançar NotFoundException se funcionário não existir', async () => {
      mockPrisma.employee.findFirst = jest.fn().mockResolvedValue(null)

      await expect(
        employeesService.updateForUser(
          mockAuthContext,
          'employee-inexistente',
          {
            displayName: 'Nome',
          },
          mockContext,
        ),
      ).rejects.toThrow(NotFoundException)
    })

    it('deve rejeitar atualização para role STAFF', async () => {
      const staffContext = makeAuthContext({ role: 'STAFF' })

      await expect(
        employeesService.updateForUser(
          staffContext,
          'employee-1',
          {
            displayName: 'Nome',
          },
          mockContext,
        ),
      ).rejects.toThrow('Apenas o dono pode editar funcionarios')
    })
  })

  describe('invalidateEmployeesCache', () => {
    it('deve deletar cache de funcionários do usuário', async () => {
      await employeesService.invalidateEmployeesCache('owner-123')

      expect(mockCache.del).toHaveBeenCalledWith('employees:list:owner-123')
    })
  })
})
