'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createComandaTerminalPaymentIntent, type TerminalPaymentMethod } from '@/lib/api'
import {
  finishOperationsMutationTrace,
  OPERATIONS_LIVE_QUERY_PREFIX,
  scheduleOperationsWorkspaceReconcile,
  startOperationsMutationTrace,
} from '@/lib/operations'

type TerminalPaymentMutationInput = {
  amount: number
  comandaId: string
  method: TerminalPaymentMethod
  replacePending?: boolean
}

export function usePdvTerminalPaymentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ amount, comandaId, method, replacePending }: TerminalPaymentMutationInput) =>
      createComandaTerminalPaymentIntent(comandaId, { amount, method, replacePending }),
    onMutate: async () => ({ trace: startOperationsMutationTrace('pdv', 'create-comanda-terminal-payment') }),
    onSuccess: (_data, variables, context) => {
      finishOperationsMutationTrace(context?.trace, 'success')
      void queryClient.invalidateQueries({ queryKey: ['comanda-details', variables.comandaId] })
      scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeFinance: false,
        includeSummary: false,
      })
      toast.success('Cobrança enviada para a maquininha')
    },
    onError: (error, _variables, context) => {
      finishOperationsMutationTrace(context?.trace, 'error')
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar cobrança para a maquininha')
    },
  })
}
