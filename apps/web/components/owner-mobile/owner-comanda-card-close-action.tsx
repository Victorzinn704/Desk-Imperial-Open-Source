'use client'

import { useMemo, useState } from 'react'
import type { ComandaPaymentMethod } from '@contracts/contracts'
import type { Comanda } from '@/components/pdv/pdv-types'
import { formatBRL as formatCurrency } from '@/lib/currency'

const PAYMENT_METHODS: Array<{ id: ComandaPaymentMethod; label: string }> = [
  { id: 'PIX', label: 'Pix' },
  { id: 'CREDIT', label: 'Crédito' },
  { id: 'DEBIT', label: 'Débito' },
  { id: 'CASH', label: 'Dinheiro' },
  { id: 'VOUCHER', label: 'Voucher' },
  { id: 'OTHER', label: 'Outro' },
]

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
  total: number
}

export function OwnerComandaCardCloseAction({
  activeComanda,
  acrescimoVal,
  descontoVal,
  isBusy,
  onCloseComanda,
  onCreatePayment,
  total,
}: OwnerComandaCardCloseActionProps) {
  const payment = useOwnerClosePaymentState(activeComanda, total, onCreatePayment)

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
      <button
        className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-accent/20 bg-accent px-4 py-3 text-sm font-semibold text-[var(--on-accent)] shadow-sm transition active:scale-[0.98] disabled:opacity-50"
        disabled={isBusy}
        type="button"
        onClick={() => onCloseComanda(activeComanda.id, descontoVal, acrescimoVal, payment.paymentMethod)}
      >
        {payment.remainingAmount > 0 ? 'Pagar restante e fechar' : 'Fechar comanda paga'}
      </button>
    </section>
  )
}

function useOwnerClosePaymentState(
  activeComanda: Comanda,
  total: number,
  onCreatePayment?: (id: string, amount: number, method: ComandaPaymentMethod) => Promise<unknown> | undefined,
) {
  const [paymentMethod, setPaymentMethod] = useState<ComandaPaymentMethod>('PIX')
  const paidAmount =
    activeComanda.paidAmount ?? activeComanda.payments?.reduce((sum, payment) => sum + payment.amount, 0) ?? 0
  const remainingAmount = Math.max(0, activeComanda.remainingAmount ?? total - paidAmount)
  const defaultPartialAmount = roundInputMoney(remainingAmount > 0 ? remainingAmount : total)
  const partialAmountKey = `${activeComanda.id}:${defaultPartialAmount}`
  const [partialAmountState, setPartialAmountState] = useState(() => ({
    key: partialAmountKey,
    value: defaultPartialAmount,
  }))
  const partialAmount = partialAmountState.key === partialAmountKey ? partialAmountState.value : defaultPartialAmount
  const normalizedPartialAmount = useMemo(
    () => Math.min(roundInputMoney(partialAmount), remainingAmount),
    [partialAmount, remainingAmount],
  )
  const canRegisterPartial =
    Boolean(onCreatePayment) && normalizedPartialAmount > 0 && normalizedPartialAmount < remainingAmount

  return {
    canRegisterPartial,
    normalizedPartialAmount,
    paidAmount,
    partialAmount,
    partialAmountKey,
    paymentMethod,
    remainingAmount,
    setPartialAmountState,
    setPaymentMethod,
  }
}

function OwnerPaymentSummary({ paidAmount, remainingAmount }: { paidAmount: number; remainingAmount: number }) {
  return (
    <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Pago</p>
        <p className="mt-1 text-base font-semibold text-[#36f57c]">{formatCurrency(paidAmount)}</p>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Restante</p>
        <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">{formatCurrency(remainingAmount)}</p>
      </div>
    </div>
  )
}

function OwnerPaymentMethodGrid({
  isBusy,
  paymentMethod,
  onPaymentMethodChange,
}: {
  isBusy: boolean
  paymentMethod: ComandaPaymentMethod
  onPaymentMethodChange: (method: ComandaPaymentMethod) => void
}) {
  return (
    <div className="mb-3 grid grid-cols-3 gap-2">
      {PAYMENT_METHODS.map((method) => (
        <button
          className={`rounded-[12px] border px-2 py-2 text-xs font-semibold transition active:scale-[0.98] ${resolvePaymentMethodClass(paymentMethod === method.id)}`}
          disabled={isBusy}
          key={method.id}
          type="button"
          onClick={() => onPaymentMethodChange(method.id)}
        >
          {method.label}
        </button>
      ))}
    </div>
  )
}

