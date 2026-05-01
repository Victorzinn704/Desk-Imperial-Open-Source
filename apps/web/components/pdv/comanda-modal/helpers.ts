import type { PrintableComanda } from '@/lib/printing'
import { calcTotal, type Comanda, type ComandaItem } from '../pdv-types'
import { normalizeTableLabel } from '../normalize-table-label'
import type { SimpleProduct } from './types'

export const STATUS_LABEL_MAP: Record<Comanda['status'], string> = {
  aberta: 'Aberta',
  em_preparo: 'Em preparo',
  pronta: 'Pronta',
  cancelada: 'Cancelada',
  fechada: 'Fechada',
}

export function resolveFallbackTitle(search: string) {
  return search.trim() ? 'Busca rápida' : 'Todos os produtos'
}

export function resolveDocLabel(doc: string) {
  return doc.replaceAll(/\D/g, '').length > 11 ? 'CNPJ' : 'CPF'
}

export function documentBorderColor(doc: string, valid: boolean): string {
  if (!doc) {
    return 'var(--border)'
  }

  return valid
    ? 'color-mix(in srgb, var(--success) 26%, var(--border))'
    : 'color-mix(in srgb, var(--danger) 26%, var(--border))'
}

export function addOrIncrementItem(prev: ComandaItem[], product: SimpleProduct): ComandaItem[] {
  const existing = prev.find((item) => item.produtoId === product.id)
  if (existing) {
    return prev.map((item) => (item.produtoId === product.id ? { ...item, quantidade: item.quantidade + 1 } : item))
  }

  return [...prev, { produtoId: product.id, nome: product.name, quantidade: 1, precoUnitario: product.unitPrice }]
}

export function buildPrintableComanda(comanda: Comanda): PrintableComanda {
  const subtotalAmount = comanda.itens.reduce((sum, item) => sum + item.quantidade * item.precoUnitario, 0)

  return {
    id: comanda.id,
    tableLabel: normalizeTableLabel(comanda.mesa ?? ''),
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
    openedAtIso: comanda.abertaEm.toISOString(),
    subtotalAmount,
    totalAmount: calcTotal(comanda),
    currency: 'BRL',
    operatorLabel: 'PDV',
  }
}
