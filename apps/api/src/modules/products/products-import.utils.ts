import type { CurrencyCode } from '@prisma/client'
import type { PrismaService } from '../../database/prisma.service'
import { isKitchenCategory } from '../../common/utils/is-kitchen-category.util'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import type { ProductImportRow } from './products-import.util'
import { resolveProductCatalogMetadata } from './products-catalog.util'

export function isSupportedCurrency(value: string) {
  return value === 'BRL' || value === 'USD' || value === 'EUR'
}

export function validateImportRow(row: ProductImportRow) {
  for (const rule of buildImportRowValidationRules(row)) {
    if (rule.invalid) {
      throw new Error(rule.message)
    }
  }
}

export function sanitizeImportRow(row: {
  name: string
  category: string
  brand: string | null
  packagingClass: string
  measurementUnit: string
  description: string | null
}) {
  return {
    safeName: sanitizeRequiredImportText(row.name, 'Nome do produto'),
    safeCategory: sanitizeRequiredImportText(row.category, 'Categoria'),
    safeBrand: sanitizePlainText(row.brand, 'Marca', { allowEmpty: true, rejectFormula: true }),
    safePackagingClass: sanitizeRequiredImportText(row.packagingClass, 'Classe de cadastro'),
    safeMeasurementUnit: sanitizeRequiredImportText(row.measurementUnit, 'Unidade de medida'),
    safeDescription: sanitizePlainText(row.description, 'Descricao', { allowEmpty: true, rejectFormula: true }),
  }
}

export async function upsertImportRow(
  prisma: PrismaService,
  workspaceUserId: string,
  row: ProductImportRow,
): Promise<'created' | 'updated'> {
  const { safeName, safeCategory, safeBrand, safePackagingClass, safeMeasurementUnit, safeDescription } =
    sanitizeImportRow(row)
  const catalogMetadata = resolveProductCatalogMetadata({
    name: safeName,
    brand: safeBrand,
    measurementUnit: safeMeasurementUnit,
    measurementValue: row.measurementValue,
    quantityLabel: null,
    imageUrl: null,
    catalogSource: null,
  })

  const existing = await prisma.product.findUnique({
    where: { userId_name: { userId: workspaceUserId, name: safeName } },
  })
  const productPayload = {
    active: true,
    brand: catalogMetadata.brand,
    catalogSource: catalogMetadata.catalogSource,
    category: safeCategory,
    currency: row.currency as CurrencyCode,
    description: safeDescription,
    measurementUnit: safeMeasurementUnit,
    measurementValue: row.measurementValue,
    packagingClass: safePackagingClass,
    quantityLabel: catalogMetadata.quantityLabel,
    stock: row.stock,
    unitCost: row.unitCost,
    unitPrice: row.unitPrice,
    unitsPerPackage: row.unitsPerPackage,
  }

  await prisma.product.upsert({
    where: { userId_name: { userId: workspaceUserId, name: safeName } },
    create: {
      ...productPayload,
      userId: workspaceUserId,
      name: safeName,
      requiresKitchen: isKitchenCategory(safeCategory),
    },
    update: {
      ...productPayload,
      ...(isKitchenCategory(safeCategory) ? { requiresKitchen: true } : {}),
    },
  })

  return existing ? 'updated' : 'created'
}

function buildImportRowValidationRules(row: ProductImportRow) {
  return [
    { invalid: !hasMinimumLength(row.name, 2), message: 'Informe um nome valido para o produto.' },
    { invalid: !hasMinimumLength(row.category, 2), message: 'Informe uma categoria valida.' },
    { invalid: !hasMinimumLength(row.packagingClass, 2), message: 'Informe uma classe de cadastro valida.' },
    { invalid: !hasMinimumLength(row.measurementUnit, 1), message: 'Informe uma unidade de medida valida.' },
    {
      invalid: !isPositiveNumber(row.measurementValue),
      message: 'A medida por item precisa ser numerica e maior que zero.',
    },
    {
      invalid: !isAtLeast(row.unitsPerPackage, 1),
      message: 'A quantidade por caixa/fardo precisa ser um inteiro maior que zero.',
    },
    { invalid: !isNonNegativeNumber(row.unitCost), message: 'O custo unitario precisa ser numerico e nao negativo.' },
    { invalid: !isNonNegativeNumber(row.unitPrice), message: 'O preco unitario precisa ser numerico e nao negativo.' },
    { invalid: !isNonNegativeNumber(row.stock), message: 'O estoque precisa ser um inteiro nao negativo.' },
    { invalid: !isSupportedCurrency(row.currency), message: 'Use BRL, USD ou EUR na coluna de moeda.' },
  ]
}

function hasMinimumLength(value: string | null | undefined, minimumLength: number) {
  return Boolean(value && value.length >= minimumLength)
}

function isPositiveNumber(value: number) {
  return !Number.isNaN(value) && value > 0
}

function isAtLeast(value: number, minimumValue: number) {
  return !Number.isNaN(value) && value >= minimumValue
}

function isNonNegativeNumber(value: number) {
  return isAtLeast(value, 0)
}

function sanitizeRequiredImportText(value: string, fieldLabel: string) {
  const sanitized = sanitizePlainText(value, fieldLabel, { allowEmpty: false, rejectFormula: true })

  if (!sanitized) {
    throw new Error(`${fieldLabel} e obrigatorio.`)
  }

  return sanitized
}
