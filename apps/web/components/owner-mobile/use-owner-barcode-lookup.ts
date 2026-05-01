import type { ProductRecord } from '@contracts/contracts'
import { useCallback, useMemo, useState } from 'react'
import type { UseFormGetValues, UseFormSetValue } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { ApiError, type BarcodeCatalogLookupResponse, lookupBarcodeCatalog } from '@/lib/api'
import { barcodeLengths, type LookupFeedback, type OwnerQuickRegisterInput } from './owner-quick-register-model'

type LookupFormApi = {
  getValues: UseFormGetValues<OwnerQuickRegisterInput>
  setValue: UseFormSetValue<OwnerQuickRegisterInput>
}

export function useOwnerBarcodeLookup(products: ProductRecord[], formApi: LookupFormApi) {
  const lookupMutation = useMutation({ mutationFn: lookupBarcodeCatalog })
  const [barcodeInput, setBarcodeInput] = useState('')
  const [lookupFeedback, setLookupFeedback] = useState<LookupFeedback | null>(null)
  const [lookupContext, setLookupContext] = useState<BarcodeCatalogLookupResponse | null>(null)
  const normalizedBarcode = barcodeInput.replace(/\D/g, '')
  const barcodeValid = normalizedBarcode.length > 0 && barcodeLengths.has(normalizedBarcode.length)
  const duplicatedProduct = useMemo(
    () => (barcodeValid ? (products.find((product) => product.barcode === normalizedBarcode) ?? null) : null),
    [barcodeValid, normalizedBarcode, products],
  )
  const activeLookupContext = lookupContext?.barcode === normalizedBarcode ? lookupContext : null

  const runBarcodeLookup = useCallback(
    async (barcode: string, mode: 'empty-only' | 'overwrite') => {
      if (!barcodeLengths.has(barcode.length) || products.some((product) => product.barcode === barcode)) {
        return
      }
      await executeBarcodeLookup({
        barcode,
        formApi,
        lookupMutation,
        mode,
        setLookupContext,
        setLookupFeedback,
      })
    },
    [formApi, lookupMutation, products],
  )

  const resetLookup = useCallback(() => {
    setBarcodeInput('')
    setLookupFeedback(null)
    setLookupContext(null)
  }, [])

  return {
    activeLookupContext,
    barcodeInput,
    barcodeValid,
    canLookup: barcodeValid && !duplicatedProduct && !lookupMutation.isPending,
    duplicatedProduct,
    lookupFeedback,
    lookupMutation,
    normalizedBarcode,
    resetLookup,
    runBarcodeLookup,
    setBarcodeInput,
    setLookupContext,
    setLookupFeedback,
  }
}

type ExecuteLookupInput = {
  barcode: string
  formApi: LookupFormApi
  lookupMutation: ReturnType<typeof useMutation<BarcodeCatalogLookupResponse, Error, string>>
  mode: 'empty-only' | 'overwrite'
  setLookupContext: (value: BarcodeCatalogLookupResponse | null) => void
  setLookupFeedback: (value: LookupFeedback | null) => void
}

async function executeBarcodeLookup(input: ExecuteLookupInput) {
  try {
    const result = await input.lookupMutation.mutateAsync(input.barcode)
    const appliedCount = applyLookupValues(input.formApi, result, input.mode)
    input.setLookupContext(result)
    input.setLookupFeedback({ tone: 'success', message: buildLookupSuccessMessage(appliedCount, result.source) })
  } catch (error) {
    input.setLookupContext(null)
    input.setLookupFeedback(buildLookupErrorFeedback(error))
  }
}

function applyLookupValues(
  formApi: LookupFormApi,
  lookup: BarcodeCatalogLookupResponse,
  mode: 'empty-only' | 'overwrite',
) {
  const shouldOverwrite = mode === 'overwrite'
  const fields = [
    ['name', lookup.name],
    ['brand', lookup.brand],
    ['category', lookup.category],
    ['packagingClass', lookup.packagingClass],
    ['measurementUnit', lookup.measurementUnit],
    ['measurementValue', lookup.measurementValue],
    ['description', lookup.description],
    ['quantityLabel', lookup.quantityLabel],
    ['servingSize', lookup.servingSize],
  ] as const
  return fields.reduce((count, [field, value]) => {
    const currentRawValue = formApi.getValues(field)
    const hasCurrentValue =
      typeof currentRawValue === 'string'
        ? currentRawValue.trim().length > 0
        : typeof currentRawValue === 'number'
          ? Number.isFinite(currentRawValue) && currentRawValue > 0
          : Boolean(currentRawValue)

    if (value === null || value === undefined || value === '' || (!shouldOverwrite && hasCurrentValue)) {
      return count
    }
    formApi.setValue(field, value, { shouldDirty: shouldOverwrite, shouldTouch: true })
    return count + 1
  }, 0)
}

function buildLookupSuccessMessage(appliedCount: number, source: string) {
  if (appliedCount === 0) {
    return 'EAN encontrado, mas os campos atuais foram mantidos.'
  }
  const sourceLabel =
    source === 'open_food_facts'
      ? 'Open Food Facts'
      : source === 'national_beverage_catalog'
        ? 'base nacional de bebidas'
        : 'catalogo externo'
  return `Dados do EAN aplicados via ${sourceLabel}.`
}

function buildLookupErrorFeedback(error: unknown): LookupFeedback {
  if (error instanceof ApiError && error.status === 404) {
    return { tone: 'warning', message: 'EAN nao encontrado na base externa. Continue com o cadastro manual.' }
  }
  return {
    tone: 'danger',
    message: error instanceof Error ? error.message : 'Nao foi possivel consultar o catalogo por EAN agora.',
  }
}
