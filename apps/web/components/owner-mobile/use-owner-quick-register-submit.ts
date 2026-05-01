import { useCallback } from 'react'
import type { UseFormReset } from 'react-hook-form'
import { toast } from 'sonner'
import { searchCatalogImages, type BarcodeCatalogLookupResponse } from '@/lib/api'
import { buildProductImageSearchQuery } from '@/lib/product-image-search'
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
      const payload = await buildOwnerProductPayload(
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

export async function buildOwnerProductPayload(
  values: OwnerQuickRegisterValues,
  normalizedBarcode: string,
  barcodeValid: boolean,
  activeLookupContext: BarcodeCatalogLookupResponse | null,
) {
  const payload = {
    ...values,
    ...resolveLookupProductFields(normalizedBarcode, activeLookupContext),
    barcode: barcodeValid ? normalizedBarcode : undefined,
  } satisfies OwnerQueuedProductPayload

  return enrichPayloadWithCatalogImage(payload)
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

async function enrichPayloadWithCatalogImage(payload: OwnerQueuedProductPayload) {
  if (payload.imageUrl) {
    return payload
  }

  const searchQuery = buildProductImageSearchQuery({
    name: payload.name,
    brand: payload.brand,
    category: payload.category,
    packagingClass: payload.packagingClass,
    quantityLabel: payload.quantityLabel,
  })

  if (!searchQuery) {
    return payload
  }

  try {
    const [candidate] = await searchCatalogImages(searchQuery, 1)
    if (!candidate?.imageUrl) {
      return payload
    }

    return {
      ...payload,
      imageUrl: candidate.imageUrl,
      catalogSource: payload.catalogSource ?? 'pexels',
    } satisfies OwnerQueuedProductPayload
  } catch {
    return payload
  }
}
