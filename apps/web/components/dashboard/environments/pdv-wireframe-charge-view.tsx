import { calcSubtotal, calcTotal, type Comanda, formatElapsed } from '@/components/pdv/pdv-types'
import { formatCurrency } from '@/lib/currency'
import { formatComandaCode } from './pdv-wireframe-environment.helpers'
import type { ComandaCurrency } from './pdv-wireframe-environment.types'
import { ComandaStatusPill } from './pdv-wireframe-shared'

const paymentMethods = ['PIX', 'debito', 'credito', 'dinheiro', 'voucher', 'dividir'] as const
const numpadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '←'] as const

export function PdvChargeView({
  comanda,
  currency,
}: Readonly<{
  comanda: Comanda | null
  currency: ComandaCurrency
}>) {
  return (
    <section className="grid gap-5 xl:grid-cols-[1.3fr_1fr] xl:items-start">
      <ChargeSummaryPanel comanda={comanda} currency={currency} />
      <div className="space-y-4">
        <PaymentMethodPanel />
        <PaymentKeypadPanel comanda={comanda} currency={currency} />
      </div>
    </section>
  )
}

function ChargeSummaryPanel({
  comanda,
  currency,
}: Readonly<{
  comanda: Comanda | null
  currency: ComandaCurrency
}>) {
  return (
    <article className="imperial-card p-5">
      <ChargeSummaryHeader comanda={comanda} />
      {comanda ? <ChargeSummaryContent comanda={comanda} currency={currency} /> : <ChargeSummaryEmptyState />}
    </article>
  )
}

function ChargeSummaryHeader({ comanda }: Readonly<{ comanda: Comanda | null }>) {
  const title = comanda?.mesa ? `Cobrar · Mesa ${comanda.mesa}` : 'Cobrar · Sem comanda'
  const subtitle = comanda
    ? `${formatComandaCode(comanda.id)} · ${comanda.garcomNome ?? 'sem garcom'} · aberta ${formatElapsed(comanda.abertaEm)}`
    : 'aguardando selecao'

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h3 className="font-['Architects_Daughter','Patrick_Hand',sans-serif] text-[1.45rem] font-semibold text-[var(--text-primary)]">
          {title}
        </h3>
        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{subtitle}</p>
      </div>
      {comanda ? <ComandaStatusPill status={comanda.status} /> : null}
    </div>
  )
}

function ChargeSummaryContent({
  comanda,
  currency,
}: Readonly<{
  comanda: Comanda
  currency: ComandaCurrency
}>) {
  const subtotal = calcSubtotal(comanda)
  const total = calcTotal(comanda)
  const serviceFee = Math.max(0, total - subtotal)

  return (
    <>
      <div className="mt-4 space-y-2">
        {comanda.itens.map((item, index) => (
          <div
            className="grid grid-cols-[36px_minmax(0,1fr)_70px_72px] gap-2 border-b border-dotted border-[var(--border)] py-2.5 text-sm last:border-b-0"
            key={`${comanda.id}-charge-${index}`}
          >
            <span className="font-semibold text-[var(--accent-strong)]">{item.quantidade}x</span>
            <span className="truncate text-[var(--text-primary)]">{item.nome}</span>
            <span className="text-right text-[12px] text-[var(--text-soft)]">
              {formatCurrency(item.precoUnitario, currency)}
            </span>
            <span className="text-right text-[var(--text-primary)]">
              {formatCurrency(item.precoUnitario * item.quantidade, currency)}
            </span>
          </div>
        ))}
      </div>
      <ChargeSummaryTotals currency={currency} serviceFee={serviceFee} subtotal={subtotal} total={total} />
    </>
  )
}

function ChargeSummaryTotals({
  currency,
  serviceFee,
  subtotal,
  total,
}: Readonly<{
  currency: ComandaCurrency
  serviceFee: number
  subtotal: number
  total: number
}>) {
  return (
    <>
      <div className="mt-4 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[12px] text-[var(--text-soft)]">
        <span>subtotal</span>
        <span>{formatCurrency(subtotal, currency)}</span>
        <span>taxa servico / acrescimo</span>
        <span>{formatCurrency(serviceFee, currency)}</span>
        <span>desconto</span>
        <span>{formatCurrency(0, currency)}</span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-4 border-t border-dashed border-[var(--border)] pt-4">
        <span className="text-sm text-[var(--text-soft)]">total</span>
        <strong className="font-['Architects_Daughter','Patrick_Hand',sans-serif] text-[2.2rem] leading-none text-[var(--text-primary)]">
          {formatCurrency(total, currency)}
        </strong>
      </div>
    </>
  )
}

function ChargeSummaryEmptyState() {
  return (
    <div className="mt-4 rounded-[8px] border border-dashed border-[var(--border)] px-4 py-10 text-center text-sm text-[var(--text-soft)]">
      Nenhuma comanda aberta para cobranca.
    </div>
  )
}

function PaymentMethodPanel() {
  return (
    <article className="imperial-card p-5">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">forma de pagamento</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {paymentMethods.map((method, index) => (
          <button className={resolvePaymentMethodClass(index === 0)} key={method} type="button">
            {method}
          </button>
        ))}
      </div>
    </article>
  )
}

function PaymentKeypadPanel({
  comanda,
  currency,
}: Readonly<{
  comanda: Comanda | null
  currency: ComandaCurrency
}>) {
  const receivedValue = comanda
    ? formatCurrency(calcTotal(comanda), currency)
        .replace(/[^\d,.-]/g, '')
        .trim()
    : '0,00'

  return (
    <article className="imperial-card p-5">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">valor recebido</p>
      <div className="mt-3 rounded-[8px] border border-[var(--border-strong)] px-4 py-3 text-right font-['JetBrains_Mono','Consolas',monospace] text-[1.5rem] text-[var(--text-primary)]">
        {receivedValue}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {numpadKeys.map((key) => (
          <button
            className="rounded-[8px] border border-dashed border-[var(--border)] px-3 py-3 text-center font-['Architects_Daughter','Patrick_Hand',sans-serif] text-[1.1rem] font-semibold text-[var(--text-primary)]"
            key={key}
            type="button"
          >
            {key}
          </button>
        ))}
      </div>
      <button
        className="mt-3 w-full rounded-[8px] border border-transparent bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--on-accent)]"
        type="button"
      >
        finalizar pagamento
      </button>
    </article>
  )
}

function resolvePaymentMethodClass(isActive: boolean) {
  return isActive
    ? 'rounded-[8px] border border-[color-mix(in_srgb,var(--accent)_40%,var(--paper))] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-3 py-3 text-sm text-[var(--accent-strong)]'
    : 'rounded-[8px] border border-dashed border-[var(--border)] px-3 py-3 text-sm text-[var(--text-primary)]'
}
