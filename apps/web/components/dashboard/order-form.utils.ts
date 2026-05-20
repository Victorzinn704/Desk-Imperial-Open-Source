import type { ProductRecord } from '@contracts/contracts'
import type { EmployeeRecord } from '@/lib/api'
import type { OrderFormInputValues } from '@/lib/validation'
import { formatStockBreakdown } from '@/lib/product-packaging'
import type { CartItemValue, DraftComposerState } from './order-form.types'

const emptyValues: OrderFormInputValues = {
  items: [],
  customerName: '',
  buyerType: 'PERSON',
  buyerDocument: '',
  buyerDistrict: '',
  buyerCity: '',
  buyerState: '',
  buyerCountry: 'Brasil',
  sellerEmployeeId: '',
  currency: 'BRL',
  channel: '',
  notes: '',
}

export function buildOrderDefaults(
  products: ProductRecord[],
  initialValues?: Partial<OrderFormInputValues>,
): OrderFormInputValues {
  return {
    ...emptyValues,
    currency: initialValues?.currency ?? products[0]?.currency ?? 'BRL',
    ...initialValues,
    items: initialValues?.items ?? [],
  }
}

export function buildDraftComposerDefaults(
  products: ProductRecord[],
  initialFormValues: OrderFormInputValues,
): DraftComposerState {
  return {
    productId: initialFormValues.items[0]?.productId ?? products[0]?.id ?? '',
    quantity: '1',
    unitPrice: '',
  }
}

export function buildDraftComposerKey(products: ProductRecord[], initialFormValues: OrderFormInputValues) {
  return `${initialFormValues.items[0]?.productId ?? ''}::${products.map((product) => product.id).join('|')}`
}

export function estimateCartTotals(products: ProductRecord[], items: CartItemValue[]) {
  return items.reduce(
    (acc, item) => {
      const product = products.find((entry) => entry.id === item.productId)
      const resolvedUnitPrice = item.unitPrice ?? product?.unitPrice ?? 0
      const lineTotal = resolvedUnitPrice * Number(item.quantity ?? 0)

      return {
        itemsTotal: acc.itemsTotal + lineTotal,
        itemsCount: acc.itemsCount + Number(item.quantity ?? 0),
      }
    },
    { itemsTotal: 0, itemsCount: 0 },
  )
}

export function buildEmployeeOptions(activeEmployees: EmployeeRecord[]) {
  const label =
    activeEmployees.length > 0 ? 'Selecione o vendedor responsável' : 'Cadastre um funcionário para vincular a venda'

  return [
    { label, value: '' },
    ...activeEmployees.map((employee) => ({
      label: `${employee.employeeCode} • ${employee.displayName}`,
      value: employee.id,
    })),
  ]
}

export function buildProductOptions(products: ProductRecord[]) {
  return [
    { label: 'Selecione um produto', value: '' },
    ...products.map((product) => ({
      label: `${product.name} • ${formatStockBreakdown(product.stock, product.unitsPerPackage, { compact: true })} (${product.stock} und)`,
      value: product.id,
    })),
  ]
}

export function resolveDraftProductId(products: ProductRecord[], draftProductId: string) {
  if (products.length === 0) {
    return ''
  }

  if (products.some((product) => product.id === draftProductId)) {
    return draftProductId
  }

  return products[0]?.id ?? ''
}

export function resolveDraftItemAddition(
  products: ProductRecord[],
  currentItems: CartItemValue[],
  draftProductId: string,
  draftQuantity: string,
  draftUnitPrice: string,
) {
  const product = products.find((item) => item.id === draftProductId)
  if (!product) {
    return { error: 'Selecione um produto para adicionar ao pedido.' }
  }

  const quantity = Number.parseInt(draftQuantity, 10)
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { error: 'Use uma quantidade inteira maior que zero.' }
  }

  const normalizedUnitPrice = draftUnitPrice.trim() === '' ? undefined : Number(draftUnitPrice.replace(',', '.'))
  if (normalizedUnitPrice !== undefined && (!Number.isFinite(normalizedUnitPrice) || normalizedUnitPrice < 0)) {
    return { error: 'O valor unitário precisa ser zero ou positivo.' }
  }

  const requestedForProduct = currentItems.reduce((total, item) => {
    return item.productId === product.id ? total + Number(item.quantity ?? 0) : total
  }, 0)
  if (requestedForProduct + quantity > product.stock) {
    return { error: `Estoque insuficiente para ${product.name}. Disponível: ${product.stock} und.` }
  }

  return {
    existingIndex: currentItems.findIndex((item) => item.productId === product.id),
    normalizedUnitPrice,
    product,
    quantity,
  }
}
