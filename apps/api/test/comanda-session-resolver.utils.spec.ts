import { ConflictException } from '@nestjs/common'
import { CashSessionStatus } from '@prisma/client'
import { resolveComandaSessionContext } from '../src/modules/operations/comanda-session-resolver.utils'

describe('resolveComandaSessionContext', () => {
  const operationalBusinessDate = new Date('2026-04-01T00:00:00.000Z')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('bloqueia caixa informado que pertence a outro funcionario', async () => {
    const prisma = {
      cashSession: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'cash-emp-1',
          businessDate: operationalBusinessDate,
          status: CashSessionStatus.OPEN,
          employeeId: 'emp-1',
        }),
      },
    }
    const helpers = {
      requireOwnedEmployee: jest.fn().mockResolvedValue({ id: 'emp-1' }),
      requireOwnedCashSession: jest.fn().mockResolvedValue({
        id: 'cash-other',
        businessDate: operationalBusinessDate,
        status: CashSessionStatus.OPEN,
        employeeId: 'emp-2',
      }),
    }

    await expect(
      resolveComandaSessionContext(
        prisma as any,
        helpers as any,
        'OWNER',
        'owner-1',
        operationalBusinessDate,
        null,
        { employeeId: 'emp-1', cashSessionId: 'cash-other' } as any,
      ),
    ).rejects.toThrow(ConflictException)
  })

  it('bloqueia caixa informado que nao esta aberto', async () => {
    const prisma = {
      cashSession: {
        findFirst: jest.fn(),
      },
    }
    const helpers = {
      requireOwnedEmployee: jest.fn(),
      requireOwnedCashSession: jest.fn().mockResolvedValue({
        id: 'cash-closed',
        businessDate: operationalBusinessDate,
        status: CashSessionStatus.CLOSED,
        employeeId: null,
      }),
    }

    await expect(
      resolveComandaSessionContext(
        prisma as any,
        helpers as any,
        'OWNER',
        'owner-1',
        operationalBusinessDate,
        null,
        { cashSessionId: 'cash-closed' } as any,
      ),
    ).rejects.toThrow('O caixa informado precisa estar aberto para receber comandas.')
  })

  it('bloqueia caixa informado de outro dia operacional', async () => {
    const prisma = {
      cashSession: {
        findFirst: jest.fn(),
      },
    }
    const helpers = {
      requireOwnedEmployee: jest.fn(),
      requireOwnedCashSession: jest.fn().mockResolvedValue({
        id: 'cash-other-day',
        businessDate: new Date('2026-04-02T00:00:00.000Z'),
        status: CashSessionStatus.OPEN,
        employeeId: null,
      }),
    }

    await expect(
      resolveComandaSessionContext(
        prisma as any,
        helpers as any,
        'OWNER',
        'owner-1',
        operationalBusinessDate,
        null,
        { cashSessionId: 'cash-other-day' } as any,
      ),
    ).rejects.toThrow('O caixa informado pertence a outro dia operacional.')
  })

  it('aceita caixa informado quando ele esta aberto e alinhado ao funcionario', async () => {
    const prisma = {
      cashSession: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'cash-emp-1',
          businessDate: operationalBusinessDate,
          status: CashSessionStatus.OPEN,
          employeeId: 'emp-1',
        }),
      },
    }
    const helpers = {
      requireOwnedEmployee: jest.fn().mockResolvedValue({ id: 'emp-1' }),
      requireOwnedCashSession: jest.fn().mockResolvedValue({
        id: 'cash-emp-1',
        businessDate: operationalBusinessDate,
        status: CashSessionStatus.OPEN,
        employeeId: 'emp-1',
      }),
    }

    await expect(
      resolveComandaSessionContext(
        prisma as any,
        helpers as any,
        'OWNER',
        'owner-1',
        operationalBusinessDate,
        null,
        { employeeId: 'emp-1', cashSessionId: 'cash-emp-1' } as any,
      ),
    ).resolves.toEqual({
      currentEmployeeId: 'emp-1',
      cashSessionId: 'cash-emp-1',
      businessDate: operationalBusinessDate,
    })
  })
})
