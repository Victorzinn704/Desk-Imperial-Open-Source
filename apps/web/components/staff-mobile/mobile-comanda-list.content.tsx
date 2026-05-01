import { MobileComandaCard } from './mobile-comanda-card'
import { MobileComandaListBanner } from './mobile-comanda-list.empty-state'
import { MobileComandaListSummary } from './mobile-comanda-list.summary'
import type { MobileComandaListProps } from './mobile-comanda-list.types'
import type { useMobileComandaListController } from './use-mobile-comanda-list-controller'

export function MobileComandaListContent({
  currentEmployeeId,
  errorMessage,
  focusedId,
  isBusy,
  isOffline,
  onAddItems,
  onCancelComanda,
  onCloseComanda,
  onCreatePayment,
  onFocus,
  onNewComanda,
  onUpdateStatus,
  summary,
  controller,
}: Readonly<MobileComandaListContentProps>) {
  return (
    <div className="p-3 sm:p-4">
      <MobileComandaListBanner errorMessage={errorMessage ?? null} isOffline={isOffline ?? false} />
      <MobileComandaListSummary
        activeCount={controller.active.length}
        isBusy={isBusy ?? false}
        summary={summary}
        onNewComanda={onNewComanda}
      />
      <MobileComandaListItems
        controller={controller}
        currentEmployeeId={currentEmployeeId}
        focusedId={focusedId}
        isBusy={isBusy}
        onAddItems={onAddItems}
        onCancelComanda={onCancelComanda}
        onCloseComanda={onCloseComanda}
        onCreatePayment={onCreatePayment}
        onFocus={onFocus}
        onUpdateStatus={onUpdateStatus}
      />
    </div>
  )
}

type MobileComandaListContentProps = Pick<
  MobileComandaListProps,
  | 'currentEmployeeId'
  | 'errorMessage'
  | 'focusedId'
  | 'isBusy'
  | 'isOffline'
  | 'onAddItems'
  | 'onCancelComanda'
  | 'onCloseComanda'
  | 'onCreatePayment'
  | 'onFocus'
  | 'onNewComanda'
  | 'onUpdateStatus'
  | 'summary'
> & {
  controller: ReturnType<typeof useMobileComandaListController>
}

function MobileComandaListItems({
  controller,
  currentEmployeeId,
  focusedId,
  isBusy,
  onAddItems,
  onCancelComanda,
  onCloseComanda,
  onCreatePayment,
  onFocus,
  onUpdateStatus,
}: Readonly<
  Pick<
    MobileComandaListContentProps,
    | 'currentEmployeeId'
    | 'focusedId'
    | 'isBusy'
    | 'onAddItems'
    | 'onCancelComanda'
    | 'onCloseComanda'
    | 'onCreatePayment'
    | 'onFocus'
    | 'onUpdateStatus'
  > & { controller: ReturnType<typeof useMobileComandaListController> }
>) {
  return (
    <ul className="space-y-4">
      {controller.sorted.map((comanda) => (
        <MobileComandaCard
          comanda={comanda}
          currentEmployeeId={currentEmployeeId}
          isBusy={isBusy}
          isFocused={comanda.id === focusedId}
          key={comanda.id}
          ref={comanda.id === focusedId ? controller.focusedRef : undefined}
          onAddItems={onAddItems}
          onCancelComanda={onCancelComanda}
          onCloseComanda={onCloseComanda}
          onCreatePayment={onCreatePayment}
          onFocus={onFocus}
          onUpdateStatus={onUpdateStatus}
        />
      ))}
    </ul>
  )
}
