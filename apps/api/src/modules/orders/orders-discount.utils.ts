import { ForbiddenException } from '@nestjs/common'
import type { Request } from 'express'
import type { AuthContext } from '../auth/auth.types'
import type { AdminPinService } from '../admin-pin/admin-pin.service'

const MAX_STAFF_DISCOUNT_PERCENT = 15

export async function assertDiscountAuthorization(
  adminPinService: AdminPinService,
  auth: AuthContext,
  workspaceUserId: string,
  request: Request,
  preparedItems: Array<{
    product: { id: string; name: string }
    quantity: number
    defaultUnitPrice: number
    unitPrice: number
    discounted: boolean
    discountPercent: number
  }>,
) {
  const discountedItems = preparedItems.filter((item) => item.discounted)

  if (!discountedItems.length) {
    return {
      discountedItems,
      maxDiscountPercent: 0,
      adminPinValidated: false,
    }
  }

  const maxDiscountPercent = discountedItems.reduce((current, item) => Math.max(current, item.discountPercent), 0)

  if (auth.role !== 'OWNER' && maxDiscountPercent > MAX_STAFF_DISCOUNT_PERCENT) {
    throw new ForbiddenException('Descontos acima de 15% so podem ser autorizados pelo dono da empresa.')
  }

  const ownerHasPin = await adminPinService.hasPinConfigured(workspaceUserId)

  if (!ownerHasPin) {
    return {
      discountedItems,
      maxDiscountPercent,
      adminPinValidated: false,
    }
  }

  const proof = adminPinService.extractVerificationProof(request)
  const valid = await adminPinService.validateVerificationProof(auth, proof)

  if (!valid) {
    throw new ForbiddenException('Confirme o PIN do dono para aplicar desconto nesta venda.')
  }

  return {
    discountedItems,
    maxDiscountPercent,
    adminPinValidated: true,
  }
}
