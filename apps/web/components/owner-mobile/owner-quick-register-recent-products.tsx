import type { ProductRecord } from '@contracts/contracts'
import { ProductThumb } from '@/components/shared/product-thumb'
import { useCatalogVisualSuggestions } from '@/components/shared/use-catalog-visual-suggestions'
import { formatBRL as formatCurrency } from '@/lib/currency'

export function OwnerQuickRegisterRecentProducts({ products }: Readonly<{ products: ProductRecord[] }>) {
  const { decorateProduct } = useCatalogVisualSuggestions(products)

  return (
    <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
            Últimos itens
          </p>
          <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Catálogo recente</h2>
        </div>
        <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
          {products.length} itens
        </span>
      </div>
      <div className="mt-4 space-y-2">
        {products.length === 0 ? (
          <EmptyRecentProducts />
        ) : (
          products.map((product) => <RecentProductCard key={product.id} product={decorateProduct(product)} />)
        )}
      </div>
    </section>
  )
}

function EmptyRecentProducts() {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] px-4 py-5 text-center text-xs text-[var(--text-soft)]">
      Nenhum produto retornado ainda pela API.
    </div>
  )
}

function RecentProductCard({ product }: Readonly<{ product: ProductRecord }>) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <ProductThumb product={product} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{product.name}</p>
            <p className="mt-1 text-xs text-[var(--text-soft)]">
              {product.category} · {product.brand ?? 'sem marca'}
              {product.quantityLabel ? ` · ${product.quantityLabel}` : ''}
              {product.barcode ? ` · EAN ${product.barcode}` : ''}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(product.unitPrice)}</p>
          <p className="mt-1 text-[10px] text-[var(--text-soft)]">{product.stockBaseUnits} und</p>
        </div>
      </div>
    </article>
  )
}
