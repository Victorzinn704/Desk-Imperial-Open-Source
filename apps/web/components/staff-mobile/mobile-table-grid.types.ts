import type { Mesa } from '@/components/pdv/pdv-types'

export interface MobileTableGridProps {
  mesas: Mesa[]
  onSelectMesa: (mesa: Mesa) => void
  currentEmployeeId?: string | null
  isLoading?: boolean
  isOffline?: boolean
  errorMessage?: string | null
}
