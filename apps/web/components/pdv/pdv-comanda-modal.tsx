'use client'

import { useMemo, useRef, useState } from 'react'
import { LoaderCircle, Printer, Search, X } from 'lucide-react'
import type { PrintableComanda } from '@/lib/printing'
import { formatCurrency } from '@/lib/currency'
import { maskDocument, validateDocument } from '@/lib/document-validation'
import { AdminPinDialog } from '@/components/admin-pin/admin-pin-dialog'
import { LabStatusPill } from '@/components/design-lab/lab-primitives'
import { calcTotal, type Comanda, type ComandaItem } from './pdv-types'
import { useThermalPrinting } from './use-thermal-printing'
import { normalizeTableLabel } from './normalize-table-label'
import {
  CategoryGrid,
  ComandaItemRow,
  PrinterSection,
  ProductCard,
  type SaveComandaPayload,
  type SimpleProduct,
  StatusButtons,
  useProductFilter,
} from './comanda-modal'

type PdvComandaModalProps = Readonly<{
  busy?: boolean
  comanda?: Comanda | null
  products: SimpleProduct[]
  initialMesa?: string
  onSave: (data: SaveComandaPayload) => Promise<Comanda>
  onClose: () => void
  onStatusChange?: (comanda: Comanda, status: Comanda['status']) => Promise<void>
}>

// ── Extracted sub-components ─────────────────────────────────────────────────

const STATUS_LABEL_MAP: Record<Comanda['status'], string> = {
  aberta: 'Aberta',
  em_preparo: 'Em preparo',
  pronta: 'Pronta',
  cancelada: 'Cancelada',
  fechada: 'Fechada',
}

function ModalHeader({
  isEditing,
  comanda,
  onClose,
}: Readonly<{ isEditing: boolean; comanda?: Comanda | null; onClose: () => void }>) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] p-4 sm:p-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            {isEditing ? `Comanda #${comanda!.id.slice(-4).toUpperCase()}` : 'Nova Comanda'}
          </h2>
          <LabStatusPill size="md" tone={isEditing ? 'warning' : 'success'}>
            {isEditing ? 'Modo edição' : 'Abrir comanda'}
          </LabStatusPill>
        </div>
        <p className="mt-1 text-sm text-[var(--text-soft)]">
          {isEditing
            ? 'Edite os itens dentro do PDV e acompanhe a tela lateral da comanda em tempo real.'
            : 'Adicione itens, confirme os dados e acompanhe a tela lateral antes de abrir a comanda.'}
        </p>
      </div>
      <button
        className="flex size-9 items-center justify-center rounded-[14px] border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-soft)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        type="button"
        onClick={onClose}
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

function DocumentBorderColor(doc: string, valid: boolean): string {
  if (!doc) {return 'var(--border)'}
  return valid
    ? 'color-mix(in srgb, var(--success) 26%, var(--border))'
    : 'color-mix(in srgb, var(--danger) 26%, var(--border))'
}

