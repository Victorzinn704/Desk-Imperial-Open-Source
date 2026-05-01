'use client'

import { OwnerComandaCard } from './owner-comanda-card'
import {
  OwnerComandasEmptyState,
  OwnerComandasFilterBar,
  OwnerComandasHero,
  OwnerComandasList,
  OwnerComandasResponsibleFilters,
  OwnerComandasStatusBanner,
} from './owner-comandas-view-sections'
import { type OwnerComandasViewProps, useOwnerComandasController } from './owner-comandas-view-model'

export function OwnerComandasView({
  comandas,
  errorMessage = null,
  focusedId,
  isBusy = false,
  isLoading = false,
  isOffline = false,
  onAddItems,
  onCloseComanda,
  onCreatePayment,
}: OwnerComandasViewProps) {
  const controller = useOwnerComandasController(comandas, focusedId)

  return (
    <OwnerComandasViewLayout
      controller={controller}
      errorMessage={errorMessage}
      focusedId={focusedId}
      isBusy={isBusy}
      isLoading={isLoading}
      isOffline={isOffline}
      onAddItems={onAddItems}
      onCloseComanda={onCloseComanda}
      onCreatePayment={onCreatePayment}
    />
  )
}

function OwnerComandasViewLayout({
  controller,
  errorMessage,
  focusedId,
  isBusy,
  isLoading,
  isOffline,
  onAddItems,
  onCloseComanda,
  onCreatePayment,
}: {
  controller: ReturnType<typeof useOwnerComandasController>
  errorMessage: string | null
  focusedId: string | null | undefined
  isBusy: boolean
  isLoading: boolean
  isOffline: boolean
  onAddItems: OwnerComandasViewProps['onAddItems']
  onCloseComanda: OwnerComandasViewProps['onCloseComanda']
  onCreatePayment: OwnerComandasViewProps['onCreatePayment']
}) {
  return (
    <div className="p-3 sm:p-4">
      <OwnerComandasViewHeader controller={controller} errorMessage={errorMessage} isOffline={isOffline} />
      <OwnerComandasViewContent
        controller={controller}
        errorMessage={errorMessage}
        focusedId={focusedId}
        isBusy={isBusy}
        isLoading={isLoading}
        isOffline={isOffline}
        onAddItems={onAddItems}
        onCloseComanda={onCloseComanda}
        onCreatePayment={onCreatePayment}
      />
    </div>
  )
}

function OwnerComandasViewHeader({
  controller,
  errorMessage,
  isOffline,
}: {
  controller: ReturnType<typeof useOwnerComandasController>
  errorMessage: string | null
  isOffline: boolean
}) {
  return (
    <>
      <OwnerComandasStatusBanner errorMessage={errorMessage} isOffline={isOffline} />
      <OwnerComandasHero
        countAbertas={controller.countAbertas}
        countFechadas={controller.countFechadas}
        countProntas={controller.countProntas}
        selectedResponsibleLabel={controller.selectedResponsibleLabel}
        ultimaComanda={controller.ultimaComanda}
        valorEmAberto={controller.valorEmAberto}
      />
      <OwnerComandasFilterBar
        countAbertas={controller.countAbertas}
        countFechadas={controller.countFechadas}
        filtro={controller.filtro}
        scopedCount={controller.scopedByResponsible.length}
        setFiltro={controller.setFiltro}
      />
      <OwnerComandasResponsibleFilters
        responsibleFilter={controller.responsibleFilter}
        responsibleOptions={controller.responsibleOptions}
        setResponsibleFilter={controller.setResponsibleFilter}
      />
    </>
  )
}

function OwnerComandasViewContent({
  controller,
  errorMessage,
  focusedId,
  isBusy,
  isLoading,
  isOffline,
  onAddItems,
  onCloseComanda,
  onCreatePayment,
}: {
  controller: ReturnType<typeof useOwnerComandasController>
  errorMessage: string | null
  focusedId: string | null | undefined
  isBusy: boolean
  isLoading: boolean
  isOffline: boolean
  onAddItems: OwnerComandasViewProps['onAddItems']
  onCloseComanda: OwnerComandasViewProps['onCloseComanda']
  onCreatePayment: OwnerComandasViewProps['onCreatePayment']
}) {
  return (
    <OwnerComandasList
      cards={controller.sorted.map((comanda) => (
        <OwnerComandaCard
          comanda={comanda}
          defaultOpen={comanda.id === focusedId}
          isBusy={isBusy}
          key={`${comanda.id}-${comanda.id === focusedId ? 'focused' : 'idle'}`}
          onAddItems={onAddItems}
          onCloseComanda={onCloseComanda}
          onCreatePayment={onCreatePayment}
        />
      ))}
      emptyState={
        <OwnerComandasEmptyState
          errorMessage={errorMessage}
          filtro={controller.filtro}
          isLoading={isLoading}
          isOffline={isOffline}
        />
      }
    />
  )
}
