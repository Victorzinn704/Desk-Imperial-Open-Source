import { ChevronRight } from 'lucide-react'
import type { ComandaStatus } from '@/components/pdv/pdv-types'
import type { StatusConfig } from './mobile-comanda-list.types'

export function MobileComandaStatusActions({
  config,
  comandaId,
  discountPercent,
  isBusy,
  onCloseComanda,
  onUpdateStatus,
  showDirectClose,
  surchargePercent,
}: Readonly<{
  config: StatusConfig
  comandaId: string
  discountPercent: number
  isBusy: boolean
  onCloseComanda?: (id: string, discountPercent: number, surchargePercent: number) => Promise<void> | void
  onUpdateStatus: (id: string, status: ComandaStatus) => Promise<void> | void
  showDirectClose: boolean
  surchargePercent: number
}>) {
  return (
    <div className="flex flex-col gap-2.5">
      {config.nextStatus ? (
        <AdvanceStatusButton
          comandaId={comandaId}
          config={config}
          discountPercent={discountPercent}
          isBusy={isBusy}
          surchargePercent={surchargePercent}
          onCloseComanda={onCloseComanda}
          onUpdateStatus={onUpdateStatus}
        />
      ) : null}
      {showDirectClose ? (
        <DirectCloseButton
          comandaId={comandaId}
          discountPercent={discountPercent}
          isBusy={isBusy}
          surchargePercent={surchargePercent}
          onCloseComanda={onCloseComanda}
          onUpdateStatus={onUpdateStatus}
        />
      ) : null}
    </div>
  )
}

function AdvanceStatusButton({
  comandaId,
  config,
  discountPercent,
  isBusy,
  onCloseComanda,
  onUpdateStatus,
  surchargePercent,
}: Readonly<{
  comandaId: string
  config: StatusConfig
  discountPercent: number
  isBusy: boolean
  onCloseComanda?: (id: string, discountPercent: number, surchargePercent: number) => Promise<void> | void
  onUpdateStatus: (id: string, status: ComandaStatus) => Promise<void> | void
  surchargePercent: number
}>) {
  return (
    <button
      className="flex w-full items-center justify-center gap-2 rounded-[14px] py-3.5 text-sm font-bold text-[var(--text-primary)] shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
      disabled={isBusy}
      style={{
        backgroundColor: config.nextBg,
        border: `1px solid ${config.chipColor}44`,
      }}
      type="button"
      onClick={() =>
        handleAdvanceStatus({ comandaId, config, discountPercent, onCloseComanda, onUpdateStatus, surchargePercent })
      }
    >
      {config.nextLabel}
      <ChevronRight className="size-4 opacity-70" />
    </button>
  )
}

function DirectCloseButton({
  comandaId,
  discountPercent,
  isBusy,
  onCloseComanda,
  onUpdateStatus,
  surchargePercent,
}: Readonly<{
  comandaId: string
  discountPercent: number
  isBusy: boolean
  onCloseComanda?: (id: string, discountPercent: number, surchargePercent: number) => Promise<void> | void
  onUpdateStatus: (id: string, status: ComandaStatus) => Promise<void> | void
  surchargePercent: number
}>) {
  return (
    <button
      className="w-full rounded-[14px] bg-[var(--accent)] px-4 py-3 text-sm font-bold text-[var(--on-accent)] transition-all active:scale-[0.98] disabled:opacity-50"
      disabled={isBusy}
      type="button"
      onClick={() =>
        handleDirectClose({ comandaId, discountPercent, onCloseComanda, onUpdateStatus, surchargePercent })
      }
    >
      {onCloseComanda ? 'Fechar' : 'Pagar'}
    </button>
  )
}

function handleAdvanceStatus({
  comandaId,
  config,
  discountPercent,
  onCloseComanda,
  onUpdateStatus,
  surchargePercent,
}: Readonly<{
  comandaId: string
  config: StatusConfig
  discountPercent: number
  onCloseComanda?: (id: string, discountPercent: number, surchargePercent: number) => Promise<void> | void
  onUpdateStatus: (id: string, status: ComandaStatus) => Promise<void> | void
  surchargePercent: number
}>) {
  const nextStatus = config.nextStatus
  if (!nextStatus) {
    return
  }

  if (nextStatus === 'fechada' && onCloseComanda) {
    void onCloseComanda(comandaId, discountPercent, surchargePercent)
    return
  }

  void onUpdateStatus(comandaId, nextStatus)
}

function handleDirectClose({
  comandaId,
  discountPercent,
  onCloseComanda,
  onUpdateStatus,
  surchargePercent,
}: Readonly<{
  comandaId: string
  discountPercent: number
  onCloseComanda?: (id: string, discountPercent: number, surchargePercent: number) => Promise<void> | void
  onUpdateStatus: (id: string, status: ComandaStatus) => Promise<void> | void
  surchargePercent: number
}>) {
  if (onCloseComanda) {
    void onCloseComanda(comandaId, discountPercent, surchargePercent)
    return
  }

  void onUpdateStatus(comandaId, 'fechada')
}
