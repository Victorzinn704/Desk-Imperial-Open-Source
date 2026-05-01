import { calcSubtotal, calcTotal, type Comanda } from '@/components/pdv/pdv-types'
import type { PrintableComanda } from './thermal-print.types'

export function comandaToPrintable(comanda: Comanda): PrintableComanda {
  return {
    id: comanda.id,
    tableLabel: comanda.mesa,
    customerName: comanda.clienteNome,
    customerDocument: comanda.clienteDocumento,
    items: comanda.itens.map((item) => ({
      name: item.nome,
      quantity: item.quantidade,
      unitPrice: item.precoUnitario,
      note: item.observacao,
    })),
    discountPercent: comanda.desconto,
    additionalPercent: comanda.acrescimo,
    openedAtIso: toIsoString(comanda.abertaEm),
    subtotalAmount: calcSubtotal(comanda),
    totalAmount: calcTotal(comanda),
    currency: 'BRL',
    operatorLabel: comanda.garcomNome,
  }
}

function toIsoString(value: Date | string | number) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}
