import { useCallback } from 'react'
import type { UseFormReset } from 'react-hook-form'
import { toast } from 'sonner'
import type { BarcodeCatalogLookupResponse } from '@/lib/api'
import {
  isOfflineProductCreateError,
  type OwnerQueuedProductPayload,
  ownerQuickRegisterDefaultValues,
  type OwnerQuickRegisterInput,
  type OwnerQuickRegisterValues,
  resolveLookupProductFields,
} from './owner-quick-register-model'

type SubmitInput = {
  activeLookupContext: BarcodeCatalogLookupResponse | null
  barcodeValid: boolean
  canSubmit: boolean
  enqueue: (action: { type: string; payload: OwnerQueuedProductPayload }) => Promise<string>
  mutateAsync: (payload: OwnerQueuedProductPayload) => Promise<unknown>
  normalizedBarcode: string
  refreshQueuedCount: () => Promise<void>
  resetAfterOfflineQueue: () => void
  reset: UseFormReset<OwnerQuickRegisterInput>
  resetLookup: () => void
  resetMutation: () => void
}

export function useOwnerQuickRegisterSubmit(input: SubmitInput) {
  return useCallback(
    async (values: OwnerQuickRegisterValues) => {
      if (!input.canSubmit) {
        return
      }
      const payload = buildOwnerProductPayload(
        values,
        input.normalizedBarcode,
        input.barcodeValid,
        input.activeLookupContext,
      )
      try {
        await input.mutateAsync(payload)
        toast.success('Produto cadastrado no catálogo')
        input.reset(ownerQuickRegisterDefaultValues)
        input.resetLookup()
        await input.refreshQueuedCount()
      } catch (error) {
        await handleSubmitFailure(error, payload, input)
      }
    },
    [input],
  )
}

function buildOwnerProductPayload(
  values: OwnerQuickRegisterValues,
  normalizedBarcode: string,
  barcodeValid: boolean,
  activeLookupContext: BarcodeCatalogLookupResponse | null,
) {
  return {
    ...values,
    ...resolveLookupProductFields(normalizedBarcode, activeLookupContext),
    barcode: barcodeValid ? normalizedBarcode : undefined,
  } satisfies OwnerQueuedProductPayload
}

async function handleSubmitFailure(error: unknown, payload: OwnerQueuedProductPayload, input: SubmitInput) {
  if (!isOfflineProductCreateError(error)) {
    return
  }
  await input.enqueue({ type: 'owner.create-product', payload })
  input.resetMutation()
  toast.info('Sem conexão — produto salvo localmente e será enviado ao reconectar.')
  input.reset(ownerQuickRegisterDefaultValues)
  input.resetAfterOfflineQueue()
  await input.refreshQueuedCount()
}
