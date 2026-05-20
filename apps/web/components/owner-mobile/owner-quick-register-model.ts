import { z } from 'zod'
import { ApiError, type BarcodeCatalogLookupResponse } from '@/lib/api'
import { currencyCodeSchema } from '@/lib/validation'

export const barcodeLengths = new Set([8, 12, 13, 14])

export const ownerQuickRegisterSchema = z
  .object({
    name: z.string().trim().min(2, 'Digite um nome de produto válido.').max(120, 'O nome ficou longo demais.'),
    brand: z.string().trim().max(80, 'A marca ficou longa demais.').optional().or(z.literal('')),
    category: z.string().trim().min(2, 'Informe uma categoria.').max(80, 'A categoria ficou longa demais.'),
    packagingClass: z
      .string()
      .trim()
      .min(2, 'A classe da embalagem ficou curta demais.')
      .max(120, 'A classe da embalagem ficou longa demais.'),
    measurementUnit: z.string().trim().min(1, 'Informe a unidade.').max(24, 'A unidade ficou longa demais.'),
    measurementValue: z.coerce.number().min(0.01, 'A medida precisa ser positiva.'),
    unitsPerPackage: z.coerce.number().int('Use um inteiro.').min(1, 'O pacote precisa ter ao menos 1 unidade.'),
    description: z.string().trim().max(280, 'A descrição ficou longa demais.').optional().or(z.literal('')),
    quantityLabel: z
      .string()
      .trim()
      .max(64, 'A leitura de quantidade ficou longa demais.')
      .optional()
      .or(z.literal('')),
    servingSize: z.string().trim().max(64, 'A porção ficou longa demais.').optional().or(z.literal('')),
    requiresKitchen: z.boolean().default(false),
    unitCost: z.coerce.number().min(0, 'O custo não pode ser negativo.'),
    unitPrice: z.coerce.number().min(0, 'O preço não pode ser negativo.'),
    stockBaseUnits: z.coerce.number().int('Use um número inteiro.').min(0, 'O estoque não pode ser negativo.'),
    currency: currencyCodeSchema.default('BRL'),
  })
  .transform((values) => ({
    name: values.name,
    brand: values.brand,
    category: values.category,
    packagingClass: values.packagingClass,
    measurementUnit: values.measurementUnit,
    measurementValue: values.measurementValue,
    unitsPerPackage: values.unitsPerPackage,
    unitCost: values.unitCost,
    unitPrice: values.unitPrice,
    currency: values.currency,
    stock: values.stockBaseUnits,
    description: values.description,
    quantityLabel: values.quantityLabel || null,
    servingSize: values.servingSize || null,
    requiresKitchen: values.requiresKitchen,
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
  packagingClass: 'Cadastro rápido móvel',
  measurementUnit: 'UN',
  measurementValue: 1,
  unitsPerPackage: 1,
  description: '',
  quantityLabel: '',
  servingSize: '',
  requiresKitchen: false,
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
