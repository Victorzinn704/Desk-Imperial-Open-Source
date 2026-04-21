import type { ComandaItem, Mesa } from '@/components/pdv/pdv-types'

export type OwnerMobileTab = 'today' | 'comandas' | 'pdv' | 'financeiro' | 'conta'
export type OwnerPdvView = 'mesas' | 'cozinha'

export type PendingAction = { type: 'new'; mesa: Mesa } | { type: 'add'; comandaId: string; mesaLabel: string }

export type OwnerCurrentUser = {
  name?: string
  fullName?: string
  companyName?: string | null
}

export type OwnerMobileShellProps = Readonly<{
  currentUser: OwnerCurrentUser | null
}>

export type OwnerSubmitComandaItems = (items: ComandaItem[]) => Promise<void> | void
