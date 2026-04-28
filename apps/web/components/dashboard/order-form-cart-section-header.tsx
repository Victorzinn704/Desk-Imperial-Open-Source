import { Plus, ShoppingBasket } from 'lucide-react'
import { Button } from '@/components/shared/button'
import { InputField } from '@/components/shared/input-field'
import { SelectField } from '@/components/shared/select-field'
import { formatCurrency } from '@/lib/currency'
import { EmbeddedSectionHeader, InlineFact, MiniInfo } from './order-form-sections'
import type { OrderCartSectionProps } from './order-form-cart-section.types'

export function CartHeader(props: Readonly<OrderCartSectionProps>) {
  if (props.isEmbedded) {
    return (
      <>
        <EmbeddedSectionHeader
          description="Adicione os itens da venda e ajuste preco manual apenas quando precisar."
          eyebrow="Carrinho"
          title="Itens da venda"
        />
        <div className="flex flex-wrap gap-2">
          <InlineFact label="linhas" value={String(props.fields.length)} />
          <InlineFact label="unidades" value={String(props.summary.totalCartUnits)} />
          <InlineFact label="total" value={formatCurrency(props.summary.itemsTotal, props.orderCurrency)} />
          <InlineFact label="estoque em foco" value={props.selectedStockLabel} />
        </div>
      </>
    )
  }

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div className="flex items-start gap-4">
        <span className="mt-1 flex size-11 items-center justify-center rounded-2xl border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.08)] text-[#8fffb9]">
          <ShoppingBasket className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8fffb9]">1. Monte o carrinho</p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
            Escolha os produtos e adicione cada linha ao pedido
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-soft)]">
            A quantidade sempre sai em unidade. O valor unitário é opcional e só serve quando você precisa vender um
            item com preço diferente do cadastro.
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:w-[360px]">
        <MiniInfo label="Linhas no carrinho" value={String(props.fields.length)} />
        <MiniInfo label="Unidades totais" value={String(props.summary.totalCartUnits)} />
        <MiniInfo label="Moeda do pedido" value={props.orderCurrency} />
        <MiniInfo label="Estoque em foco" value={props.selectedStockLabel} />
      </div>
    </div>
  )
}

export function CartComposer(props: Readonly<OrderCartSectionProps>) {
  const gridClass = props.isEmbedded
    ? 'grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,140px)_minmax(0,170px)_minmax(0,190px)] lg:items-end'
    : 'mt-6 grid gap-4 lg:grid-cols-2 2xl:grid-cols-[minmax(0,1.35fr)_150px_180px_auto] 2xl:items-end'

  return (
    <div className={gridClass}>
      <SelectField
        label="Produto"
        options={props.productOptions}
        value={props.resolvedDraftProductId}
        onChange={(event) => props.onDraftProductChange(event.currentTarget.value)}
      />
      <InputField
        hint="Sempre em und."
        label="Quantidade"
        min="1"
        step="1"
        type="number"
        value={props.draftQuantity}
        onChange={(event) => props.onDraftQuantityChange(event.currentTarget.value)}
      />
      <InputField
        hint="Opcional"
        label="Valor unitário"
        placeholder="42.90"
        step="0.01"
        type="number"
        value={props.draftUnitPrice}
        onChange={(event) => props.onDraftUnitPriceChange(event.currentTarget.value)}
      />
      <Button
        className="2xl:mb-[2px] whitespace-nowrap"
        disabled={!props.products.length}
        type="button"
        onClick={props.onAddItem}
      >
        <Plus className="size-4" />
        {props.isEmbedded ? 'Adicionar item' : 'Adicionar ao pedido'}
      </Button>
    </div>
  )
}

export function SelectedProductSummary(props: Readonly<OrderCartSectionProps>) {
  if (!props.selectedDraftProduct) {
    return null
  }

  if (props.isEmbedded) {
    return (
      <div className="grid gap-3 border-t border-dashed border-[var(--border)] pt-4 text-sm leading-7 text-[var(--text-soft)] sm:grid-cols-3">
        <InlineFact label="produto" value={props.selectedDraftProduct.name} />
        <InlineFact label="estoque" value={props.selectedStockLabel} />
        <InlineFact
          label="preço base"
          value={formatCurrency(props.selectedDraftProduct.unitPrice, props.selectedDraftProduct.displayCurrency)}
        />
      </div>
    )
  }

  return (
    <div className="imperial-card-soft mt-4 px-4 py-3 text-sm leading-7 text-[var(--text-soft)]">
      <span className="font-medium text-[var(--text-primary)]">{props.selectedDraftProduct.name}</span>
      {` • ${props.selectedDraftProduct.category} • Estoque ${props.selectedStockLabel} • Preço base ${formatCurrency(props.selectedDraftProduct.unitPrice, props.selectedDraftProduct.displayCurrency)}`}
    </div>
  )
}
