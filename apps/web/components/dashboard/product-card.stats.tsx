import type { ProductRecord } from '@contracts/contracts'
import type { buildProductCardView } from './product-card.model'

type ProductCardView = ReturnType<typeof buildProductCardView>

export function ProductStats({ card, product }: Readonly<{ card: ProductCardView; product: ProductRecord }>) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <StatTile label="Custo" primary={card.costValue.primary} secondary={card.costValue.secondary} />
      <StatTile label="Preço de venda" primary={card.priceValue.primary} secondary={card.priceValue.secondary} />
      <StatTile
        dot={card.stock.dot}
        dotLabel={card.stock.label}
        label="Estoque"
        primary={card.stockBreakdown}
        secondary={`${product.stock} und · ${card.packageHelper}`}
      />
      <StatTile
        accent={card.margin?.accentColor}
        label="Lucro potencial"
        primary={card.profitValue.primary}
        secondary={card.profitValue.secondary}
      />
    </div>
  )
}

function StatTile({
  label,
  primary,
  secondary,
  dot,
  dotLabel,
  accent,
}: Readonly<{
  accent?: string
  dot?: string
  dotLabel?: string
  label: string
  primary: string
  secondary?: string | null
}>) {
  const dotStyle = dot ? buildColorStyle(dot) : undefined
  const accentStyle = accent ? buildColorStyle(accent) : undefined

  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-muted)] px-3.5 py-3">
      <div className="flex items-center justify-between gap-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">{label}</p>
        {dot ? (
          <span className="flex items-center gap-1 text-[10px]" style={dotStyle}>
            <span className="size-1.5 rounded-full" style={buildBackgroundStyle(dot)} />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]" style={accentStyle}>
        {primary}
      </p>
      {(secondary ?? dotLabel) ? (
        <p className="mt-0.5 truncate text-[10px] leading-4 text-[var(--text-soft)]">{secondary ?? dotLabel}</p>
      ) : null}
    </div>
  )
}

function buildColorStyle(color: string) {
  return { color }
}

function buildBackgroundStyle(background: string) {
  return { background }
}
