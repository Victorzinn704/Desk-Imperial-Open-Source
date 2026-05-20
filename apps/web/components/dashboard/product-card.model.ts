import type { ProductRecord } from '@contracts/contracts'
import { formatCurrencyComparison } from '@/lib/currency'
import { formatMeasurement, formatStockBreakdown } from '@/lib/product-packaging'

function calcMarginPct(unitPrice: number, unitCost: number): number | null {
  if (unitPrice <= 0) {
    return null
  }
  return ((unitPrice - unitCost) / unitPrice) * 100
}

function marginTone(pct: number) {
  const label = `${pct.toFixed(0)}%`

  if (pct >= 50) {
    return {
      label,
      textClass: 'text-[#34f27f]',
      borderClass: 'border-[rgba(52,242,127,0.22)] bg-[rgba(52,242,127,0.07)]',
      accentColor: '#34f27f',
    }
  }

  if (pct >= 30) {
    return {
      label,
      textClass: 'text-[var(--accent)]',
      borderClass: 'border-accent/25 bg-accent/[0.07]',
      accentColor: 'var(--accent)',
    }
  }

  if (pct >= 15) {
    return {
      label,
      textClass: 'text-[#fbbf24]',
      borderClass: 'border-[rgba(251,191,36,0.22)] bg-[rgba(251,191,36,0.07)]',
      accentColor: '#fbbf24',
    }
  }

  return {
    label,
    textClass: 'text-[#f87171]',
    borderClass: 'border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.07)]',
    accentColor: '#f87171',
  }
}

function stockTone(stock: number) {
  if (stock === 0) {
    return { dot: '#f87171', label: 'Sem estoque' }
  }
  if (stock < 10) {
    return { dot: '#fbbf24', label: 'Estoque baixo' }
  }
  return { dot: '#34f27f', label: 'Em estoque' }
}

export function buildProductCardView(product: ProductRecord) {
  const marginPct = calcMarginPct(product.unitPrice, product.unitCost)
  const margin = marginPct !== null ? marginTone(marginPct) : null

  return {
    accentColor: !product.active ? 'var(--border)' : (margin?.accentColor ?? 'var(--accent)'),
    costValue: formatCurrencyComparison({
      originalValue: product.originalUnitCost,
      originalCurrency: product.currency,
      convertedValue: product.unitCost,
      displayCurrency: product.displayCurrency,
    }),
    margin,
    measurementLabel: formatMeasurement(product.measurementValue, product.measurementUnit),
    packageHelper: product.unitsPerPackage > 1 ? `${product.unitsPerPackage} und/caixa` : 'por unidade',
    priceValue: formatCurrencyComparison({
      originalValue: product.originalUnitPrice,
      originalCurrency: product.currency,
      convertedValue: product.unitPrice,
      displayCurrency: product.displayCurrency,
    }),
    profitValue: formatCurrencyComparison({
      originalValue: product.originalPotentialProfit,
      originalCurrency: product.currency,
      convertedValue: product.potentialProfit,
      displayCurrency: product.displayCurrency,
    }),
    stock: stockTone(product.stock),
    stockBreakdown: formatStockBreakdown(product.stock, product.unitsPerPackage),
  }
}
