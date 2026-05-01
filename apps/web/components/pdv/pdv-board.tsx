'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { OperationsLiveResponse } from '@contracts/contracts'
import type { PdvMesaIntent } from './pdv-navigation-intent'
import type { SimpleProduct } from './comanda-modal'
import { PdvBoardError, PdvBoardHeader, PdvBoardKanban } from './pdv-board.sections'
import { PdvComandaPreviewModal } from './pdv-comanda-preview-modal'
import { toPdvComanda } from './pdv-operations'
import { usePdvBoardController } from './use-pdv-board-controller'
import { fetchComandaDetails } from '@/lib/api'

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

// eslint-disable-next-line max-lines-per-function
export function PdvBoard({
  mesaIntent = null,
  onConsumeMesaIntent,
  operations,
  products,
  variant = 'grid',
}: Readonly<PdvBoardProps>) {
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let idleId: number | null = null

    const preload = () => {
      void loadPdvComandaModal()
    }

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(preload, { timeout: 250 })
    } else {
      timeoutId = setTimeout(preload, 120)
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      if (idleId != null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId)
      }
    }
  }, [])

  const controller = usePdvBoardController({
    mesaIntent,
    onConsumeMesaIntent,
    operations,
    variant,
  })
  const previewComandaId = controller.previewComandaId
  const editingComandaId = controller.editingComanda?.id
  const previewDetailsQuery = useQuery({
    queryKey: ['comanda-details', 'pdv-preview', previewComandaId],
    queryFn: async () => {
      if (!previewComandaId) {
        throw new Error('Preview comanda id is required to fetch comanda details')
      }
      const response = await fetchComandaDetails(previewComandaId)
      return toPdvComanda(response.comanda)
    },
    enabled: Boolean(previewComandaId),
    staleTime: 5_000,
  })
  const editingDetailsQuery = useQuery({
    queryKey: ['comanda-details', 'pdv-edit', editingComandaId],
    queryFn: async () => {
      if (!editingComandaId) {
        throw new Error('Editing comanda id is required to fetch comanda details')
      }
      const response = await fetchComandaDetails(editingComandaId)
      return toPdvComanda(response.comanda)
    },
    enabled: Boolean(editingComandaId),
    staleTime: 5_000,
  })
  const previewComanda = previewDetailsQuery.data ?? controller.previewComanda
  const editingComanda = editingDetailsQuery.data ?? controller.editingComanda

  return (
    <div className="space-y-5">
      <PdvBoardError message={controller.actionError} />

      <section className="space-y-4">
        <PdvBoardHeader
          description={controller.sectionCopy.description}
          eyebrow={controller.sectionCopy.eyebrow}
          title={controller.sectionCopy.title}
          onNewComanda={controller.openNewModal}
        />
        <PdvBoardKanban
          comandasByStatus={controller.comandasByStatus}
          onCardClick={(comanda) => controller.openPreviewModal(comanda.id)}
          onDragEnd={(result) => void controller.handleDragEnd(result)}
        />
      </section>

      {controller.previewComandaId && previewComanda ? (
        <PdvComandaPreviewModal
          busy={previewDetailsQuery.isLoading}
          comanda={previewComanda}
          onCharge={() => controller.openEditingModal(controller.previewComandaId!)}
          onClose={controller.closePreviewModal}
          onEdit={() => controller.openEditingModal(controller.previewComandaId!)}
        />
      ) : null}

      {controller.isNewModalOpen ? (
        <LazyPdvComandaModal
          busy={controller.mutationBusy}
          initialMesa={controller.mesaPreSelectedLabel ?? undefined}
          products={products}
          onClose={controller.closeNewModal}
          onSave={controller.persistComandaDraft}
        />
      ) : null}

      {editingComanda ? (
        <LazyPdvComandaModal
          busy={controller.mutationBusy}
          comanda={editingComanda}
          products={products}
          onClose={controller.closeEditingModal}
          onSave={controller.persistComandaDraft}
          onStatusChange={controller.handleStatusChange}
        />
      ) : null}
    </div>
  )
}
