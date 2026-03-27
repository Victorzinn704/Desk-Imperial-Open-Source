'use client'

import { memo } from 'react'
import { Archive, Package, PencilLine, RotateCcw } from 'lucide-react'
import type { ProductRecord } from '@contracts/contracts'
import { formatCurrencyComparison } from '@/lib/currency'
import { formatMeasurement, formatStockBreakdown } from '@/lib/product-packaging'
import { Button } from '@/components/shared/button'

// ── helpers ──────────────────────────────────────────────────────────────────

function calcMarginPct(unitPrice: number, unitCost: number): number | null {
  if (unitPrice <= 0) return null
  return ((unitPrice - unitCost) / unitPrice) * 100
}

function marginTone(pct: number) {
  if (pct >= 50) return { label: `${pct.toFixed(0)}%`, textClass: 'text-[#34f27f]', borderClass: 'border-[rgba(52,242,127,0.22)] bg-[rgba(52,242,127,0.07)]', accentColor: '#34f27f' }
  if (pct >= 30) return { label: `${pct.toFixed(0)}%`, textClass: 'text-[#c9a96e]', borderClass: 'border-[rgba(201,169,110,0.28)] bg-[rgba(201,169,110,0.07)]', accentColor: '#c9a96e' }
  if (pct >= 15) return { label: `${pct.toFixed(0)}%`, textClass: 'text-[#fbbf24]', borderClass: 'border-[rgba(251,191,36,0.22)] bg-[rgba(251,191,36,0.07)]', accentColor: '#fbbf24' }
  return { label: `${pct.toFixed(0)}%`, textClass: 'text-[#f87171]', borderClass: 'border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.07)]', accentColor: '#f87171' }
}

function stockTone(stock: number) {
  if (stock === 0) return { dot: '#f87171', label: 'Sem estoque' }
  if (stock < 10) return { dot: '#fbbf24', label: 'Estoque baixo' }
  return { dot: '#34f27f', label: 'Em estoque' }
}

// ── component ─────────────────────────────────────────────────────────────────

