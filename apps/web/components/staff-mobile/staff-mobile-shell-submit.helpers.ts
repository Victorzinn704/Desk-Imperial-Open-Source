'use client'

import { toast } from 'sonner'
import { type QueryClient } from '@tanstack/react-query'
import { haptic } from '@/components/shared/haptic'
import { calcSubtotal, type ComandaItem } from '@/components/pdv/pdv-types'
import { normalizeTableLabel } from '@/components/pdv/normalize-table-label'
import { ApiError, openCashSession } from '@/lib/api'
import type { CreateComandaPaymentPayload, OpenComandaPayload } from '@/lib/api-operations'
import { OPERATIONS_LIVE_QUERY_PREFIX, scheduleOperationsWorkspaceReconcile } from '@/lib/operations'
import { isCashSessionRequiredError } from '@/lib/operations/operations-error-utils'
import type { useStaffMobileShellMutations } from './use-staff-mobile-shell-mutations'
import type { PendingAction, StaffMobileTab } from './staff-mobile-shell-types'

export function toApiItemPayload(item: ComandaItem) {
  const isManual = item.produtoId.startsWith('manual-')
  return {
    notes: item.observacao,
    productId: isManual ? undefined : item.produtoId,
    productName: isManual ? item.nome : undefined,
    quantity: item.quantidade,
    unitPrice: item.precoUnitario,
  }
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof ApiError && error.status === 0) {
    return true
  }

  return error instanceof Error && error.message.toLowerCase().includes('fetch')
}

export async function enqueueOfflineItems(
  pendingAction: PendingAction,
  items: ComandaItem[],
  enqueue: (action: { type: string; payload: unknown }) => Promise<string>,
  setPendingAction: (action: PendingAction | null) => void,
  setActiveTab: (tab: StaffMobileTab) => void,
) {
  if (pendingAction.type === 'add') {
    for (const item of items) {
      await enqueue({
        type: 'add-item',
        payload: { comandaId: pendingAction.comandaId, payload: toApiItemPayload(item) },
      })
    }
  } else if (pendingAction.type === 'new') {
    await enqueue({
      type: 'open-comanda',
      payload: {
        items: items.map(toApiItemPayload),
        mesaId: pendingAction.mesa.id,
        tableLabel: pendingAction.mesa.numero,
      },
    })
  }

  toast.info('Sem conexão — pedido salvo. Será enviado ao reconectar.')
  haptic.medium()
  setPendingAction(null)
  setActiveTab('mesas')
}

export async function submitEditComanda(
  action: Extract<PendingAction, { type: 'edit' }>,
  items: ComandaItem[],
  mutateAsync: ReturnType<typeof useStaffMobileShellMutations>['replaceComandaMutation']['mutateAsync'],
) {
  return mutateAsync({
    comandaId: action.comandaId,
    payload: {
      customerDocument: action.comanda.clienteDocumento,
      customerName: action.comanda.clienteNome,
      items: items.map(toApiItemPayload),
      notes: action.comanda.notes,
      participantCount: action.comanda.participantCount,
      tableLabel: action.mesaLabel,
    },
  })
}

export async function submitAddItems(
  comandaId: string,
  items: ComandaItem[],
  mutateAsync: ReturnType<typeof useStaffMobileShellMutations>['addComandaItemsMutation']['mutateAsync'],
) {
  return mutateAsync({
    comandaId,
    items: items.map(toApiItemPayload),
  })
}

export async function submitNewComanda(args: {
  items: ComandaItem[]
  mesa: Extract<PendingAction, { type: 'new' }>['mesa']
  mutateAsync: ReturnType<typeof useStaffMobileShellMutations>['openComandaMutation']['mutateAsync']
  queryClient: QueryClient
}) {
  const payload: OpenComandaPayload = {
    items: args.items.map(toApiItemPayload),
    mesaId: args.mesa.id,
    tableLabel: normalizeTableLabel(args.mesa.numero),
  }

  try {
    await args.mutateAsync(payload)
    return
  } catch (error) {
    if (!isCashSessionRequiredError(error)) {
      throw error
    }
  }

  toast.dismiss()
  toast.info('Abrindo caixa automaticamente...')
  await openCashSession({ openingCashAmount: 0 }, { includeSnapshot: false })
  scheduleOperationsWorkspaceReconcile(args.queryClient, OPERATIONS_LIVE_QUERY_PREFIX, { includeSummary: true })
  await args.mutateAsync(payload)
}

export async function closeComandaWithDiscount(args: {
  comanda: Parameters<typeof calcSubtotal>[0]
  comandaId: string
  discountPercent: number
  mutateAsync: ReturnType<typeof useStaffMobileShellMutations>['closeComandaMutation']['mutateAsync']
  surchargePercent: number
}) {
  const subtotal = calcSubtotal(args.comanda)
  const discountAmount = Math.round(subtotal * args.discountPercent) / 100
  const serviceFeeAmount = Math.round(subtotal * args.surchargePercent) / 100
  await args.mutateAsync({ comandaId: args.comandaId, discountAmount, serviceFeeAmount })
}

export type CreatePaymentMethod = CreateComandaPaymentPayload['method']
