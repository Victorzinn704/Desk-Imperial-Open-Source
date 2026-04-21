'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { ComandaItem, Mesa } from '@/components/pdv/pdv-types'
import { normalizeTableLabel } from '@/components/pdv/normalize-table-label'
import { MobileTableGrid } from '../staff-mobile/mobile-table-grid'
import { OwnerPdvBanner, OwnerPdvOverviewHeader, OwnerPdvSummary, OwnerPdvViewTabs } from './owner-mobile-pdv-chrome'
import type { OwnerPdvView, PendingAction } from './owner-mobile-shell-types'
import { OPERATIONS_KITCHEN_QUERY_KEY } from '@/lib/operations'
import type { fetchOperationsKitchen, fetchProducts } from '@/lib/api'

const KitchenOrdersView = dynamic(
  () => import('../staff-mobile/kitchen-orders-view').then((mod) => mod.KitchenOrdersView),
  { ssr: false },
)
const MobileOrderBuilder = dynamic(
  () => import('../staff-mobile/mobile-order-builder').then((mod) => mod.MobileOrderBuilder),
  { ssr: false },
)

function OwnerPdvOverview({
  errorMessage,
  isOffline,
  kitchenData,
  kitchenLoading,
  mesas,
  mesasLoading,
  onOpenQuickRegister,
  onSelectMesa,
  onSetPdvView,
  pdvView,
}: Readonly<{
  errorMessage: string | null
  isOffline: boolean
  kitchenData: Awaited<ReturnType<typeof fetchOperationsKitchen>> | undefined
  kitchenLoading: boolean
  mesas: Mesa[]
  mesasLoading: boolean
  onOpenQuickRegister: () => void
  onSelectMesa: (mesa: Mesa) => void
  onSetPdvView: (view: OwnerPdvView) => void
  pdvView: OwnerPdvView
}>) {
  const kitchenQueue = (kitchenData?.statusCounts.queued ?? 0) + (kitchenData?.statusCounts.inPreparation ?? 0)
  const mesasEmAtendimento = useMemo(() => mesas.filter((mesa) => mesa.status !== 'livre').length, [mesas])
  const mesasLivres = useMemo(() => mesas.filter((mesa) => mesa.status === 'livre').length, [mesas])

  return (
    <>
      <OwnerPdvBanner errorMessage={errorMessage} isOffline={isOffline} />
      <OwnerPdvOverviewSurface
        kitchenQueue={kitchenQueue}
        mesasEmAtendimento={mesasEmAtendimento}
        mesasLivres={mesasLivres}
        pdvView={pdvView}
        onOpenQuickRegister={onOpenQuickRegister}
        onSetPdvView={onSetPdvView}
      />
      <OwnerPdvOverviewList
        errorMessage={errorMessage}
        isOffline={isOffline}
        kitchenData={kitchenData}
        kitchenLoading={kitchenLoading}
        mesas={mesas}
        mesasLoading={mesasLoading}
        pdvView={pdvView}
        onSelectMesa={onSelectMesa}
      />
    </>
  )
}

function OwnerPdvOverviewSurface({
  kitchenQueue,
  mesasEmAtendimento,
  mesasLivres,
  onOpenQuickRegister,
  onSetPdvView,
  pdvView,
}: Readonly<{
  kitchenQueue: number
  mesasEmAtendimento: number
  mesasLivres: number
  onOpenQuickRegister: () => void
  onSetPdvView: (view: OwnerPdvView) => void
  pdvView: OwnerPdvView
}>) {
  return (
    <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <OwnerPdvOverviewHeader onOpenQuickRegister={onOpenQuickRegister} />
      <OwnerPdvSummary kitchenQueue={kitchenQueue} mesasEmAtendimento={mesasEmAtendimento} mesasLivres={mesasLivres} />
      <OwnerPdvViewTabs pdvView={pdvView} onSetPdvView={onSetPdvView} />
    </section>
  )
}

