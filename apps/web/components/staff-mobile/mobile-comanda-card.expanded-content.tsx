'use client'

import type { MobileComandaCardProps } from './mobile-comanda-list.types'
import type { useMobileComandaCardController } from './mobile-comanda-card.controller'
import { MobileComandaItemsList } from './mobile-comanda-card.details'
import { MobileComandaCardFinancialSection } from './mobile-comanda-card.financial'
import { MobileComandaActionStrip } from './mobile-comanda-card.header'

export function MobileComandaCardExpandedContent({
  controller,
  isBusy,
  onAddItems,
  onCancelComanda,
  onCloseComanda,
  onCreatePayment,
  onUpdateStatus,
}: Readonly<{
  controller: ReturnType<typeof useMobileComandaCardController>
  isBusy: boolean
  onAddItems?: MobileComandaCardProps['onAddItems']
  onCancelComanda?: MobileComandaCardProps['onCancelComanda']
  onCloseComanda?: MobileComandaCardProps['onCloseComanda']
  onCreatePayment?: MobileComandaCardProps['onCreatePayment']
  onUpdateStatus: MobileComandaCardProps['onUpdateStatus']
}>) {
  return (
    <div className="mt-5 animate-in fill-mode-forwards fade-in slide-in-from-top-2 duration-300">
      <MobileComandaActionStrip
        canAddItems={controller.canAddItems}
        comanda={controller.activeComanda}
        isBusy={isBusy}
        onAddItems={onAddItems}
        onCancelComanda={onCancelComanda}
      />
      <MobileComandaItemsList isLoadingDetails={controller.isLoadingDetails} items={controller.activeComanda.itens} />
      <MobileComandaCardFinancialSection
        controller={controller}
        isBusy={isBusy}
        onCloseComanda={onCloseComanda}
        onCreatePayment={onCreatePayment}
        onUpdateStatus={onUpdateStatus}
      />
    </div>
  )
}
