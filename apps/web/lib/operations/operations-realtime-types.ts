import type { OperationsKitchenItemRecord } from '@contracts/contracts'

export type OperationsKitchenSnapshot = {
  businessDate: string
  companyOwnerId: string
  items: OperationsKitchenItemRecord[]
  statusCounts: {
    queued: number
    inPreparation: number
    ready: number
  }
}
