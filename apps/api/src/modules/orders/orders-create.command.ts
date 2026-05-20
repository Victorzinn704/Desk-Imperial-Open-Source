import { BadRequestException, NotFoundException } from '@nestjs/common'
import { BuyerType, type CurrencyCode, Prisma } from '@prisma/client'
import { isValidCnpj, isValidCpf, sanitizeDocument } from '../../common/utils/document-validation.util'
import { roundCurrency, roundPercent } from '../../common/utils/number-rounding.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import type { AuthContext } from '../auth/auth.types'
import {
  buildInventoryProductsById,
  buildProductConsumptionMap,
  calculateEffectiveUnitCost,
} from '../products/product-combo-consumption.util'
import type { CreateOrderDto } from './dto/create-order.dto'
import { sanitizeBuyerFields } from './orders-buyer-fields.util'
import { invalidateOrdersCache, refreshOrdersFinanceSummary } from './orders-cache.utils'
import { recordOrderCreatedAudit } from './orders-create-audit.util'
import { buildOrderCreateData } from './orders-create-data.builder'
import { assertDiscountAuthorization } from './orders-discount.utils'
import { resolveBuyerLocation } from './orders-location.utils'
import { resolveOrderSeller } from './orders-seller.utils'
import { assertRequestedStockAvailability } from './orders-stock.utils'
import { toOrderRecord } from './orders.types'
import {
  orderProductInventoryInclude,
  type OrdersHttpRequest,
  type OrdersServiceDependencies,
} from './orders-service.types'

type CreateOrderInput = {
  auth: AuthContext
  dto: CreateOrderDto
  context: RequestContext
  request: OrdersHttpRequest
}

type RequestedOrderItem = CreateOrderDto['items'][number] & { index: number }
type LoadedOrderProduct = Awaited<ReturnType<typeof loadOrderProducts>>[number]
type PreparedOrderItem = ReturnType<typeof prepareOrderItems>[number]
type SanitizedBuyerFields = ReturnType<typeof sanitizeBuyerFields>

export async function createOrderForUser(deps: OrdersServiceDependencies, input: CreateOrderInput) {
  const workspaceUserId = resolveWorkspaceOwnerUserId(input.auth)
  const requestedItems = resolveRequestedItems(input.dto)
  const products = await loadOrderProducts(deps, workspaceUserId, requestedItems)
  const productsById = buildProductsById(products)
  const requestedStockByProduct = buildProductConsumptionMap(requestedItems, productsById)

  assertAllRequestedProductsExist(requestedItems, productsById)
  assertRequestedStockAvailability(buildInventoryProductsById(products), requestedStockByProduct)
  assertBuyerDocument(input.dto)

  const prepared = await prepareOrderDraft(deps, input, {
    workspaceUserId,
    requestedItems,
    productsById,
    requestedStockByProduct,
  })
  const order = await persistOrder(deps, prepared)

  await recordOrderCreatedAudit(deps, {
    auth: input.auth,
    buyerType: input.dto.buyerType,
    context: input.context,
    orderId: order.id,
    draft: prepared,
  })
  refreshOrdersFinanceSummary(deps, workspaceUserId)
  void invalidateOrdersCache(deps, workspaceUserId)

  return {
    order: toOrderRecord(order, {
      displayCurrency: input.auth.preferredCurrency,
      currencyService: deps.currencyService,
      snapshot: prepared.snapshot,
    }),
  }
}

function resolveRequestedItems(dto: CreateOrderDto): RequestedOrderItem[] {
  const requestedItems = dto.items.map((item, index) => ({ ...item, index }))

  if (!requestedItems.length) {
    throw new BadRequestException('Adicione pelo menos um produto ao pedido.')
  }

  return requestedItems
}

function loadOrderProducts(
  deps: OrdersServiceDependencies,
  workspaceUserId: string,
  requestedItems: RequestedOrderItem[],
) {
  return deps.prisma.product.findMany({
    where: {
      id: { in: [...new Set(requestedItems.map((item) => item.productId))] },
      userId: workspaceUserId,
      active: true,
    },
    include: orderProductInventoryInclude,
  })
}

function buildProductsById(products: LoadedOrderProduct[]) {
  return new Map(products.map((product) => [product.id, product]))
}

function assertAllRequestedProductsExist(
  requestedItems: RequestedOrderItem[],
  productsById: Map<string, LoadedOrderProduct>,
) {
  for (const item of requestedItems) {
    if (!productsById.has(item.productId)) {
      throw new NotFoundException(`O item ${item.index + 1} referencia um produto que nao existe nesta conta.`)
    }
  }
}

function assertBuyerDocument(dto: CreateOrderDto) {
  const buyerDocument = sanitizeDocument(dto.buyerDocument)

  if (dto.buyerType === BuyerType.PERSON && !isValidCpf(buyerDocument)) {
    throw new BadRequestException('Informe um CPF valido para a compra em nome de pessoa.')
  }

  if (dto.buyerType === BuyerType.COMPANY && !isValidCnpj(buyerDocument)) {
    throw new BadRequestException('Informe um CNPJ valido para a compra em nome de empresa.')
  }
}

