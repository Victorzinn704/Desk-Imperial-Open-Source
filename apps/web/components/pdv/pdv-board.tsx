'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { OperationsLiveResponse } from '@contracts/contracts'
import type { PdvMesaIntent } from './pdv-navigation-intent'
import type { SimpleProduct } from './comanda-modal'
import { PdvBoardError, PdvBoardHeader, PdvBoardKanban } from './pdv-board.sections'
import { PdvComandaPreviewModal } from './pdv-comanda-preview-modal'
import { toPdvComanda } from './pdv-operations'
import { usePdvBoardController } from './use-pdv-board-controller'
import { usePdvAutoPrintTerminalPayments } from './use-pdv-auto-print-terminal-payments'
import { usePdvTerminalPaymentMutation } from './use-pdv-terminal-payment-mutation'
import { useThermalPrinting } from './use-thermal-printing'
import { fetchComandaDetails } from '@/lib/api'
import { comandaToPrintable } from '@/lib/printing'

const loadPdvComandaModal = () => import('./pdv-comanda-modal').then((mod) => mod.PdvComandaModal)

const LazyPdvComandaModal = dynamic(loadPdvComandaModal, {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] px-4">
      <div className="w-full max-w-xl rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-panel-strong)]">
        <div className="space-y-3">
          <div className="h-6 w-40 animate-pulse rounded-lg bg-[var(--surface-soft)]" />
          <div className="h-4 w-72 animate-pulse rounded-lg bg-[var(--surface-soft)]" />
          <div className="grid gap-3 pt-2 md:grid-cols-2">
            <div className="h-12 animate-pulse rounded-[14px] bg-[var(--surface-soft)]" />
            <div className="h-12 animate-pulse rounded-[14px] bg-[var(--surface-soft)]" />
            <div className="h-40 animate-pulse rounded-[14px] bg-[var(--surface-soft)] md:col-span-2" />
          </div>
        </div>
      </div>
    </div>
  ),
})

type PdvBoardProps = Readonly<{
  mesaIntent?: PdvMesaIntent | null
  onConsumeMesaIntent?: () => void
  operations?: OperationsLiveResponse
  products: SimpleProduct[]
  variant?: 'grid' | 'comandas' | 'cobranca'
}>

type PdvBoardController = ReturnType<typeof usePdvBoardController>
type PdvTerminalPaymentMutation = ReturnType<typeof usePdvTerminalPaymentMutation>
type PdvThermalPrinter = ReturnType<typeof useThermalPrinting>
type PrintableComandaInput = Parameters<typeof comandaToPrintable>[0]
type PdvComandaModalPreloadTask = {
  cancel: () => void
}

export function PdvBoard({
  mesaIntent = null,
  onConsumeMesaIntent,
  operations,
  products,
  variant = 'grid',
}: Readonly<PdvBoardProps>) {
  usePreloadPdvComandaModal()
  const controller = usePdvBoardController({
    mesaIntent,
    onConsumeMesaIntent,
    operations,
    variant,
  })
  const terminalPaymentMutation = usePdvTerminalPaymentMutation()
  const printer = useThermalPrinting()
  usePdvAutoPrintTerminalPayments({ comandas: controller.comandas, printComanda: printer.printComanda })

  return (
    <div className="space-y-5">
      <PdvBoardError message={controller.actionError} />
      <PdvBoardMainSection controller={controller} />
      <PdvPreviewModalSlot
        controller={controller}
        printer={printer}
        terminalPaymentMutation={terminalPaymentMutation}
      />
      <PdvNewModalSlot controller={controller} products={products} />
      <PdvEditingModalSlot controller={controller} products={products} />
    </div>
  )
}

function PdvBoardMainSection({ controller }: Readonly<{ controller: PdvBoardController }>) {
  const handlePreviewCardClick = useCallback(
    (comanda: { id: string }) => {
      controller.openPreviewModal(comanda.id)
    },
    [controller],
  )

  const handlePreviewDragEnd = useCallback(
    (result: Parameters<typeof controller.handleDragEnd>[0]) => void controller.handleDragEnd(result),
    [controller],
  )

  return (
    <section className="space-y-4">
      <PdvBoardHeader
        description={controller.sectionCopy.description}
        eyebrow={controller.sectionCopy.eyebrow}
        title={controller.sectionCopy.title}
        onNewComanda={controller.openNewModal}
      />
      <PdvBoardKanban
        comandasByStatus={controller.comandasByStatus}
        onCardClick={handlePreviewCardClick}
        onDragEnd={handlePreviewDragEnd}
      />
    </section>
  )
}

function usePreloadPdvComandaModal() {
  useEffect(() => schedulePdvComandaModalPreload(), [])
}

function schedulePdvComandaModalPreload() {
  const preload = () => void loadPdvComandaModal()
  const task = createPdvComandaModalPreloadTask(preload)
  return task.cancel
}

