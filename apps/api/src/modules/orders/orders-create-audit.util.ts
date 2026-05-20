import type { BuyerType, CurrencyCode } from '@prisma/client'
import type { RequestContext } from '../../common/utils/request-context.util'
import { resolveAuthActorUserId } from '../auth/auth-shared.util'
import type { AuthContext } from '../auth/auth.types'
import type { OrdersServiceDependencies } from './orders-service.types'

type OrderCreationAuditDraft = {
  preparedItems: Array<{
    product: { id: string; name: string }
    quantity: number
    discounted: boolean
    discountPercent: number
  }>
  totals: {
    totalRevenue: number
    totalProfit: number
    totalItems: number
  }
  discountAuthorization: {
    adminPinValidated: boolean
    discountedItems: unknown[]
    maxDiscountPercent: number
  }
  orderCurrency: CurrencyCode
  buyerDistrict: string | null
  buyerCity: string
  buyerState: string | null
  buyerCountry: string
  geocodedLocation: { label?: string | null } | null
  seller: {
    employeeCode?: string | null
    displayName?: string | null
  } | null
}

type OrderCreationAuditInput = {
  auth: AuthContext
  buyerType: BuyerType
  context: RequestContext
  orderId: string
  draft: OrderCreationAuditDraft
}

export async function recordOrderCreatedAudit(deps: OrdersServiceDependencies, input: OrderCreationAuditInput) {
  await deps.auditLogService.record({
    actorUserId: resolveAuthActorUserId(input.auth),
    event: 'order.created',
    resource: 'order',
    resourceId: input.orderId,
    metadata: {
      itemCount: input.draft.preparedItems.length,
      items: input.draft.preparedItems.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        discounted: item.discounted,
        discountPercent: item.discountPercent,
      })),
      totalRevenue: input.draft.totals.totalRevenue,
      totalProfit: input.draft.totals.totalProfit,
      totalItems: input.draft.totals.totalItems,
      buyerType: input.buyerType,
      currency: input.draft.orderCurrency,
      initiatedByRole: input.auth.role,
      adminPinValidated: input.draft.discountAuthorization.adminPinValidated,
      discountItemCount: input.draft.discountAuthorization.discountedItems.length,
      maxDiscountPercent: input.draft.discountAuthorization.maxDiscountPercent,
      buyerLocation: resolveBuyerLocationLabel(input.draft),
      sellerCode: input.draft.seller?.employeeCode,
      sellerName: input.draft.seller?.displayName,
    },
    ipAddress: input.context.ipAddress,
    userAgent: input.context.userAgent,
  })
}

function resolveBuyerLocationLabel(draft: OrderCreationAuditDraft) {
  return (
    draft.geocodedLocation?.label ??
    [draft.buyerDistrict, draft.buyerCity, draft.buyerState, draft.buyerCountry].filter(Boolean).join(', ')
  )
}
