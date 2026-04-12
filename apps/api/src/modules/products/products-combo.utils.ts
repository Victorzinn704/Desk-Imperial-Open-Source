import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'

export function normalizeComboItemsInput(items: Array<{
  productId: string
  quantityPackages?: number
  quantityUnits?: number
}> | undefined) {
  if (!items?.length) {
    return []
  }

  const groupedByProduct = new Map<
    string,
    { productId: string; quantityPackages: number; quantityUnits: number }
  >()

  for (const item of items) {
    const productId = item.productId.trim()
    if (!productId) {
      throw new BadRequestException('Cada componente do combo precisa informar um produto válido.')
    }

    const quantityPackages = Math.max(0, item.quantityPackages ?? 0)
    const quantityUnits = Math.max(0, item.quantityUnits ?? 0)

    if (quantityPackages === 0 && quantityUnits === 0) {
      throw new BadRequestException('Cada componente do combo precisa de quantidade em caixa ou unidade.')
    }

    const existing = groupedByProduct.get(productId)
    if (existing) {
      existing.quantityPackages += quantityPackages
      existing.quantityUnits += quantityUnits
      continue
    }

    groupedByProduct.set(productId, { productId, quantityPackages, quantityUnits })
  }

  return Array.from(groupedByProduct.values())
}

export function assertComboUpdateRules(
  nextIsCombo: boolean,
  dto: { comboItems?: unknown[]; isCombo?: boolean },
  normalizedComboItems: Array<{ productId: string; quantityPackages: number; quantityUnits: number }> | null,
  wasCombo: boolean,
) {
  if (!nextIsCombo && normalizedComboItems && normalizedComboItems.length > 0) {
    throw new BadRequestException('Remova os componentes ou marque o produto como combo antes de salvar.')
  }

  if (nextIsCombo && dto.comboItems !== undefined && normalizedComboItems && normalizedComboItems.length === 0) {
    throw new BadRequestException('Produtos do tipo combo precisam de pelo menos um componente.')
  }

  if (dto.isCombo === true && !wasCombo && dto.comboItems === undefined) {
    throw new BadRequestException('Ao ativar um combo, informe os itens de composição.')
  }
}

export async function buildComboItemsPayload(
  transaction: Prisma.TransactionClient,
  workspaceUserId: string,
  comboProductId: string,
  normalizedItems: Array<{ productId: string; quantityPackages: number; quantityUnits: number }>,
) {
  if (!normalizedItems.length) {
    throw new BadRequestException('Produtos do tipo combo precisam de pelo menos um componente.')
  }

  const products = await transaction.product.findMany({
    where: {
      userId: workspaceUserId,
      id: { in: normalizedItems.map((item) => item.productId) },
    },
    select: { id: true, unitsPerPackage: true },
  })
  const productsById = new Map(products.map((product) => [product.id, product]))

  for (const item of normalizedItems) {
    if (item.productId === comboProductId) {
      throw new BadRequestException('Um combo não pode conter ele mesmo como componente.')
    }

    if (!productsById.has(item.productId)) {
      throw new NotFoundException('Um ou mais componentes do combo não foram encontrados nesta conta.')
    }
  }

  return normalizedItems.map((item) => {
    const component = productsById.get(item.productId)!
    const safeUnitsPerPackage = Math.max(1, component.unitsPerPackage)
    const totalUnits = item.quantityPackages * safeUnitsPerPackage + item.quantityUnits

    if (totalUnits <= 0) {
      throw new BadRequestException('A composição do combo precisa resultar em pelo menos uma unidade.')
    }

    if (safeUnitsPerPackage <= 1) {
      return {
        comboProductId,
        componentProductId: item.productId,
        quantityPackages: 0,
        quantityUnits: totalUnits,
        totalUnits,
      }
    }

    return {
      comboProductId,
      componentProductId: item.productId,
      quantityPackages: Math.floor(totalUnits / safeUnitsPerPackage),
      quantityUnits: totalUnits % safeUnitsPerPackage,
      totalUnits,
    }
  })
}
