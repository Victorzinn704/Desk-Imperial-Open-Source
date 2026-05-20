'use client'

import { type QueryClient, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { haptic } from '@/components/shared/haptic'
import { createComandaTerminalPaymentIntent, type TerminalPaymentMethod } from '@/lib/api'
import {
  finishOperationsMutationTrace,
  OPERATIONS_LIVE_QUERY_PREFIX,
  scheduleOperationsWorkspaceReconcile,
  startOperationsMutationTrace,
} from '@/lib/operations'

export function useCreateComandaTerminalPaymentIntentMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: ({ amount, comandaId, method }: { amount: number; comandaId: string; method: TerminalPaymentMethod }) =>
      createComandaTerminalPaymentIntent(comandaId, { amount, method, replacePending: true }),
    onMutate: async () => ({ trace: startOperationsMutationTrace('owner-mobile', 'create-comanda-payment') }),
    onSuccess: (_data, variables, context) => {
      finishOperationsMutationTrace(context?.trace, 'success')
      void queryClient.invalidateQueries({ queryKey: ['comanda-details', variables.comandaId] })
      scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeFinance: false,
        includeSummary: false,
      })
      toast.success('Solicitação enviada para a maquininha')
      haptic.medium()
    },
    onError: (err, _variables, context) => {
      finishOperationsMutationTrace(context?.trace, 'error')
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar para a maquininha')
      haptic.error()
    },
  })
}
