'use client'

import { type Dispatch, type DragEvent, memo, type SetStateAction } from 'react'
import { formatCurrency } from '@/lib/currency'
import type { Comanda, ComandaItem } from '../../pdv-types'
import { ComandaItemRow } from './comanda-item-row'
import { STATUS_LABEL_MAP } from '../helpers'
import type { SimpleProduct } from '../types'

type ComandaLivePreviewProps = Readonly<{
  mesa: string
  clienteNome: string
  notes: string
  status: Comanda['status']
  itens: ComandaItem[]
  products: SimpleProduct[]
  bruto: number
  desconto: number
  acrescimo: number
  total: number
  addItem: (product: SimpleProduct) => void
  changeQty: (produtoId: string, delta: number) => void
  setItens: Dispatch<SetStateAction<ComandaItem[]>>
}>

export const ComandaLivePreview = memo(function ComandaLivePreview({
  mesa,
  clienteNome,
  notes,
  status,
  itens,
  products,
  bruto,
  desconto,
  acrescimo,
  total,
  addItem,
  changeQty,
  setItens,
}: ComandaLivePreviewProps) {
  return (
    <div className="flex min-h-0 flex-col bg-[var(--surface-soft)]">
      <PreviewHeading mesa={mesa} />
      <PreviewMetaGrid clienteNome={clienteNome} status={status} />
      <PreviewNotesCard notes={notes} />
      <PreviewItemsDropZone
        addItem={addItem}
        changeQty={changeQty}
        itens={itens}
        products={products}
        setItens={setItens}
      />
      <PreviewTotalsCard acrescimo={acrescimo} bruto={bruto} desconto={desconto} total={total} />
    </div>
  )
})

function PreviewHeading({ mesa }: Readonly<{ mesa: string }>) {
  return (
    <div className="border-b border-[var(--border)] px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Tela da comanda</p>
      <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
        Itens ao vivo da mesa {mesa || 'sem numero'}
      </h3>
      <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">Itens, cliente e fechamento na mesma leitura.</p>
    </div>
  )
}

function PreviewMetaGrid({
  clienteNome,
  status,
}: Readonly<{
  clienteNome: string
  status: Comanda['status']
}>) {
  return (
    <div className="grid grid-cols-2 gap-3 border-b border-[var(--border)] px-4 py-4">
      <PreviewMetaCard label="Cliente" value={clienteNome || 'Nao identificado'} />
      <PreviewMetaCard label="Status" value={STATUS_LABEL_MAP[status]} />
    </div>
  )
}

function PreviewMetaCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-2 truncate text-sm font-medium text-[var(--text-primary)]">{value}</p>
    </div>
  )
}

function PreviewNotesCard({ notes }: Readonly<{ notes: string }>) {
  return (
    <div className="border-b border-[var(--border)] px-4 py-4">
      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
          Observação geral
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
          {notes.trim().length > 0 ? notes : 'Sem observação geral registrada para esta comanda.'}
        </p>
      </div>
    </div>
  )
}

function PreviewItemsDropZone({
  addItem,
  changeQty,
  itens,
  products,
  setItens,
}: Readonly<{
  addItem: (product: SimpleProduct) => void
  changeQty: (produtoId: string, delta: number) => void
  itens: ComandaItem[]
  products: SimpleProduct[]
  setItens: Dispatch<SetStateAction<ComandaItem[]>>
}>) {
  return (
    <div
      className="flex-1 overflow-y-auto px-4 py-4"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => handleDropProduct(event, products, addItem)}
    >
      {itens.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-8 text-center">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Nenhum item ainda</p>
          <p className="mt-2 text-xs leading-6 text-[var(--text-soft)]">
            Arraste produtos da esquerda ou toque para adicionar.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {itens.map((item) => (
            <ComandaItemRow item={item} key={item.produtoId} setItens={setItens} onChangeQty={changeQty} />
          ))}
        </div>
      )}
    </div>
  )
}

function PreviewTotalsCard({
  acrescimo,
  bruto,
  desconto,
  total,
}: Readonly<{
  acrescimo: number
  bruto: number
  desconto: number
  total: number
}>) {
  return (
    <div className="border-t border-[var(--border)] px-4 py-4">
      <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <PreviewTotalRow label="Subtotal" value={formatCurrency(bruto, 'BRL')} />
        <PreviewTotalRow label="Desconto" value={`${desconto}%`} />
        <PreviewTotalRow label="Acrescimo" value={`${acrescimo}%`} />
        <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4">
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Total final</span>
          <span className="text-xl font-bold text-[var(--success)]">{formatCurrency(total, 'BRL')}</span>
        </div>
      </div>
    </div>
  )
}

function PreviewTotalRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="mt-2 flex items-center justify-between text-sm text-[var(--text-soft)] first:mt-0">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function handleDropProduct(
  event: DragEvent<HTMLDivElement>,
  products: SimpleProduct[],
  addItem: (product: SimpleProduct) => void,
) {
  event.preventDefault()
  const id = event.dataTransfer.getData('productId')
  const product = products.find((entry) => entry.id === id)
  if (product) {
    addItem(product)
  }
}
