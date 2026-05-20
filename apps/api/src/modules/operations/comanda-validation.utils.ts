import { BadRequestException } from '@nestjs/common'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import { toNumberOrZero } from './operations-domain.utils'

export function calculateDraftItemsSubtotal(
  items: Array<{
    totalAmount: { toNumber(): number } | number
  }>,
) {
  return roundCurrency(items.reduce((sum, item) => sum + toNumberOrZero(item.totalAmount), 0))
}

export function assertMonetaryAdjustmentsWithinSubtotal(
  subtotalAmount: number,
  discountAmount: number,
  serviceFeeAmount: number,
) {
  if (discountAmount > subtotalAmount) {
    throw new BadRequestException('O desconto não pode ser maior que o subtotal da comanda.')
  }

  if (serviceFeeAmount > subtotalAmount) {
    throw new BadRequestException('A taxa de serviço não pode ser maior que o subtotal da comanda.')
  }
}

export function shouldRecalculateComandaTotals(
  fields: { discountAmount: number; serviceFeeAmount: number },
  draftItemsCount: number,
) {
  return draftItemsCount > 0 || fields.discountAmount > 0 || fields.serviceFeeAmount > 0
}
