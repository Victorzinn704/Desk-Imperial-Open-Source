'use client'

import { OwnerPdvBuilder, OwnerPdvOverview } from './owner-mobile-pdv-tab-sections'
import { type OwnerPdvTabProps } from './owner-mobile-pdv-tab-model'

export function OwnerPdvTab(props: OwnerPdvTabProps) {
  if (props.pendingAction) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <OwnerPdvBuilder
          errorMessage={props.errorMessage}
          isBusy={props.isBusy}
          isOffline={props.isOffline}
          pendingAction={props.pendingAction}
          products={props.products}
          productsErrorMessage={props.productsErrorMessage}
          productsLoading={props.productsLoading}
          onCancelBuilder={props.onCancelBuilder}
          onOpenQuickRegister={props.onOpenQuickRegister}
          onSubmit={props.onSubmit}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-3 pb-6">
      <OwnerPdvOverview
        errorMessage={props.errorMessage}
        isOffline={props.isOffline}
        kitchenData={props.kitchenData}
        kitchenLoading={props.kitchenLoading}
        mesas={props.mesas}
        mesasLoading={props.mesasLoading}
        pdvView={props.pdvView}
        onOpenQuickRegister={props.onOpenQuickRegister}
        onSelectMesa={props.onSelectMesa}
        onSetPdvView={props.onSetPdvView}
      />
    </div>
  )
}
