import { Plus } from 'lucide-react'
import { calcSubtotal, calcTotal, type Comanda, formatElapsed } from '@/components/pdv/pdv-types'
import { formatCurrency } from '@/lib/currency'
import { formatComandaCode } from './pdv-wireframe-environment.helpers'
import type { ComandaCurrency, PdvCategoryOption, ProductCardRecord } from './pdv-wireframe-environment.types'
import { StampPill } from './pdv-wireframe-shared'

export function PdvGridView({
  activeCategory,
  categories,
  comanda,
  currency,
  products,
  onCategoryChange,
}: Readonly<{
  activeCategory: string
  categories: PdvCategoryOption[]
  comanda: Comanda | null
  currency: ComandaCurrency
  products: ProductCardRecord[]
  onCategoryChange: (categoryId: string) => void
}>) {
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_360px] xl:items-start">
      <PdvCatalogPanel
        activeCategory={activeCategory}
        categories={categories}
        currency={currency}
        products={products}
        onCategoryChange={onCategoryChange}
      />
      <PdvComandaPreview comanda={comanda} currency={currency} />
    </section>
  )
}

function PdvCatalogPanel({
  activeCategory,
  categories,
  currency,
  products,
  onCategoryChange,
}: Readonly<{
  activeCategory: string
  categories: PdvCategoryOption[]
  currency: ComandaCurrency
  products: ProductCardRecord[]
  onCategoryChange: (categoryId: string) => void
}>) {
  return (
    <article className="imperial-card p-5">
      <PdvCategoryFilters
        activeCategory={activeCategory}
        categories={categories}
        productsCount={products.length}
        onCategoryChange={onCategoryChange}
      />
      <PdvProductGrid currency={currency} products={products} />
    </article>
  )
}

