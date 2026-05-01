import type { OperationsKitchenResponse } from '@contracts/contracts'

export interface KitchenOrdersViewProps {
  data: OperationsKitchenResponse | undefined
  queryKey: readonly unknown[]
  isLoading?: boolean
  isOffline?: boolean
  errorMessage?: string | null
  currentEmployeeId?: string | null
}

export type KitchenTab = 'QUEUED' | 'IN_PREPARATION' | 'READY'
