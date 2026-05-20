import { NotFoundException } from '@nestjs/common'
import { resetOperationsHelpersHarness } from './helpers/operations-helpers-harness'

describe('OperationsHelpersService - comanda recalculation branches', () => {
  let harness: ReturnType<typeof resetOperationsHelpersHarness>

  beforeEach(() => {
    harness = resetOperationsHelpersHarness()
  })

  it('recalculateComanda falha quando comanda nao existe', async () => {
    const transaction = { comanda: { findUnique: jest.fn().mockResolvedValue(null) } }

    await expect(harness.service.recalculateComanda(transaction as any, 'comanda-x')).rejects.toThrow(NotFoundException)
  })

  it('recalculateComanda aplica overrides de desconto e taxa de servico', async () => {
    const transaction = {
      comanda: {
        findUnique: jest.fn().mockResolvedValue({
          discountAmount: 10,
          id: 'comanda-1',
          items: [{ totalAmount: 100 }, { totalAmount: 50.555 }],
          serviceFeeAmount: 5,
        }),
        update: jest.fn().mockResolvedValue({ id: 'comanda-1' }),
      },
    }

    await harness.service.recalculateComanda(transaction as any, 'comanda-1', {
      discountAmount: 20,
      serviceFeeAmount: 0,
    })

    expect(transaction.comanda.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          discountAmount: 20,
          serviceFeeAmount: 0,
          subtotalAmount: 150.56,
          totalAmount: 130.56,
        },
      }),
    )
  })
})
