import { ForbiddenException, NotFoundException } from '@nestjs/common'
import type { AuthContext } from '../src/modules/auth/auth.types'
import { makeOwnerAuthContext, makeStaffAuthContext } from './helpers/auth-context.factory'
import {
  asOperationsClient,
  makeOperationsCashSession,
  makeOperationsComanda,
  makeOperationsEmployee,
  OPERATIONS_OWNER_ID,
  resetOperationsHelpersHarness,
} from './helpers/operations-helpers-harness'

describe('OperationsHelpersService - authorization branches', () => {
  let harness: ReturnType<typeof resetOperationsHelpersHarness>

  beforeEach(() => {
    harness = resetOperationsHelpersHarness()
  })

  it('requireAuthorizedCashSession permite OWNER sem checagem de funcionario', async () => {
    const session = makeOperationsCashSession({ employeeId: 'emp-1' })

    jest.spyOn(harness.service, 'requireOwnedCashSession').mockResolvedValue(session)
    const resolveEmployeeSpy = jest.spyOn(harness.service, 'resolveEmployeeForStaff')

    const result = await harness.service.requireAuthorizedCashSession(
      asOperationsClient({}),
      OPERATIONS_OWNER_ID,
      makeOwnerAuthContext(),
      'cash-1',
    )

    expect(result).toBe(session)
    expect(resolveEmployeeSpy).not.toHaveBeenCalled()
  })

  it('requireAuthorizedCashSession bloqueia STAFF operando caixa de outro funcionario', async () => {
    jest
      .spyOn(harness.service, 'requireOwnedCashSession')
      .mockResolvedValue(makeOperationsCashSession({ employeeId: 'emp-2' }))
    jest.spyOn(harness.service, 'resolveEmployeeForStaff').mockResolvedValue(makeOperationsEmployee({ id: 'emp-1' }))

    await expect(
      harness.service.requireAuthorizedCashSession(
        asOperationsClient({}),
        OPERATIONS_OWNER_ID,
        makeStaffAuthContext({ employeeId: 'emp-1' }),
        'cash-1',
      ),
    ).rejects.toThrow(ForbiddenException)
  })

  it('requireAuthorizedCashSession permite STAFF quando caixa pertence ao funcionario autenticado', async () => {
    const session = makeOperationsCashSession({ employeeId: 'emp-2' })

    jest.spyOn(harness.service, 'requireOwnedCashSession').mockResolvedValue(session)
    jest.spyOn(harness.service, 'resolveEmployeeForStaff').mockResolvedValue(makeOperationsEmployee({ id: 'emp-2' }))

    await expect(
      harness.service.requireAuthorizedCashSession(
        asOperationsClient({}),
        OPERATIONS_OWNER_ID,
        makeStaffAuthContext({ employeeId: 'emp-2' }),
        'cash-1',
      ),
    ).resolves.toBe(session)
  })

  it('requireOwnedCashSession falha quando sessao nao pertence ao workspace', async () => {
    const transaction = { cashSession: { findFirst: jest.fn().mockResolvedValue(null) } }

    await expect(
      harness.service.requireOwnedCashSession(asOperationsClient(transaction), OPERATIONS_OWNER_ID, 'cash-1'),
    ).rejects.toThrow(NotFoundException)
  })

  it('requireOwnedCashSession inclui movimentos quando solicitado', async () => {
    const transaction = { cashSession: { findFirst: jest.fn().mockResolvedValue({ id: 'cash-1' }) } }

    await harness.service.requireOwnedCashSession(asOperationsClient(transaction), OPERATIONS_OWNER_ID, 'cash-1', {
      includeMovements: true,
    })

    expect(transaction.cashSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { movements: { orderBy: { createdAt: 'asc' } } },
      }),
    )
  })

  it('requireAuthorizedComanda permite OWNER e STAFF ativo mesmo em outro atendimento', async () => {
    const ownerAuth = makeOwnerAuthContext()
    const staffAuth = makeStaffAuthContext({ employeeId: 'emp-1' })
    const comanda = makeOperationsComanda({ currentEmployeeId: 'emp-2' })

    jest.spyOn(harness.service, 'requireOwnedComanda').mockResolvedValue(comanda)
    jest.spyOn(harness.service, 'resolveEmployeeForStaff').mockResolvedValue(makeOperationsEmployee({ id: 'emp-1' }))

    await expect(
      harness.service.requireAuthorizedComanda({
        transaction: asOperationsClient({}),
        workspaceOwnerUserId: OPERATIONS_OWNER_ID,
        auth: ownerAuth,
        comandaId: 'comanda-1',
      }),
    ).resolves.toBe(comanda)
    await expect(
      harness.service.requireAuthorizedComanda({
        transaction: asOperationsClient({}),
        workspaceOwnerUserId: OPERATIONS_OWNER_ID,
        auth: staffAuth,
        comandaId: 'comanda-1',
      }),
    ).resolves.toBe(comanda)
  })

  it('requireAuthorizedComanda bloqueia STAFF sem funcionario ativo vinculado', async () => {
    jest
      .spyOn(harness.service, 'requireOwnedComanda')
      .mockResolvedValue(makeOperationsComanda({ currentEmployeeId: 'emp-2' }))
    jest.spyOn(harness.service, 'resolveEmployeeForStaff').mockResolvedValue(null)

    await expect(
      harness.service.requireAuthorizedComanda({
        transaction: asOperationsClient({}),
        workspaceOwnerUserId: OPERATIONS_OWNER_ID,
        auth: makeStaffAuthContext({ employeeId: 'emp-1' }),
        comandaId: 'comanda-1',
      }),
    ).rejects.toThrow(ForbiddenException)
  })

  it('requireAuthorizedComanda permite STAFF quando comanda esta vinculada ao seu atendimento', async () => {
    const comanda = makeOperationsComanda({ currentEmployeeId: 'emp-3' })

    jest.spyOn(harness.service, 'requireOwnedComanda').mockResolvedValue(comanda)
    jest.spyOn(harness.service, 'resolveEmployeeForStaff').mockResolvedValue(makeOperationsEmployee({ id: 'emp-3' }))

    await expect(
      harness.service.requireAuthorizedComanda({
        transaction: asOperationsClient({}),
        workspaceOwnerUserId: OPERATIONS_OWNER_ID,
        auth: makeStaffAuthContext({ employeeId: 'emp-3' }),
        comandaId: 'comanda-1',
      }),
    ).resolves.toBe(comanda)
  })

  it('requireOwnedComanda e requireOwnedEmployee falham quando recurso nao existe', async () => {
    const transaction = {
      comanda: { findFirst: jest.fn().mockResolvedValue(null) },
      employee: { findFirst: jest.fn().mockResolvedValue(null) },
    }

    await expect(
      harness.service.requireOwnedComanda(asOperationsClient(transaction), OPERATIONS_OWNER_ID, 'comanda-1'),
    ).rejects.toThrow(NotFoundException)
    await expect(
      harness.service.requireOwnedEmployee(asOperationsClient(transaction), OPERATIONS_OWNER_ID, 'emp-1'),
    ).rejects.toThrow(NotFoundException)
  })

  it('resolveEmployeeForStaff retorna null para OWNER e para STAFF sem employeeId', async () => {
    const transaction = { employee: { findFirst: jest.fn().mockResolvedValue({ id: 'emp-1' }) } }

    await expect(
      harness.service.resolveEmployeeForStaff(
        asOperationsClient(transaction),
        OPERATIONS_OWNER_ID,
        makeOwnerAuthContext(),
      ),
    ).resolves.toBeNull()
    await expect(
      harness.service.resolveEmployeeForStaff(
        asOperationsClient(transaction),
        OPERATIONS_OWNER_ID,
        makeStaffAuthContext({ employeeId: null }),
      ),
    ).resolves.toBeNull()
    expect(transaction.employee.findFirst).not.toHaveBeenCalled()
  })

  it('resolveEmployeeForStaff carrega funcionario ativo para STAFF com employeeId', async () => {
    const employee = makeOperationsEmployee({ id: 'emp-1' })
    const transaction = { employee: { findFirst: jest.fn().mockResolvedValue(employee) } }

    const result = await harness.service.resolveEmployeeForStaff(
      asOperationsClient(transaction),
      OPERATIONS_OWNER_ID,
      makeStaffAuthContext({ employeeId: 'emp-1' }),
    )

    expect(result).toBe(employee)
    expect(transaction.employee.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ active: true, id: 'emp-1', userId: OPERATIONS_OWNER_ID }),
      }),
    )
  })

  it('requireAuthorizedComanda usa actorEmployee informado quando presente', async () => {
    const auth = makeStaffAuthContext({ employeeId: 'emp-9' }) as AuthContext
    const actorEmployee = { id: 'emp-9' }
    const comanda = makeOperationsComanda({ currentEmployeeId: 'emp-9' })

    jest.spyOn(harness.service, 'requireOwnedComanda').mockResolvedValue(comanda)
    const resolveEmployeeSpy = jest.spyOn(harness.service, 'resolveEmployeeForStaff')

    const result = await harness.service.requireAuthorizedComanda({
      transaction: asOperationsClient({}),
      workspaceOwnerUserId: OPERATIONS_OWNER_ID,
      auth,
      comandaId: 'comanda-1',
      actorEmployee,
    })

    expect(result).toBe(comanda)
    expect(resolveEmployeeSpy).not.toHaveBeenCalled()
  })
})