function OwnerPdvOverviewList({
  errorMessage,
  isOffline,
  kitchenData,
  kitchenLoading,
  mesas,
  mesasLoading,
  onSelectMesa,
  pdvView,
}: Readonly<{
  errorMessage: string | null
  isOffline: boolean
  kitchenData: Awaited<ReturnType<typeof fetchOperationsKitchen>> | undefined
  kitchenLoading: boolean
  mesas: Mesa[]
  mesasLoading: boolean
  onSelectMesa: (mesa: Mesa) => void
  pdvView: OwnerPdvView
}>) {
  if (pdvView === 'cozinha') {
    return (
      <KitchenOrdersView
        data={kitchenData}
        errorMessage={errorMessage}
        isLoading={kitchenLoading}
        isOffline={isOffline}
        queryKey={OPERATIONS_KITCHEN_QUERY_KEY}
      />
    )
  }

  return (
    <MobileTableGrid
      errorMessage={errorMessage}
      isLoading={mesasLoading}
      isOffline={isOffline}
      mesas={mesas}
      onSelectMesa={onSelectMesa}
    />
  )
}

function OwnerPdvBuilder({
  errorMessage,
  isBusy,
  isOffline,
  onCancelBuilder,
  onOpenQuickRegister,
  onSubmit,
  pendingAction,
  products,
  productsErrorMessage,
  productsLoading,
}: Readonly<{
  errorMessage: string | null
  isBusy: boolean
  isOffline: boolean
  onCancelBuilder: () => void
  onOpenQuickRegister: () => void
  onSubmit: (items: ComandaItem[]) => Promise<void> | void
  pendingAction: PendingAction
  products: Awaited<ReturnType<typeof fetchProducts>>['items']
  productsErrorMessage: string | null
  productsLoading: boolean
}>) {
  const mesaLabel =
    pendingAction.type === 'new' ? normalizeTableLabel(pendingAction.mesa.numero) : pendingAction.mesaLabel
  const mode = pendingAction.type === 'add' ? 'add' : 'new'

  return (
    <>
      <OwnerPdvBanner errorMessage={errorMessage} isOffline={isOffline} />
      <MobileOrderBuilder
        busy={isBusy}
        errorMessage={productsErrorMessage}
        isLoading={productsLoading}
        isOffline={isOffline}
        mesaLabel={mesaLabel}
        mode={mode}
        produtos={products}
        secondaryAction={{ label: 'Cadastro rápido', onClick: onOpenQuickRegister }}
        summaryItems={[
          { label: 'Mesa', value: mesaLabel, tone: '#008cff' },
          { label: 'Modo', value: mode === 'add' ? 'Adicionar' : 'Nova', tone: '#36f57c' },
          { label: 'Fluxo', value: 'Ao vivo', tone: '#eab308' },
        ]}
        onCancel={onCancelBuilder}
        onSubmit={onSubmit}
      />
    </>
  )
}

type OwnerPdvTabProps = Readonly<{
  errorMessage: string | null
  isBusy: boolean
  isOffline: boolean
  kitchenData: Awaited<ReturnType<typeof fetchOperationsKitchen>> | undefined
  kitchenLoading: boolean
  mesas: Mesa[]
  mesasLoading: boolean
  onCancelBuilder: () => void
  onOpenQuickRegister: () => void
  onSelectMesa: (mesa: Mesa) => void
  onSetPdvView: (view: OwnerPdvView) => void
  onSubmit: (items: ComandaItem[]) => Promise<void> | void
  pdvView: OwnerPdvView
  pendingAction: PendingAction | null
  products: Awaited<ReturnType<typeof fetchProducts>>['items']
  productsErrorMessage: string | null
  productsLoading: boolean
}>

export function OwnerPdvTab(props: OwnerPdvTabProps) {
  return (
    <div className="space-y-4 p-3 pb-6">
      {props.pendingAction ? (
        <OwnerPdvBuilder
          errorMessage={props.errorMessage}
          isBusy={props.isBusy}
          isOffline={props.isOffline}
          pendingAction={props.pendingAction}
          products={props.products}
          productsErrorMessage={props.productsErrorMessage}
          productsLoading={props.productsLoading}
          onCancelBuilder={props.onCancelBuilder}
          onOpenQuickRegister={props.onOpenQuickRegister}
          onSubmit={props.onSubmit}
        />
      ) : (
        <OwnerPdvOverview
          errorMessage={props.errorMessage}
          isOffline={props.isOffline}
          kitchenData={props.kitchenData}
          kitchenLoading={props.kitchenLoading}
          mesas={props.mesas}
          mesasLoading={props.mesasLoading}
          pdvView={props.pdvView}
          onOpenQuickRegister={props.onOpenQuickRegister}
          onSelectMesa={props.onSelectMesa}
          onSetPdvView={props.onSetPdvView}
        />
      )}
    </div>
  )
}
