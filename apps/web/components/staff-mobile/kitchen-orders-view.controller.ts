'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDeferredValue, useMemo, useState } from 'react'
import type { OperationsKitchenResponse } from '@contracts/contracts'
import { updateKitchenItemStatus } from '@/lib/api'
import { useLowPerformanceMode } from '@/hooks/use-performance'
import { buildKitchenSnapshot, buildStatusCounts } from './kitchen-orders-view.helpers'
import type { KitchenOrdersViewProps, KitchenTab } from './kitchen-orders-view.types'

export function useKitchenOrdersController({
  currentEmployeeId = null,
  data,
  queryKey,
}: Pick<KitchenOrdersViewProps, 'currentEmployeeId' | 'data' | 'queryKey'>) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<KitchenTab>('QUEUED')
  const [error, setError] = useState<string | null>(null)
  const isLowPerformance = useLowPerformanceMode()
  const deferredData = useDeferredValue(data)
  const snapshotData = isLowPerformance ? deferredData : data
  const allItems = useMemo(() => snapshotData?.items ?? [], [snapshotData])
  const tabItems = useMemo(() => allItems.filter((item) => item.kitchenStatus === activeTab), [activeTab, allItems])
  const snapshot = useMemo(() => buildKitchenSnapshot(allItems, currentEmployeeId), [allItems, currentEmployeeId])
  const advanceMutation = useKitchenAdvanceMutation({ queryClient, queryKey, setError })

  return {
    activeTab,
    allItems,
    counts: snapshot.counts,
    error,
    hasItems: allItems.length > 0,
    setActiveTab,
    setError,
    snapshot,
    tabItems,
    onAdvance: (itemId: string, status: 'IN_PREPARATION' | 'READY' | 'DELIVERED') =>
      advanceMutation.mutate({ itemId, status }),
    isPending: advanceMutation.isPending,
  }
}

function useKitchenAdvanceMutation({
  queryClient,
  queryKey,
  setError,
}: Readonly<{
  queryClient: ReturnType<typeof useQueryClient>
  queryKey: readonly unknown[]
  setError: (value: string | null) => void
}>) {
  return useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: 'IN_PREPARATION' | 'READY' | 'DELIVERED' }) =>
      updateKitchenItemStatus(itemId, status),
    onMutate: async ({ itemId, status }) => {
      await queryClient.cancelQueries({ queryKey })
      const snapshotBefore = queryClient.getQueryData<OperationsKitchenResponse>(queryKey)

      if (snapshotBefore) {
        const nextItems = snapshotBefore.items.flatMap((item) => buildOptimisticKitchenItem(item, itemId, status))
        const nextCounts = buildStatusCounts(nextItems)
        queryClient.setQueryData<OperationsKitchenResponse>(queryKey, {
          ...snapshotBefore,
          items: nextItems,
          statusCounts: {
            inPreparation: nextCounts.IN_PREPARATION,
            queued: nextCounts.QUEUED,
            ready: nextCounts.READY,
          },
        })
      }

      return { snapshotBefore }
    },
    onSuccess: () => {
      setError(null)
    },
    onError: (err, _vars, context) => {
      if (context?.snapshotBefore) {
        queryClient.setQueryData(queryKey, context.snapshotBefore)
      }
      setError(err instanceof Error ? err.message : 'Erro ao atualizar item.')
    },
  })
}

function buildOptimisticKitchenItem(
  item: OperationsKitchenResponse['items'][number],
  itemId: string,
  status: 'IN_PREPARATION' | 'READY' | 'DELIVERED',
) {
  if (item.itemId !== itemId) {
    return [item]
  }
  if (status === 'DELIVERED') {
    return []
  }
  return [
    {
      ...item,
      kitchenReadyAt: status === 'READY' ? new Date().toISOString() : item.kitchenReadyAt,
      kitchenStatus: status,
    },
  ]
}
