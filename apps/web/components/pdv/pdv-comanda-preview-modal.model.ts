import type { TerminalPaymentMethod } from '@/lib/api'
import { calcSubtotal, calcTotal, type Comanda, countComandaItems } from './pdv-types'

export const terminalPaymentMethods: Array<{ id: TerminalPaymentMethod; label: string }> = [
  { id: 'PIX', label: 'PIX' },
  { id: 'DEBIT', label: 'Débito' },
  { id: 'CREDIT', label: 'Crédito' },
]

export type PreviewSummary = ReturnType<typeof buildPreviewSummary>

export function buildPreviewSummary(comanda: Comanda) {
  const subtotal = calcSubtotal(comanda)
  const total = calcTotal(comanda)
  const paidAmount = comanda.paidAmount ?? 0
  const remainingAmount = Math.max(0, comanda.remainingAmount ?? total - paidAmount)

  return {
    chargeLabel:
      comanda.paymentStatus === 'PAID' || remainingAmount <= 0.009 ? 'Revisar cobrança' : 'Cobrança e pagamento',
    itemCount: countComandaItems(comanda),
    paidAmount,
    remainingAmount,
    subtotal,
    total,
  }
}

export function resolveTerminalMethodClassName(active: boolean) {
  const baseClassName = 'min-h-10 rounded-[12px] border px-2 text-xs font-bold uppercase tracking-[0.08em] transition'
  return active
    ? `${baseClassName} border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]`
    : `${baseClassName} border-[var(--border)] bg-[var(--surface)] text-[var(--text-soft)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]`
}

export function resolveTerminalMethodLabel(method: TerminalPaymentMethod) {
  return terminalPaymentMethods.find((option) => option.id === method)?.label ?? method
}

export function resolveCustomerLabel(comanda: Comanda) {
  return comanda.clienteNome?.trim() ? comanda.clienteNome : 'Sem cliente identificado'
}

export function resolveStatusLabel(status: Comanda['status']) {
  switch (status) {
    case 'em_preparo':
      return 'Em preparo'
    case 'pronta':
      return 'Pronta'
    case 'cancelada':
      return 'Cancelada'
    case 'fechada':
      return 'Fechada'
    default:
      return 'Aberta'
  }
}

export function resolvePaymentLabel(comanda: Comanda) {
  switch (comanda.paymentStatus) {
    case 'PAID':
      return 'Pago'
    case 'PARTIAL':
      return 'Parcial'
    case 'UNPAID':
      return 'Pendente'
    default:
      return 'Sem pagamento'
  }
}
