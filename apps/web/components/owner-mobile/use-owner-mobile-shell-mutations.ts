'use client'

import { type QueryClient, useMutation } from '@tanstack/react-query'
import type { OperationsLiveResponse } from '@contracts/contracts'
import { toast } from 'sonner'
import { haptic } from '@/components/shared/haptic'
import {
  addComandaItem,
  addComandaItems,
  closeComanda,
  logout,
  openCashSession,
  openComanda,
  updateComandaStatus,
} from '@/lib/api'
import {
  appendOptimisticComandaItem,
  appendOptimisticComandaMutation,
  buildOptimisticComandaRecord,
  invalidateOperationsWorkspace,
  OPERATIONS_LIVE_COMPACT_QUERY_KEY,
  OPERATIONS_LIVE_QUERY_PREFIX,
  rollbackOperationsSnapshot,
  setOptimisticComandaStatus,
} from '@/lib/operations'

type RouterLike = { push: (href: string) => void }

function useLogoutMutation(queryClient: QueryClient, router: RouterLike) {
  return useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await queryClient.cancelQueries()
      queryClient.clear()
      router.push('/login')
    },
    onError: () => {
      toast.error('Erro ao sair. Verifique sua conexão.')
    },
  })
}

function useOpenComandaMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: (payload: Parameters<typeof openComanda>[0]) => openComanda(payload, { includeSnapshot: false }),
    onMutate: async (vars) => {
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
          items: vars.items,
        }),
      )
      return { snapshot }
    },
    onSuccess: () => {
      void invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX)
      toast.success('Comanda aberta com sucesso')
      haptic.success()
    },
    onError: (err, _vars, ctx) => {
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, ctx?.snapshot)
      toast.error(err instanceof Error ? err.message : 'Erro ao abrir comanda')
      haptic.error()
    },
  })
}

function useAddComandaItemMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: ({ comandaId, payload }: { comandaId: string; payload: Parameters<typeof addComandaItem>[1] }) =>
      addComandaItem(comandaId, payload, { includeSnapshot: false }),
    onMutate: async ({ comandaId, payload }) => {
      await queryClient.cancelQueries({ queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY })
      const snapshot = appendOptimisticComandaItem(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, comandaId, payload)
      return { snapshot }
    },
    onSuccess: () => {
      void invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeKitchen: true,
        includeSummary: false,
      })
      toast.success('Item adicionado')
      haptic.light()
    },
    onError: (_err, _vars, ctx) => {
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, ctx?.snapshot)
      toast.error('Erro ao adicionar item')
      haptic.error()
    },
  })
}

function useAddComandaItemsMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: ({ comandaId, items }: { comandaId: string; items: Parameters<typeof addComandaItems>[1] }) =>
      addComandaItems(comandaId, items, { includeSnapshot: false }),
    onMutate: async ({ comandaId, items }) => {
      await queryClient.cancelQueries({ queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY })
      const snapshot = queryClient.getQueryData<OperationsLiveResponse>(OPERATIONS_LIVE_COMPACT_QUERY_KEY)
      for (const item of items) {
        appendOptimisticComandaItem(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, comandaId, item)
      }
      return { snapshot }
    },
    onSuccess: () => {
      void invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeKitchen: true,
        includeSummary: false,
      })
      toast.success('Itens adicionados')
      haptic.light()
    },
    onError: (_err, _vars, ctx) => {
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, ctx?.snapshot)
      toast.error('Erro ao adicionar itens')
      haptic.error()
    },
  })
}

function useUpdateComandaStatusMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: ({ comandaId, status }: { comandaId: string; status: 'OPEN' | 'IN_PREPARATION' | 'READY' }) =>
      updateComandaStatus(comandaId, status, { includeSnapshot: false }),
    onMutate: async ({ comandaId, status }) => {
      await queryClient.cancelQueries({ queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY })
      const snapshot = setOptimisticComandaStatus(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, comandaId, status)
      return { snapshot }
    },
    onSuccess: () => {
      void invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeKitchen: true,
      })
      toast.success('Status atualizado')
      haptic.medium()
    },
    onError: (err, _vars, ctx) => {
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, ctx?.snapshot)
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar status')
      haptic.error()
    },
  })
}

function useCloseComandaMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: ({
      comandaId,
      discountAmount,
      serviceFeeAmount,
    }: {
      comandaId: string
      discountAmount: number
      serviceFeeAmount: number
    }) => closeComanda(comandaId, { discountAmount, serviceFeeAmount }, { includeSnapshot: false }),
    onMutate: async ({ comandaId }) => {
      await queryClient.cancelQueries({ queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY })
      const snapshot = setOptimisticComandaStatus(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, comandaId, 'CLOSED')
      return { snapshot }
    },
    onSuccess: () => {
      void invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeOrders: true,
        includeFinance: true,
      })
      toast.success('Comanda fechada')
      haptic.heavy()
    },
    onError: (err, _vars, ctx) => {
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, ctx?.snapshot)
      toast.error(err instanceof Error ? err.message : 'Erro ao fechar comanda')
      haptic.error()
    },
  })
}

function useOpenCashSessionMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: (openingCashAmount: number) =>
      openCashSession({ openingCashAmount }, { includeSnapshot: false }),
    onSuccess: () => {
      void invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeSummary: true,
      })
      toast.success('Caixa aberto')
      haptic.success()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Erro ao abrir caixa')
      haptic.error()
    },
  })
}

export function useOwnerMobileShellMutations(queryClient: QueryClient, router: RouterLike) {
  return {
    addComandaItemMutation: useAddComandaItemMutation(queryClient),
    addComandaItemsMutation: useAddComandaItemsMutation(queryClient),
    closeComandaMutation: useCloseComandaMutation(queryClient),
    logoutMutation: useLogoutMutation(queryClient, router),
    openCashSessionMutation: useOpenCashSessionMutation(queryClient),
    openComandaMutation: useOpenComandaMutation(queryClient),
    updateComandaStatusMutation: useUpdateComandaStatusMutation(queryClient),
  }
}
