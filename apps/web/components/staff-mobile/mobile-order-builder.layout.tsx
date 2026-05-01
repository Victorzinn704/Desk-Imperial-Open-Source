'use client'

import { MobileOrderBuilderContent } from './mobile-order-builder.content'
import { MobileOrderCheckoutDock } from './mobile-order-builder.checkout-dock'
import { MobileOrderBuilderHeader } from './mobile-order-builder.header'
import type { MobileOrderBuilderProps } from './mobile-order-builder.types'
import type { MobileOrderBuilderController } from './use-mobile-order-builder-controller'

type MobileOrderBuilderLayoutProps = Readonly<
  Pick<
    MobileOrderBuilderProps,
    | 'busy'
    | 'checkoutDockOffset'
    | 'errorMessage'
    | 'isLoading'
    | 'isOffline'
    | 'mesaLabel'
    | 'mode'
    | 'onCancel'
    | 'secondaryAction'
    | 'summaryItems'
  > &
    MobileOrderBuilderController
>

function getSubmitLabel(mode: MobileOrderBuilderProps['mode']) {
  if (mode === 'edit') {
    return 'Salvar edição'
  }
  if (mode === 'add') {
    return 'Adicionar itens'
  }
  return 'Abrir comanda'
}

function MobileOrderBuilderHeaderSection({
  controller,
  mesaLabel,
  mode,
  onCancel,
  secondaryAction,
  summaryItems,
}: Readonly<{
  controller: MobileOrderBuilderController
  mesaLabel: string
  mode: MobileOrderBuilderProps['mode']
  onCancel: () => void
  secondaryAction?: MobileOrderBuilderProps['secondaryAction']
  summaryItems?: MobileOrderBuilderProps['summaryItems']
}>) {
  return (
    <MobileOrderBuilderHeader
      categories={controller.categories}
      headerLabel={`Mesa ${mesaLabel}`}
      mesaLabel={mesaLabel}
      mode={mode}
      search={controller.search}
      secondaryActionLabel={secondaryAction?.label}
      selectedCategory={controller.selectedCategory}
      summaryItems={summaryItems}
      onCancel={onCancel}
      onSearchChange={controller.handleSearchChange}
      onSecondaryAction={secondaryAction?.onClick}
      onSelectAll={controller.showAllProducts}
      onSelectCategory={controller.openCategory}
    />
  )
}

function MobileOrderBuilderContentSection({
  busy,
  controller,
  errorMessage,
  isLoading,
  isOffline,
}: Readonly<{
  busy?: boolean
  controller: MobileOrderBuilderController
  errorMessage?: string | null
  isLoading?: boolean
  isOffline?: boolean
}>) {
  return (
    <MobileOrderBuilderContent
      activeProdutos={controller.activeProdutos}
      addItem={controller.addItem}
      busy={busy}
      deferredSearch={controller.deferredSearch}
      errorMessage={errorMessage}
      filtered={controller.filtered}
      getQty={controller.getQty}
      isLoading={isLoading}
      isOffline={isOffline}
      removeItem={controller.removeItem}
      selectedCategory={controller.selectedCategory}
      totalItems={controller.totalItems}
      onShowAllProducts={controller.showAllProducts}
    />
  )
}

function MobileOrderBuilderCheckoutSection({
  busy,
  checkoutDockOffset,
  controller,
  mode,
  submitLabel,
}: Readonly<{
  busy?: boolean
  checkoutDockOffset?: MobileOrderBuilderProps['checkoutDockOffset']
  controller: MobileOrderBuilderController
  mode: MobileOrderBuilderProps['mode']
  submitLabel: string
}>) {
  return (
    <MobileOrderCheckoutDock
      busy={busy}
      dockOffset={checkoutDockOffset}
      mode={mode}
      submitLabel={submitLabel}
      totalItems={controller.totalItems}
      totalValue={controller.totalValue}
      onSubmit={() => void controller.handleSubmit()}
    />
  )
}

type MobileOrderBuilderSectionsProps = Readonly<{
  busy?: boolean
  checkoutDockOffset?: MobileOrderBuilderProps['checkoutDockOffset']
  controller: MobileOrderBuilderController
  errorMessage?: string | null
  isLoading?: boolean
  isOffline?: boolean
  mesaLabel: string
  mode: MobileOrderBuilderProps['mode']
  onCancel: () => void
  secondaryAction?: MobileOrderBuilderProps['secondaryAction']
  submitLabel: string
  summaryItems?: MobileOrderBuilderProps['summaryItems']
}>

function MobileOrderBuilderSections({
  busy,
  checkoutDockOffset,
  controller,
  errorMessage,
  isLoading,
  isOffline,
  mesaLabel,
  mode,
  onCancel,
  secondaryAction,
  submitLabel,
  summaryItems,
}: MobileOrderBuilderSectionsProps) {
  return (
    <>
      <MobileOrderBuilderHeaderSection
        controller={controller}
        mesaLabel={mesaLabel}
        mode={mode}
        secondaryAction={secondaryAction}
        summaryItems={summaryItems}
        onCancel={onCancel}
      />
      <MobileOrderBuilderContentSection
        busy={busy}
        controller={controller}
        errorMessage={errorMessage}
        isLoading={isLoading}
        isOffline={isOffline}
      />
      <MobileOrderBuilderCheckoutSection
        busy={busy}
        checkoutDockOffset={checkoutDockOffset}
        controller={controller}
        mode={mode}
        submitLabel={submitLabel}
      />
    </>
  )
}

export function MobileOrderBuilderLayout({
  checkoutDockOffset,
  busy,
  errorMessage,
  isLoading,
  isOffline,
  mesaLabel,
  mode,
  onCancel,
  secondaryAction,
  summaryItems,
  ...controller
}: MobileOrderBuilderLayoutProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--surface)]">
      <MobileOrderBuilderSections
        busy={busy}
        checkoutDockOffset={checkoutDockOffset}
        controller={controller}
        errorMessage={errorMessage}
        isLoading={isLoading}
        isOffline={isOffline}
        mesaLabel={mesaLabel}
        mode={mode}
        secondaryAction={secondaryAction}
        submitLabel={getSubmitLabel(mode)}
        summaryItems={summaryItems}
        onCancel={onCancel}
      />
    </div>
  )
}
