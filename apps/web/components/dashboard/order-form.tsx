'use client'

import { AdminPinDialog } from '@/components/admin-pin/admin-pin-dialog'
import { OrderCartSection } from './order-form-cart-section'
import { OrderBuyerSection, OrderFormIntro, OrderFormSubmitBar, OrderOperationSection } from './order-form-sections'
import type { OrderFormProps } from './order-form.types'
import { useOrderFormController } from './use-order-form-controller'

export type OrderFormController = ReturnType<typeof useOrderFormController>

export function OrderForm(props: Readonly<OrderFormProps>) {
  const controller = useOrderFormController(props)
  const documentLabel = controller.buyerType === 'COMPANY' ? 'CNPJ do comprador' : 'CPF do comprador'
  const documentPlaceholder = controller.buyerType === 'COMPANY' ? '12.345.678/0001-90' : '123.456.789-09'

  return (
    <div className={controller.isEmbedded ? 'min-w-0' : 'imperial-card p-7'}>
      {controller.isEmbedded ? null : <OrderFormIntro />}
      <form className={controller.isEmbedded ? 'space-y-8' : 'mt-6 space-y-6'} onSubmit={controller.handleFormSubmit}>
        <OrderCartSection
          currentItems={controller.currentItems}
          draftQuantity={controller.draftQuantity}
          draftUnitPrice={controller.draftUnitPrice}
          fields={controller.fields}
          isEmbedded={controller.isEmbedded}
          itemsError={controller.itemsError}
          orderCurrency={controller.orderCurrency}
          productOptions={controller.productOptions}
          products={props.products}
          resolvedDraftProductId={controller.resolvedDraftProductId}
          selectedDraftProduct={controller.selectedDraftProduct}
          selectedStockLabel={controller.selectedStockLabel}
          summary={{ ...controller.estimatedCart, totalCartUnits: controller.totalCartUnits }}
          onAddItem={controller.handleAddItem}
          onDraftProductChange={(value) => controller.updateDraftComposer({ productId: value })}
          onDraftQuantityChange={(value) => controller.updateDraftComposer({ quantity: value })}
          onDraftUnitPriceChange={(value) => controller.updateDraftComposer({ unitPrice: value })}
          onRemoveItem={controller.removeItem}
        />
        <OrderOperationSection {...controller} />
        <OrderBuyerSection {...controller} documentLabel={documentLabel} documentPlaceholder={documentPlaceholder} />
        <OrderFormSubmitBar
          disabled={!props.products.length}
          isEmbedded={controller.isEmbedded}
          loading={controller.loading}
          submitLabel={controller.submitLabel}
        />
      </form>
      {controller.pinDialogOpen ? (
        <AdminPinDialog
          description={controller.pinDialogDescription}
          title={controller.pinDialogTitle}
          onCancel={controller.handlePinCancel}
          onConfirm={controller.handlePinConfirm}
        />
      ) : null}
    </div>
  )
}
