'use client'

import { useMemo, useState, useRef } from 'react'
import { LoaderCircle, Printer, Search, X } from 'lucide-react'
import type { PrintableComanda } from '@/lib/printing'
import { formatCurrency } from '@/lib/currency'
import { maskDocument, validateDocument } from '@/lib/document-validation'
import { AdminPinDialog } from '@/components/admin-pin/admin-pin-dialog'
import type { Comanda, ComandaItem } from './pdv-types'
import { calcTotal } from './pdv-types'
import { useThermalPrinting } from './use-thermal-printing'
import { normalizeTableLabel } from './normalize-table-label'
import {
  type SimpleProduct,
  type SaveComandaPayload,
  useProductFilter,
  ProductCard,
  CategoryGrid,
  ComandaItemRow,
  PrinterSection,
  StatusButtons,
} from './comanda-modal'

type PdvComandaModalProps = {
  busy?: boolean
  comanda?: Comanda | null
  products: SimpleProduct[]
  initialMesa?: string
  onSave: (data: SaveComandaPayload) => Promise<Comanda>
  onClose: () => void
  onStatusChange?: (comanda: Comanda, status: Comanda['status']) => Promise<void>
}

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
  const docLabel = clienteDocumento.replace(/\D/g, '').length > 11 ? 'CNPJ' : 'CPF'

  // Helper to require PIN before executing an action
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
    setItens((prev) => {
      const existing = prev.find((item) => item.produtoId === product.id)
      if (existing) {
        return prev.map((item) => (item.produtoId === product.id ? { ...item, quantidade: item.quantidade + 1 } : item))
      }

      return [
        ...prev,
        {
          produtoId: product.id,
          nome: product.name,
          quantidade: 1,
          precoUnitario: product.unitPrice,
        },
      ]
    })
  }

  function changeQty(produtoId: string, delta: number) {
    setItens((prev) =>
      prev
        .map((item) => (item.produtoId === produtoId ? { ...item, quantidade: item.quantidade + delta } : item))
        .filter((item) => item.quantidade > 0),
    )
  }

  const bruto = useMemo(() => itens.reduce((sum, item) => sum + item.quantidade * item.precoUnitario, 0), [itens])
  const itemCount = useMemo(() => itens.reduce((sum, item) => sum + item.quantidade, 0), [itens])
  const draftComanda: Comanda = {
    id: comanda?.id ?? '',
    status: comanda?.status ?? 'aberta',
    mesa,
    clienteNome,
    clienteDocumento,
    itens,
    desconto,
    acrescimo,
    abertaEm: comanda?.abertaEm ?? new Date(),
  }
  const total = calcTotal(draftComanda)
  const isBusy = busy || isSubmitting

  async function handleSave(options?: { printAfterSave?: boolean }) {
    if (itens.length === 0 || isBusy) {
      return
    }

    setSaveError(null)
    setIsSubmitting(true)

    try {
      const savedComanda = await onSave({
        mesa,
        clienteNome,
        clienteDocumento,
        itens,
        desconto,
        acrescimo,
      })

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

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="imperial-card relative flex h-full w-full max-w-6xl flex-col gap-0 overflow-hidden rounded-none sm:h-auto sm:max-h-[90vh] sm:rounded-[24px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] p-4 sm:p-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold text-white">
                {isEditing ? `Comanda #${comanda!.id.slice(-4).toUpperCase()}` : 'Nova Comanda'}
              </h2>
              {isEditing ? (
                <span className="rounded-full border border-[rgba(251,146,60,0.24)] bg-[rgba(251,146,60,0.1)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#fb923c]">
                  Modo edicao
                </span>
              ) : (
                <span className="rounded-full border border-[rgba(52,242,127,0.24)] bg-[rgba(52,242,127,0.1)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#36f57c]">
                  Abrir comanda
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-[var(--text-soft)]">
              {isEditing
                ? 'Edite os itens dentro do PDV e acompanhe a tela lateral da comanda em tempo real.'
                : 'Adicione itens, confirme os dados e acompanhe a tela lateral antes de abrir a comanda.'}
            </p>
          </div>
          <button
            className="flex size-9 items-center justify-center rounded-[14px] border border-[rgba(255,255,255,0.08)] text-[var(--text-soft)] transition-colors hover:border-[rgba(255,255,255,0.16)] hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 overflow-y-auto xl:overflow-hidden xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.8fr)_minmax(320px,0.7fr)]">
          <div className="flex min-h-0 flex-col border-b border-[rgba(255,255,255,0.06)] xl:border-b-0 xl:border-r">
            <div className="p-4">
              <div className="flex items-center gap-2 rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5">
                <Search className="size-4 text-[var(--text-soft)]" />
                <input
                  className="flex-1 bg-transparent text-sm text-white placeholder-[var(--text-soft)] outline-none"
                  placeholder="Buscar produto..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              {/* Categories Kanban Squares */}
              <CategoryGrid
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                showAllOption={showProducts}
              />
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {!showProducts ? (
                <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-[20px] border border-dashed border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-6 text-center">
                  <p className="text-base font-semibold text-white">Escolha uma categoria</p>
                  <p className="mt-2 max-w-[24rem] text-sm leading-6 text-[var(--text-soft)]">
                    Primeiro selecione a classe do produto. A lista aparece no mesmo painel, sem trocar de tela.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-3 py-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                        {selectedCategory ? selectedCategory : search.trim() ? 'Busca rápida' : 'Todos os produtos'}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-soft)]">
                        {filteredProducts.length} produtos visíveis
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory(null)
                        setSearch('')
                      }}
                      className="rounded-[10px] border border-[rgba(255,255,255,0.08)] px-3 py-1.5 text-xs font-semibold text-[var(--text-soft)] transition-colors hover:text-white"
                    >
                      Ver categorias
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-1">
                    {filteredProducts.map((product) => {
                      const inCart = itens.find((item) => item.produtoId === product.id)
                      return (
                        <ProductCard
                          key={product.id}
                          product={product}
                          inCartQty={inCart?.quantidade ?? 0}
                          onAdd={() => addItem(product)}
                          onDragStart={(e) => e.dataTransfer.setData('productId', product.id)}
                        />
                      )
                    })}

                    {filteredProducts.length === 0 ? (
                      <p className="py-8 text-center text-sm text-[var(--text-soft)]">Nenhum produto encontrado</p>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-col border-b border-[rgba(255,255,255,0.06)] xl:border-b-0 xl:border-r">
            <div className="grid grid-cols-2 gap-3 p-4 pb-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                  Mesa
                </label>
                <input
                  className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm text-white outline-none focus:border-[rgba(52,242,127,0.3)]"
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
                  className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm text-white outline-none focus:border-[rgba(52,242,127,0.3)]"
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
                      background: docValidation.valid ? 'rgba(52,242,127,0.1)' : 'rgba(239,68,68,0.1)',
                      color: docValidation.valid ? '#36f57c' : '#fca5a5',
                    }}
                  >
                    {docValidation.valid ? `${docLabel} valido` : (docValidation.message ?? `${docLabel} invalido`)}
                  </span>
                ) : null}
              </label>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-[12px] border bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm text-white outline-none transition-colors"
                  inputMode="numeric"
                  placeholder="000.000.000-00 ou 00.000.000/0001-00"
                  style={{
                    borderColor: clienteDocumento
                      ? docValidation.valid
                        ? 'rgba(52,242,127,0.35)'
                        : 'rgba(239,68,68,0.35)'
                      : 'rgba(255,255,255,0.08)',
                  }}
                  value={clienteDocumento}
                  onChange={(event) => setClienteDocumento(maskDocument(event.target.value))}
                />
                {clienteDocumento ? (
                  <button
                    className="rounded-[12px] border border-[rgba(255,255,255,0.08)] px-2.5 text-[var(--text-soft)] hover:text-white"
                    type="button"
                    onClick={() => setClienteDocumento('')}
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 px-4 pt-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                  Desconto %
                </label>
                <input
                  className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm text-white outline-none focus:border-[rgba(52,242,127,0.3)]"
                  max="100"
                  min="0"
                  type="number"
                  value={desconto}
                  onChange={(event) => {
                    const newValue = Math.min(100, Math.max(0, Number(event.target.value)))
                    if (newValue > 0 && newValue !== desconto) {
                      requirePin(
                        () => setDesconto(newValue),
                        'Aplicar Desconto',
                        `Confirme o desconto de ${newValue}% com seu PIN.`,
                      )
                    } else {
                      setDesconto(newValue)
                    }
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                  Acrescimo %
                </label>
                <input
                  className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm text-white outline-none focus:border-[rgba(52,242,127,0.3)]"
                  max="100"
                  min="0"
                  type="number"
                  value={acrescimo}
                  onChange={(event) => {
                    const newValue = Math.min(100, Math.max(0, Number(event.target.value)))
                    if (newValue > 0 && newValue !== acrescimo) {
                      requirePin(
                        () => setAcrescimo(newValue),
                        'Aplicar Acréscimo',
                        `Confirme o acréscimo de ${newValue}% com seu PIN.`,
                      )
                    } else {
                      setAcrescimo(newValue)
                    }
                  }}
                />
              </div>
            </div>

            <div className="m-4 flex items-center justify-between rounded-[14px] border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.06)] px-4 py-3">
              <div>
                {bruto !== total ? (
                  <p className="text-xs text-[var(--text-soft)] line-through">{formatCurrency(bruto, 'BRL')}</p>
                ) : null}
                <p className="text-xl font-bold text-[#36f57c]">{formatCurrency(total, 'BRL')}</p>
              </div>
              <p className="text-xs text-[var(--text-soft)]">{itemCount} itens</p>
            </div>

            {isEditing && onStatusChange && comanda ? (
              <StatusButtons
                comanda={comanda}
                isBusy={isBusy}
                onStatusChange={onStatusChange}
                onClose={onClose}
                requirePin={requirePin}
              />
            ) : null}

            <div className="border-t border-[rgba(255,255,255,0.06)] p-4">
              <PrinterSection
                printers={printers}
                selectedPrinterName={selectedPrinterName}
                connectionState={connectionState}
                statusMessage={statusMessage}
                isBusy={isBusy}
                onChoosePrinter={choosePrinter}
                onRefreshPrinters={() => void refreshPrinters()}
              />

              {saveError ? <p className="mt-3 text-xs text-[#fca5a5]">{saveError}</p> : null}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  className="w-full rounded-[14px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] py-3 text-sm font-semibold text-white transition-all hover:border-[rgba(255,255,255,0.22)] hover:bg-[rgba(255,255,255,0.06)] disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={itens.length === 0 || connectionState === 'printing' || isBusy}
                  type="button"
                  onClick={() => void handleSave()}
                >
                  {isEditing ? 'Salvar alteracoes' : 'Abrir comanda'}
                </button>

                <button
                  className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-[rgba(52,242,127,0.4)] bg-[rgba(52,242,127,0.12)] py-3 text-sm font-semibold text-[#36f57c] transition-all hover:bg-[rgba(52,242,127,0.2)] disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={
                    itens.length === 0 || connectionState === 'discovering' || connectionState === 'printing' || isBusy
                  }
                  type="button"
                  onClick={() => void handleSave({ printAfterSave: true })}
                >
                  {connectionState === 'printing' || isBusy ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Printer className="size-4" />
                  )}
                  {isEditing ? 'Salvar e imprimir' : 'Abrir e imprimir'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col bg-[rgba(255,255,255,0.015)]">
            <div className="border-b border-[rgba(255,255,255,0.06)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Tela da comanda</p>
              <h3 className="mt-2 text-lg font-semibold text-white">Itens ao vivo da mesa {mesa || 'sem numero'}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
                Sempre que abrir ou editar uma comanda, esta coluna mostra os itens que vao sair para o atendimento.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 border-b border-[rgba(255,255,255,0.06)] px-4 py-4">
              <div className="rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Cliente</p>
                <p className="mt-2 truncate text-sm font-medium text-white">{clienteNome || 'Nao identificado'}</p>
              </div>
              <div className="rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Status</p>
                <p className="mt-2 text-sm font-medium text-white">
                  {draftComanda.status === 'aberta'
                    ? 'Aberta'
                    : draftComanda.status === 'em_preparo'
                      ? 'Em preparo'
                      : draftComanda.status === 'pronta'
                        ? 'Pronta'
                        : 'Fechada'}
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
                if (product) addItem(product)
              }}
            >
              {itens.length === 0 ? (
                <div className="flex h-full min-h-52 flex-col items-center justify-center rounded-[18px] border border-dashed border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-6 text-center">
                  <p className="text-sm font-semibold text-white">Nenhum item ainda</p>
                  <p className="mt-2 text-xs leading-6 text-[var(--text-soft)]">
                    Arraste produtos da esquerda ou toque para adicionar.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {itens.map((item) => (
                    <ComandaItemRow key={item.produtoId} item={item} onChangeQty={changeQty} setItens={setItens} />
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-[rgba(255,255,255,0.06)] px-4 py-4">
              <div className="rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(9,11,17,0.9)] p-4">
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
                <div className="mt-4 flex items-center justify-between border-t border-[rgba(255,255,255,0.08)] pt-4">
                  <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                    Total final
                  </span>
                  <span className="text-xl font-bold text-[#36f57c]">{formatCurrency(total, 'BRL')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isPinDialogOpen && (
        <AdminPinDialog
          title={pinDialogTitle}
          description={pinDialogDescription}
          onConfirm={handlePinConfirm}
          onCancel={handlePinCancel}
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
