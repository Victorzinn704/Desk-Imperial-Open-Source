'use client'

import { type QueryClient, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { haptic } from '@/components/shared/haptic'
import { cancelComanda, closeComanda, createComandaPayment } from '@/lib/api'
import {
  appendOptimisticComandaPayment,
  finishOperationsMutationTrace,
  OPERATIONS_LIVE_COMPACT_QUERY_KEY,
  OPERATIONS_LIVE_QUERY_PREFIX,
  rollbackOperationsSnapshot,
  scheduleOperationsWorkspaceReconcile,
  setOptimisticComandaStatus,
  startOperationsMutationTrace,
} from '@/lib/operations'

export function useCloseComandaMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: (payload: { comandaId: string; discountAmount: number; serviceFeeAmount: number }) =>
      closeComanda(payload.comandaId, resolveCloseComandaPayload(payload), { includeSnapshot: false }),
    onMutate: async ({ comandaId }) => {
      const trace = startOperationsMutationTrace('staff-mobile', 'close-comanda')
      await queryClient.cancelQueries({ queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY })
      const snapshot = setOptimisticComandaStatus(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, comandaId, 'CLOSED')
      return { snapshot, trace }
    },
    onError: (_err, _vars, ctx) => {
      finishOperationsMutationTrace(ctx?.trace, 'error')
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, ctx?.snapshot)
      toast.error('Erro ao fechar comanda')
      haptic.error()
    },
    onSuccess: (_data, _vars, context) => {
      finishOperationsMutationTrace(context?.trace, 'success')
      scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeFinance: true,
        includeKitchen: true,
        includeOrders: true,
        includeSummary: true,
      })
      toast.success('Comanda fechada — pagamento efetuado')
      haptic.heavy()
    },
  })
}

export function useCreateComandaPaymentMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: (payload: {
      amount: number
      comandaId: string
      method: Parameters<typeof createComandaPayment>[1]['method']
    }) => createComandaPayment(payload.comandaId, resolveCreatePaymentPayload(payload), { includeSnapshot: false }),
    onMutate: async ({ amount, comandaId, method }) => {
      const trace = startOperationsMutationTrace('staff-mobile', 'create-comanda-payment')
      await queryClient.cancelQueries({ queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY })
      const snapshot = appendOptimisticComandaPayment(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, comandaId, {
        amount,
        method,
      })
      return { snapshot, trace }
    },
    onError: (_err, _vars, ctx) => {
      finishOperationsMutationTrace(ctx?.trace, 'error')
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, ctx?.snapshot)
      toast.error('Erro ao registrar pagamento')
      haptic.error()
    },
    onSuccess: (_data, variables, context) => {
      finishOperationsMutationTrace(context?.trace, 'success')
      void queryClient.invalidateQueries({ queryKey: ['comanda-details', variables.comandaId] })
      scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, { includeSummary: false })
      toast.success('Pagamento registrado')
      haptic.success()
    },
  })
}

export function useCancelComandaMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: (comandaId: string) => cancelComanda(comandaId, { includeSnapshot: false }),
    onMutate: async (comandaId) => {
      const trace = startOperationsMutationTrace('staff-mobile', 'cancel-comanda')
      await queryClient.cancelQueries({ queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY })
      const snapshot = setOptimisticComandaStatus(
        queryClient,
        OPERATIONS_LIVE_COMPACT_QUERY_KEY,
        comandaId,
        'CANCELLED',
      )
      return { snapshot, trace }
    },
    onError: (_err, _vars, ctx) => {
      finishOperationsMutationTrace(ctx?.trace, 'error')
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, ctx?.snapshot)
      toast.error('Erro ao cancelar comanda')
      haptic.error()
    },
    onSuccess: (_data, _vars, context) => {
      finishOperationsMutationTrace(context?.trace, 'success')
      scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeKitchen: true,
        includeSummary: true,
      })
      toast.success('Comanda cancelada')
      haptic.heavy()
    },
  })
}

function resolveCloseComandaPayload(payload: { discountAmount: number; serviceFeeAmount: number }) {
  return {
    discountAmount: payload.discountAmount,
    serviceFeeAmount: payload.serviceFeeAmount,
  }
}

function resolveCreatePaymentPayload(payload: {
  amount: number
  method: Parameters<typeof createComandaPayment>[1]['method']
}) {
  return {
    amount: payload.amount,
    method: payload.method,
  }
}
