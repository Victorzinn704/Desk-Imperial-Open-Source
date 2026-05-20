import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import type { ComandaDraftItemDto } from '../src/modules/operations/operations.schemas'
import { OPERATIONS_OWNER_ID, resetOperationsHelpersHarness } from './helpers/operations-helpers-harness'

describe('OperationsHelpersService - draft items and stock branches', () => {
  let harness: ReturnType<typeof resetOperationsHelpersHarness>

  beforeEach(() => {
    harness = resetOperationsHelpersHarness()
  })

  it('resolveComandaDraftItems retorna vazio quando lista nao existe', async () => {
    const transaction = { product: { findMany: jest.fn() } }

    const result = await harness.service.resolveComandaDraftItems(transaction as any, OPERATIONS_OWNER_ID, undefined)

    expect(result).toEqual([])
    expect(transaction.product.findMany).not.toHaveBeenCalled()
  })

  it('resolveComandaDraftItems normaliza itens de catalogo e manuais', async () => {
    const transaction = {
      product: {
        findMany: jest.fn().mockResolvedValue([
          {
            category: 'pizza',
            id: 'prod-1',
            name: 'Pizza Casa',
            requiresKitchen: true,
            unitPrice: 30,
          },
        ]),
      },
    }

    const result = await harness.service.resolveComandaDraftItems(transaction as any, OPERATIONS_OWNER_ID, [
      { notes: '  sem cebola ', productId: 'prod-1', quantity: 2, unitPrice: 31.114 } as ComandaDraftItemDto,
      { notes: '   ', productName: ' Item Manual ', quantity: 1, unitPrice: 12.499 } as ComandaDraftItemDto,
      { productName: ' Pastel ', quantity: 1, unitPrice: 8 } as ComandaDraftItemDto,
    ])

    expect(result).toEqual([
      {
        notes: 'sem cebola',
        productId: 'prod-1',
        productName: 'Pizza Casa',
        quantity: 2,
        requiresKitchen: true,
        totalAmount: 62.22,
        unitPrice: 31.11,
      },
      {
        notes: null,
        productId: null,
        productName: 'Item Manual',
        quantity: 1,
        requiresKitchen: false,
        totalAmount: 12.5,
        unitPrice: 12.5,
      },
      {
        notes: null,
        productId: null,
        productName: 'Pastel',
        quantity: 1,
        requiresKitchen: true,
        totalAmount: 8,
        unitPrice: 8,
      },
    ])
  })

  it('resolveComandaDraftItems falha quando produto nao existe no catalogo do workspace', async () => {
    const transaction = { product: { findMany: jest.fn().mockResolvedValue([]) } }

    await expect(
      harness.service.resolveComandaDraftItems(transaction as any, OPERATIONS_OWNER_ID, [
        { productId: 'prod-x', quantity: 1 } as ComandaDraftItemDto,
      ]),
    ).rejects.toThrow(NotFoundException)
  })

  it('resolveComandaDraftItems falha para item manual sem unitPrice ou com nome invalido', async () => {
    const transaction = { product: { findMany: jest.fn() } }

    await expect(
      harness.service.resolveComandaDraftItems(transaction as any, OPERATIONS_OWNER_ID, [
        { productName: 'Manual', quantity: 1 } as ComandaDraftItemDto,
      ]),
    ).rejects.toThrow(BadRequestException)
    await expect(
      harness.service.resolveComandaDraftItems(transaction as any, OPERATIONS_OWNER_ID, [
        { productName: '=CSV formula', quantity: 1, unitPrice: 10 } as ComandaDraftItemDto,
      ]),
    ).rejects.toThrow(BadRequestException)
  })

  it('assertDraftSelectionsStockAvailability bloqueia produto sem estoque no fluxo da comanda', async () => {
    const transaction = {
      product: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ comboComponents: [], id: 'prod-1', isCombo: false, name: 'Cerveja', stock: 0 }]),
      },
    }

    await expect(
      harness.service.assertDraftSelectionsStockAvailability(transaction as any, OPERATIONS_OWNER_ID, [
        { productId: 'prod-1', quantity: 1 },
      ]),
    ).rejects.toThrow('Estoque insuficiente para Cerveja')
  })

  it('assertDraftSelectionsStockAvailability considera consumo de componentes em combo', async () => {
    const transaction = {
      product: {
        findMany: jest.fn().mockResolvedValue([
          {
            comboComponents: [
              {
                componentProduct: { id: 'beer-1', name: 'Cerveja Long Neck', stock: 1 },
                componentProductId: 'beer-1',
                totalUnits: 2,
              },
            ],
            id: 'combo-1',
            isCombo: true,
            name: 'Combo Petisco',
            stock: 99,
          },
        ]),
      },
    }

    await expect(
      harness.service.assertDraftSelectionsStockAvailability(transaction as any, OPERATIONS_OWNER_ID, [
        { productId: 'combo-1', quantity: 1 },
      ]),
    ).rejects.toThrow('Estoque insuficiente para Cerveja Long Neck')
  })

  it('assertOpenTableAvailability bloqueia mesa ocupada e permite mesa livre', async () => {
    const transaction = {
      comanda: {
        findFirst: jest.fn().mockResolvedValueOnce({ id: 'comanda-open' }).mockResolvedValueOnce(null),
      },
    }

    await expect(
      harness.service.assertOpenTableAvailability(transaction as any, OPERATIONS_OWNER_ID, 'Mesa 1'),
    ).rejects.toThrow(ConflictException)
    await expect(
      harness.service.assertOpenTableAvailability(transaction as any, OPERATIONS_OWNER_ID, 'Mesa 2', 'comanda-atual'),
    ).resolves.toBeUndefined()
  })
})
