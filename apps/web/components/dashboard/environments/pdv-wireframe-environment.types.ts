import type { OperationsKitchenItemRecord } from '@contracts/contracts'
import type { AuthUser } from '@/lib/api'
import type { PdvMesaIntent } from '@/components/pdv/pdv-navigation-intent'
import type { formatCurrency } from '@/lib/currency'

export type PdvVariant = 'grid' | 'comandas' | 'kds' | 'cobranca'
export type PdvComandaGroupId = 'todas' | 'mesa' | 'balcao' | 'delivery'

export type PdvWireframeEnvironmentProps = {
  mesaIntent?: PdvMesaIntent | null
  user: AuthUser
  variant?: PdvVariant
}

export type ProductCardRecord = {
  id: string
  name: string
  category: string
  unitPrice: number
  active?: boolean
}

export type KitchenTicket = {
  id: string
  code: string
  mesaLabel: string
  employeeName: string
  elapsedMinutes: number
  items: OperationsKitchenItemRecord[]
  status: 'queued' | 'in_preparation' | 'ready'
  sortTotal: number
}

export type ComandaCurrency = Parameters<typeof formatCurrency>[1]

export type PdvCategoryOption = {
  id: string
  label: string
  count: number
}

export type PdvComandaGroupOption = {
  id: PdvComandaGroupId
  label: string
  count: number
}
