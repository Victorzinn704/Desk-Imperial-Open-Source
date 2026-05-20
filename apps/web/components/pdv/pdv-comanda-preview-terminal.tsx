'use client'

import { CreditCard } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import type { TerminalPaymentMethod } from '@/lib/api'
import {
  resolveTerminalMethodClassName,
  resolveTerminalMethodLabel,
  terminalPaymentMethods,
} from './pdv-comanda-preview-modal.model'

export function TerminalPaymentPanel({
  amount,
  busy,
  comandaId,
  method,
  onMethodChange,
  onTerminalPayment,
}: Readonly<{
  amount: number
  busy: boolean
  comandaId: string
  method: TerminalPaymentMethod
  onMethodChange: (method: TerminalPaymentMethod) => void
  onTerminalPayment: (comandaId: string, amount: number, method: TerminalPaymentMethod) => Promise<unknown>
}>) {
  return (
    <div className="rounded-[18px] border border-[color-mix(in_srgb,var(--accent)_24%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_8%,var(--surface-soft))] p-4">
      <TerminalPaymentHeader amount={amount} />
      <TerminalPaymentMethods method={method} onMethodChange={onMethodChange} />
      <TerminalPaymentButton
        amount={amount}
        busy={busy}
        comandaId={comandaId}
        method={method}
        onTerminalPayment={onTerminalPayment}
      />
    </div>
  )
}

function TerminalPaymentHeader({ amount }: Readonly<{ amount: number }>) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Maquininha</p>
        <p className="mt-1 text-sm text-[var(--text-soft)]">
          Envia a cobrança direto para o terminal. Ao trocar o método, a cobrança pendente é substituída quando o Point
          ainda permite cancelamento.
        </p>
      </div>
      <p className="shrink-0 text-base font-bold tabular-nums text-[var(--accent)]">{formatCurrency(amount, 'BRL')}</p>
    </div>
  )
}

function TerminalPaymentMethods({
  method,
  onMethodChange,
}: Readonly<{
  method: TerminalPaymentMethod
  onMethodChange: (method: TerminalPaymentMethod) => void
}>) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      {terminalPaymentMethods.map((option) => (
        <button
          className={resolveTerminalMethodClassName(option.id === method)}
          key={option.id}
          type="button"
          onClick={() => onMethodChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function TerminalPaymentButton({
  amount,
  busy,
  comandaId,
  method,
  onTerminalPayment,
}: Readonly<{
  amount: number
  busy: boolean
  comandaId: string
  method: TerminalPaymentMethod
  onTerminalPayment: (comandaId: string, amount: number, method: TerminalPaymentMethod) => Promise<unknown>
}>) {
  return (
    <button
      className="mt-3 inline-flex min-h-11 w-full items-center justify-between gap-3 rounded-[14px] border border-[var(--accent)] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--on-accent)] transition hover:bg-[var(--accent-strong)] disabled:opacity-60"
      disabled={busy}
      type="button"
      onClick={() => void onTerminalPayment(comandaId, amount, method)}
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        <CreditCard className="size-4 shrink-0" />
        <span className="truncate">{busy ? 'Enviando...' : 'Enviar para maquininha'}</span>
      </span>
      <span className="shrink-0">{resolveTerminalMethodLabel(method)}</span>
    </button>
  )
}
