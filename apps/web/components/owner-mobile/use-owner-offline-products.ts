import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api'
import { type OfflineAction, type OfflineDrainResult, useOfflineQueue } from '@/components/shared/use-offline-queue'
import type { OwnerQueuedProductPayload } from './owner-quick-register-model'

type ProductMutation = {
  mutateAsync: (payload: OwnerQueuedProductPayload) => Promise<unknown>
  reset: () => void
}

type ProductQueryClient = {
  invalidateQueries: (input: { queryKey: string[] }) => Promise<unknown>
}

export function useOwnerOfflineProducts(productMutation: ProductMutation, queryClient: ProductQueryClient) {
  const { enqueue, drainQueue, listQueue } = useOfflineQueue()
  const [queuedCount, setQueuedCount] = useState(0)
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  const refreshQueuedCount = useCallback(async () => {
    const queue = await listQueue()
    setQueuedCount(queue.filter((entry) => entry.type === 'owner.create-product').length)
  }, [listQueue])

  const runDrain = useCallback(async () => {
    const result = await drainQueue((action) => drainOwnerProductAction(action, productMutation))
    notifyDrainResult(result)
    if (result.processedCount > 0) {
      await queryClient.invalidateQueries({ queryKey: ['products'] })
    }
    await refreshQueuedCount()
    return result
  }, [drainQueue, productMutation, queryClient, refreshQueuedCount])

  useOwnerOfflineLifecycle(runDrain, refreshQueuedCount, setIsOnline)

  return { enqueue, isOnline, queuedCount, refreshQueuedCount, runDrain }
}

async function drainOwnerProductAction(action: OfflineAction, productMutation: ProductMutation) {
  if (action.type !== 'owner.create-product') {
    return
  }

  try {
    await productMutation.mutateAsync(action.payload as OwnerQueuedProductPayload)
  } catch (error) {
    if (error instanceof ApiError && (error.status === 400 || error.status === 409)) {
      productMutation.reset()
      return
    }
    throw error
  }
}

function notifyDrainResult(result: OfflineDrainResult) {
  if (result.expiredCount === 1) {
    toast.error('1 cadastro offline expirou apos 10 minutos sem conexao e foi descartado.')
  } else if (result.expiredCount > 1) {
    toast.error(`${result.expiredCount} cadastros offline expiraram apos 10 minutos sem conexao e foram descartados.`)
  }

  if (result.processedCount === 1) {
    toast.success('1 produto offline foi sincronizado.')
  } else if (result.processedCount > 1) {
    toast.success(`${result.processedCount} produtos offline foram sincronizados.`)
  }
}

function useOwnerOfflineLifecycle(
  runDrain: () => Promise<OfflineDrainResult>,
  refreshQueuedCount: () => Promise<void>,
  setIsOnline: (value: boolean) => void,
) {
  useEffect(() => {
    void refreshQueuedCount()
  }, [refreshQueuedCount])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      void runDrain()
    }
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    if (navigator.onLine) {
      void runDrain()
    }
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [runDrain, setIsOnline])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'DRAIN_QUEUE') {
        void runDrain()
      }
    }
    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [runDrain])
}
