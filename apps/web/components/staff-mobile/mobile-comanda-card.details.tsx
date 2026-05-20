import { formatBRL as formatCurrency } from '@/lib/currency'
import type { Comanda } from '@/components/pdv/pdv-types'

export function MobileComandaItemsList({
  isLoadingDetails,
  items,
}: Readonly<{
  isLoadingDetails: boolean
  items: Comanda['itens']
}>) {
  if (isLoadingDetails) {
    return (
      <div className="mb-5 flex justify-center py-4">
        <div className="size-5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  if (items.length === 0) {
    return null
  }

  return (
    <div className="mb-5 rounded-[14px] border border-[var(--border)] bg-[var(--surface-muted)] p-3">
      <ul className="space-y-2.5">
        {items.map((item, index) => (
          <li className="flex items-center justify-between text-[13px]" key={`${item.produtoId}-${index}`}>
            <div className="flex items-start gap-2.5">
              <span className="w-4 text-center font-bold text-[var(--accent,#008cff)]">{item.quantidade}x</span>
              <div className="flex flex-col">
                <span className="font-medium text-[var(--text-primary)]/90">{item.nome}</span>
                {item.observacao ? (
                  <span className="text-[10px] italic text-[var(--text-primary)]/40">{`"${item.observacao}"`}</span>
                ) : null}
              </div>
            </div>
            <span className="ml-3 shrink-0 font-medium text-[var(--text-soft,#7a8896)]">
              {formatCurrency(item.quantidade * item.precoUnitario)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function MobileComandaAdjustmentsSection({
  adjustedTotal,
  discountPercent,
  isBusy,
  setDiscountPercent,
  setSurchargePercent,
  surchargePercent,
  total,
}: Readonly<{
  adjustedTotal: number
  discountPercent: number
  isBusy: boolean
  setDiscountPercent: (value: number) => void
  setSurchargePercent: (value: number) => void
  surchargePercent: number
  total: number
}>) {
  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PercentField disabled={isBusy} label="Desconto %" value={discountPercent} onChange={setDiscountPercent} />
        <PercentField disabled={isBusy} label="Acréscimo %" value={surchargePercent} onChange={setSurchargePercent} />
      </div>
      {discountPercent > 0 || surchargePercent > 0 ? (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-[rgba(0,140,255,0.2)] bg-[rgba(0,140,255,0.06)] px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-soft,#7a8896)]">
              Total Final
            </p>
            <p className="text-xs text-[var(--text-soft,#7a8896)] line-through">{formatCurrency(total)}</p>
          </div>
          <span className="text-xl font-bold text-[var(--accent,#008cff)]">{formatCurrency(adjustedTotal)}</span>
        </div>
      ) : null}
    </>
  )
}

function PercentField({
  disabled,
  label,
  onChange,
  value,
}: Readonly<{
  disabled: boolean
  label: string
  onChange: (value: number) => void
  value: number
}>) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-soft,#7a8896)]">
        {label}
      </label>
      <input
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[rgba(0,140,255,0.4)]"
        disabled={disabled}
        max={100}
        min={0}
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}
