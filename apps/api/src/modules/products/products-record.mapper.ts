import type { CurrencyCode } from '@prisma/client'
import { roundCurrency, roundPercent } from '../../common/utils/number-rounding.util'
import { resolveProductCatalogMetadata } from './products-catalog.util'
import type { ProductRecord, ProductRecordOptions, ProductWithComboLike } from './products.types'

export function buildProductRecord(product: ProductWithComboLike, options: ProductRecordOptions): ProductRecord {
  const catalogMetadata = resolveProductCatalogMetadata({
    name: product.name,
    brand: product.brand,
    measurementUnit: product.measurementUnit,
    measurementValue: product.measurementValue,
    quantityLabel: product.quantityLabel,
    imageUrl: product.imageUrl,
    catalogSource: product.catalogSource,
  })
  const originalValues = buildOriginalProductValues(product)
  const convertedValues = buildConvertedProductValues(product, originalValues, options)
  const stockValues = buildProductStockValues(product)

  return {
    ...buildProductIdentityRecord(product, catalogMetadata),
    ...buildProductInventoryRecord(product, stockValues),
    ...buildProductMoneyRecord(product, originalValues, convertedValues, options.displayCurrency),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  }
}

function buildProductIdentityRecord(
  product: ProductWithComboLike,
  catalogMetadata: ReturnType<typeof resolveProductCatalogMetadata>,
): Pick<
  ProductRecord,
  | 'id'
  | 'name'
  | 'barcode'
  | 'brand'
  | 'category'
  | 'packagingClass'
  | 'measurementUnit'
  | 'measurementValue'
  | 'unitsPerPackage'
  | 'isCombo'
  | 'comboDescription'
  | 'comboItems'
  | 'description'
  | 'quantityLabel'
  | 'servingSize'
  | 'imageUrl'
  | 'catalogSource'
> {
  return {
    id: product.id,
    name: product.name,
    barcode: product.barcode,
    brand: catalogMetadata.brand,
    category: product.category,
    packagingClass: product.packagingClass,
    measurementUnit: product.measurementUnit,
    measurementValue: toNumber(product.measurementValue),
    unitsPerPackage: product.unitsPerPackage,
    isCombo: product.isCombo,
    comboDescription: product.comboDescription,
    comboItems: buildComboItems(product),
    description: product.description,
    quantityLabel: catalogMetadata.quantityLabel,
    servingSize: product.servingSize,
    imageUrl: catalogMetadata.imageUrl,
    catalogSource: catalogMetadata.catalogSource,
  }
}

function buildProductInventoryRecord(
  product: ProductWithComboLike,
  stockValues: ReturnType<typeof buildProductStockValues>,
): Pick<
  ProductRecord,
  | 'stockPackages'
  | 'stockLooseUnits'
  | 'stock'
  | 'lowStockThreshold'
  | 'isLowStock'
  | 'requiresKitchen'
  | 'active'
  | 'stockBaseUnits'
> {
  return {
    stockPackages: stockValues.stockPackages,
    stockLooseUnits: stockValues.stockLooseUnits,
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    isLowStock: stockValues.isLowStock,
    requiresKitchen: product.requiresKitchen,
    active: product.active,
    stockBaseUnits: stockValues.stockBaseUnits,
  }
}

function buildProductMoneyRecord(
  product: ProductWithComboLike,
  originalValues: ReturnType<typeof buildOriginalProductValues>,
  convertedValues: ReturnType<typeof buildConvertedProductValues>,
  displayCurrency: CurrencyCode,
): Pick<
  ProductRecord,
  | 'currency'
  | 'displayCurrency'
  | 'unitCost'
  | 'unitPrice'
  | 'originalUnitCost'
  | 'originalUnitPrice'
  | 'inventoryCostValue'
  | 'inventorySalesValue'
  | 'potentialProfit'
  | 'originalInventoryCostValue'
  | 'originalInventorySalesValue'
  | 'originalPotentialProfit'
  | 'marginPercent'
> {
  return {
    currency: product.currency,
    displayCurrency,
    unitCost: convertedValues.unitCost,
    unitPrice: convertedValues.unitPrice,
    originalUnitCost: originalValues.originalUnitCost,
    originalUnitPrice: originalValues.originalUnitPrice,
    inventoryCostValue: convertedValues.inventoryCostValue,
    inventorySalesValue: convertedValues.inventorySalesValue,
    potentialProfit: convertedValues.potentialProfit,
    originalInventoryCostValue: originalValues.originalInventoryCostValue,
    originalInventorySalesValue: originalValues.originalInventorySalesValue,
    originalPotentialProfit: originalValues.originalPotentialProfit,
    marginPercent: convertedValues.marginPercent,
  }
}

function buildComboItems(product: ProductWithComboLike): ProductRecord['comboItems'] {
  return (product.comboComponents ?? []).map((component) => ({
    componentProductId: component.componentProductId,
    componentProductName: component.componentProduct.name,
    packagingClass: component.componentProduct.packagingClass,
    measurementUnit: component.componentProduct.measurementUnit,
    measurementValue: toNumber(component.componentProduct.measurementValue),
    unitsPerPackage: component.componentProduct.unitsPerPackage,
    quantityPackages: component.quantityPackages,
    quantityUnits: component.quantityUnits,
    totalUnits: component.totalUnits,
  }))
}

function buildOriginalProductValues(product: ProductWithComboLike) {
  const originalUnitCost = toNumber(product.unitCost)
  const originalUnitPrice = toNumber(product.unitPrice)
  const originalInventoryCostValue = roundCurrency(originalUnitCost * product.stock)
  const originalInventorySalesValue = roundCurrency(originalUnitPrice * product.stock)

  return {
    originalUnitCost,
    originalUnitPrice,
    originalInventoryCostValue,
    originalInventorySalesValue,
    originalPotentialProfit: roundCurrency(originalInventorySalesValue - originalInventoryCostValue),
  }
}

function buildConvertedProductValues(
  product: ProductWithComboLike,
  originalValues: ReturnType<typeof buildOriginalProductValues>,
  options: ProductRecordOptions,
) {
  const inventoryCostValue = convertProductAmount(product, originalValues.originalInventoryCostValue, options)
  const inventorySalesValue = convertProductAmount(product, originalValues.originalInventorySalesValue, options)
  const potentialProfit = roundCurrency(inventorySalesValue - inventoryCostValue)

  return {
    unitCost: convertProductAmount(product, originalValues.originalUnitCost, options),
    unitPrice: convertProductAmount(product, originalValues.originalUnitPrice, options),
    inventoryCostValue,
    inventorySalesValue,
    potentialProfit,
    marginPercent: inventorySalesValue > 0 ? roundPercent((potentialProfit / inventorySalesValue) * 100) : 0,
  }
}

function convertProductAmount(product: ProductWithComboLike, amount: number, options: ProductRecordOptions) {
  return options.currencyService.convert({
    source: { amount, currency: product.currency },
    targetCurrency: options.displayCurrency,
    snapshot: options.snapshot,
  })
}

function buildProductStockValues(product: ProductWithComboLike) {
  return {
    stockBaseUnits: product.stock,
    stockPackages: product.unitsPerPackage > 1 ? Math.floor(product.stock / product.unitsPerPackage) : 0,
    stockLooseUnits: product.unitsPerPackage > 1 ? product.stock % product.unitsPerPackage : product.stock,
    isLowStock: product.lowStockThreshold != null && product.stock <= product.lowStockThreshold,
  }
}

function toNumber(value: { toNumber(): number } | number) {
  return typeof value === 'number' ? value : value.toNumber()
}
