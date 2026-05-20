import { type ReactNode, useMemo, useState } from 'react'
import { Archive, PencilLine, Plus, RotateCcw, Search, ShoppingCart, Trash2, X } from 'lucide-react'
import type { ProductRecord } from '@contracts/contracts'
import { LabFilterChip, LabStatusPill, type LabStatusTone, LabTable } from '@/components/design-lab/lab-primitives'
import { ProductThumb } from '@/components/shared/product-thumb'
import { useCatalogVisualSuggestions } from '@/components/shared/use-catalog-visual-suggestions'
import { formatCurrency } from '@/lib/currency'
import { formatStockBreakdown } from '@/lib/product-packaging'
import { type ProductMutationError, productsTotalsValue } from './portfolio-environment.model'

export function PortfolioProductsPanel({
  busy,
  bulkRestockFeedback,
  bulkRestockPending,
  currency,
  filteredProducts,
  mutationError,
  onBulkRestock,
  onCreate,
  onArchive,
  onDelete,
  onEdit,
  onRestore,
  onSell,
  products,
  productsError,
  searchQuery,
  setSearchQuery,
}: Readonly<{
  busy: boolean
  bulkRestockFeedback: string | null
  bulkRestockPending: boolean
  currency: string
  filteredProducts: ProductRecord[]
  mutationError: ProductMutationError
  onBulkRestock: () => void
  onCreate: () => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (product: ProductRecord | null) => void
  onRestore: (id: string) => void
  onSell: (product: ProductRecord) => void
  products: ProductRecord[]
  productsError: string | null
  searchQuery: string
  setSearchQuery: (value: string) => void
}>) {
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'active' | 'low-stock' | 'combo' | 'kitchen'>('all')

  const tableRows = useMemo(() => {
    switch (catalogFilter) {
      case 'active':
        return filteredProducts.filter((product) => product.active)
      case 'low-stock':
        return filteredProducts.filter((product) => product.isLowStock)
      case 'combo':
        return filteredProducts.filter((product) => product.isCombo)
      case 'kitchen':
        return filteredProducts.filter((product) => product.requiresKitchen)
      default:
        return filteredProducts
    }
  }, [catalogFilter, filteredProducts])

  const filterOptions = [
    { key: 'all' as const, label: 'Todos', count: filteredProducts.length },
    { key: 'active' as const, label: 'Ativos', count: filteredProducts.filter((product) => product.active).length },
    {
      key: 'low-stock' as const,
      label: 'Estoque baixo',
      count: filteredProducts.filter((product) => product.isLowStock).length,
    },
    { key: 'combo' as const, label: 'Combos', count: filteredProducts.filter((product) => product.isCombo).length },
    {
      key: 'kitchen' as const,
      label: 'Cozinha',
      count: filteredProducts.filter((product) => product.requiresKitchen).length,
    },
  ]

  const emptyTitle = products.length ? 'Nenhum produto bate com a busca' : 'Nenhum produto cadastrado'
  const emptyDescription = products.length
    ? 'Tente outro termo para localizar nome, marca, categoria ou classe.'
    : 'Abra o cadastro do portfólio para criar os primeiros itens reais.'
  const { decorateProduct } = useCatalogVisualSuggestions(tableRows.slice(0, 24), {
    maxItems: 24,
    useBarcodeLookup: true,
  })

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-[var(--lab-border)] pb-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[var(--lab-fg)]">Produtos cadastrados</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--lab-fg-soft)]">
            Catálogo real com estoque, margem, EAN e ações operacionais sem encapsular a tabela em outro card.
          </p>
        </div>
        <div className="flex flex-col gap-3 xl:items-end">
          <PortfolioSearchBox value={searchQuery} onChange={setSearchQuery} />
          <button
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 text-sm font-medium text-[var(--lab-fg)] transition hover:bg-[var(--lab-surface-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={bulkRestockPending}
            type="button"
            onClick={onBulkRestock}
          >
            {bulkRestockPending ? 'Reabastecendo estoque...' : 'Reabastecer em massa'}
          </button>
        </div>
      </div>

      {productsError ? <AlertMessage message={productsError} tone="danger" /> : null}
      {mutationError ? <AlertMessage message={mutationError.message} tone="danger" /> : null}
      {bulkRestockFeedback ? <AlertMessage message={bulkRestockFeedback} tone="success" /> : null}

      <div className="flex flex-wrap items-center gap-2">
        {filterOptions.map((option) => (
          <LabFilterChip
            active={catalogFilter === option.key}
            count={option.count}
            key={option.key}
            label={option.label}
            onClick={() => setCatalogFilter(option.key)}
          />
        ))}
      </div>

      <LabTable
        dense
        columns={[
          {
            id: 'produto',
            header: 'Produto',
            cell: (product) => (
              <div className="flex min-w-0 items-start gap-3">
                <ProductThumb product={decorateProduct(product)} size="md" visualPolicy="real-only" />
                <div className="min-w-0 space-y-2">
                  <p className="truncate font-medium text-[var(--lab-fg)]">{product.name}</p>
                  <p className="mt-1 truncate text-xs text-[var(--lab-fg-soft)]">
                    {product.category} · {product.brand ?? 'sem marca'} · {product.packagingClass}
                    {product.quantityLabel ? ` · ${product.quantityLabel}` : ''}
                    {product.barcode ? ` · EAN ${product.barcode}` : ''}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <ProductRowTag tone={product.active ? 'success' : 'neutral'}>
                      {product.active ? 'ativo' : 'arquivado'}
                    </ProductRowTag>
                    {product.requiresKitchen ? <ProductRowTag tone="info">cozinha</ProductRowTag> : null}
                    {product.isCombo ? <ProductRowTag tone="warning">combo</ProductRowTag> : null}
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: 'operacao',
            header: 'Leitura operacional',
            cell: (product) => (
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--lab-fg-soft)]">
                  <span>{formatStockBreakdown(product.stock, product.unitsPerPackage, { compact: true })}</span>
                  <span>·</span>
                  <span>{product.stockBaseUnits} und base</span>
                  {product.lowStockThreshold != null ? (
                    <>
                      <span>·</span>
                      <span>alerta em {product.lowStockThreshold}</span>
                    </>
                  ) : null}
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--lab-surface-hover)]">
                  <div
                    className={
                      product.isLowStock
                        ? 'h-full rounded-full bg-[var(--lab-warning)]'
                        : 'h-full rounded-full bg-[var(--lab-blue)]'
                    }
                    style={{
                      width: `${Math.max(
                        product.lowStockThreshold && product.lowStockThreshold > 0
                          ? Math.min((product.stockBaseUnits / (product.lowStockThreshold * 3)) * 100, 100)
                          : Math.min((product.stockBaseUnits / Math.max(product.stockBaseUnits, 1)) * 100, 100),
                        10,
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <LabStatusPill tone={product.isLowStock ? 'warning' : 'success'}>
                    {product.isLowStock ? 'estoque baixo' : 'estoque estável'}
                  </LabStatusPill>
                </div>
              </div>
            ),
            width: '270px',
          },
          {
            id: 'preco',
            header: 'Preço e margem',
            cell: (product) => (
              <div className="space-y-1.5">
                <ValueReading label="custo" value={formatCurrency(product.unitCost, product.displayCurrency)} />
                <ValueReading strong label="venda" value={formatCurrency(product.unitPrice, product.displayCurrency)} />
                <div className="pt-0.5">
                  <MarginPill marginPercent={product.marginPercent} />
                </div>
              </div>
            ),
            align: 'right',
            width: '180px',
          },
          {
            id: 'potencial',
            header: 'Potencial',
            cell: (product) => (
              <div className="space-y-1.5">
                <ValueReading
                  strong
                  label="venda"
                  value={formatCurrency(product.inventorySalesValue, product.displayCurrency)}
                />
                <ValueReading label="lucro" value={formatCurrency(product.potentialProfit, product.displayCurrency)} />
              </div>
            ),
            align: 'right',
            width: '170px',
          },
          {
            id: 'acoes',
            header: 'Ações',
            cell: (product) => (
              <div className="flex justify-end gap-2">
                <ActionButton disabled={busy} icon={PencilLine} label="Editar" onClick={() => onEdit(product)} />
                {product.active ? (
                  <>
                    <ActionButton
                      disabled={busy}
                      icon={ShoppingCart}
                      label="Vender"
                      tone="info"
                      onClick={() => onSell(product)}
                    />
                    <ActionButton
                      disabled={busy}
                      icon={Archive}
                      label="Arquivar"
                      onClick={() => onArchive(product.id)}
                    />
                  </>
                ) : (
                  <>
                    <ActionButton
                      disabled={busy}
                      icon={RotateCcw}
                      label="Reativar"
                      onClick={() => onRestore(product.id)}
                    />
                    <ActionButton
                      disabled={busy}
                      icon={Trash2}
                      label="Excluir"
                      tone="danger"
                      onClick={() => onDelete(product.id)}
                    />
                  </>
                )}
              </div>
            ),
            align: 'right',
            width: '280px',
          },
        ]}
        emptyAction={
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-2 text-sm font-medium text-[var(--lab-fg)] transition hover:bg-[var(--lab-surface-hover)]"
            type="button"
            onClick={onCreate}
          >
            <Plus className="size-4" />
            Cadastrar produto
          </button>
        }
        emptyDescription={emptyDescription}
        emptyTitle={emptyTitle}
        rowKey="id"
        rows={tableRows}
      />

      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[var(--lab-fg-muted)]">
        <span>
          {tableRows.length} de {products.length} {tableRows.length === 1 ? 'encontrado' : 'encontrados'}
        </span>
        <span>{formatCurrency(productsTotalsValue(tableRows, currency), currency as never)} em venda filtrada</span>
      </div>
    </section>
  )
}

function ProductRowTag({
  children,
  tone,
}: Readonly<{
  children: ReactNode
  tone: LabStatusTone
}>) {
  return (
    <LabStatusPill size="sm" tone={tone}>
      {children}
    </LabStatusPill>
  )
}

function ValueReading({
  label,
  strong = false,
  value,
}: Readonly<{
  label: string
  strong?: boolean
  value: string
}>) {
  return (
    <div className="flex items-center justify-end gap-2 text-xs">
      <span className="uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">{label}</span>
      <span className={strong ? 'font-semibold text-[var(--lab-fg)]' : 'text-[var(--lab-fg-soft)]'}>{value}</span>
    </div>
  )
}

function PortfolioSearchBox({
  value,
  onChange,
}: Readonly<{
  value: string
  onChange: (value: string) => void
}>) {
  return (
    <label className="flex w-full items-center gap-3 rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-surface)] px-3 py-2 xl:w-[280px]">
      <span className="sr-only">Buscar produto</span>
      <Search className="size-4 text-[var(--lab-fg-muted)]" />
      <input
        className="h-8 min-w-0 flex-1 bg-transparent text-sm text-[var(--lab-fg)] outline-none placeholder:text-[var(--lab-fg-muted)]"
        placeholder="Buscar nome, EAN, marca ou classe"
        type="search"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {value ? (
        <button
          className="inline-flex size-8 items-center justify-center rounded-xl border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] text-[var(--lab-fg-soft)] transition hover:bg-[var(--lab-surface-hover)] hover:text-[var(--lab-fg)]"
          type="button"
          onClick={() => onChange('')}
        >
          <X className="size-4" />
          <span className="sr-only">Limpar busca</span>
        </button>
      ) : null}
    </label>
  )
}

function MarginPill({ marginPercent }: Readonly<{ marginPercent: number }>) {
  let tone: LabStatusTone = 'danger'
  if (marginPercent >= 50) {
    tone = 'success'
  } else if (marginPercent >= 30) {
    tone = 'info'
  } else if (marginPercent >= 15) {
    tone = 'warning'
  }

  return <LabStatusPill tone={tone}>{`${marginPercent.toFixed(0)}%`}</LabStatusPill>
}

function ActionButton({
  disabled,
  icon: Icon,
  label,
  onClick,
  tone = 'neutral',
}: Readonly<{
  disabled?: boolean
  icon: typeof PencilLine
  label: string
  onClick: () => void
  tone?: 'neutral' | 'danger' | 'info'
}>) {
  const className =
    tone === 'danger'
      ? 'border-[var(--lab-danger-soft)] bg-[var(--lab-danger-soft)] text-[var(--lab-danger)]'
      : tone === 'info'
        ? 'border-[var(--lab-blue-border)] bg-[var(--lab-blue-soft)] text-[var(--lab-blue)]'
        : 'border-[var(--lab-border)] bg-[var(--lab-surface-raised)] text-[var(--lab-fg-soft)] hover:bg-[var(--lab-surface-hover)] hover:text-[var(--lab-fg)]'

  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  )
}

export function AlertMessage({
  message,
  tone,
}: Readonly<{
  message: string
  tone: LabStatusTone
}>) {
  const textClass =
    tone === 'danger'
      ? 'text-[var(--lab-danger)]'
      : tone === 'warning'
        ? 'text-[var(--lab-warning)]'
        : tone === 'success'
          ? 'text-[var(--lab-success)]'
          : 'text-[var(--lab-fg)]'

  return (
    <div className="mb-4 rounded-[14px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-3">
      <p className={`text-sm ${textClass}`}>{message}</p>
    </div>
  )
}
