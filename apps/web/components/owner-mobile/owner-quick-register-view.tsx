'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { useDashboardMutations } from '@/components/dashboard/hooks/useDashboardMutations'
import { OwnerBarcodeScannerSheet } from '@/components/owner-mobile/owner-barcode-scanner-sheet'
import { OwnerQuickRegisterBarcodeSection } from './owner-quick-register-barcode-section'
import { OwnerQuickRegisterFormSection } from './owner-quick-register-form-section'
import { OwnerQuickRegisterHeader } from './owner-quick-register-header'
import { OwnerQuickRegisterHero } from './owner-quick-register-hero'
import { OwnerQuickRegisterRecentProducts } from './owner-quick-register-recent-products'
import { type LookupFeedback } from './owner-quick-register-model'
import { useOwnerBarcodeLookup } from './use-owner-barcode-lookup'
import { useOwnerOfflineProducts } from './use-owner-offline-products'
import { useOwnerProductCatalog } from './use-owner-product-catalog'
import { useOwnerQuickRegisterForm } from './use-owner-quick-register-form'
import { useOwnerQuickRegisterSubmit } from './use-owner-quick-register-submit'

export function OwnerQuickRegisterView({
  companyName,
  displayName,
  onBack,
}: Readonly<{
  companyName: string
  displayName: string
  onBack: () => void
}>) {
  const controller = useOwnerQuickRegisterController()

  return (
    <div className="min-h-screen min-h-[100svh] bg-[var(--bg)] text-[var(--text-primary)]">
      <OwnerQuickRegisterHeader companyName={companyName} onBack={onBack} />
      <OwnerQuickRegisterContent controller={controller} displayName={displayName} />
      <OwnerBarcodeScannerSheet
        open={controller.scannerOpen}
        onClose={() => controller.setScannerOpen(false)}
        onDetected={controller.handleDetected}
      />
    </div>
  )
}

function useOwnerQuickRegisterController() {
  const { createProductMutation, queryClient } = useDashboardMutations()
  const catalog = useOwnerProductCatalog()
  const { form, stockBaseUnits, stockValue } = useOwnerQuickRegisterForm()
  const offline = useOwnerOfflineProducts(createProductMutation, queryClient)
  const barcode = useOwnerBarcodeLookup(catalog.products, { getValues: form.getValues, setValue: form.setValue })
  const [scannerOpen, setScannerOpen] = useState(false)
  const canSubmit =
    !createProductMutation.isPending &&
    !barcode.duplicatedProduct &&
    isBarcodeReady(barcode.normalizedBarcode, barcode.barcodeValid)
  const submitProduct = useOwnerQuickRegisterSubmit({
    activeLookupContext: barcode.activeLookupContext,
    barcodeValid: barcode.barcodeValid,
    canSubmit,
    enqueue: offline.enqueue,
    mutateAsync: createProductMutation.mutateAsync,
    normalizedBarcode: barcode.normalizedBarcode,
    refreshQueuedCount: offline.refreshQueuedCount,
    reset: form.reset,
    resetAfterOfflineQueue: () =>
      resetAfterOfflineQueue(barcode.setBarcodeInput, barcode.setLookupContext, barcode.setLookupFeedback),
    resetLookup: barcode.resetLookup,
    resetMutation: createProductMutation.reset,
  })
  const handleDetected = useBarcodeDetectedHandler(barcode.runBarcodeLookup, barcode.setBarcodeInput, setScannerOpen)

  return {
    barcode,
    canSubmit,
    catalog,
    createProductMutation,
    form,
    handleDetected,
    offline,
    scannerOpen,
    setScannerOpen,
    stockBaseUnits,
    stockValue,
    submitProduct,
  }
}

function OwnerQuickRegisterContent({
  controller,
  displayName,
}: Readonly<{
  controller: ReturnType<typeof useOwnerQuickRegisterController>
  displayName: string
}>) {
  const c = controller
  return (
    <main className="space-y-4 p-3 pb-6" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
      {!c.offline.isOnline ? <OfflineNotice /> : null}
      <OwnerQuickRegisterHero
        categoriesCount={c.catalog.categoriesCount}
        displayName={displayName}
        lowStockCount={c.catalog.lowStockCount}
        productsCount={c.catalog.totals?.totalProducts ?? c.catalog.products.length}
        queuedCount={c.offline.queuedCount}
      />
      {c.catalog.productsError ? <ErrorNotice message={c.catalog.productsError} /> : null}
      <OwnerQuickRegisterBarcodeSection
        {...c.barcode}
        lookupPending={c.barcode.lookupMutation.isPending}
        onLookup={() => void c.barcode.runBarcodeLookup(c.barcode.normalizedBarcode, 'overwrite')}
        onOpenScanner={() => c.setScannerOpen(true)}
        onSetBarcode={c.barcode.setBarcodeInput}
      />
      <OwnerQuickRegisterFormSection
        canSubmit={c.canSubmit}
        createError={getMutationError(c.createProductMutation.error)}
        errors={c.form.formState.errors}
        isPending={c.createProductMutation.isPending}
        queuedCount={c.offline.queuedCount}
        register={c.form.register}
        stockBaseUnits={c.stockBaseUnits}
        stockValue={c.stockValue}
        onDrain={() => void c.offline.runDrain()}
        onSubmit={c.form.handleSubmit(c.submitProduct)}
      />
      <OwnerQuickRegisterRecentProducts products={c.catalog.recentProducts} />
    </main>
  )
}

function OfflineNotice() {
  return (
    <div className="rounded-2xl border border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.08)] px-4 py-3 text-xs text-[#fcd34d]">
      Sem conexão. Novos cadastros entram na fila local e sincronizam quando a rede voltar.
    </div>
  )
}

function ErrorNotice({ message }: Readonly<{ message: string }>) {
  return (
    <div className="rounded-2xl border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-xs text-[#fca5a5]">
      {message}
    </div>
  )
}

function getMutationError(error: unknown) {
  return error instanceof Error ? error.message : null
}

function isBarcodeReady(normalizedBarcode: string, barcodeValid: boolean) {
  return normalizedBarcode.length === 0 || barcodeValid
}

function resetAfterOfflineQueue(
  setBarcodeInput: (value: string) => void,
  setLookupContext: (value: null) => void,
  setLookupFeedback: (value: LookupFeedback) => void,
) {
  setBarcodeInput('')
  setLookupContext(null)
  setLookupFeedback({ tone: 'info', message: 'Produto salvo na fila offline deste aparelho.' })
}

function useBarcodeDetectedHandler(
  runBarcodeLookup: (barcode: string, mode: 'empty-only' | 'overwrite') => Promise<void>,
  setBarcodeInput: (value: string) => void,
  setScannerOpen: (value: boolean) => void,
) {
  return useCallback(
    (code: string) => {
      setBarcodeInput(code)
      setScannerOpen(false)
      toast.success('EAN capturado pela câmera')
      void runBarcodeLookup(code, 'empty-only')
    },
    [runBarcodeLookup, setBarcodeInput, setScannerOpen],
  )
}
