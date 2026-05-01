'use client'

import { MobileComandaListContent } from './mobile-comanda-list.content'
import { MobileComandaListEmptyState } from './mobile-comanda-list.empty-state'
import { resolveMobileComandaListContentState } from './mobile-comanda-list.helpers'
import type { MobileComandaListProps } from './mobile-comanda-list.types'
import { useMobileComandaListController } from './use-mobile-comanda-list-controller'

// eslint-disable-next-line max-lines-per-function
export function MobileComandaList({
  comandas,
  currentEmployeeId = null,
  onUpdateStatus,
  onAddItems,
  onNewComanda,
  onCancelComanda,
  onCloseComanda,
  onCreatePayment,
  focusedId,
  onFocus,
  isLoading = false,
  isOffline = false,
  errorMessage = null,
  isBusy = false,
  summary,
}: MobileComandaListProps) {
  const controller = useMobileComandaListController({ comandas, focusedId })
  const contentState = resolveMobileComandaListContentState({
    count: controller.active.length,
    errorMessage,
    isLoading,
    isOffline,
  })

  if (contentState !== 'items') {
    return (
      <MobileComandaListEmptyState
        errorMessage={contentState === 'loading' ? null : errorMessage}
        isBusy={isBusy}
        isLoading={contentState === 'loading'}
        isOffline={contentState === 'offline'}
        onNewComanda={onNewComanda}
      />
    )
  }

  return (
    <MobileComandaListContent
      controller={controller}
      currentEmployeeId={currentEmployeeId}
      errorMessage={errorMessage}
      focusedId={focusedId}
      isBusy={isBusy}
      isOffline={isOffline}
      summary={summary}
      onAddItems={onAddItems}
      onCancelComanda={onCancelComanda}
      onCloseComanda={onCloseComanda}
      onCreatePayment={onCreatePayment}
      onFocus={onFocus}
      onNewComanda={onNewComanda}
      onUpdateStatus={onUpdateStatus}
    />
  )
}