function createPdvComandaModalPreloadTask(preload: () => void): PdvComandaModalPreloadTask {
  if (canUseIdlePreload()) {
    return createIdlePreloadTask(preload)
  }

  return createTimeoutPreloadTask(preload)
}

function canUseIdlePreload() {
  return typeof window !== 'undefined' && 'requestIdleCallback' in window
}

function createIdlePreloadTask(preload: () => void): PdvComandaModalPreloadTask {
  const idleId = window.requestIdleCallback(preload, { timeout: 250 })
  return { cancel: () => cancelIdlePreload(idleId) }
}

function createTimeoutPreloadTask(preload: () => void): PdvComandaModalPreloadTask {
  const timeoutId = setTimeout(preload, 120)
  return { cancel: () => clearTimeout(timeoutId) }
}

function cancelIdlePreload(idleId: number) {
  if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    window.cancelIdleCallback(idleId)
  }
}

function PdvPreviewModalSlot({
  controller,
  printer,
  terminalPaymentMutation,
}: Readonly<{
  controller: PdvBoardController
  printer: PdvThermalPrinter
  terminalPaymentMutation: PdvTerminalPaymentMutation
}>) {
  const previewComandaId = controller.previewComandaId
  const previewDetailsQuery = usePdvComandaDetailsQuery('pdv-preview', previewComandaId ?? undefined)
  const previewComanda = previewDetailsQuery.data ?? controller.previewComanda
  const handlePreviewCharge = usePreviewCharge(controller, previewComandaId)
  const handlePrintPreviewComanda = usePrintPreviewComanda(printer)
  const handleTerminalPayment = useTerminalPaymentHandler(terminalPaymentMutation)

  if (!(previewComandaId && previewComanda)) {
    return null
  }

  return (
    <PdvComandaPreviewModal
      busy={previewDetailsQuery.isLoading}
      comanda={previewComanda}
      terminalPaymentBusy={terminalPaymentMutation.isPending}
      onCharge={handlePreviewCharge}
      onClose={controller.closePreviewModal}
      onEdit={handlePreviewCharge}
      onPrint={handlePrintPreviewComanda}
      onTerminalPayment={handleTerminalPayment}
    />
  )
}

function PdvNewModalSlot({
  controller,
  products,
}: Readonly<{ controller: PdvBoardController; products: SimpleProduct[] }>) {
  if (!controller.isNewModalOpen) {
    return null
  }

  return (
    <LazyPdvComandaModal
      busy={controller.mutationBusy}
      initialMesa={controller.mesaPreSelectedLabel ?? undefined}
      products={products}
      onClose={controller.closeNewModal}
      onSave={controller.persistComandaDraft}
    />
  )
}

function PdvEditingModalSlot({
  controller,
  products,
}: Readonly<{ controller: PdvBoardController; products: SimpleProduct[] }>) {
  const editingComandaId = controller.editingComanda?.id
  const editingDetailsQuery = usePdvComandaDetailsQuery('pdv-edit', editingComandaId ?? undefined)
  const editingComanda = editingDetailsQuery.data ?? controller.editingComanda

  if (!editingComanda) {
    return null
  }

  return (
    <LazyPdvComandaModal
      busy={controller.mutationBusy}
      comanda={editingComanda}
      products={products}
      onClose={controller.closeEditingModal}
      onSave={controller.persistComandaDraft}
      onStatusChange={controller.handleStatusChange}
    />
  )
}

function usePreviewCharge(controller: PdvBoardController, previewComandaId: string | null) {
  return useCallback(() => {
    if (previewComandaId) {
      controller.openEditingModal(previewComandaId)
    }
  }, [controller, previewComandaId])
}

function usePrintPreviewComanda(printer: PdvThermalPrinter) {
  return useCallback(
    async (comanda: PrintableComandaInput) => {
      try {
        await printer.printComanda(comandaToPrintable(comanda))
        toast.success('Comanda enviada para a impressora')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao imprimir comanda')
      }
    },
    [printer],
  )
}

function useTerminalPaymentHandler(terminalPaymentMutation: PdvTerminalPaymentMutation) {
  return useCallback(
    (comandaId: string, amount: number, method: 'PIX' | 'DEBIT' | 'CREDIT') =>
      terminalPaymentMutation.mutateAsync({ amount, comandaId, method, replacePending: true }),
    [terminalPaymentMutation],
  )
}

function usePdvComandaDetailsQuery(scope: 'pdv-preview' | 'pdv-edit', comandaId: string | undefined) {
  return useQuery({
    queryKey: ['comanda-details', scope, comandaId],
    queryFn: async () => {
      if (!comandaId) {
        throw new Error(`Comanda id is required to fetch ${scope} details`)
      }

      const response = await fetchComandaDetails(comandaId)
      return toPdvComanda(response.comanda)
    },
    enabled: Boolean(comandaId),
    staleTime: 5_000,
  })
}
