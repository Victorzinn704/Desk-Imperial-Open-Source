'use client'

import { useCallback } from 'react'
import type { Comanda, ComandaStatus } from '@/components/pdv/pdv-types'
import { toOperationAmounts, toOperationsStatus } from '@/components/pdv/pdv-operations'
import type { CreateComandaPaymentPayload } from '@/lib/api'
import type { useStaffMobileShellMutations } from './use-staff-mobile-shell-mutations'
import { closeComandaWithDiscount } from './staff-mobile-shell-submit.helpers'

interface StatusHandlerArgs {
  comandasById: Map<string, Comanda>
  mutations: ReturnType<typeof useStaffMobileShellMutations>
  setScreenError: (message: string | null) => void
}

function resolveErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function useUpdateStatusHandler(args: StatusHandlerArgs) {
  return useCallback(
    async (id: string, status: ComandaStatus) => {
      const comanda = args.comandasById.get(id)
      if (!comanda) {
        return
      }

      try {
        args.setScreenError(null)

        if (status === 'fechada') {
          await args.mutations.closeComandaMutation.mutateAsync({
            comandaId: id,
            ...toOperationAmounts(comanda),
          })
          return
        }

        if (status === 'cancelada') {
          await args.mutations.cancelComandaMutation.mutateAsync(id)
          return
        }

        await args.mutations.updateComandaStatusMutation.mutateAsync({
          comandaId: id,
          status: toOperationsStatus(status),
        })
      } catch (error) {
        args.setScreenError(resolveErrorMessage(error, 'Não foi possível atualizar a comanda.'))
      }
    },
    [args],
  )
}

function useCancelHandler(args: StatusHandlerArgs) {
  return useCallback(
    async (id: string) => {
      try {
        args.setScreenError(null)
        await args.mutations.cancelComandaMutation.mutateAsync(id)
      } catch (error) {
        args.setScreenError(resolveErrorMessage(error, 'Não foi possível cancelar a comanda.'))
      }
    },
    [args],
  )
}

function useCloseWithDiscountHandler(args: StatusHandlerArgs) {
  return useCallback(
    async (id: string, discountPercent: number, surchargePercent: number) => {
      const comanda = args.comandasById.get(id)
      if (!comanda) {
        return
      }

      try {
        args.setScreenError(null)
        await closeComandaWithDiscount({
          comanda,
          comandaId: id,
          discountPercent,
          mutateAsync: args.mutations.closeComandaMutation.mutateAsync,
          surchargePercent,
        })
      } catch (error) {
        args.setScreenError(resolveErrorMessage(error, 'Não foi possível fechar a comanda.'))
      }
    },
    [args],
  )
}

function useCreatePaymentHandler(args: StatusHandlerArgs) {
  return useCallback(
    async (id: string, amount: number, method: CreateComandaPaymentPayload['method']) => {
      try {
        args.setScreenError(null)
        await args.mutations.createComandaPaymentMutation.mutateAsync({ amount, comandaId: id, method })
      } catch (error) {
        args.setScreenError(resolveErrorMessage(error, 'Não foi possível registrar o pagamento.'))
      }
    },
    [args],
  )
}

export function useStatusHandlers(args: StatusHandlerArgs) {
  const handleUpdateStatus = useUpdateStatusHandler(args)
  const handleCancel = useCancelHandler(args)
  const handleCloseWithDiscount = useCloseWithDiscountHandler(args)
  const handleCreatePayment = useCreatePaymentHandler(args)

  return { handleCancel, handleCloseWithDiscount, handleCreatePayment, handleUpdateStatus }
}