function PdvCategoryFilters({
  activeCategory,
  categories,
  productsCount,
  onCategoryChange,
}: Readonly<{
  activeCategory: string
  categories: PdvCategoryOption[]
  productsCount: number
  onCategoryChange: (categoryId: string) => void
}>) {
  return (
    <div className="mb-5 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="wireframe-filtermeta">categorias do catálogo</p>
          <p className="mt-1 text-sm text-[var(--text-soft)]">o shell define a visão. aqui você só recorta a grade.</p>
        </div>
        <span className="wireframe-filtermeta">{productsCount} visíveis</span>
      </div>
      <div className="wireframe-filterbar">
        {categories.map((category) => (
          <button
            className={
              activeCategory === category.id
                ? 'wireframe-filterchip wireframe-filterchip--active'
                : 'wireframe-filterchip'
            }
            key={category.id}
            type="button"
            onClick={() => onCategoryChange(category.id)}
          >
            <span className="wireframe-filterchip__meta">{category.count}</span>
            {category.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function PdvProductGrid({
  currency,
  products,
}: Readonly<{
  currency: ComandaCurrency
  products: ProductCardRecord[]
}>) {
  if (products.length === 0) {
    return (
      <div className="rounded-[8px] border border-dashed border-[var(--border)] px-4 py-10 text-center text-sm text-[var(--text-soft)]">
        Nenhum produto disponivel nesta categoria.
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {products.slice(0, 12).map((product) => (
        <PdvProductCard currency={currency} key={product.id} product={product} />
      ))}
    </div>
  )
}

function PdvProductCard({
  currency,
  product,
}: Readonly<{
  currency: ComandaCurrency
  product: ProductCardRecord
}>) {
  return (
    <div className="rounded-[8px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] p-4">
      <div className="flex aspect-[4/3] items-center justify-center rounded-[8px] border border-dashed border-[var(--border)] text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
        foto
      </div>
      <p className="mt-4 text-sm font-semibold text-[var(--text-primary)]">{product.name}</p>
      <p className="mt-1 text-xs text-[var(--text-soft)]">{product.category}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <strong className="text-sm text-[var(--text-primary)]">{formatCurrency(product.unitPrice, currency)}</strong>
        <button
          aria-label={`Adicionar ${product.name}`}
          className="wireframe-inline-button wireframe-inline-button--icon"
          title={`Adicionar ${product.name}`}
          type="button"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  )
}

function PdvComandaPreview({
  comanda,
  currency,
}: Readonly<{
  comanda: Comanda | null
  currency: ComandaCurrency
}>) {
  return (
    <article className="imperial-card p-5">
      <PdvComandaPreviewHeader comanda={comanda} />
      <div className="border-t border-dashed border-[var(--border)] pt-1">
        {comanda ? <PdvComandaPreviewContent comanda={comanda} currency={currency} /> : <PdvComandaEmptyState />}
      </div>
    </article>
  )
}

function PdvComandaPreviewHeader({ comanda }: Readonly<{ comanda: Comanda | null }>) {
  const title = comanda?.mesa ? `Comanda · Mesa ${comanda.mesa}` : 'Comanda · Sem mesa selecionada'
  const subtitle = comanda
    ? `${formatComandaCode(comanda.id)} · aberta ${formatElapsed(comanda.abertaEm)}`
    : 'aguardando abertura'

  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h3 className="font-['Architects_Daughter','Patrick_Hand',sans-serif] text-[1.45rem] font-semibold leading-tight text-[var(--text-primary)]">
          {title}
        </h3>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">{subtitle}</p>
      </div>
      <StampPill>{comanda ? `${comanda.itens.length} itens` : '0 itens'}</StampPill>
    </div>
  )
}

function PdvComandaPreviewContent({
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
      <div className="space-y-2.5">
        {comanda.itens.slice(0, 6).map((item, index) => (
          <div
            className="grid grid-cols-[30px_minmax(0,1fr)_72px_18px] gap-2 border-b border-dotted border-[var(--border)] py-2.5 text-sm last:border-b-0"
            key={`${comanda.id}-${index}`}
          >
            <span className="font-semibold text-[var(--accent-strong)]">{item.quantidade}x</span>
            <span className="truncate text-[var(--text-primary)]">{item.nome}</span>
            <span className="text-right text-[12px] text-[var(--text-primary)]">
              {formatCurrency(item.precoUnitario * item.quantidade, currency)}
            </span>
            <span className="text-right text-[var(--text-muted)]">×</span>
            {item.observacao ? (
              <span className="col-start-2 col-end-5 text-[12px] italic text-[var(--text-soft)]">
                ↳ {item.observacao}
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <PdvComandaPreviewTotals currency={currency} serviceFee={serviceFee} subtotal={subtotal} total={total} />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          className="rounded-[8px] border border-dashed border-[var(--border-strong)] px-4 py-3 text-sm text-[var(--text-primary)]"
          type="button"
        >
          salvar
        </button>
        <button
          className="rounded-[8px] border border-transparent bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--on-accent)]"
          type="button"
        >
          cobrar
        </button>
      </div>
    </>
  )
}

function PdvComandaPreviewTotals({
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
      <div className="mt-4 space-y-1 text-[12px] text-[var(--text-soft)]">
        <div className="flex items-center justify-between gap-3">
          <span>subtotal</span>
          <span>{formatCurrency(subtotal, currency)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>taxa / acrescimo</span>
          <span>{formatCurrency(serviceFee, currency)}</span>
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-4 border-t border-dashed border-[var(--border)] pt-3">
        <span className="text-sm text-[var(--text-soft)]">total</span>
        <strong className="font-['Architects_Daughter','Patrick_Hand',sans-serif] text-[2rem] leading-none text-[var(--text-primary)]">
          {formatCurrency(total, currency)}
        </strong>
      </div>
    </>
  )
}

function PdvComandaEmptyState() {
  return (
    <div className="rounded-[8px] border border-dashed border-[var(--border)] px-4 py-10 text-center text-sm text-[var(--text-soft)]">
      Nenhuma comanda aberta no momento.
    </div>
  )
}
