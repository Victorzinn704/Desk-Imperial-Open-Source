'use client'

import { MobileComandaStatusActions } from './mobile-comanda-card.actions'
import { MobileComandaAdjustmentsSection } from './mobile-comanda-card.details'
import { MobileComandaPaymentSection } from './mobile-comanda-card.payment'
import type { useMobileComandaCardController } from './mobile-comanda-card.controller'
import type { MobileComandaCardProps, PaymentMethod } from './mobile-comanda-list.types'

type MobileComandaCreatePaymentHandler = (amount: number, method: PaymentMethod) => void

type MobileComandaCardFinancialSectionProps = {
  controller: ReturnType<typeof useMobileComandaCardController>
  isBusy: boolean
  onCloseComanda?: MobileComandaCardProps['onCloseComanda']
  onCreatePayment?: MobileComandaCardProps['onCreatePayment']
  onUpdateStatus: MobileComandaCardProps['onUpdateStatus']
}

type MobileComandaCardFinancialBodyProps = {
  controller: ReturnType<typeof useMobileComandaCardController>
  createPaymentHandler?: MobileComandaCreatePaymentHandler
  isBusy: boolean
  onCloseComanda?: MobileComandaCardProps['onCloseComanda']
  onUpdateStatus: MobileComandaCardProps['onUpdateStatus']
}

export function MobileComandaCardFinancialSection({
  controller,
  isBusy,
  onCloseComanda,
  onCreatePayment,
  onUpdateStatus,
}: Readonly<MobileComandaCardFinancialSectionProps>) {
  const createPaymentHandler = resolveCreatePaymentHandler(controller, onCreatePayment)

  return (
    <MobileComandaCardFinancialBody
      controller={controller}
      createPaymentHandler={createPaymentHandler}
      isBusy={isBusy}
      onCloseComanda={onCloseComanda}
      onUpdateStatus={onUpdateStatus}
    />
  )
}

function MobileComandaCardFinancialBody({
  controller,
  createPaymentHandler,
  isBusy,
  onCloseComanda,
  onUpdateStatus,
}: Readonly<MobileComandaCardFinancialBodyProps>) {
  return (
    <>
      <MobileComandaAdjustmentsSection
        adjustedTotal={controller.adjustedTotal}
        discountPercent={controller.discountPercent}
        isBusy={isBusy}
        setDiscountPercent={controller.setDiscountPercent}
        setSurchargePercent={controller.setSurchargePercent}
        surchargePercent={controller.surchargePercent}
        total={controller.total}
      />
      <MobileComandaPaymentSection
        canCreatePayment={controller.canCreatePayment}
        isBusy={isBusy}
        paidAmount={controller.paidAmount}
        parsedPaymentAmount={controller.parsedPaymentAmount}
        participantCount={controller.activeComanda.participantCount}
        paymentAmount={controller.paymentAmount}
        paymentMethod={controller.paymentMethod}
        paymentMethods={controller.paymentMethods}
        remainingAmount={controller.remainingAmount}
        setPaymentAmount={controller.setPaymentAmount}
        setPaymentMethod={controller.setPaymentMethod}
        setPaymentShortcut={controller.setPaymentShortcut}
        onCreatePayment={createPaymentHandler}
      />
      <MobileComandaStatusActions
        comandaId={controller.activeComanda.id}
        config={controller.config}
        discountPercent={controller.discountPercent}
        isBusy={isBusy}
        showDirectClose={controller.showDirectClose}
        surchargePercent={controller.surchargePercent}
        onCloseComanda={onCloseComanda}
        onUpdateStatus={onUpdateStatus}
      />
    </>
  )
}

function resolveCreatePaymentHandler(
  controller: ReturnType<typeof useMobileComandaCardController>,
  onCreatePayment?: MobileComandaCardProps['onCreatePayment'],
) {
  if (!onCreatePayment) {
    return undefined
  }

  return (amount: number, method: PaymentMethod) => {
    void onCreatePayment(controller.activeComanda.id, amount, method)
    controller.setPaymentAmount('')
  }
}
