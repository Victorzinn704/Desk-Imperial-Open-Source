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
  if (!row.name || row.name.length < 2) {
    throw new Error('Informe um nome valido para o produto.')
  }
  if (!row.category || row.category.length < 2) {
    throw new Error('Informe uma categoria valida.')
  }
  if (!row.packagingClass || row.packagingClass.length < 2) {
    throw new Error('Informe uma classe de cadastro valida.')
  }
  if (!row.measurementUnit || row.measurementUnit.length < 1) {
    throw new Error('Informe uma unidade de medida valida.')
  }
  if (Number.isNaN(row.measurementValue) || row.measurementValue <= 0) {
    throw new Error('A medida por item precisa ser numerica e maior que zero.')
  }
  if (Number.isNaN(row.unitsPerPackage) || row.unitsPerPackage < 1) {
    throw new Error('A quantidade por caixa/fardo precisa ser um inteiro maior que zero.')
  }
  if (Number.isNaN(row.unitCost) || row.unitCost < 0) {
    throw new Error('O custo unitario precisa ser numerico e nao negativo.')
  }
  if (Number.isNaN(row.unitPrice) || row.unitPrice < 0) {
    throw new Error('O preco unitario precisa ser numerico e nao negativo.')
  }
  if (Number.isNaN(row.stock) || row.stock < 0) {
    throw new Error('O estoque precisa ser um inteiro nao negativo.')
  }
  if (!isSupportedCurrency(row.currency)) {
    throw new Error('Use BRL, USD ou EUR na coluna de moeda.')
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
    safeName: sanitizePlainText(row.name, 'Nome do produto', { allowEmpty: false, rejectFormula: true })!,
    safeCategory: sanitizePlainText(row.category, 'Categoria', { allowEmpty: false, rejectFormula: true })!,
    safeBrand: sanitizePlainText(row.brand, 'Marca', { allowEmpty: true, rejectFormula: true }),
    safePackagingClass: sanitizePlainText(row.packagingClass, 'Classe de cadastro', {
      allowEmpty: false,
      rejectFormula: true,
    })!,
    safeMeasurementUnit: sanitizePlainText(row.measurementUnit, 'Unidade de medida', {
      allowEmpty: false,
      rejectFormula: true,
    })!,
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

  await prisma.product.upsert({
    where: { userId_name: { userId: workspaceUserId, name: safeName } },
    create: {
      userId: workspaceUserId,
      name: safeName,
      brand: catalogMetadata.brand,
      category: safeCategory,
      packagingClass: safePackagingClass,
      measurementUnit: safeMeasurementUnit,
      measurementValue: row.measurementValue,
      unitsPerPackage: row.unitsPerPackage,
      description: safeDescription,
      quantityLabel: catalogMetadata.quantityLabel,
      catalogSource: catalogMetadata.catalogSource,
      unitCost: row.unitCost,
      unitPrice: row.unitPrice,
      currency: row.currency as CurrencyCode,
      stock: row.stock,
      requiresKitchen: isKitchenCategory(safeCategory),
      active: true,
    },
    update: {
      brand: catalogMetadata.brand,
      category: safeCategory,
      packagingClass: safePackagingClass,
      measurementUnit: safeMeasurementUnit,
      measurementValue: row.measurementValue,
      unitsPerPackage: row.unitsPerPackage,
      description: safeDescription,
      quantityLabel: catalogMetadata.quantityLabel,
      catalogSource: catalogMetadata.catalogSource,
      unitCost: row.unitCost,
      unitPrice: row.unitPrice,
      currency: row.currency as CurrencyCode,
      stock: row.stock,
      ...(isKitchenCategory(safeCategory) ? { requiresKitchen: true } : {}),
      active: true,
    },
  })

  return existing ? 'updated' : 'created'
}
