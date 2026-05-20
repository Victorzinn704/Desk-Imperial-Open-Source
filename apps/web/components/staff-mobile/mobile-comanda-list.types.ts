import type { Comanda, ComandaStatus } from '@/components/pdv/pdv-types'

export type PaymentMethod = 'PIX' | 'CREDIT' | 'DEBIT' | 'CASH' | 'VOUCHER' | 'OTHER'

export interface MobileComandaListProps {
  comandas: Comanda[]
  currentEmployeeId?: string | null
  onUpdateStatus: (id: string, status: ComandaStatus) => Promise<void> | void
  onAddItems?: (comanda: Comanda) => void
  onNewComanda?: () => void
  onCancelComanda?: (id: string) => Promise<void> | void
  onCloseComanda?: (id: string, discountPercent: number, surchargePercent: number) => Promise<void> | void
  onCreatePayment?: (id: string, amount: number, method: PaymentMethod) => Promise<void> | void
  focusedId?: string | null
  onFocus?: (id: string | null) => void
  isLoading?: boolean
  isOffline?: boolean
  errorMessage?: string | null
  isBusy?: boolean
  summary?: {
    activeCount: number
    preparingCount: number
    readyCount: number
  }
}

export interface MobileComandaCardProps {
  comanda: Comanda
  currentEmployeeId?: string | null
  isFocused: boolean
  onUpdateStatus: (id: string, status: ComandaStatus) => Promise<void> | void
  onAddItems?: (comanda: Comanda) => void
  onCancelComanda?: (id: string) => Promise<void> | void
  onCloseComanda?: (id: string, discountPercent: number, surchargePercent: number) => Promise<void> | void
  onCreatePayment?: (id: string, amount: number, method: PaymentMethod) => Promise<void> | void
  onFocus?: (id: string | null) => void
  isBusy?: boolean
}

export type StatusConfig = {
  label: string
  chipColor: string
  chipBg: string
  nextStatus: ComandaStatus | null
  nextLabel: string | null
  nextBg: string
}

export type MobileComandaListContentState = 'loading' | 'error' | 'offline' | 'empty' | 'items'
