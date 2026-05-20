import { BadRequestException } from '@nestjs/common'
import { sanitizeDocument } from '../../common/utils/document-validation.util'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import type { CreateOrderDto } from './dto/create-order.dto'

export function sanitizeBuyerFields(dto: CreateOrderDto) {
  return {
    customerName: requireSafeText(dto.customerName, 'Comprador'),
    buyerDocument: sanitizeDocument(dto.buyerDocument),
    buyerDistrict: optionalSafeText(dto.buyerDistrict, 'Bairro ou regiao'),
    buyerCity: requireSafeText(dto.buyerCity, 'Cidade da venda'),
    buyerState: optionalSafeText(dto.buyerState, 'Estado da venda'),
    buyerCountry: requireSafeText(dto.buyerCountry ?? 'Brasil', 'Pais da venda') ?? 'Brasil',
    channel: optionalSafeText(dto.channel, 'Canal'),
    notes: sanitizePlainText(dto.notes, 'Observacoes', { allowEmpty: true, rejectFormula: false }),
  }
}

function requireSafeText(value: string | undefined, field: string) {
  const sanitized = sanitizePlainText(value, field, { allowEmpty: false, rejectFormula: true })

  if (!sanitized) {
    throw new BadRequestException(`${field} e obrigatorio.`)
  }

  return sanitized
}

function optionalSafeText(value: string | null | undefined, field: string) {
  return sanitizePlainText(value, field, { allowEmpty: true, rejectFormula: true })
}
