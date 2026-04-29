'use client'

import dynamic from 'next/dynamic'
import type { OperationsLiveResponse } from '@contracts/contracts'
import type { PdvMesaIntent } from './pdv-navigation-intent'
import type { SimpleProduct } from './comanda-modal'
import { PdvBoardError, PdvBoardHeader, PdvBoardKanban } from './pdv-board.sections'
import { usePdvBoardController } from './use-pdv-board-controller'

const LazyPdvComandaModal = dynamic(() => import('./pdv-comanda-modal').then((mod) => mod.PdvComandaModal), {
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
  const controller = usePdvBoardController({
    mesaIntent,
    onConsumeMesaIntent,
    operations,
    variant,
  })

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
          onCardClick={(comanda) => controller.openEditingModal(comanda.id)}
          onDragEnd={(result) => void controller.handleDragEnd(result)}
        />
      </section>

      {controller.isNewModalOpen ? (
        <LazyPdvComandaModal
          busy={controller.mutationBusy}
          initialMesa={controller.mesaPreSelectedLabel ?? undefined}
          products={products}
          onClose={controller.closeNewModal}
          onSave={controller.persistComandaDraft}
        />
      ) : null}

      {controller.editingComanda ? (
        <LazyPdvComandaModal
          busy={controller.mutationBusy}
          comanda={controller.editingComanda}
          products={products}
          onClose={controller.closeEditingModal}
          onSave={controller.persistComandaDraft}
          onStatusChange={controller.handleStatusChange}
        />
      ) : null}
    </div>
  )
}
