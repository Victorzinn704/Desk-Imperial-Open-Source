import { assertOwnerRole, resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { resolveAuthActorUserId } from '../auth/auth-shared.util'
import type { AuthContext } from '../auth/auth.types'
import type { UpdateProductDto } from './dto/update-product.dto'
import { assertComboUpdateRules, buildComboItemsPayload, normalizeComboItemsInput } from './products-combo.utils'
import { buildProductUpdateData } from './products-update.utils'
import { toProductRecord } from './products-response.mapper'
import { type ProductsServiceDependencies, productWithComboInclude } from './products-service.types'
import {
  handleProductConflict,
  invalidateProductsCache,
  refreshProductsFinanceSummary,
  requireOwnedProduct,
} from './products-service.shared'

type UpdateProductInput = {
  auth: AuthContext
  productId: string
  dto: UpdateProductDto
  context: RequestContext
}

export async function updateProductForUser(deps: ProductsServiceDependencies, input: UpdateProductInput) {
  assertOwnerRole(input.auth, 'Apenas o dono pode editar produtos.')
  const workspaceUserId = resolveWorkspaceOwnerUserId(input.auth)
  const existingProduct = await requireOwnedProduct(deps, workspaceUserId, input.productId)
  const normalizedComboItems = input.dto.comboItems ? normalizeComboItemsInput(input.dto.comboItems) : null
  const nextIsCombo = input.dto.isCombo ?? existingProduct.isCombo

  assertComboUpdateRules(nextIsCombo, input.dto, normalizedComboItems, existingProduct.isCombo)

  try {
    const product = await persistProductUpdate(deps, {
      workspaceUserId,
      productId: existingProduct.id,
      dto: input.dto,
      nextIsCombo,
      normalizedComboItems,
    })
    const snapshot = await deps.currencyService.getSnapshot()

    await deps.auditLogService.record({
      actorUserId: resolveAuthActorUserId(input.auth),
      event: 'product.updated',
      resource: 'product',
      resourceId: product.id,
      metadata: {
        updatedFields: Object.keys(input.dto),
        isCombo: product.isCombo,
        comboItemsCount: product.comboComponents.length,
      },
      ipAddress: input.context.ipAddress,
      userAgent: input.context.userAgent,
    })

    refreshProductsFinanceSummary(deps, workspaceUserId)
    void invalidateProductsCache(deps, workspaceUserId)

    return {
      product: toProductRecord(product, {
        displayCurrency: input.auth.preferredCurrency,
        currencyService: deps.currencyService,
        snapshot,
      }),
    }
  } catch (error) {
    handleProductConflict(error)
  }
}

async function persistProductUpdate(
  deps: ProductsServiceDependencies,
  input: {
    workspaceUserId: string
    productId: string
    dto: UpdateProductDto
    nextIsCombo: boolean
    normalizedComboItems: ReturnType<typeof normalizeComboItemsInput> | null
  },
) {
  return deps.prisma.$transaction(async (transaction) => {
    const updatedProduct = await transaction.product.update({
      where: { id: input.productId },
      data: buildProductUpdateData(input.dto, input.nextIsCombo),
    })

    if (!input.nextIsCombo) {
      await transaction.productComboItem.deleteMany({ where: { comboProductId: updatedProduct.id } })
    } else if (input.normalizedComboItems) {
      const comboItemsPayload = await buildComboItemsPayload(
        transaction,
        input.workspaceUserId,
        updatedProduct.id,
        input.normalizedComboItems,
      )

      await transaction.productComboItem.deleteMany({ where: { comboProductId: updatedProduct.id } })
      await transaction.productComboItem.createMany({ data: comboItemsPayload })
    }

    return transaction.product.findUniqueOrThrow({
      where: { id: updatedProduct.id },
      include: productWithComboInclude,
    })
  })
}
