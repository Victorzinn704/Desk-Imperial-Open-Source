'use client'

import type { ComandaPaymentMethod } from '@contracts/contracts'
import type { Comanda } from '@/components/pdv/pdv-types'
import {
  OwnerPartialPaymentControls,
  OwnerPaymentMethodGrid,
  OwnerPaymentSummary,
  useOwnerClosePaymentState,
} from './owner-close-payment-controls'
import {
  isTerminalPaymentMethod,
  OwnerTerminalPaymentAction,
  type OwnerTerminalPaymentIntentHandler,
} from './owner-terminal-payment-action'

type OwnerComandaCardCloseActionProps = {
  activeComanda: Comanda
  acrescimoVal: number
  descontoVal: number
  isBusy: boolean
  onCloseComanda: (
    id: string,
    discountAmount: number,
    serviceFeeAmount: number,
    paymentMethod?: ComandaPaymentMethod,
  ) => Promise<unknown> | undefined
  onCreatePayment?: (id: string, amount: number, method: ComandaPaymentMethod) => Promise<unknown> | undefined
  onCreateTerminalPaymentIntent?: OwnerTerminalPaymentIntentHandler
  total: number
}

export function OwnerComandaCardCloseAction({
  activeComanda,
  acrescimoVal,
  descontoVal,
  isBusy,
  onCloseComanda,
  onCreatePayment,
  onCreateTerminalPaymentIntent,
  total,
}: OwnerComandaCardCloseActionProps) {
  const payment = useOwnerClosePaymentState(activeComanda, total, onCreatePayment)
  const terminalMethod = isTerminalPaymentMethod(payment.paymentMethod) ? payment.paymentMethod : null
  const canSendToTerminal =
    Boolean(onCreateTerminalPaymentIntent) && Boolean(terminalMethod) && payment.remainingAmount > 0

  return (
    <section className="mb-4 rounded-[16px] border border-[rgba(0,140,255,0.24)] bg-[rgba(0,140,255,0.06)] p-3">
      <OwnerPaymentSummary paidAmount={payment.paidAmount} remainingAmount={payment.remainingAmount} />
      <OwnerPaymentMethodGrid
        isBusy={isBusy}
        paymentMethod={payment.paymentMethod}
        onPaymentMethodChange={payment.setPaymentMethod}
      />
      {onCreatePayment ? (
        <OwnerPartialPaymentControls
          activeComanda={activeComanda}
          canRegisterPartial={payment.canRegisterPartial}
          isBusy={isBusy}
          normalizedPartialAmount={payment.normalizedPartialAmount}
          partialAmount={payment.partialAmount}
          partialAmountKey={payment.partialAmountKey}
          paymentMethod={payment.paymentMethod}
          remainingAmount={payment.remainingAmount}
          onCreatePayment={onCreatePayment}
          onPartialAmountChange={payment.setPartialAmountState}
        />
      ) : null}
      {canSendToTerminal && terminalMethod && onCreateTerminalPaymentIntent ? (
        <OwnerTerminalPaymentAction
          activeComandaId={activeComanda.id}
          amount={payment.remainingAmount}
          isBusy={isBusy}
          method={terminalMethod}
          onCreateTerminalPaymentIntent={onCreateTerminalPaymentIntent}
        />
      ) : null}
      <button
        className={resolveCloseButtonClass(canSendToTerminal)}
        disabled={isBusy}
        type="button"
        onClick={() => onCloseComanda(activeComanda.id, descontoVal, acrescimoVal, payment.paymentMethod)}
      >
        {resolveCloseButtonLabel(canSendToTerminal, payment.remainingAmount)}
      </button>
    </section>
  )
}

function resolveCloseButtonClass(isTerminalFallback: boolean) {
  if (isTerminalFallback) {
    return 'flex w-full items-center justify-center gap-2 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition active:scale-[0.98] disabled:opacity-50'
  }

  return 'flex w-full items-center justify-center gap-2 rounded-[14px] border border-accent/20 bg-accent px-4 py-3 text-sm font-semibold text-[var(--on-accent)] shadow-sm transition active:scale-[0.98] disabled:opacity-50'
}

function resolveCloseButtonLabel(isTerminalFallback: boolean, remainingAmount: number) {
  if (isTerminalFallback) {
    return 'Fechar manualmente'
  }

  return remainingAmount > 0 ? 'Pagar restante e fechar' : 'Fechar comanda paga'
}
