'use client'

import type { FinanceSummaryResponse } from '@contracts/contracts'
import { LabPanel, LabStatusPill, LabTable } from '@/components/design-lab/lab-primitives'
import { ProductThumb } from '@/components/shared/product-thumb'
import { formatCurrency } from '@/lib/currency'
import { formatPercent } from './financeiro-model'
import { FinanceSummaryRow } from './financeiro-shared'
import { buildDreAuditColumns } from './financeiro-tab-panels.columns'
import { FinanceProgressRow, ProgressRowValue } from './financeiro-progress-list'
import { buildDreStatementModel } from './financeiro-tab-summary.model'
import {
  buildDreAuditRows,
  calculateSharePercent,
  type FinancePanelProps,
  type FinanceProductsPanelProps,
} from './financeiro-tab-panels.model'

type TopProduct = FinanceSummaryResponse['topProducts'][number]

export function DreStatementPanel(props: FinancePanelProps) {
  const model = buildDreStatementModel(props)

  return (
    <LabPanel
      action={<LabStatusPill tone={model.actionTone}>{model.actionValue}</LabStatusPill>}
      padding="md"
      subtitle="Demonstrativo objetivo do resultado, sem repetir o hero."
      title="DRE resumido"
    >
      <div className="space-y-2">
        {model.rows.map((row) => (
          <FinanceSummaryRow key={row.label} label={row.label} tone={row.tone} value={row.value} />
        ))}
      </div>
    </LabPanel>
  )
}

export function DreProductDriversPanel({
  displayCurrency,
  finance,
  products: catalogProducts,
}: FinanceProductsPanelProps) {
  const products = finance?.topProducts.slice(0, 4) ?? []
  const productsById = new Map(catalogProducts.map((product) => [product.id, product]))
  const totalRevenue = products.reduce((sum, product) => sum + product.inventorySalesValue, 0)

  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{products.length} produtos</LabStatusPill>}
      padding="md"
      subtitle="Produtos que mais sustentam receita e margem no resultado atual."
      title="Drivers do resultado"
    >
      <div className="space-y-4">
        {products.length > 0 ? (
          products.map((product) => (
            <DreProductDriverRow
              catalogProduct={productsById.get(product.id)}
              displayCurrency={displayCurrency}
              key={product.id}
              product={product}
              sharePercent={calculateSharePercent({ total: totalRevenue, value: product.inventorySalesValue })}
            />
          ))
        ) : (
          <p className="text-sm text-[var(--lab-fg-soft)]">Sem produtos suficientes para leitura agora.</p>
        )}
      </div>
    </LabPanel>
  )
}

export function DrePeriodBreakdownPanel({ displayCurrency, finance }: FinancePanelProps) {
  const rows = buildDreAuditRows(finance?.revenueTimeline ?? [])

  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{rows.length} períodos</LabStatusPill>}
      padding="md"
      subtitle="Fechamento sequencial para entender evolução de receita, lucro e margem."
      title="Fechamento gerencial"
    >
      <LabTable
        dense
        className="rounded-none border-0 bg-transparent"
        columns={buildDreAuditColumns({ displayCurrency })}
        emptyDescription="Sem períodos suficientes para fechar o demonstrativo."
        emptyTitle="Nenhum fechamento disponível"
        rowKey="label"
        rows={rows}
      />
    </LabPanel>
  )
}

function DreProductDriverRow({
  catalogProduct,
  displayCurrency,
  product,
  sharePercent,
}: Readonly<{
  catalogProduct?: FinanceProductsPanelProps['products'][number]
  displayCurrency: FinancePanelProps['displayCurrency']
  product: TopProduct
  sharePercent: number
}>) {
  const productBrand = resolveProductBrand({ catalogProduct, product })

  return (
    <FinanceProgressRow
      aside={
        <ProgressRowValue
          label={`${sharePercent.toFixed(0)}% da venda líder`}
          value={formatCurrency(product.inventorySalesValue, displayCurrency)}
        />
      }
      leading={<ProductThumb product={buildProductThumbSource({ catalogProduct, product, productBrand })} size="sm" />}
      shareLabel=""
      sharePercent={sharePercent}
      subtitle={<ProductDriverSubtitle brand={productBrand} product={product} />}
      title={product.name}
    />
  )
}

function ProductDriverSubtitle({ brand, product }: Readonly<{ brand: string | null; product: TopProduct }>) {
  return (
    <>
      {product.category}
      {brand ? ` · ${brand}` : ''}
      {' · '}margem {formatPercent(product.marginPercent)}
    </>
  )
}

function resolveProductBrand({
  catalogProduct,
  product,
}: Readonly<{
  catalogProduct?: FinanceProductsPanelProps['products'][number]
  product: TopProduct
}>) {
  return product.brand?.trim() || catalogProduct?.brand?.trim() || null
}

function buildProductThumbSource({
  catalogProduct,
  product,
  productBrand,
}: Readonly<{
  catalogProduct?: FinanceProductsPanelProps['products'][number]
  product: TopProduct
  productBrand: string | null
}>) {
  return {
    name: product.name,
    brand: productBrand,
    category: product.category,
    barcode: product.barcode ?? catalogProduct?.barcode,
    packagingClass: product.packagingClass ?? catalogProduct?.packagingClass,
    quantityLabel: product.quantityLabel ?? catalogProduct?.quantityLabel,
    imageUrl: product.imageUrl ?? catalogProduct?.imageUrl,
    catalogSource: product.catalogSource ?? catalogProduct?.catalogSource,
    isCombo: product.isCombo ?? catalogProduct?.isCombo,
  }
}
