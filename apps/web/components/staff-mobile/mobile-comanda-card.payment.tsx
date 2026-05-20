import { formatBRL as formatCurrency } from '@/lib/currency'
import type { PaymentMethod } from './mobile-comanda-list.types'

type MobileComandaPaymentSectionProps = {
  canCreatePayment: boolean
  isBusy: boolean
  onCreatePayment?: (amount: number, method: PaymentMethod) => void
  paidAmount: number
  parsedPaymentAmount: number
  participantCount: number | null | undefined
  paymentAmount: string
  paymentMethod: PaymentMethod
  paymentMethods: ReadonlyArray<{ label: string; value: PaymentMethod }>
  remainingAmount: number
  setPaymentAmount: (value: string) => void
  setPaymentMethod: (value: PaymentMethod) => void
  setPaymentShortcut: (amount: number) => void
}

export function MobileComandaPaymentSection({
  canCreatePayment,
  isBusy,
  onCreatePayment,
  paidAmount,
  parsedPaymentAmount,
  participantCount,
  paymentAmount,
  paymentMethod,
  paymentMethods,
  remainingAmount,
  setPaymentAmount,
  setPaymentMethod,
  setPaymentShortcut,
}: Readonly<MobileComandaPaymentSectionProps>) {
  if (!onCreatePayment) {
    return null
  }

  const bodyProps = {
    canCreatePayment,
    isBusy,
    onCreatePayment,
    paidAmount,
    parsedPaymentAmount,
    participantCount,
    paymentAmount,
    paymentMethod,
    paymentMethods,
    remainingAmount,
    setPaymentAmount,
    setPaymentMethod,
    setPaymentShortcut,
  }

  return <MobileComandaPaymentBody {...bodyProps} />
}

function MobileComandaPaymentBody({
  canCreatePayment,
  isBusy,
  onCreatePayment,
  paidAmount,
  parsedPaymentAmount,
  participantCount,
  paymentAmount,
  paymentMethod,
  paymentMethods,
  remainingAmount,
  setPaymentAmount,
  setPaymentMethod,
  setPaymentShortcut,
}: Readonly<
  Omit<MobileComandaPaymentSectionProps, 'onCreatePayment'> & {
    onCreatePayment: (amount: number, method: PaymentMethod) => void
  }
>) {
  return (
    <div className="mb-4 rounded-[16px] border border-[var(--border)] bg-[var(--surface-muted)] p-3">
      <PaymentMetrics paidAmount={paidAmount} remainingAmount={remainingAmount} />
      <PaymentMethodSelector
        isBusy={isBusy}
        paymentMethod={paymentMethod}
        paymentMethods={paymentMethods}
        setPaymentMethod={setPaymentMethod}
      />
      <PaymentInputRow
        canCreatePayment={canCreatePayment}
        isBusy={isBusy}
        parsedPaymentAmount={parsedPaymentAmount}
        paymentAmount={paymentAmount}
        paymentMethod={paymentMethod}
        remainingAmount={remainingAmount}
        setPaymentAmount={setPaymentAmount}
        onCreatePayment={onCreatePayment}
      />
      <PaymentShortcutGrid
        isBusy={isBusy}
        participantCount={participantCount}
        remainingAmount={remainingAmount}
        setPaymentShortcut={setPaymentShortcut}
      />
    </div>
  )
}

function PaymentMetrics({
  paidAmount,
  remainingAmount,
}: Readonly<{
  paidAmount: number
  remainingAmount: number
}>) {
  return (
    <div className="mb-3 grid grid-cols-2 gap-px overflow-hidden rounded-[13px] bg-[var(--border)]">
      <PaymentMetric label="Pago" tone="#36f57c" value={formatCurrency(paidAmount)} />
      <PaymentMetric label="Restante" tone="var(--text-primary)" value={formatCurrency(remainingAmount)} />
    </div>
  )
}

