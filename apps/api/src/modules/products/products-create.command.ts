import { BadRequestException } from '@nestjs/common'
import { assertOwnerRole, resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import { isKitchenCategory } from '../../common/utils/is-kitchen-category.util'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { resolveAuthActorUserId } from '../auth/auth-shared.util'
import type { AuthContext } from '../auth/auth.types'
import type { CreateProductDto } from './dto/create-product.dto'
import { buildComboItemsPayload, normalizeComboItemsInput } from './products-combo.utils'
import { sanitizeProductBarcode } from './products-barcode.util'
import { resolveProductCatalogMetadata, sanitizeProductCatalogImageUrl } from './products-catalog.util'
import { toProductRecord } from './products-response.mapper'
import { type ProductsServiceDependencies, productWithComboInclude } from './products-service.types'
import {
  handleProductConflict,
  invalidateProductsCache,
  refreshProductsFinanceSummary,
} from './products-service.shared'

type CreateProductInput = {
  auth: AuthContext
  dto: CreateProductDto
  context: RequestContext
}

type NormalizedComboItem = ReturnType<typeof normalizeComboItemsInput>[number]

type SanitizedCreateProduct = {
  data: ReturnType<typeof buildCreateProductData>
  isCombo: boolean
  normalizedComboItems: NormalizedComboItem[]
}

export async function createProductForUser(deps: ProductsServiceDependencies, input: CreateProductInput) {
  assertOwnerRole(input.auth, 'Apenas o dono pode cadastrar produtos.')
  const workspaceUserId = resolveWorkspaceOwnerUserId(input.auth)
  const sanitized = sanitizeCreateProduct(input.dto, workspaceUserId)

  assertComboCanBeCreated(sanitized)

  try {
    const product = await persistCreatedProduct(deps, workspaceUserId, sanitized)
    const snapshot = await deps.currencyService.getSnapshot()

    await recordProductCreatedAudit(deps, input, product)
    refreshProductsFinanceSummary(deps, workspaceUserId)
    void invalidateProductsCache(deps, workspaceUserId)

    return {
      product: toProductRecord(product, {
        displayCurrency: input.auth.preferredCurrency,
        currencyService: deps.currencyService,
        snapshot,
      }),
    }
  } catch (error) {
    handleProductConflict(error)
  }
}

function sanitizeCreateProduct(dto: CreateProductDto, workspaceUserId: string): SanitizedCreateProduct {
  const isCombo = dto.isCombo ?? false
  const normalizedComboItems = normalizeComboItemsInput(dto.comboItems)
  const safeName = requireSafeText(dto.name, 'Nome do produto')
  const safeBrand = optionalSafeText(dto.brand, 'Marca')
  const safeCategory = requireSafeText(dto.category, 'Categoria')
  const safeMeasurementUnit = requireSafeText(dto.measurementUnit, 'Unidade de medida')
  const safeQuantityLabel = optionalSafeText(dto.quantityLabel, 'Quantidade do catalogo')
  const safeImageUrl = sanitizeProductCatalogImageUrl(dto.imageUrl)
  const safeCatalogSource = optionalSafeText(dto.catalogSource, 'Origem do catalogo')
  const catalogMetadata = resolveProductCatalogMetadata({
    name: safeName,
    brand: safeBrand,
    measurementUnit: safeMeasurementUnit,
    measurementValue: dto.measurementValue,
    quantityLabel: safeQuantityLabel,
    imageUrl: safeImageUrl,
    catalogSource: safeCatalogSource,
  })

  return {
    isCombo,
    normalizedComboItems,
    data: buildCreateProductData({
      dto,
      workspaceUserId,
      isCombo,
      safeName,
      safeCategory,
      safeMeasurementUnit,
      catalogMetadata,
    }),
  }
}

function buildCreateProductData(input: {
  dto: CreateProductDto
  workspaceUserId: string
  isCombo: boolean
  safeName: string
  safeCategory: string
  safeMeasurementUnit: string
  catalogMetadata: ReturnType<typeof resolveProductCatalogMetadata>
}) {
  const { dto, workspaceUserId, isCombo, safeName, safeCategory, safeMeasurementUnit, catalogMetadata } = input

  return {
    userId: workspaceUserId,
    name: safeName,
    barcode: sanitizeProductBarcode(dto.barcode, 'Codigo de barras'),
    brand: catalogMetadata.brand,
    category: safeCategory,
    packagingClass: requireSafeText(dto.packagingClass, 'Classe de cadastro'),
    measurementUnit: safeMeasurementUnit,
    measurementValue: dto.measurementValue,
    unitsPerPackage: dto.unitsPerPackage,
    isCombo,
    comboDescription: isCombo ? optionalSafeText(dto.comboDescription, 'Descricao do combo') : null,
    description: optionalSafeText(dto.description, 'Descricao'),
    quantityLabel: catalogMetadata.quantityLabel,
    servingSize: optionalSafeText(dto.servingSize, 'Porcao do catalogo'),
    imageUrl: catalogMetadata.imageUrl,
    catalogSource: catalogMetadata.catalogSource,
    unitCost: dto.unitCost,
    unitPrice: dto.unitPrice,
    currency: dto.currency,
    stock: dto.stock,
    lowStockThreshold: dto.lowStockThreshold ?? null,
    requiresKitchen: dto.requiresKitchen ?? isKitchenCategory(dto.category),
    active: true,
  }
}

function assertComboCanBeCreated({ isCombo, normalizedComboItems }: SanitizedCreateProduct) {
  if (isCombo && normalizedComboItems.length === 0) {
    throw new BadRequestException('Produtos do tipo combo precisam informar pelo menos um componente.')
  }
}

async function persistCreatedProduct(
  deps: ProductsServiceDependencies,
  workspaceUserId: string,
  sanitized: SanitizedCreateProduct,
) {
  return deps.prisma.$transaction(async (transaction) => {
    const createdProduct = await transaction.product.create({
      data: sanitized.data,
    })

    if (sanitized.isCombo) {
      const comboItemsPayload = await buildComboItemsPayload(
        transaction,
        workspaceUserId,
        createdProduct.id,
        sanitized.normalizedComboItems,
      )
      await transaction.productComboItem.createMany({ data: comboItemsPayload })
    }

    return transaction.product.findUniqueOrThrow({
      where: { id: createdProduct.id },
      include: productWithComboInclude,
    })
  })
}

async function recordProductCreatedAudit(
  deps: ProductsServiceDependencies,
  input: CreateProductInput,
  product: Awaited<ReturnType<typeof persistCreatedProduct>>,
) {
  await deps.auditLogService.record({
    actorUserId: resolveAuthActorUserId(input.auth),
    event: 'product.created',
    resource: 'product',
    resourceId: product.id,
    metadata: {
      name: product.name,
      barcode: product.barcode,
      brand: product.brand,
      category: product.category,
      packagingClass: product.packagingClass,
      measurementUnit: product.measurementUnit,
      measurementValue: Number(product.measurementValue),
      unitsPerPackage: product.unitsPerPackage,
      quantityLabel: product.quantityLabel,
      servingSize: product.servingSize,
      imageUrl: product.imageUrl,
      catalogSource: product.catalogSource,
      isCombo: product.isCombo,
      comboItemsCount: product.comboComponents.length,
      stock: product.stock,
      currency: product.currency,
    },
    ipAddress: input.context.ipAddress,
    userAgent: input.context.userAgent,
  })
}

function requireSafeText(value: string | undefined, field: string) {
  const sanitized = sanitizePlainText(value, field, { allowEmpty: false, rejectFormula: true })

  if (!sanitized) {
    throw new BadRequestException(`${field} e obrigatorio.`)
  }

  return sanitized
}

function optionalSafeText(value: string | null | undefined, field: string) {
  return sanitizePlainText(value, field, { allowEmpty: true, rejectFormula: true })
}