async function prepareOrderDraft(
  deps: OrdersServiceDependencies,
  input: CreateOrderInput,
  inventory: {
    workspaceUserId: string
    requestedItems: RequestedOrderItem[]
    productsById: Map<string, LoadedOrderProduct>
    requestedStockByProduct: Map<string, number>
  },
) {
  const orderCurrency = input.dto.currency ?? input.auth.preferredCurrency
  const sanitizedBuyer = sanitizeBuyerFields(input.dto)
  const [snapshot, seller, geocodedLocation] = await Promise.all([
    deps.currencyService.getSnapshot(),
    resolveOrderSeller(deps.prisma, input.auth, inventory.workspaceUserId, input.dto.sellerEmployeeId),
    resolveBuyerLocation(
      deps.prisma,
      deps.geocodingService,
      buildBuyerLocationInput(sanitizedBuyer, inventory.workspaceUserId),
    ),
  ])
  const preparedItems = prepareOrderItems(deps, {
    requestedItems: inventory.requestedItems,
    productsById: inventory.productsById,
    orderCurrency,
    snapshot,
  })
  const discountAuthorization = await assertDiscountAuthorization(
    deps.adminPinService,
    input.auth,
    inventory.workspaceUserId,
    input.request,
    preparedItems,
  )
  const totals = summarizePreparedItems(preparedItems)

  return {
    ...inventory,
    ...sanitizedBuyer,
    dto: input.dto,
    orderCurrency,
    snapshot,
    seller,
    geocodedLocation,
    preparedItems,
    discountAuthorization,
    totals,
  }
}

function buildBuyerLocationInput(buyer: SanitizedBuyerFields, userId: string) {
  return {
    userId,
    district: buyer.buyerDistrict,
    city: buyer.buyerCity,
    state: buyer.buyerState,
    country: buyer.buyerCountry,
  }
}

function prepareOrderItems(
  deps: OrdersServiceDependencies,
  input: {
    requestedItems: RequestedOrderItem[]
    productsById: Map<string, LoadedOrderProduct>
    orderCurrency: CurrencyCode
    snapshot: Awaited<ReturnType<OrdersServiceDependencies['currencyService']['getSnapshot']>>
  },
) {
  return input.requestedItems.map((item) => {
    const product = input.productsById.get(item.productId)

    if (!product) {
      throw new NotFoundException(`Produto nao encontrado para o item ${item.index + 1}.`)
    }

    const unitCost = calculateEffectiveUnitCost(product, {
      currencyService: deps.currencyService,
      displayCurrency: input.orderCurrency,
      snapshot: input.snapshot,
    })
    const defaultUnitPrice = deps.currencyService.convert({
      source: { amount: Number(product.unitPrice), currency: product.currency },
      targetCurrency: input.orderCurrency,
      snapshot: input.snapshot,
    })
    const unitPrice = item.unitPrice ?? defaultUnitPrice
    const discounted = unitPrice < defaultUnitPrice
    const discountPercent = resolveDiscountPercent(discounted, defaultUnitPrice, unitPrice)
    const lineRevenue = roundCurrency(unitPrice * item.quantity)
    const lineCost = roundCurrency(unitCost * item.quantity)

    return {
      product,
      quantity: item.quantity,
      unitCost,
      defaultUnitPrice,
      unitPrice,
      discounted,
      discountPercent,
      lineRevenue,
      lineCost,
      lineProfit: roundCurrency(lineRevenue - lineCost),
    }
  })
}

function resolveDiscountPercent(discounted: boolean, defaultUnitPrice: number, unitPrice: number) {
  return discounted && defaultUnitPrice > 0
    ? roundPercent(((defaultUnitPrice - unitPrice) / defaultUnitPrice) * 100)
    : 0
}

function summarizePreparedItems(preparedItems: PreparedOrderItem[]) {
  const totalRevenue = roundCurrency(preparedItems.reduce((total, item) => total + item.lineRevenue, 0))
  const totalCost = roundCurrency(preparedItems.reduce((total, item) => total + item.lineCost, 0))

  return {
    totalRevenue,
    totalCost,
    totalProfit: roundCurrency(totalRevenue - totalCost),
    totalItems: preparedItems.reduce((total, item) => total + item.quantity, 0),
  }
}

async function persistOrder(deps: OrdersServiceDependencies, draft: Awaited<ReturnType<typeof prepareOrderDraft>>) {
  return deps.prisma.$transaction(
    async (transaction) => {
      await decrementInventory(transaction, draft)

      return transaction.order.create({
        data: buildOrderCreateData(draft),
        include: { items: true },
      })
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  )
}

async function decrementInventory(
  transaction: Prisma.TransactionClient,
  draft: Awaited<ReturnType<typeof prepareOrderDraft>>,
) {
  const inventoryProductsById = buildInventoryProductsById([...draft.productsById.values()])

  for (const [productId, requestedQuantity] of draft.requestedStockByProduct.entries()) {
    const stockUpdate = await transaction.product.updateMany({
      where: { id: productId, userId: draft.workspaceUserId, active: true, stock: { gte: requestedQuantity } },
      data: { stock: { decrement: requestedQuantity } },
    })

    if (stockUpdate.count !== 1) {
      const product = inventoryProductsById.get(productId)
      throw new BadRequestException(
        `Estoque insuficiente para ${product?.name ?? 'o produto selecionado'}. Revise a quantidade e tente novamente.`,
      )
    }
  }
}
