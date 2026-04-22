'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import { MobileTableGrid } from '../staff-mobile/mobile-table-grid'
import { OwnerPdvBanner, OwnerPdvOverviewHeader, OwnerPdvSummary, OwnerPdvViewTabs } from './owner-mobile-pdv-chrome'
import {
  buildOwnerPdvBuilderContext,
  buildOwnerPdvOverviewMetrics,
  type OwnerPdvTabProps,
} from './owner-mobile-pdv-tab-model'
import { OPERATIONS_KITCHEN_QUERY_KEY } from '@/lib/operations'

const KitchenOrdersView = dynamic(
  () => import('../staff-mobile/kitchen-orders-view').then((mod) => mod.KitchenOrdersView),
  { ssr: false },
)
const MobileOrderBuilder = dynamic(
  () => import('../staff-mobile/mobile-order-builder').then((mod) => mod.MobileOrderBuilder),
  { ssr: false },
)

type OwnerPdvBuilderProps = Pick<
  OwnerPdvTabProps,
  | 'errorMessage'
  | 'isBusy'
  | 'isOffline'
  | 'onCancelBuilder'
  | 'onOpenQuickRegister'
  | 'onSubmit'
  | 'products'
  | 'productsErrorMessage'
  | 'productsLoading'
> & {
  pendingAction: NonNullable<OwnerPdvTabProps['pendingAction']>
}

export function OwnerPdvOverview({
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
}: Pick<
  OwnerPdvTabProps,
  | 'errorMessage'
  | 'isOffline'
  | 'kitchenData'
  | 'kitchenLoading'
  | 'mesas'
  | 'mesasLoading'
  | 'onOpenQuickRegister'
  | 'onSelectMesa'
  | 'onSetPdvView'
  | 'pdvView'
>) {
  const metrics = useMemo(() => buildOwnerPdvOverviewMetrics(kitchenData, mesas), [kitchenData, mesas])

  return (
    <>
      <OwnerPdvBanner errorMessage={errorMessage} isOffline={isOffline} />
      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <OwnerPdvOverviewHeader onOpenQuickRegister={onOpenQuickRegister} />
        <OwnerPdvSummary
          kitchenQueue={metrics.kitchenQueue}
          mesasEmAtendimento={metrics.mesasEmAtendimento}
          mesasLivres={metrics.mesasLivres}
        />
        <OwnerPdvViewTabs pdvView={pdvView} onSetPdvView={onSetPdvView} />
      </section>
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

function OwnerPdvOverviewList({
  errorMessage,
  isOffline,
  kitchenData,
  kitchenLoading,
  mesas,
  mesasLoading,
  onSelectMesa,
  pdvView,
}: Pick<
  OwnerPdvTabProps,
  | 'errorMessage'
  | 'isOffline'
  | 'kitchenData'
  | 'kitchenLoading'
  | 'mesas'
  | 'mesasLoading'
  | 'onSelectMesa'
  | 'pdvView'
>) {
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

export function OwnerPdvBuilder({
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
}: OwnerPdvBuilderProps) {
  const builder = buildOwnerPdvBuilderContext(pendingAction)

  return (
    <>
      <OwnerPdvBanner errorMessage={errorMessage} isOffline={isOffline} />
      <MobileOrderBuilder
        busy={isBusy}
        errorMessage={productsErrorMessage}
        isLoading={productsLoading}
        isOffline={isOffline}
        mesaLabel={builder.mesaLabel}
        mode={builder.mode}
        produtos={products}
        secondaryAction={{ label: 'Cadastro rápido', onClick: onOpenQuickRegister }}
        summaryItems={[
          { label: 'Mesa', value: builder.mesaLabel, tone: '#008cff' },
          { label: 'Modo', value: builder.mode === 'add' ? 'Adicionar' : 'Nova', tone: '#36f57c' },
          { label: 'Fluxo', value: 'Ao vivo', tone: '#eab308' },
        ]}
        onCancel={onCancelBuilder}
        onSubmit={onSubmit}
      />
    </>
  )
}
