import { CartComposer, CartHeader, SelectedProductSummary } from './order-form-cart-section-header'
import { CartEmbeddedFooter, CartItemsList } from './order-form-cart-section-list'
import type { OrderCartSectionProps } from './order-form-cart-section.types'

export function OrderCartSection(props: Readonly<OrderCartSectionProps>) {
  return (
    <section className={props.isEmbedded ? 'space-y-5' : 'imperial-card-soft p-5'}>
      <CartHeader {...props} />
      <CartComposer {...props} />
      <SelectedProductSummary {...props} />
      {props.itemsError ? <p className="mt-4 text-sm text-[var(--danger)]">{props.itemsError}</p> : null}
      <CartItemsList {...props} />
      {props.isEmbedded && props.fields.length ? (
        <CartEmbeddedFooter {...props.summary} orderCurrency={props.orderCurrency} />
      ) : null}
    </section>
  )
}