function OwnerPartialPaymentControls({
  activeComanda,
  canRegisterPartial,
  isBusy,
  normalizedPartialAmount,
  partialAmount,
  partialAmountKey,
  paymentMethod,
  remainingAmount,
  onCreatePayment,
  onPartialAmountChange,
}: {
  activeComanda: Comanda
  canRegisterPartial: boolean
  isBusy: boolean
  normalizedPartialAmount: number
  partialAmount: number
  partialAmountKey: string
  paymentMethod: ComandaPaymentMethod
  remainingAmount: number
  onCreatePayment: (id: string, amount: number, method: ComandaPaymentMethod) => Promise<unknown> | undefined
  onPartialAmountChange: (state: { key: string; value: number }) => void
}) {
  return (
    <>
      <OwnerSplitPresetGrid
        activeComanda={activeComanda}
        isBusy={isBusy}
        partialAmountKey={partialAmountKey}
        remainingAmount={remainingAmount}
        onPartialAmountChange={onPartialAmountChange}
      />
      <OwnerPartialAmountInput
        activeComandaId={activeComanda.id}
        canRegisterPartial={canRegisterPartial}
        isBusy={isBusy}
        normalizedPartialAmount={normalizedPartialAmount}
        partialAmount={partialAmount}
        partialAmountKey={partialAmountKey}
        paymentMethod={paymentMethod}
        remainingAmount={remainingAmount}
        onCreatePayment={onCreatePayment}
        onPartialAmountChange={onPartialAmountChange}
      />
    </>
  )
}

function OwnerSplitPresetGrid({
  activeComanda,
  isBusy,
  partialAmountKey,
  remainingAmount,
  onPartialAmountChange,
}: {
  activeComanda: Comanda
  isBusy: boolean
  partialAmountKey: string
  remainingAmount: number
  onPartialAmountChange: (state: { key: string; value: number }) => void
}) {
  const participantCount = Math.max(1, activeComanda.participantCount ?? 1)
  const splitPresets = [
    { label: 'Meia', value: remainingAmount / 2 },
    { label: '3 partes', value: remainingAmount / 3 },
    { label: `${participantCount} pessoas`, value: remainingAmount / participantCount },
  ]

  return (
    <div className="mb-2 grid grid-cols-3 gap-2">
      {splitPresets.map((split) => (
        <button
          className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-[11px] font-semibold text-[var(--text-soft)] disabled:opacity-45"
          disabled={isBusy || remainingAmount <= 0}
          key={split.label}
          type="button"
          onClick={() => onPartialAmountChange({ key: partialAmountKey, value: roundInputMoney(split.value) })}
        >
          {split.label}
        </button>
      ))}
    </div>
  )
}

function OwnerPartialAmountInput({
  activeComandaId,
  canRegisterPartial,
  isBusy,
  normalizedPartialAmount,
  partialAmount,
  partialAmountKey,
  paymentMethod,
  remainingAmount,
  onCreatePayment,
  onPartialAmountChange,
}: {
  activeComandaId: string
  canRegisterPartial: boolean
  isBusy: boolean
  normalizedPartialAmount: number
  partialAmount: number
  partialAmountKey: string
  paymentMethod: ComandaPaymentMethod
  remainingAmount: number
  onCreatePayment: (id: string, amount: number, method: ComandaPaymentMethod) => Promise<unknown> | undefined
  onPartialAmountChange: (state: { key: string; value: number }) => void
}) {
  return (
    <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
      <input
        aria-label="Valor parcial"
        className="min-h-11 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[rgba(0,140,255,0.5)]"
        disabled={isBusy || remainingAmount <= 0}
        inputMode="decimal"
        min={0}
        step="0.01"
        type="number"
        value={partialAmount}
        onChange={(event) => onPartialAmountChange({ key: partialAmountKey, value: Number(event.target.value) })}
      />
      <button
        className="min-h-11 rounded-[12px] border border-[rgba(0,140,255,0.28)] px-3 text-xs font-semibold text-[var(--accent,#008cff)] disabled:opacity-45"
        disabled={isBusy || !canRegisterPartial}
        type="button"
        onClick={() => onCreatePayment(activeComandaId, normalizedPartialAmount, paymentMethod)}
      >
        Parcial
      </button>
    </div>
  )
}

function resolvePaymentMethodClass(isActive: boolean) {
  if (isActive) {
    return 'border-[rgba(0,140,255,0.5)] bg-[rgba(0,140,255,0.18)] text-[var(--accent,#008cff)]'
  }

  return 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-soft)]'
}

function roundInputMoney(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.round(Math.max(0, value) * 100) / 100
}