export const ProductCard = memo(function ProductCard({
  product,
  onEdit,
  onArchive,
  onRestore,
  busy,
}: Readonly<{
  product: ProductRecord
  onEdit: (product: ProductRecord) => void
  onArchive: (productId: string) => void
  onRestore: (productId: string) => void
  busy?: boolean
}>) {
  const costValue = formatCurrencyComparison({
    originalValue: product.originalUnitCost,
    originalCurrency: product.currency,
    convertedValue: product.unitCost,
    displayCurrency: product.displayCurrency,
  })
  const priceValue = formatCurrencyComparison({
    originalValue: product.originalUnitPrice,
    originalCurrency: product.currency,
    convertedValue: product.unitPrice,
    displayCurrency: product.displayCurrency,
  })
  const profitValue = formatCurrencyComparison({
    originalValue: product.originalPotentialProfit,
    originalCurrency: product.currency,
    convertedValue: product.potentialProfit,
    displayCurrency: product.displayCurrency,
  })

  const measurementLabel = formatMeasurement(product.measurementValue, product.measurementUnit)
  const stockBreakdown = formatStockBreakdown(product.stock, product.unitsPerPackage)
  const packageHelper =
    product.unitsPerPackage > 1
      ? `${product.unitsPerPackage} und/caixa`
      : 'por unidade'

  const marginPct = calcMarginPct(product.unitPrice, product.unitCost)
  const margin = marginPct !== null ? marginTone(marginPct) : null
  const stock = stockTone(product.stock)

  // left accent: cor da margem se ativo, cinza se arquivado
  const accentColor = !product.active ? 'rgba(255,255,255,0.08)' : (margin?.accentColor ?? 'rgba(155,132,96,0.5)')

  return (
    <article
      className="relative overflow-hidden rounded-[22px] border border-white/6 bg-[rgba(255,255,255,0.02)] p-5 transition-colors hover:border-white/10 hover:bg-[rgba(255,255,255,0.035)]"
      style={{ boxShadow: product.active ? `inset 3px 0 0 ${accentColor}` : undefined }}
    >
      {/* header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 min-w-0">
          {/* name + status */}
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-base font-semibold text-white truncate">{product.name}</h3>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] border ${
                product.active
                  ? 'border-[rgba(52,242,127,0.22)] bg-[rgba(52,242,127,0.07)] text-[#7bd68a]'
                  : 'border-white/8 bg-white/4 text-[var(--text-soft)]'
              }`}
            >
              {product.active ? 'ativo' : 'arquivado'}
            </span>
            {margin ? (
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-[0.1em] border ${margin.borderClass} ${margin.textClass}`}>
                {margin.label} margem
              </span>
            ) : null}
          </div>

          {/* chips: categoria, marca, medida */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded-[8px] border border-white/8 bg-white/4 px-2.5 py-1 text-[11px] text-[var(--text-soft)]">
              {product.category}
            </span>
            {product.brand ? (
              <span className="rounded-[8px] border border-white/8 bg-white/4 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-[var(--text-soft)]">
                {product.brand}
              </span>
            ) : null}
            <span className="rounded-[8px] border border-white/8 bg-white/4 px-2.5 py-1 text-[11px] text-[var(--text-soft)]">
              {measurementLabel}
            </span>
            {product.packagingClass && product.packagingClass !== 'UN' ? (
              <span className="rounded-[8px] border border-white/8 bg-white/4 px-2.5 py-1 text-[11px] text-[var(--text-soft)]">
                {product.packagingClass}
              </span>
            ) : null}
          </div>

          {product.description ? (
            <p className="mt-3 text-sm leading-6 text-[var(--text-soft)] line-clamp-2">{product.description}</p>
          ) : null}
        </div>

        {/* actions */}
        <div className="flex shrink-0 gap-2">
          <Button disabled={busy} onClick={() => onEdit(product)} size="sm" variant="secondary">
            <PencilLine className="size-3.5" />
            Editar
          </Button>
          {product.active ? (
            <Button disabled={busy} onClick={() => onArchive(product.id)} size="sm" variant="ghost">
              <Archive className="size-3.5" />
              Arquivar
            </Button>
          ) : (
            <Button disabled={busy} onClick={() => onRestore(product.id)} size="sm" variant="ghost">
              <RotateCcw className="size-3.5" />
              Reativar
            </Button>
          )}
        </div>
      </div>

      {/* stats grid */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Custo" primary={costValue.primary} secondary={costValue.secondary} />
        <StatTile label="Preço de venda" primary={priceValue.primary} secondary={priceValue.secondary} />
        <StatTile
          label="Estoque"
          primary={stockBreakdown}
          secondary={`${product.stock} und · ${packageHelper}`}
          dot={stock.dot}
          dotLabel={stock.label}
        />
        <StatTile
          label="Lucro potencial"
          primary={profitValue.primary}
          secondary={profitValue.secondary}
          accent={margin?.accentColor}
        />
      </div>
    </article>
  )
})
ProductCard.displayName = 'ProductCard'

function StatTile({
  label,
  primary,
  secondary,
  dot,
  dotLabel,
  accent,
}: {
  label: string
  primary: string
  secondary?: string | null
  dot?: string
  dotLabel?: string
  accent?: string
}) {
  return (
    <div className="rounded-[14px] border border-white/6 bg-[rgba(255,255,255,0.02)] px-3.5 py-3">
      <div className="flex items-center justify-between gap-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">{label}</p>
        {dot ? (
          <span className="flex items-center gap-1 text-[10px]" style={{ color: dot }}>
            <span className="size-1.5 rounded-full" style={{ background: dot }} />
          </span>
        ) : null}
      </div>
      <p
        className="mt-2 text-sm font-semibold text-white"
        style={accent ? { color: accent } : undefined}
      >
        {primary}
      </p>
      {secondary ?? dotLabel ? (
        <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-soft)] truncate">{secondary ?? dotLabel}</p>
      ) : null}
    </div>
  )
}
