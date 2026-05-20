import { Trash2 } from 'lucide-react'
import { Button } from '@/components/shared/button'
import { formatCurrency } from '@/lib/currency'
import { formatStockBreakdown } from '@/lib/product-packaging'
import { InlineFact } from './order-form-sections'
import type { CartLineItemProps, OrderCartSectionProps } from './order-form-cart-section.types'

export function CartItemsList(props: Readonly<OrderCartSectionProps>) {
  const listClass = props.isEmbedded
    ? 'mt-5 divide-y divide-dashed divide-[var(--border)] border-t border-dashed border-[var(--border)]'
    : 'mt-5 space-y-3'

  return (
    <div className={listClass}>
      {props.isEmbedded && props.fields.length ? <EmbeddedItemsHeader /> : null}
      {props.fields.length ? (
        props.fields.map((field, index) => (
          <CartLineItem
            currentItem={props.currentItems[index]}
            field={field}
            index={index}
            isEmbedded={props.isEmbedded}
            key={field.id}
            orderCurrency={props.orderCurrency}
            product={props.products.find((item) => item.id === field.productId)}
            onRemoveItem={props.onRemoveItem}
          />
        ))
      ) : (
        <CartEmptyState isEmbedded={props.isEmbedded} />
      )}
    </div>
  )
}

export function CartEmbeddedFooter(
  props: Readonly<{
    itemsCount: number
    itemsTotal: number
    orderCurrency: OrderCartSectionProps['orderCurrency']
    totalCartUnits: number
  }>,
) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-[var(--border)] pt-4">
      <div className="flex flex-wrap gap-2">
        <InlineFact label="linhas ativas" value={String(props.itemsCount)} />
        <InlineFact label="unidades" value={String(props.totalCartUnits)} />
      </div>
      <div className="text-right">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Subtotal estimado</p>
        <p className="text-lg font-semibold text-[var(--text-primary)]">
          {formatCurrency(props.itemsTotal, props.orderCurrency)}
        </p>
      </div>
    </div>
  )
}

function EmbeddedItemsHeader() {
  return (
    <div className="grid gap-3 py-3 text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)] lg:grid-cols-[minmax(0,1.7fr)_110px_90px_130px_auto]">
      <span>Item</span>
      <span className="text-right">Unit.</span>
      <span className="text-right">Qtd.</span>
      <span className="text-right">Total</span>
      <span className="text-right">Ação</span>
    </div>
  )
}

function CartLineItem(props: CartLineItemProps) {
  const resolvedUnitPrice = props.currentItem?.unitPrice ?? props.product?.unitPrice ?? 0
  const resolvedQuantity = Number(props.currentItem?.quantity ?? props.field.quantity ?? 0)
  const lineTotal = resolvedUnitPrice * resolvedQuantity
  const productSummary = props.product
    ? `${props.product.category} • ${formatStockBreakdown(props.product.stock, props.product.unitsPerPackage)}`
    : 'Revisar item antes de concluir a venda.'

  return (
    <div
      className={
        props.isEmbedded
          ? 'grid gap-4 py-4 lg:grid-cols-[minmax(0,1.7fr)_110px_90px_130px_auto] lg:items-center'
          : 'imperial-card-soft px-4 py-4'
      }
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-[var(--text-primary)]">
          {props.product?.name ?? 'Produto removido do portfólio'}
        </p>
        <p className="mt-1 text-sm text-[var(--text-soft)]">{productSummary}</p>
      </div>
      {props.isEmbedded ? (
        <EmbeddedLineMeta
          currentItem={props.currentItem}
          index={props.index}
          lineTotal={lineTotal}
          orderCurrency={props.orderCurrency}
          resolvedQuantity={resolvedQuantity}
          resolvedUnitPrice={resolvedUnitPrice}
          onRemoveItem={props.onRemoveItem}
        />
      ) : (
        <InlineLineMeta
          currentItem={props.currentItem}
          field={props.field}
          index={props.index}
          orderCurrency={props.orderCurrency}
          onRemoveItem={props.onRemoveItem}
        />
      )}
    </div>
  )
}

function EmbeddedLineMeta(
  props: Readonly<{
    currentItem: CartLineItemProps['currentItem']
    index: number
    lineTotal: number
    onRemoveItem: CartLineItemProps['onRemoveItem']
    orderCurrency: CartLineItemProps['orderCurrency']
    resolvedQuantity: number
    resolvedUnitPrice: number
  }>,
) {
  return (
    <>
      <div className="text-right text-sm text-[var(--text-soft)]">
        {props.currentItem?.unitPrice != null
          ? formatCurrency(props.resolvedUnitPrice, props.orderCurrency)
          : 'cadastro'}
      </div>
      <div className="text-right text-sm text-[var(--text-primary)]">{props.resolvedQuantity}</div>
      <div className="text-right text-sm font-medium text-[var(--text-primary)]">
        {formatCurrency(props.lineTotal, props.orderCurrency)}
      </div>
      <div className="flex justify-end">
        <Button size="sm" type="button" variant="ghost" onClick={() => props.onRemoveItem(props.index)}>
          <Trash2 className="size-4" />
          Remover
        </Button>
      </div>
    </>
  )
}

function InlineLineMeta(
  props: Readonly<{
    currentItem: CartLineItemProps['currentItem']
    field: CartLineItemProps['field']
    index: number
    onRemoveItem: CartLineItemProps['onRemoveItem']
    orderCurrency: CartLineItemProps['orderCurrency']
  }>,
) {
  const quantityLabel = `${props.currentItem?.quantity ?? props.field.quantity} und`
  const priceLabel =
    props.currentItem?.unitPrice != null
      ? `Preço manual ${formatCurrency(props.currentItem.unitPrice, props.orderCurrency)}`
      : 'Preço do cadastro'

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-soft)]">
        {quantityLabel}
      </div>
      <div className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-soft)]">
        {priceLabel}
      </div>
      <Button size="sm" type="button" variant="ghost" onClick={() => props.onRemoveItem(props.index)}>
        <Trash2 className="size-4" />
        Remover
      </Button>
    </div>
  )
}

function CartEmptyState({ isEmbedded }: Readonly<{ isEmbedded: boolean }>) {
  return (
    <div
      className={
        isEmbedded
          ? 'rounded-[16px] border border-dashed border-[var(--border)] px-4 py-6 text-center'
          : 'imperial-card-soft border-dashed px-4 py-6 text-center'
      }
    >
      <p className="text-lg font-semibold text-[var(--text-primary)]">Seu carrinho ainda está vazio.</p>
      <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
        Adicione um ou mais produtos para transformar a operação em pedido multi-item.
      </p>
    </div>
  )
}
