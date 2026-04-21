import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import type { UpdateProductDto } from './dto/update-product.dto'
import { sanitizeProductBarcode } from './products-barcode.util'

export function buildProductUpdateData(dto: UpdateProductDto, nextIsCombo: boolean) {
  const optionalText = (field: string | undefined, label: string, allowEmpty: boolean) =>
    field !== undefined ? { [label]: sanitizePlainText(field, label, { allowEmpty, rejectFormula: true }) } : {}

  return {
    ...optionalText(dto.name, 'name', false),
    ...(dto.barcode !== undefined ? { barcode: sanitizeProductBarcode(dto.barcode, 'Codigo de barras') } : {}),
    ...optionalText(dto.brand, 'brand', true),
    ...optionalText(dto.category, 'category', false),
    ...optionalText(dto.packagingClass, 'packagingClass', false),
    ...optionalText(dto.measurementUnit, 'measurementUnit', false),
    ...(dto.measurementValue !== undefined ? { measurementValue: dto.measurementValue } : {}),
    ...(dto.unitsPerPackage !== undefined ? { unitsPerPackage: dto.unitsPerPackage } : {}),
    ...optionalText(dto.description, 'description', true),
    ...(dto.isCombo !== undefined ? { isCombo: dto.isCombo } : {}),
    ...(nextIsCombo ? optionalText(dto.comboDescription, 'comboDescription', true) : { comboDescription: null }),
    ...(dto.unitCost !== undefined ? { unitCost: dto.unitCost } : {}),
    ...(dto.unitPrice !== undefined ? { unitPrice: dto.unitPrice } : {}),
    ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
    ...(dto.stock !== undefined ? { stock: dto.stock } : {}),
    ...(dto.active !== undefined ? { active: dto.active } : {}),
    ...(dto.requiresKitchen !== undefined ? { requiresKitchen: dto.requiresKitchen } : {}),
    ...(dto.lowStockThreshold !== undefined ? { lowStockThreshold: dto.lowStockThreshold } : {}),
  }
}
