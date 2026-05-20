'use client'

import { type QueryClient, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { haptic } from '@/components/shared/haptic'
import { createComandaPayment } from '@/lib/api'
import {
  appendOptimisticComandaPayment,
  finishOperationsMutationTrace,
  OPERATIONS_LIVE_COMPACT_QUERY_KEY,
  OPERATIONS_LIVE_QUERY_PREFIX,
  rollbackOperationsSnapshot,
  scheduleOperationsWorkspaceReconcile,
  startOperationsMutationTrace,
} from '@/lib/operations'

export function useCreateComandaPaymentMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: ({
      amount,
      comandaId,
      method,
    }: {
      amount: number
      comandaId: string
      method: Parameters<typeof createComandaPayment>[1]['method']
    }) => createComandaPayment(comandaId, { amount, method }, { includeSnapshot: false }),
    onMutate: async ({ amount, comandaId, method }) => {
      const trace = startOperationsMutationTrace('owner-mobile', 'create-comanda-payment')
      await queryClient.cancelQueries({ queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY })
      const snapshot = appendOptimisticComandaPayment(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, comandaId, {
        amount,
        method,
      })
      return { snapshot, trace }
    },
    onSuccess: (_data, variables, context) => {
      finishOperationsMutationTrace(context?.trace, 'success')
      void queryClient.invalidateQueries({ queryKey: ['comanda-details', variables.comandaId] })
      scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeSummary: false,
      })
      toast.success('Pagamento registrado')
      haptic.success()
    },
    onError: (err, _variables, ctx) => {
      finishOperationsMutationTrace(ctx?.trace, 'error')
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, ctx?.snapshot)
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar pagamento')
      haptic.error()
    },
  })
}