function PaymentMetric({
  label,
  tone,
  value,
}: Readonly<{
  label: string
  tone: string
  value: string
}>) {
  return (
    <div className="bg-[var(--surface)] px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-1 text-sm font-bold" style={{ color: tone }}>
        {value}
      </p>
    </div>
  )
}

function PaymentMethodSelector({
  isBusy,
  paymentMethod,
  paymentMethods,
  setPaymentMethod,
}: Readonly<{
  isBusy: boolean
  paymentMethod: PaymentMethod
  paymentMethods: ReadonlyArray<{ label: string; value: PaymentMethod }>
  setPaymentMethod: (value: PaymentMethod) => void
}>) {
  return (
    <div className="mb-3 grid grid-cols-4 gap-1">
      {paymentMethods.map((method) => (
        <button
          className="rounded-lg border px-1.5 py-2 text-[10px] font-bold transition-all active:scale-95 disabled:opacity-50"
          disabled={isBusy}
          key={method.value}
          style={resolvePaymentMethodStyle(paymentMethod === method.value)}
          type="button"
          onClick={() => setPaymentMethod(method.value)}
        >
          {method.label}
        </button>
      ))}
    </div>
  )
}

function PaymentInputRow({
  canCreatePayment,
  isBusy,
  onCreatePayment,
  parsedPaymentAmount,
  paymentAmount,
  paymentMethod,
  remainingAmount,
  setPaymentAmount,
}: Readonly<{
  canCreatePayment: boolean
  isBusy: boolean
  onCreatePayment: (amount: number, method: PaymentMethod) => void
  parsedPaymentAmount: number
  paymentAmount: string
  paymentMethod: PaymentMethod
  remainingAmount: number
  setPaymentAmount: (value: string) => void
}>) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-2">
      <input
        className="min-h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[rgba(0,140,255,0.45)]"
        disabled={isBusy || remainingAmount <= 0}
        inputMode="decimal"
        placeholder="Valor parcial"
        type="text"
        value={paymentAmount}
        onChange={(event) => setPaymentAmount(event.target.value)}
      />
      <button
        className="min-h-11 rounded-xl bg-[var(--accent)] px-4 text-xs font-bold text-[var(--on-accent)] transition-all active:scale-95 disabled:opacity-40"
        disabled={isBusy || !canCreatePayment}
        type="button"
        onClick={() => {
          if (canCreatePayment) {
            onCreatePayment(parsedPaymentAmount, paymentMethod)
          }
        }}
      >
        Parcial
      </button>
    </div>
  )
}

function PaymentShortcutGrid({
  isBusy,
  participantCount,
  remainingAmount,
  setPaymentShortcut,
}: Readonly<{
  isBusy: boolean
  participantCount: number | null | undefined
  remainingAmount: number
  setPaymentShortcut: (amount: number) => void
}>) {
  return (
    <div className="mt-2 grid grid-cols-3 gap-1">
      {buildPaymentShortcuts(remainingAmount, participantCount).map((shortcut) => (
        <button
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-[10px] font-semibold text-[var(--text-soft)] active:scale-95 disabled:opacity-40"
          disabled={isBusy || remainingAmount <= 0}
          key={shortcut.label}
          type="button"
          onClick={() => setPaymentShortcut(shortcut.value)}
        >
          {shortcut.label}
        </button>
      ))}
    </div>
  )
}

function resolvePaymentMethodStyle(selected: boolean) {
  return {
    background: selected ? 'rgba(0,140,255,0.14)' : 'var(--surface)',
    borderColor: selected ? 'rgba(0,140,255,0.45)' : 'var(--border)',
    color: selected ? 'var(--accent,#008cff)' : 'var(--text-soft)',
  }
}

function buildPaymentShortcuts(remainingAmount: number, participantCount: number | null | undefined) {
  return [
    { label: 'Meia', value: remainingAmount / 2 },
    { label: 'Pessoa', value: remainingAmount / Math.max(1, participantCount ?? 1) },
    { label: 'Restante', value: remainingAmount },
  ]
}
