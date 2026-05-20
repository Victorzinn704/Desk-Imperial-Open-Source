'use client'

import { CreditCard } from 'lucide-react'
import type { ComandaPaymentMethod } from '@contracts/contracts'
import type { TerminalPaymentMethod } from '@/lib/api'
import { formatBRL as formatCurrency } from '@/lib/currency'

const TERMINAL_PAYMENT_METHODS = new Set<ComandaPaymentMethod>(['PIX', 'DEBIT', 'CREDIT'])

export type OwnerTerminalPaymentIntentHandler = (
  id: string,
  amount: number,
  method: TerminalPaymentMethod,
) => Promise<unknown> | undefined

export function isTerminalPaymentMethod(method: ComandaPaymentMethod): method is TerminalPaymentMethod {
  return TERMINAL_PAYMENT_METHODS.has(method)
}

export function OwnerTerminalPaymentAction({
  activeComandaId,
  amount,
  isBusy,
  method,
  onCreateTerminalPaymentIntent,
}: {
  activeComandaId: string
  amount: number
  isBusy: boolean
  method: TerminalPaymentMethod
  onCreateTerminalPaymentIntent: OwnerTerminalPaymentIntentHandler
}) {
  return (
    <button
      className="mb-2 flex w-full items-center justify-between gap-3 rounded-[14px] border border-[rgba(0,140,255,0.28)] bg-[rgba(0,140,255,0.14)] px-4 py-3 text-sm font-semibold text-[var(--accent,#008cff)] transition active:scale-[0.98] disabled:opacity-50"
      disabled={isBusy}
      type="button"
      onClick={() => onCreateTerminalPaymentIntent(activeComandaId, amount, method)}
    >
      <span className="flex min-w-0 items-center gap-2">
        <CreditCard className="size-4 shrink-0" />
        <span className="truncate">Enviar para maquininha</span>
      </span>
      <span className="shrink-0 tabular-nums">{formatCurrency(amount)}</span>
    </button>
  )
}
