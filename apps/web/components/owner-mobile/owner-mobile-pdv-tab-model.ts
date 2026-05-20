'use client'

import { normalizeTableLabel } from '@/components/pdv/normalize-table-label'
import type { ComandaItem, Mesa } from '@/components/pdv/pdv-types'
import type { fetchOperationsKitchen, fetchProducts } from '@/lib/api'
import type { OwnerPdvView, PendingAction } from './owner-mobile-shell-types'

export type OwnerPdvTabProps = Readonly<{
  errorMessage: string | null
  isBusy: boolean
  isOffline: boolean
  kitchenData: Awaited<ReturnType<typeof fetchOperationsKitchen>> | undefined
  kitchenLoading: boolean
  mesas: Mesa[]
  mesasLoading: boolean
  onCancelBuilder: () => void
  onOpenQuickRegister: () => void
  onSelectMesa: (mesa: Mesa) => void
  onSetPdvView: (view: OwnerPdvView) => void
  onSubmit: (items: ComandaItem[]) => Promise<void> | void
  pdvView: OwnerPdvView
  pendingAction: PendingAction | null
  products: Awaited<ReturnType<typeof fetchProducts>>['items']
  productsErrorMessage: string | null
  productsLoading: boolean
}>

export function buildOwnerPdvOverviewMetrics(
  kitchenData: Awaited<ReturnType<typeof fetchOperationsKitchen>> | undefined,
  mesas: Mesa[],
) {
  const kitchenQueue = (kitchenData?.statusCounts.queued ?? 0) + (kitchenData?.statusCounts.inPreparation ?? 0)
  const mesasEmAtendimento = mesas.filter((mesa) => mesa.status !== 'livre').length
  const mesasLivres = mesas.filter((mesa) => mesa.status === 'livre').length

  return {
    kitchenQueue,
    mesasEmAtendimento,
    mesasLivres,
  }
}

export function buildOwnerPdvBuilderContext(pendingAction: PendingAction) {
  return {
    mesaLabel: pendingAction.type === 'new' ? normalizeTableLabel(pendingAction.mesa.numero) : pendingAction.mesaLabel,
    mode: pendingAction.type === 'edit' ? 'edit' : pendingAction.type === 'add' ? 'add' : 'new',
    initialItems: pendingAction.type === 'edit' ? pendingAction.comanda.itens : undefined,
  } as const
}
