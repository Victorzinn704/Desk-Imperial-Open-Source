import type { Comanda, Mesa } from '@/components/pdv/pdv-types'

export type StaffMobileTab = 'mesas' | 'cozinha' | 'pedido' | 'pedidos' | 'historico'

export type PendingAction =
  | { type: 'new'; mesa: Mesa }
  | { type: 'add'; comandaId: string; mesaLabel: string }
  | { type: 'edit'; comandaId: string; mesaLabel: string; comanda: Comanda }

export type StaffMobileCurrentUser = {
  name?: string
  fullName?: string
  employeeId?: string | null
} | null

export interface StaffMobileShellProps {
  currentUser: StaffMobileCurrentUser
}

export type StaffMobileShellQueryScope = Readonly<{
  activeTab: StaffMobileTab
  pendingAction: PendingAction | null
}>
