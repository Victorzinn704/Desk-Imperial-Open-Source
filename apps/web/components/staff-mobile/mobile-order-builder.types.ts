import type { ReactNode } from 'react'
import type { ComandaItem } from '@/components/pdv/pdv-types'
import type { ProductRecord } from '@contracts/contracts'

export interface MobileOrderBuilderProps {
  mesaLabel: string
  mode: 'new' | 'add' | 'edit'
  busy?: boolean
  checkoutDockOffset?: 'navigation' | 'screen'
  isLoading?: boolean
  isOffline?: boolean
  errorMessage?: string | null
  initialItems?: ComandaItem[]
  produtos: ProductRecord[]
  onSubmit: (items: ComandaItem[]) => Promise<void> | void
  onCancel: () => void
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  summaryItems?: MobileOrderSummaryItem[]
}

export interface MobileOrderSummaryItem {
  label: string
  value: ReactNode
  tone?: string
}

export type CartEntry = ComandaItem & { _key: string }