function ComandaLivePreview({
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
}: Readonly<{
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
  setItens: React.Dispatch<React.SetStateAction<ComandaItem[]>>
}>) {
  return (
    <div className="flex min-h-0 flex-col bg-[var(--surface-soft)]">
      <div className="border-b border-[var(--border)] px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Tela da comanda</p>
        <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
          Itens ao vivo da mesa {mesa || 'sem numero'}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
          Itens, cliente e fechamento na mesma leitura.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-[var(--border)] px-4 py-4">
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Cliente</p>
          <p className="mt-2 truncate text-sm font-medium text-[var(--text-primary)]">
            {clienteNome || 'Nao identificado'}
          </p>
        </div>
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Status</p>
          <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{STATUS_LABEL_MAP[status]}</p>
        </div>
      </div>

      <div className="border-b border-[var(--border)] px-4 py-4">
        <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Observação geral</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
            {notes.trim().length > 0 ? notes : 'Sem observação geral registrada para esta comanda.'}
          </p>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto px-4 py-4"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const id = e.dataTransfer.getData('productId')
          const product = products.find((p) => p.id === id)
          if (product) {addItem(product)}
        }}
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

      <div className="border-t border-[var(--border)] px-4 py-4">
        <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-center justify-between text-sm text-[var(--text-soft)]">
            <span>Subtotal</span>
            <span>{formatCurrency(bruto, 'BRL')}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-[var(--text-soft)]">
            <span>Desconto</span>
            <span>{desconto}%</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-[var(--text-soft)]">
            <span>Acrescimo</span>
            <span>{acrescimo}%</span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4">
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Total final
            </span>
            <span className="text-xl font-bold text-[var(--success)]">{formatCurrency(total, 'BRL')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function resolveFallbackTitle(search: string): string {
  return search.trim() ? 'Busca rápida' : 'Todos os produtos'
}

function resolveDocLabel(doc: string): string {
  return doc.replaceAll(/\D/g, '').length > 11 ? 'CNPJ' : 'CPF'
}

function addOrIncrementItem(prev: ComandaItem[], product: SimpleProduct): ComandaItem[] {
  const existing = prev.find((item) => item.produtoId === product.id)
  if (existing) {
    return prev.map((item) => (item.produtoId === product.id ? { ...item, quantidade: item.quantidade + 1 } : item))
  }
  return [...prev, { produtoId: product.id, nome: product.name, quantidade: 1, precoUnitario: product.unitPrice }]
}

function SaveButtons({
  isEditing,
  isBusy,
  hasItems,
  connectionState,
  onSave,
  onSaveAndPrint,
}: Readonly<{
  isEditing: boolean
  isBusy: boolean
  hasItems: boolean
  connectionState: string
  onSave: () => void
  onSaveAndPrint: () => void
}>) {
  const isPrinting = connectionState === 'printing'
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <button
        className="w-full rounded-[14px] border border-[var(--border)] bg-[var(--surface)] py-3 text-sm font-semibold text-[var(--text-primary)] transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!hasItems || isPrinting || isBusy}
        type="button"
        onClick={onSave}
      >
        {isEditing ? 'Salvar alteracoes' : 'Abrir comanda'}
      </button>
      <button
        className="flex w-full items-center justify-center gap-2 rounded-[14px] border py-3 text-sm font-semibold text-[var(--success)] transition-all disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          borderColor: 'color-mix(in srgb, var(--success) 28%, var(--border))',
          backgroundColor: 'color-mix(in srgb, var(--success) 10%, var(--surface))',
        }}
        disabled={!hasItems || connectionState === 'discovering' || isPrinting || isBusy}
        type="button"
        onClick={onSaveAndPrint}
      >
        {isPrinting || isBusy ? <LoaderCircle className="size-4 animate-spin" /> : <Printer className="size-4" />}
        {isEditing ? 'Salvar e imprimir' : 'Abrir e imprimir'}
      </button>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export function PdvComandaModal({
  busy = false,
  comanda,
  products,
  initialMesa,
  onSave,
  onClose,
  onStatusChange,
}: Readonly<PdvComandaModalProps>) {
  const isEditing = Boolean(comanda)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mesa, setMesa] = useState(comanda?.mesa ?? initialMesa ?? '')
  const [clienteNome, setClienteNome] = useState(comanda?.clienteNome ?? '')
  const [clienteDocumento, setClienteDocumento] = useState(comanda?.clienteDocumento ?? '')
  const [notes, setNotes] = useState(comanda?.notes ?? '')
  const [itens, setItens] = useState<ComandaItem[]>(comanda?.itens ?? [])
  const [desconto, setDesconto] = useState(comanda?.desconto ?? 0)
  const [acrescimo, setAcrescimo] = useState(comanda?.acrescimo ?? 0)
  const [saveError, setSaveError] = useState<string | null>(null)

  // PIN protection states
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false)
  const [pinDialogTitle, setPinDialogTitle] = useState('Ação protegida')
  const [pinDialogDescription, setPinDialogDescription] = useState('Digite o PIN para confirmar')
  const pinActionRef = useRef<(() => void) | null>(null)

  const {
    printers,
    selectedPrinterName,
    connectionState,
    statusMessage,
    choosePrinter,
    refreshPrinters,
    printComanda,
  } = useThermalPrinting()

  const {
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    categories,
    filtered: filteredProducts,
    showProducts,
  } = useProductFilter(products)

  const docValidation = validateDocument(clienteDocumento)
  const docLabel = resolveDocLabel(clienteDocumento)

  function requirePin(action: () => void, title: string, description: string) {
    setPinDialogTitle(title)
    setPinDialogDescription(description)
    pinActionRef.current = action
    setIsPinDialogOpen(true)
  }

  function handlePinConfirm() {
    if (pinActionRef.current) {
      pinActionRef.current()
    }
    setIsPinDialogOpen(false)
    pinActionRef.current = null
  }

  function handlePinCancel() {
    setIsPinDialogOpen(false)
    pinActionRef.current = null
  }

  function addItem(product: SimpleProduct) {
    setItens((prev) => addOrIncrementItem(prev, product))
  }

  function changeQty(produtoId: string, delta: number) {
    setItens((prev) =>
      prev
        .map((item) => (item.produtoId === produtoId ? { ...item, quantidade: item.quantidade + delta } : item))
        .filter((item) => item.quantidade > 0),
    )
  }

  function handlePercentChange(
    newValue: number,
    currentValue: number,
    setter: (v: number) => void,
    pinTitle: string,
    pinDescriptionFn: (v: number) => string,
  ) {
    const needsPin = newValue > 0 && newValue !== currentValue
    if (needsPin) {requirePin(() => setter(newValue), pinTitle, pinDescriptionFn(newValue))}
    else {setter(newValue)}
  }

  const bruto = useMemo(() => itens.reduce((sum, item) => sum + item.quantidade * item.precoUnitario, 0), [itens])
  const itemCount = useMemo(() => itens.reduce((sum, item) => sum + item.quantidade, 0), [itens])
  const draftComanda: Comanda = {
    id: comanda?.id ?? '',
    status: comanda?.status ?? 'aberta',
    mesa,
    clienteNome,
    clienteDocumento,
    notes,
    itens,
    desconto,
    acrescimo,
    abertaEm: comanda?.abertaEm ?? new Date(),
  }
  const total = calcTotal(draftComanda)
  const isBusy = busy || isSubmitting

  async function handleSave(options?: { printAfterSave?: boolean }) {
    if (itens.length === 0 || isBusy) {return}

    setSaveError(null)
    setIsSubmitting(true)

    try {
      const savedComanda = await onSave({ mesa, clienteNome, clienteDocumento, notes, itens, desconto, acrescimo })
      if (!options?.printAfterSave) {
        onClose()
        return
      }
      await printComanda(buildPrintableComanda(savedComanda))
      onClose()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Nao foi possivel imprimir a comanda.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const fallbackTitle = resolveFallbackTitle(search)
  const productListTitle = selectedCategory ?? fallbackTitle

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center p-0 sm:items-center sm:p-4">
      <button
        aria-label="Fechar comanda"
        className="absolute inset-0 border-0 p-0 backdrop-blur-sm"
        style={{ backgroundColor: 'color-mix(in srgb, var(--bg) 86%, transparent)' }}
        type="button"
        onClick={onClose}
      />

      <div className="relative z-10 flex h-full w-full max-w-6xl flex-col gap-0 overflow-hidden rounded-none border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-panel-strong)] sm:h-auto sm:max-h-[90vh] sm:rounded-[24px]">
        <ModalHeader comanda={comanda} isEditing={isEditing} onClose={onClose} />

        <div className="grid min-h-0 flex-1 overflow-y-auto xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.86fr)_minmax(340px,0.78fr)] xl:overflow-hidden">
          <div className="flex min-h-0 flex-col border-b border-[var(--border)] xl:border-b-0 xl:border-r">
            <div className="p-4">
              <div className="flex items-center gap-2 rounded-[14px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2.5">
                <Search className="size-4 text-[var(--text-soft)]" />
                <input
                  className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-soft)] outline-none"
                  placeholder="Buscar produto..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <CategoryGrid
                categories={categories}
                selectedCategory={selectedCategory}
                showAllOption={showProducts}
                onSelectCategory={setSelectedCategory}
              />
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <div className="mb-3 flex items-center justify-between rounded-[14px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                    {productListTitle}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-soft)]">
                    {filteredProducts.length} produtos visíveis
                  </p>
                </div>
                <button
                  className="rounded-[10px] border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-soft)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                  type="button"
                  onClick={() => {
                    setSelectedCategory(null)
                    setSearch('')
                  }}
                >
                  Limpar
                </button>
              </div>

              {showProducts ? (
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-1">
                  {filteredProducts.map((product) => {
                    const inCart = itens.find((item) => item.produtoId === product.id)
                    return (
                      <ProductCard
                        inCartQty={inCart?.quantidade ?? 0}
                        key={product.id}
                        product={product}
                        onAdd={() => addItem(product)}
                        onDragStart={(e) => e.dataTransfer.setData('productId', product.id)}
                      />
                    )
                  })}

                  {filteredProducts.length === 0 ? (
                    <div className="rounded-[18px] border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--text-soft)]">
                      Nenhum produto encontrado para o filtro atual.
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex min-h-0 flex-col overflow-y-auto border-b border-[var(--border)] xl:border-b-0 xl:border-r">
            <div className="grid grid-cols-2 gap-3 p-4 pb-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                  Mesa
                </label>
                <input
                  className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  placeholder="Ex: 4"
                  value={mesa}
                  onChange={(event) => setMesa(event.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                  Cliente
                </label>
                <input
                  className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  placeholder="Nome (opcional)"
                  value={clienteNome}
                  onChange={(event) => setClienteNome(event.target.value)}
                />
              </div>
            </div>

            <div className="px-4 pb-3">
              <label className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                CPF / CNPJ
                {clienteDocumento ? (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{
                      background: docValidation.valid
                        ? 'color-mix(in srgb, var(--success) 12%, transparent)'
                        : 'color-mix(in srgb, var(--danger) 12%, transparent)',
                      color: docValidation.valid ? 'var(--success)' : 'var(--danger)',
                    }}
                  >
                    {docValidation.valid ? `${docLabel} valido` : (docValidation.message ?? `${docLabel} invalido`)}
                  </span>
                ) : null}
              </label>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-[12px] border bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors"
                  inputMode="numeric"
                  placeholder="000.000.000-00 ou 00.000.000/0001-00"
                  style={{ borderColor: DocumentBorderColor(clienteDocumento, docValidation.valid) }}
                  value={clienteDocumento}
                  onChange={(event) => setClienteDocumento(maskDocument(event.target.value))}
                />
                {clienteDocumento ? (
                  <button
                    className="rounded-[12px] border border-[var(--border)] px-2.5 text-[var(--text-soft)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                    type="button"
                    onClick={() => setClienteDocumento('')}
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="px-4 pb-3">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                Observação da comanda
              </label>
              <textarea
                className="min-h-[84px] w-full resize-none rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-soft)] focus:border-[var(--accent)]"
                placeholder="Ex: cliente na varanda, entregar junto, prioridade alta"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 px-4 pt-1">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                  Desconto %
                </label>
                <input
                  className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  max="100"
                  min="0"
                  type="number"
                  value={desconto}
                  onChange={(event) => {
                    const newValue = Math.min(100, Math.max(0, Number(event.target.value)))
                    handlePercentChange(
                      newValue,
                      desconto,
                      setDesconto,
                      'Aplicar Desconto',
                      (v) => `Confirme o desconto de ${v}% com seu PIN.`,
                    )
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                  Acrescimo %
                </label>
                <input
                  className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  max="100"
                  min="0"
                  type="number"
                  value={acrescimo}
                  onChange={(event) => {
                    const newValue = Math.min(100, Math.max(0, Number(event.target.value)))
                    handlePercentChange(
                      newValue,
                      acrescimo,
                      setAcrescimo,
                      'Aplicar Acréscimo',
                      (v) => `Confirme o acréscimo de ${v}% com seu PIN.`,
                    )
                  }}
                />
              </div>
            </div>

            <div
              className="m-4 flex items-center justify-between rounded-[14px] border px-4 py-3"
              style={{
                borderColor: 'color-mix(in srgb, var(--success) 20%, var(--border))',
                backgroundColor: 'color-mix(in srgb, var(--success) 8%, var(--surface))',
              }}
            >
              <div>
                {bruto !== total ? (
                  <p className="text-xs text-[var(--text-soft)] line-through">{formatCurrency(bruto, 'BRL')}</p>
                ) : null}
                <p className="text-xl font-bold text-[var(--success)]">{formatCurrency(total, 'BRL')}</p>
              </div>
              <p className="text-xs text-[var(--text-soft)]">{itemCount} itens</p>
            </div>

            {isEditing && onStatusChange && comanda ? (
              <StatusButtons
                comanda={comanda}
                isBusy={isBusy}
                requirePin={requirePin}
                onClose={onClose}
                onStatusChange={onStatusChange}
              />
            ) : null}

            <div className="border-t border-[var(--border)] p-4 pb-5">
              <SaveButtons
                connectionState={connectionState}
                hasItems={itens.length > 0}
                isBusy={isBusy}
                isEditing={isEditing}
                onSave={() => void handleSave()}
                onSaveAndPrint={() => void handleSave({ printAfterSave: true })}
              />

              {saveError ? <p className="mt-3 text-xs text-[var(--danger)]">{saveError}</p> : null}

              <div className="mt-4">
                <PrinterSection
                  connectionState={connectionState}
                  isBusy={isBusy}
                  printers={printers}
                  selectedPrinterName={selectedPrinterName}
                  statusMessage={statusMessage}
                  onChoosePrinter={choosePrinter}
                  onRefreshPrinters={() => refreshPrinters()}
                />
              </div>
            </div>
          </div>

          <ComandaLivePreview
            acrescimo={acrescimo}
            addItem={addItem}
            bruto={bruto}
            changeQty={changeQty}
            clienteNome={clienteNome}
            desconto={desconto}
            itens={itens}
            mesa={mesa}
            notes={notes}
            products={products}
            setItens={setItens}
            status={draftComanda.status}
            total={total}
          />
        </div>
      </div>

      {isPinDialogOpen && (
        <AdminPinDialog
          description={pinDialogDescription}
          title={pinDialogTitle}
          onCancel={handlePinCancel}
          onConfirm={handlePinConfirm}
        />
      )}
    </div>
  )
}

function buildPrintableComanda(comanda: Comanda): PrintableComanda {
  const subtotalAmount = comanda.itens.reduce((sum, item) => sum + item.quantidade * item.precoUnitario, 0)

  return {
    id: comanda.id,
    tableLabel: normalizeTableLabel(comanda.mesa ?? ''),
    customerName: comanda.clienteNome,
    customerDocument: comanda.clienteDocumento,
    items: comanda.itens.map((item) => ({
      name: item.nome,
      quantity: item.quantidade,
      unitPrice: item.precoUnitario,
      note: item.observacao,
    })),
    discountPercent: comanda.desconto,
    additionalPercent: comanda.acrescimo,
    openedAtIso: comanda.abertaEm.toISOString(),
    subtotalAmount,
    totalAmount: calcTotal(comanda),
    currency: 'BRL',
    operatorLabel: 'PDV',
  }
}
