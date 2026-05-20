'use client'

import { type QueryClient, useMutation } from '@tanstack/react-query'
import type { OperationsLiveResponse } from '@contracts/contracts'
import { toast } from 'sonner'
import { haptic } from '@/components/shared/haptic'
import { addComandaItem, addComandaItems, logout, openComanda, replaceComanda, updateComandaStatus } from '@/lib/api'
import {
  appendOptimisticComandaItem,
  appendOptimisticComandaMutation,
  buildOptimisticComandaRecord,
  finishOperationsMutationTrace,
  OPERATIONS_LIVE_COMPACT_QUERY_KEY,
  OPERATIONS_LIVE_QUERY_PREFIX,
  rollbackOperationsSnapshot,
  scheduleOperationsWorkspaceReconcile,
  setOptimisticComandaStatus,
  startOperationsMutationTrace,
  syncKitchenSnapshotFromComanda,
} from '@/lib/operations'
import {
  useCancelComandaMutation,
  useCloseComandaMutation,
  useCreateComandaPaymentMutation,
} from './use-staff-mobile-shell-secondary-mutations'

type RouterLike = { push: (href: string) => void }

function useLogoutMutation(queryClient: QueryClient, router: RouterLike) {
  return useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await queryClient.cancelQueries()
      queryClient.clear()
      router.push('/login')
    },
  })
}

function useOpenComandaMutation(queryClient: QueryClient, currentEmployeeId: string | null) {
  return useMutation({
    mutationFn: (payload: Parameters<typeof openComanda>[0]) => openComanda(payload, { includeSnapshot: false }),
    onMutate: async (vars) => {
      const trace = startOperationsMutationTrace('staff-mobile', 'open-comanda')
      const snapshot = await appendOptimisticComandaMutation(
        queryClient,
        OPERATIONS_LIVE_COMPACT_QUERY_KEY,
        buildOptimisticComandaRecord({
          tableLabel: vars.tableLabel,
          mesaId: vars.mesaId ?? null,
          customerName: vars.customerName ?? null,
          customerDocument: vars.customerDocument ?? null,
          participantCount: vars.participantCount ?? 1,
          notes: vars.notes ?? null,
          cashSessionId: vars.cashSessionId ?? null,
          currentEmployeeId,
          items: vars.items,
        }),
      )
      return { snapshot, trace }
    },
    onError: (_err, _vars, ctx) => {
      finishOperationsMutationTrace(ctx?.trace, 'error')
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, ctx?.snapshot)
      haptic.error()
    },
    onSuccess: (data, _vars, context) => {
      finishOperationsMutationTrace(context?.trace, 'success')
      syncKitchenSnapshotFromComanda(queryClient, data.comanda)
      scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX)
      toast.success('Comanda aberta com sucesso')
      haptic.success()
    },
  })
}

function useAddComandaItemMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: ({ comandaId, payload }: { comandaId: string; payload: Parameters<typeof addComandaItem>[1] }) =>
      addComandaItem(comandaId, payload, { includeSnapshot: false }),
    onMutate: async ({ comandaId, payload }) => {
      const trace = startOperationsMutationTrace('staff-mobile', 'add-comanda-item')
      await queryClient.cancelQueries({ queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY })
      const snapshot = appendOptimisticComandaItem(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, comandaId, payload)
      return { snapshot, trace }
    },
    onError: (_err, _vars, ctx) => {
      finishOperationsMutationTrace(ctx?.trace, 'error')
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, ctx?.snapshot)
      toast.error('Erro ao adicionar item')
      haptic.error()
    },
    onSuccess: (data, _vars, context) => {
      finishOperationsMutationTrace(context?.trace, 'success')
      syncKitchenSnapshotFromComanda(queryClient, data.comanda)
      scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeKitchen: true,
        includeSummary: false,
      })
      toast.success('Item adicionado')
      haptic.light()
    },
  })
}

function useAddComandaItemsMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: ({ comandaId, items }: { comandaId: string; items: Parameters<typeof addComandaItems>[1] }) =>
      addComandaItems(comandaId, items, { includeSnapshot: false }),
    onMutate: async ({ comandaId, items }) => {
      const trace = startOperationsMutationTrace('staff-mobile', 'add-comanda-items')
      await queryClient.cancelQueries({ queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY })
      const snapshot = queryClient.getQueryData<OperationsLiveResponse>(OPERATIONS_LIVE_COMPACT_QUERY_KEY)
      for (const item of items) {
        appendOptimisticComandaItem(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, comandaId, item)
      }
      return { snapshot, trace }
    },
    onError: (_err, _vars, ctx) => {
      finishOperationsMutationTrace(ctx?.trace, 'error')
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, ctx?.snapshot)
      toast.error('Erro ao adicionar itens')
      haptic.error()
    },
    onSuccess: (data, _vars, context) => {
      finishOperationsMutationTrace(context?.trace, 'success')
      syncKitchenSnapshotFromComanda(queryClient, data.comanda)
      scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeKitchen: true,
        includeSummary: false,
      })
      toast.success('Itens adicionados')
      haptic.light()
    },
  })
}

function useReplaceComandaMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: ({ comandaId, payload }: { comandaId: string; payload: Parameters<typeof replaceComanda>[1] }) =>
      replaceComanda(comandaId, payload, { includeSnapshot: false }),
    onMutate: async () => {
      const trace = startOperationsMutationTrace('staff-mobile', 'replace-comanda')
      await queryClient.cancelQueries({ queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY })
      const snapshot = queryClient.getQueryData<OperationsLiveResponse>(OPERATIONS_LIVE_COMPACT_QUERY_KEY)
      return { snapshot, trace }
    },
    onError: (_err, _vars, ctx) => {
      finishOperationsMutationTrace(ctx?.trace, 'error')
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, ctx?.snapshot)
      toast.error('Erro ao salvar edição')
      haptic.error()
    },
    onSuccess: (data, variables, context) => {
      finishOperationsMutationTrace(context?.trace, 'success')
      syncKitchenSnapshotFromComanda(queryClient, data.comanda)
      void queryClient.invalidateQueries({ queryKey: ['comanda-details', variables.comandaId] })
      scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeKitchen: true,
        includeSummary: true,
      })
      toast.success('Comanda atualizada')
      haptic.success()
    },
  })
}

function useUpdateComandaStatusMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: ({ comandaId, status }: { comandaId: string; status: 'OPEN' | 'IN_PREPARATION' | 'READY' }) =>
      updateComandaStatus(comandaId, status, { includeSnapshot: false }),
    onMutate: async ({ comandaId, status }) => {
      const trace = startOperationsMutationTrace('staff-mobile', 'update-comanda-status')
      await queryClient.cancelQueries({ queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY })
      const snapshot = setOptimisticComandaStatus(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, comandaId, status)
      return { snapshot, trace }
    },
    onError: (_err, _vars, ctx) => {
      finishOperationsMutationTrace(ctx?.trace, 'error')
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, ctx?.snapshot)
      toast.error('Erro ao atualizar status')
      haptic.error()
    },
    onSuccess: (_data, _vars, context) => {
      finishOperationsMutationTrace(context?.trace, 'success')
      scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeKitchen: true,
        includeSummary: false,
      })
      toast.success('Status atualizado')
      haptic.medium()
    },
  })
}

export function useStaffMobileShellMutations(
  queryClient: QueryClient,
  router: RouterLike,
  currentEmployeeId: string | null,
) {
  const logoutMutation = useLogoutMutation(queryClient, router)
  const openComandaMutation = useOpenComandaMutation(queryClient, currentEmployeeId)
  const addComandaItemMutation = useAddComandaItemMutation(queryClient)
  const addComandaItemsMutation = useAddComandaItemsMutation(queryClient)
  const replaceComandaMutation = useReplaceComandaMutation(queryClient)
  const updateComandaStatusMutation = useUpdateComandaStatusMutation(queryClient)
  const closeComandaMutation = useCloseComandaMutation(queryClient)
  const createComandaPaymentMutation = useCreateComandaPaymentMutation(queryClient)
  const cancelComandaMutation = useCancelComandaMutation(queryClient)

  return {
    addComandaItemMutation,
    addComandaItemsMutation,
    cancelComandaMutation,
    closeComandaMutation,
    createComandaPaymentMutation,
    logoutMutation,
    openComandaMutation,
    replaceComandaMutation,
    updateComandaStatusMutation,
    isBusy:
      openComandaMutation.isPending ||
      addComandaItemMutation.isPending ||
      addComandaItemsMutation.isPending ||
      replaceComandaMutation.isPending ||
      updateComandaStatusMutation.isPending ||
      cancelComandaMutation.isPending ||
      createComandaPaymentMutation.isPending ||
      closeComandaMutation.isPending,
  }
}
