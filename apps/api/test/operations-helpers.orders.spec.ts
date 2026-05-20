import { BadRequestException, NotFoundException } from '@nestjs/common'
import { CurrencyCode } from '@prisma/client'
import { OPERATIONS_OWNER_ID, resetOperationsHelpersHarness } from './helpers/operations-helpers-harness'

describe('OperationsHelpersService - order projection branches', () => {
  let harness: ReturnType<typeof resetOperationsHelpersHarness>

  beforeEach(() => {
    harness = resetOperationsHelpersHarness()
  })

  it('ensureOrderForClosedComanda retorna pedido existente sem recriar', async () => {
    const transaction = {
      comanda: { findFirst: jest.fn() },
      order: { create: jest.fn(), findFirst: jest.fn().mockResolvedValue({ id: 'order-1' }) },
    }

    const result = await harness.service.ensureOrderForClosedComanda(
      transaction as any,
      OPERATIONS_OWNER_ID,
      'comanda-1',
    )

    expect(result).toEqual({ id: 'order-1' })
    expect(transaction.order.create).not.toHaveBeenCalled()
  })

  it('ensureOrderForClosedComanda falha quando comanda nao existe', async () => {
    const transaction = {
      comanda: { findFirst: jest.fn().mockResolvedValue(null) },
      order: { create: jest.fn(), findFirst: jest.fn().mockResolvedValue(null) },
    }

    await expect(
      harness.service.ensureOrderForClosedComanda(transaction as any, OPERATIONS_OWNER_ID, 'comanda-x'),
    ).rejects.toThrow(NotFoundException)
  })

  it('ensureOrderForClosedComanda cria pedido consolidado com custos e categorias corretos', async () => {
    const transaction = makeOrderProjectionTransaction({
      comanda: {
        currentEmployee: { displayName: 'Atendente 1', employeeCode: 'E001' },
        currentEmployeeId: 'emp-1',
        customerDocument: '529.982.247-25',
        customerName: 'Cliente XPTO',
        id: 'comanda-1',
        items: [
          makeProductComandaItem({ productName: 'Pizza', quantity: 2, totalAmount: 30, unitCost: 10, unitPrice: 15 }),
          makeManualComandaItem(),
        ],
        notes: 'Fechamento presencial',
        totalAmount: 50,
      },
    })

    await harness.service.ensureOrderForClosedComanda(transaction as any, OPERATIONS_OWNER_ID, 'comanda-1')

    expect(transaction.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          buyerType: 'PERSON',
          comandaId: 'comanda-1',
          currency: CurrencyCode.BRL,
          status: 'COMPLETED',
          totalCost: 20,
          totalItems: 3,
          totalProfit: 30,
          totalRevenue: 50,
          userId: OPERATIONS_OWNER_ID,
        }),
      }),
    )

    const createPayload = transaction.order.create.mock.calls[0][0]
    expect(transaction.product.updateMany).toHaveBeenCalledTimes(1)
    expect(createPayload.data.items.create).toEqual([
      expect.objectContaining({ category: 'Alimentos', lineCost: 20, lineProfit: 10, lineRevenue: 30 }),
      expect.objectContaining({ category: 'Comanda manual', lineCost: 0, lineProfit: 20, lineRevenue: 20 }),
    ])
  })

  it('ensureOrderForClosedComanda falha quando a baixa de estoque nao reserva o item', async () => {
    const transaction = makeOrderProjectionTransaction({
      comanda: {
        currentEmployee: null,
        currentEmployeeId: null,
        customerDocument: null,
        customerName: 'Cliente XPTO',
        id: 'comanda-estoque',
        items: [
          makeProductComandaItem({
            productName: 'Pizza',
            quantity: 2,
            stock: 1,
            totalAmount: 30,
            unitCost: 10,
            unitPrice: 15,
          }),
        ],
        notes: null,
        totalAmount: 30,
      },
      stockUpdateCount: 0,
    })

    await expect(
      harness.service.ensureOrderForClosedComanda(transaction as any, OPERATIONS_OWNER_ID, 'comanda-estoque'),
    ).rejects.toThrow(BadRequestException)
    await expect(
      harness.service.ensureOrderForClosedComanda(transaction as any, OPERATIONS_OWNER_ID, 'comanda-estoque'),
    ).rejects.toThrow('Estoque insuficiente para Pizza')
    expect(transaction.order.create).not.toHaveBeenCalled()
  })

  it('ensureOrderForClosedComanda consome componentes quando a comanda fecha combo', async () => {
    const transaction = makeOrderProjectionTransaction({
      comanda: {
        currentEmployee: null,
        currentEmployeeId: null,
        customerDocument: null,
        customerName: 'Cliente Combo',
        id: 'comanda-2',
        items: [
          {
            productId: 'combo-1',
            productName: 'Combo Imperial',
            quantity: 2,
            totalAmount: 60,
            unitPrice: 30,
            product: {
              category: 'Combos',
              comboComponents: [
                {
                  componentProduct: {
                    currency: CurrencyCode.BRL,
                    id: 'product-1',
                    name: 'Mini salgado',
                    stock: 40,
                    unitCost: 4,
                  },
                  componentProductId: 'product-1',
                  totalUnits: 3,
                },
              ],
              id: 'combo-1',
              isCombo: true,
              unitCost: 1,
            },
          },
        ],
        notes: null,
        totalAmount: 60,
      },
    })

    await harness.service.ensureOrderForClosedComanda(transaction as any, OPERATIONS_OWNER_ID, 'comanda-2')

    expect(transaction.product.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'product-1', stock: { gte: 6 } }),
      }),
    )
    expect(transaction.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          items: { create: [expect.objectContaining({ lineCost: 24, lineProfit: 36, unitCost: 12 })] },
          totalCost: 24,
          totalProfit: 36,
        }),
      }),
    )
  })
})

function makeOrderProjectionTransaction(params: { comanda: Record<string, unknown>; stockUpdateCount?: number }) {
  return {
    comanda: { findFirst: jest.fn().mockResolvedValue(params.comanda) },
    order: {
      create: jest.fn().mockResolvedValue({ id: 'order-created' }),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    product: { updateMany: jest.fn().mockResolvedValue({ count: params.stockUpdateCount ?? 1 }) },
  }
}

function makeProductComandaItem(params: {
  productName: string
  quantity: number
  stock?: number
  totalAmount: number
  unitCost: number
  unitPrice: number
}) {
  return {
    productId: 'prod-1',
    productName: params.productName,
    quantity: params.quantity,
    totalAmount: params.totalAmount,
    unitPrice: params.unitPrice,
    product: {
      category: 'Alimentos',
      comboComponents: [],
      currency: CurrencyCode.BRL,
      id: 'prod-1',
      isCombo: false,
      name: params.productName,
      stock: params.stock ?? 10,
      unitCost: params.unitCost,
    },
  }
}

function makeManualComandaItem() {
  return {
    product: null,
    productId: null,
    productName: 'Taxa manual',
    quantity: 1,
    totalAmount: 20,
    unitPrice: 20,
  }
}
