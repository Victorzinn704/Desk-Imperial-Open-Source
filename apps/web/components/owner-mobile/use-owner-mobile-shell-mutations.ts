'use client'

import { type QueryClient, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { haptic } from '@/components/shared/haptic'
import { addComandaItem, addComandaItems, closeComanda, logout, openComanda, updateComandaStatus } from '@/lib/api'
import { invalidateOperationsWorkspace, OPERATIONS_LIVE_QUERY_PREFIX } from '@/lib/operations'

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
    onSuccess: () => {
      void invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX)
      toast.success('Comanda aberta com sucesso')
      haptic.success()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Erro ao abrir comanda')
      haptic.error()
    },
  })
}

function useAddComandaItemMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: ({ comandaId, payload }: { comandaId: string; payload: Parameters<typeof addComandaItem>[1] }) =>
      addComandaItem(comandaId, payload, { includeSnapshot: false }),
    onSuccess: () => {
      void invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeKitchen: true,
        includeSummary: false,
      })
      toast.success('Item adicionado')
      haptic.light()
    },
    onError: () => {
      toast.error('Erro ao adicionar item')
      haptic.error()
    },
  })
}

function useAddComandaItemsMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: ({ comandaId, items }: { comandaId: string; items: Parameters<typeof addComandaItems>[1] }) =>
      addComandaItems(comandaId, items, { includeSnapshot: false }),
    onSuccess: () => {
      void invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeKitchen: true,
        includeSummary: false,
      })
      toast.success('Itens adicionados')
      haptic.light()
    },
    onError: () => {
      toast.error('Erro ao adicionar itens')
      haptic.error()
    },
  })
}

function useUpdateComandaStatusMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: ({ comandaId, status }: { comandaId: string; status: 'OPEN' | 'IN_PREPARATION' | 'READY' }) =>
      updateComandaStatus(comandaId, status, { includeSnapshot: false }),
    onSuccess: () => {
      void invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeKitchen: true,
      })
      toast.success('Status atualizado')
      haptic.medium()
    },
    onError: (err) => {
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
    onSuccess: () => {
      void invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeOrders: true,
        includeFinance: true,
      })
      toast.success('Comanda fechada')
      haptic.heavy()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Erro ao fechar comanda')
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
    openComandaMutation: useOpenComandaMutation(queryClient),
    updateComandaStatusMutation: useUpdateComandaStatusMutation(queryClient),
  }
}
