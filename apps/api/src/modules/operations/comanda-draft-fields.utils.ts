import { BadRequestException } from '@nestjs/common'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import { assertMonetaryAdjustmentsWithinSubtotal } from './comanda-validation.utils'

type PrepareComandaDraftFieldsInput = {
  customerDocument?: string | null | undefined
  customerName?: string | null | undefined
  discountAmount?: number | null | undefined
  fallbackDiscountAmount?: number
  fallbackParticipantCount: number
  fallbackServiceFeeAmount?: number
  notes?: string | null | undefined
  participantCount?: number | null | undefined
  serviceFeeAmount?: number | null | undefined
  subtotal: number
  tableLabel: string
}

export function prepareComandaDraftFields(input: PrepareComandaDraftFieldsInput) {
  const tableLabel = sanitizePlainText(input.tableLabel, 'Mesa', {
    allowEmpty: false,
    rejectFormula: true,
  })!
  const customerName = sanitizePlainText(input.customerName, 'Nome do cliente', {
    allowEmpty: true,
    rejectFormula: true,
  })
  const customerDocument = sanitizePlainText(input.customerDocument, 'Documento do cliente', {
    allowEmpty: true,
    rejectFormula: true,
  })
  const notes = sanitizePlainText(input.notes, 'Observacoes da comanda', {
    allowEmpty: true,
    rejectFormula: false,
  })
  const participantCount = input.participantCount ?? input.fallbackParticipantCount
  const discountAmount = roundCurrency(input.discountAmount ?? input.fallbackDiscountAmount ?? 0)
  const serviceFeeAmount = roundCurrency(input.serviceFeeAmount ?? input.fallbackServiceFeeAmount ?? 0)

  if (participantCount < 1) {
    throw new BadRequestException('A comanda precisa ter pelo menos uma pessoa.')
  }

  assertMonetaryAdjustmentsWithinSubtotal(input.subtotal, discountAmount, serviceFeeAmount)

  return {
    customerDocument,
    customerName,
    discountAmount,
    notes,
    participantCount,
    serviceFeeAmount,
    tableLabel,
  }
}
