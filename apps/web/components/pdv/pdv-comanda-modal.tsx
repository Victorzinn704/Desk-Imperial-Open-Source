'use client'

import { useCallback } from 'react'
import { AdminPinDialog } from '@/components/admin-pin/admin-pin-dialog'
import {
  ComandaCatalogPane,
  ComandaFormPane,
  ComandaLivePreview,
  ModalHeader,
  type SaveComandaPayload,
  type SimpleProduct,
  useComandaModalController,
} from './comanda-modal'
import type { Comanda } from './pdv-types'

const modalOverlayStyle = {
  backgroundColor: 'color-mix(in srgb, var(--bg) 86%, transparent)',
} as const

function useComandaFormActions(controller: ReturnType<typeof useComandaModalController>) {
  const handleRefreshPrinters = useCallback(() => {
    void controller.refreshPrinters()
  }, [controller])
  const handleSave = useCallback(() => {
    void controller.handleSave()
  }, [controller])
  const handleSaveAndPrint = useCallback(() => {
    void controller.handleSave({ printAfterSave: true })
  }, [controller])

  return {
    handleRefreshPrinters,
    handleSave,
    handleSaveAndPrint,
  }
}

type PdvComandaModalProps = Readonly<{
  busy?: boolean
  comanda?: Comanda | null
  products: SimpleProduct[]
  initialMesa?: string
  onSave: (data: SaveComandaPayload) => Promise<Comanda>
  onClose: () => void
  onStatusChange?: (comanda: Comanda, status: Comanda['status']) => Promise<void>
}>

export function PdvComandaModal({
  busy = false,
  comanda,
  products,
  initialMesa,
  onSave,
  onClose,
  onStatusChange,
}: Readonly<PdvComandaModalProps>) {
  const controller = useComandaModalController({
    busy,
    comanda,
    initialMesa,
    onClose,
    onSave,
    products,
  })

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center p-0 sm:items-center sm:p-5">
      <button
        aria-label="Fechar comanda"
        className="absolute inset-0 border-0 p-0 backdrop-blur-sm"
        style={modalOverlayStyle}
        type="button"
        onClick={onClose}
      />

      <div className="relative z-10 flex h-[100dvh] w-full flex-col gap-0 overflow-hidden rounded-none border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-panel-strong)] sm:h-[calc(100dvh-32px)] sm:max-h-[calc(100dvh-32px)] sm:w-[calc(100vw-32px)] sm:max-w-[1760px] sm:rounded-[24px]">
        <ModalHeader comanda={comanda} isEditing={controller.isEditing} onClose={onClose} />
        <ComandaModalContent
          comanda={comanda}
          controller={controller}
          products={products}
          onClose={onClose}
          onStatusChange={onStatusChange}
        />
      </div>

      {controller.isPinDialogOpen && (
        <AdminPinDialog
          description={controller.pinDialogDescription}
          title={controller.pinDialogTitle}
          onCancel={controller.handlePinCancel}
          onConfirm={controller.handlePinConfirm}
        />
      )}
    </div>
  )
}

function ComandaModalContent({
  comanda,
  controller,
  products,
  onClose,
  onStatusChange,
}: Readonly<{
  comanda?: Comanda | null
  controller: ReturnType<typeof useComandaModalController>
  products: SimpleProduct[]
  onClose: () => void
  onStatusChange?: (comanda: Comanda, status: Comanda['status']) => Promise<void>
}>) {
  return (
    <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.82fr)] lg:grid-rows-[minmax(0,1fr)_minmax(260px,0.72fr)] lg:overflow-hidden 2xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.72fr)_minmax(380px,0.78fr)] 2xl:grid-rows-none">
      <ComandaCatalogColumn controller={controller} />
      <ComandaFormColumn comanda={comanda} controller={controller} onClose={onClose} onStatusChange={onStatusChange} />
      <ComandaPreviewColumn controller={controller} products={products} />
    </div>
  )
}

function ComandaCatalogColumn({ controller }: Readonly<{ controller: ReturnType<typeof useComandaModalController> }>) {
  return (
    <ComandaCatalogPane
      categories={controller.categories}
      filteredProducts={controller.filteredProducts}
      itens={controller.itens}
      search={controller.search}
      selectedCategory={controller.selectedCategory}
      setSearch={controller.setSearch}
      setSelectedCategory={controller.setSelectedCategory}
      showProducts={controller.showProducts}
      onAddItem={controller.addItem}
    />
  )
}

function ComandaFormColumn({
  comanda,
  controller,
  onClose,
  onStatusChange,
}: Readonly<{
  comanda?: Comanda | null
  controller: ReturnType<typeof useComandaModalController>
  onClose: () => void
  onStatusChange?: (comanda: Comanda, status: Comanda['status']) => Promise<void>
}>) {
  const formActions = useComandaFormActions(controller)

  return (
    <ComandaFormPane
      acrescimo={controller.acrescimo}
      bruto={controller.bruto}
      clienteDocumento={controller.clienteDocumento}
      clienteNome={controller.clienteNome}
      comanda={comanda}
      connectionState={controller.connectionState}
      desconto={controller.desconto}
      docLabel={controller.docLabel}
      docValidation={controller.docValidation}
      isBusy={controller.isBusy}
      isEditing={controller.isEditing}
      itemCount={controller.itemCount}
      itensLength={controller.itens.length}
      mesa={controller.mesa}
      notes={controller.notes}
      printers={controller.printers}
      requirePin={controller.requirePin}
      saveError={controller.saveError}
      selectedPrinterId={controller.selectedPrinterId}
      statusMessage={controller.statusMessage}
      total={controller.total}
      onChoosePrinter={controller.choosePrinter}
      onClose={onClose}
      onRefreshPrinters={formActions.handleRefreshPrinters}
      onSave={formActions.handleSave}
      onSaveAndPrint={formActions.handleSaveAndPrint}
      onSetAcrescimo={controller.handleAcrescimoChange}
      onSetClienteDocumento={controller.setClienteDocumento}
      onSetClienteNome={controller.setClienteNome}
      onSetDesconto={controller.handleDescontoChange}
      onSetMesa={controller.setMesa}
      onSetNotes={controller.setNotes}
      onStatusChange={onStatusChange}
    />
  )
}

function ComandaPreviewColumn({
  controller,
  products,
}: Readonly<{
  controller: ReturnType<typeof useComandaModalController>
  products: SimpleProduct[]
}>) {
  return (
    <ComandaLivePreview
      acrescimo={controller.acrescimo}
      addItem={controller.addItem}
      bruto={controller.bruto}
      changeQty={controller.changeQty}
      clienteNome={controller.clienteNome}
      desconto={controller.desconto}
      itens={controller.itens}
      mesa={controller.mesa}
      notes={controller.notes}
      products={products}
      setItens={controller.setItens}
      status={controller.draftStatus}
      total={controller.total}
    />
  )
}
