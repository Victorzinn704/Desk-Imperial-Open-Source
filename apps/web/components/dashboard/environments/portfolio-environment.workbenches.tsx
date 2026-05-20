import type { ReactNode } from 'react'
import type { ProductRecord } from '@contracts/contracts'
import { LabFactPill } from '@/components/design-lab/lab-primitives'
import { LabWorkbench } from '@/components/design-lab/lab-workbench'
import { OrderForm } from '@/components/dashboard/order-form'
import { ProductForm } from '@/components/dashboard/product-form'
import { formatCurrency } from '@/lib/currency'
import type { OrderFormInputValues, ProductFormValues } from '@/lib/validation'
import { AlertMessage } from './portfolio-products-panel'
import { type ProductMutationError, type SaleMode, saleModeMeta } from './portfolio-environment.model'

export type PortfolioProductWorkbenchState = {
  creatingProduct: boolean
  mutationError: ProductMutationError
  product: ProductRecord | null
  products: ProductRecord[]
  updatingProduct: boolean
}

export type PortfolioSaleWorkbenchState = {
  currentMode: SaleMode
  employees: Parameters<typeof OrderForm>[0]['employees']
  errorMessage: string | null
  loading: boolean
  product: ProductRecord | null
  products: ProductRecord[]
  saleInitialValues?: Partial<OrderFormInputValues>
  userRole: 'OWNER' | 'STAFF'
}

export function PortfolioProductWorkbench({
  state,
  onClose,
  onSubmit,
}: Readonly<{
  state: PortfolioProductWorkbenchState
  onClose: () => void
  onSubmit: (values: ProductFormValues) => void
}>) {
  return (
    <LabWorkbench
      bodyClassName="portfolio-workbench-open"
      description="Campos do produto, estoque e margem."
      title={state.product ? 'Editar produto' : 'Cadastrar produto'}
      toolbar={<PortfolioProductToolbar product={state.product} products={state.products} />}
      onClose={onClose}
    >
      {state.mutationError ? <AlertMessage message={state.mutationError.message} tone="danger" /> : null}
      <PortfolioFormShell>
        <ProductForm
          appearance="embedded"
          availableProducts={state.products}
          loading={state.creatingProduct || state.updatingProduct}
          product={state.product}
          onCancelEdit={onClose}
          onSubmit={onSubmit}
        />
      </PortfolioFormShell>
    </LabWorkbench>
  )
}

export function PortfolioSaleWorkbench({
  state,
  onClose,
  onModeChange,
  onSubmit,
}: Readonly<{
  state: PortfolioSaleWorkbenchState
  onClose: () => void
  onModeChange: (mode: SaleMode) => void
  onSubmit: Parameters<typeof OrderForm>[0]['onSubmit']
}>) {
  return (
    <LabWorkbench
      bodyClassName="portfolio-workbench-open"
      description="Produto, canal, localização e pagamento."
      title={state.product ? `Vender ${state.product.name}` : 'Vender produto'}
      toolbar={
        <PortfolioSaleToolbar currentMode={state.currentMode} product={state.product} onModeChange={onModeChange} />
      }
      onClose={onClose}
    >
      <PortfolioSaleSurface state={state} onSubmit={onSubmit} />
    </LabWorkbench>
  )
}

function PortfolioFormShell({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return <div className="scroll-mt-24">{children}</div>
}

function PortfolioSaleSurface({
  state,
  onSubmit,
}: Readonly<{
  state: PortfolioSaleWorkbenchState
  onSubmit: Parameters<typeof OrderForm>[0]['onSubmit']
}>) {
  return (
    <div className="space-y-4">
      {state.errorMessage ? <AlertMessage message={state.errorMessage} tone="danger" /> : null}

      <PortfolioFormShell>
        <OrderForm
          appearance="embedded"
          channelPreset={saleModeMeta[state.currentMode].channel}
          employees={state.employees}
          initialValues={state.saleInitialValues}
          loading={state.loading}
          products={state.products}
          submitLabel="Registrar venda"
          userRole={state.userRole}
          onSubmit={onSubmit}
        />
      </PortfolioFormShell>
    </div>
  )
}

function PortfolioSaleToolbar({
  currentMode,
  onModeChange,
  product,
}: Readonly<{
  currentMode: SaleMode
  onModeChange: (mode: SaleMode) => void
  product: ProductRecord | null
}>) {
  const mode = saleModeMeta[currentMode]

  return (
    <>
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">
        Modalidade
      </span>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(saleModeMeta) as SaleMode[]).map((entry) => (
          <SaleModeButton active={currentMode === entry} key={entry} mode={entry} onClick={() => onModeChange(entry)} />
        ))}
      </div>
      <LabFactPill label="canal" value={mode.channel} />
      <LabFactPill label="produto" value={product ? `${product.name} · ${product.category}` : 'seleção livre'} />
      <LabFactPill
        label="preço base"
        value={product ? formatCurrency(product.unitPrice, product.displayCurrency) : 'valor do cadastro'}
      />
    </>
  )
}

function SaleModeButton({
  active,
  mode,
  onClick,
}: Readonly<{
  active: boolean
  mode: SaleMode
  onClick: () => void
}>) {
  const entryMeta = saleModeMeta[mode]
  const Icon = entryMeta.icon

  return (
    <button className={saleModeButtonClass({ active })} type="button" onClick={onClick}>
      <Icon className="size-4" />
      {entryMeta.label}
    </button>
  )
}

function PortfolioProductToolbar({
  product,
  products,
}: Readonly<{
  product: ProductRecord | null
  products: ProductRecord[]
}>) {
  return (
    <>
      <LabFactPill label="modo" value={product ? 'edição' : 'novo item'} />
      <LabFactPill label="skus ativos" value={String(products.filter((item) => item.active).length)} />
      <LabFactPill label="cozinha" value={product?.requiresKitchen ? 'envia para KDS' : 'definido no fluxo'} />
      <LabFactPill label="combos" value={product?.isCombo ? 'combo habilitado' : 'produto simples'} />
    </>
  )
}

function saleModeButtonClass({
  active,
}: Readonly<{
  active: boolean
}>) {
  const base = 'inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition'
  const activeClass = 'border-[var(--lab-blue-border)] bg-[var(--lab-blue-soft)] text-[var(--lab-blue)]'
  const idleClass =
    'border-[var(--lab-border)] bg-[var(--lab-surface)] text-[var(--lab-fg-soft)] hover:border-[var(--lab-border-strong)] hover:text-[var(--lab-fg)]'

  return `${base} ${active ? activeClass : idleClass}`
}
