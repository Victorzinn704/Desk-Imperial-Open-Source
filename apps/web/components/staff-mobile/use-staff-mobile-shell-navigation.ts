'use client'

import { useCallback } from 'react'
import { type Comanda, type Mesa } from '@/components/pdv/pdv-types'
import { normalizeTableLabel } from '@/components/pdv/normalize-table-label'
import type { PendingAction, StaffMobileTab } from './staff-mobile-shell-types'

function resolveMesaLabel(pendingAction: PendingAction | null) {
  if (!pendingAction) {
    return '?'
  }

  return pendingAction.type === 'new' ? normalizeTableLabel(pendingAction.mesa.numero) : pendingAction.mesaLabel
}

function resolveOrderMode(pendingAction: PendingAction | null): 'new' | 'add' | 'edit' {
  if (pendingAction?.type === 'edit') {
    return 'edit'
  }

  if (pendingAction?.type === 'add') {
    return 'add'
  }

  return 'new'
}

function resolvePendingComanda(pendingAction: PendingAction | null, comandasById: Map<string, Comanda>) {
  if (!pendingAction || pendingAction.type === 'new') {
    return null
  }

  if (pendingAction.type === 'edit') {
    return comandasById.get(pendingAction.comandaId) ?? pendingAction.comanda
  }

  return comandasById.get(pendingAction.comandaId) ?? null
}

function resolveResponsibleSummary(args: {
  currentEmployeeId: string | null
  pendingAction: PendingAction | null
  pendingComanda: Comanda | null
}) {
  if (!args.pendingAction || args.pendingAction.type === 'new') {
    return { label: 'Situação', tone: '#36f57c', value: 'Mesa livre' }
  }

  const isCurrentEmployee = args.pendingComanda?.garcomId === args.currentEmployeeId
  return {
    label: 'Responsável',
    tone: isCurrentEmployee ? '#c4b5fd' : '#f0f0f3',
    value: isCurrentEmployee ? 'Sua mesa' : (args.pendingComanda?.garcomNome ?? 'Sem responsável'),
  }
}

export function resolveBuilderContext(
  pendingAction: PendingAction | null,
  comandasById: Map<string, Comanda>,
  currentEmployeeId: string | null,
  kitchenBadge: number,
) {
  const mesaLabel = resolveMesaLabel(pendingAction)
  const orderMode = resolveOrderMode(pendingAction)
  const pendingComanda = resolvePendingComanda(pendingAction, comandasById)
  const responsibleSummary = resolveResponsibleSummary({
    currentEmployeeId,
    pendingAction,
    pendingComanda,
  })

  const summaryItems = pendingAction
    ? [
        { label: 'Mesa', value: mesaLabel, tone: '#008cff' },
        responsibleSummary,
        {
          label: 'Na cozinha',
          value: String(kitchenBadge),
          tone: kitchenBadge > 0 ? '#eab308' : '#36f57c',
        },
      ]
    : undefined

  return { mesaLabel, orderMode, pendingComanda, summaryItems }
}

export function useNavigationActions(setters: {
  setActiveTab: (tab: StaffMobileTab) => void
  setFocusedComandaId: (id: string | null) => void
  setPendingAction: (action: PendingAction | null) => void
}) {
  const handleSelectMesa = useCallback(
    (mesa: Mesa) => {
      if (mesa.status === 'ocupada' && mesa.comandaId) {
        setters.setPendingAction(null)
        setters.setFocusedComandaId(mesa.comandaId)
        setters.setActiveTab('pedidos')
        return
      }

      setters.setPendingAction({ type: 'new', mesa })
      setters.setFocusedComandaId(null)
      setters.setActiveTab('pedido')
    },
    [setters],
  )

  const handleAddItemsToComanda = useCallback(
    (comanda: Comanda) => {
      setters.setPendingAction({ type: 'edit', comandaId: comanda.id, mesaLabel: comanda.mesa ?? '?', comanda })
      setters.setActiveTab('pedido')
    },
    [setters],
  )

  const handleNewComanda = useCallback(() => {
    setters.setPendingAction(null)
    setters.setFocusedComandaId(null)
    setters.setActiveTab('mesas')
  }, [setters])

  return { handleAddItemsToComanda, handleNewComanda, handleSelectMesa }
}
