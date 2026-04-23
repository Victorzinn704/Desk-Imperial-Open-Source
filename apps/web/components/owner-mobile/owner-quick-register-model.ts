import { z } from 'zod'
import { ApiError, type BarcodeCatalogLookupResponse } from '@/lib/api'
import { currencyCodeSchema } from '@/lib/validation'

export const barcodeLengths = new Set([8, 12, 13, 14])

export const ownerQuickRegisterSchema = z
  .object({
    name: z.string().trim().min(2, 'Digite um nome de produto válido.').max(120, 'O nome ficou longo demais.'),
    brand: z.string().trim().max(80, 'A marca ficou longa demais.').optional().or(z.literal('')),
    category: z.string().trim().min(2, 'Informe uma categoria.').max(80, 'A categoria ficou longa demais.'),
    unitCost: z.coerce.number().min(0, 'O custo não pode ser negativo.'),
    unitPrice: z.coerce.number().min(0, 'O preço não pode ser negativo.'),
    stockBaseUnits: z.coerce.number().int('Use um número inteiro.').min(0, 'O estoque não pode ser negativo.'),
    currency: currencyCodeSchema.default('BRL'),
  })
  .transform((values) => ({
    name: values.name,
    brand: values.brand,
    category: values.category,
    packagingClass: 'Cadastro rápido móvel',
    measurementUnit: 'UN',
    measurementValue: 1,
    unitsPerPackage: 1,
    unitCost: values.unitCost,
    unitPrice: values.unitPrice,
    currency: values.currency,
    stock: values.stockBaseUnits,
    description: '',
    requiresKitchen: false,
    lowStockThreshold: null,
  }))

export type OwnerQuickRegisterInput = z.input<typeof ownerQuickRegisterSchema>
export type OwnerQuickRegisterValues = z.output<typeof ownerQuickRegisterSchema>
export type OwnerQueuedProductPayload = OwnerQuickRegisterValues & {
  barcode?: string
  quantityLabel?: string | null
  servingSize?: string | null
  imageUrl?: string | null
  catalogSource?: string | null
}
export type LookupFeedbackTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'
export type LookupFeedback = { tone: LookupFeedbackTone; message: string }

export const ownerQuickRegisterDefaultValues: OwnerQuickRegisterInput = {
  name: '',
  brand: '',
  category: '',
  unitCost: 0,
  unitPrice: 0,
  stockBaseUnits: 0,
  currency: 'BRL',
}

export function isOfflineProductCreateError(error: unknown) {
  return error instanceof ApiError && (error.status === 0 || error.status === 504)
}

export function resolveLookupProductFields(barcode: string, lookupContext: BarcodeCatalogLookupResponse | null) {
  if (!lookupContext || lookupContext.barcode !== barcode) {
    return {}
  }

  return {
    packagingClass: lookupContext.packagingClass ?? 'Cadastro rápido móvel',
    measurementUnit: lookupContext.measurementUnit ?? 'UN',
    measurementValue: lookupContext.measurementValue ?? 1,
    unitsPerPackage: 1,
    description: lookupContext.description ?? '',
    quantityLabel: lookupContext.quantityLabel,
    servingSize: lookupContext.servingSize,
    imageUrl: lookupContext.imageUrl,
    catalogSource: lookupContext.source,
  }
}
