/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common'
import { AuditSeverity, type CurrencyCode, Prisma } from '@prisma/client'
import { assertOwnerRole, resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { PrismaService } from '../../database/prisma.service'
import { resolveAuthActorUserId } from '../auth/auth-shared.util'
import type { AuthContext } from '../auth/auth.types'
import { CurrencyService, type ExchangeRatesSnapshot } from '../currency/currency.service'
import { AuditLogService } from '../monitoring/audit-log.service'
import { parseProductImportCsv } from './products-import.util'
import type { CreateProductDto } from './dto/create-product.dto'
import type { ListProductsQueryDto } from './dto/list-products.query'
import type { UpdateProductDto } from './dto/update-product.dto'
import { buildProductsResponse, toProductRecord } from './products.types'
import { CacheService } from '../../common/services/cache.service'
import { isKitchenCategory } from '../../common/utils/is-kitchen-category.util'
import { FinanceService } from '../finance/finance.service'
import { normalizeComboItemsInput, assertComboUpdateRules, buildComboItemsPayload } from './products-combo.utils'
import { validateImportRow, upsertImportRow } from './products-import.utils'
import { buildProductUpdateData } from './products-update.utils'
import { sanitizeProductBarcode } from './products-barcode.util'
import { resolveProductCatalogMetadata, sanitizeProductCatalogImageUrl } from './products-catalog.util'

type UploadedCsvFile = {
  buffer: Buffer
  originalname: string
}

const productWithComboInclude = Prisma.validator<Prisma.ProductInclude>()({
  comboComponents: {
    include: {
      componentProduct: {
        select: {
          id: true,
          name: true,
          packagingClass: true,
          measurementUnit: true,
          measurementValue: true,
          unitsPerPackage: true,
          active: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
})

const BULK_RESTOCK_TARGET_STOCK = 24
const BULK_RESTOCK_THRESHOLD_MULTIPLIER = 2

@Injectable()
export class ProductsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CurrencyService) private readonly currencyService: CurrencyService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    private readonly cache: CacheService,
    @Optional() private readonly financeService?: FinanceService,
  ) {}

  async listForUser(auth: AuthContext, query: ListProductsQueryDto) {
    const workspaceUserId = resolveWorkspaceOwnerUserId(auth)
    const includeInactive = auth.role === 'OWNER' && query.includeInactive
    const limit = Math.min(query.limit ?? 200, 2000)
    const shouldUseListCache = !(query.category || query.search || query.cursor || query.limit)
    const cacheScope = includeInactive ? 'all' : 'active'
    const cacheKey = shouldUseListCache ? CacheService.productsKey(workspaceUserId, cacheScope) : null

    if (cacheKey) {
      const cached = await this.cache.get<ReturnType<typeof buildProductsResponse>>(cacheKey)
      if (cached) {
        return cached
      }
    }

    const items = await this.prisma.product.findMany({
      take: limit,
      ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
      include: productWithComboInclude,
      where: {
        userId: workspaceUserId,
        ...(includeInactive ? {} : { active: true }),
        ...(query.category
          ? {
              category: {
                equals: query.category.trim(),
                mode: 'insensitive',
              },
            }
          : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search.trim(), mode: 'insensitive' } },
                { barcode: { contains: query.search.trim(), mode: 'insensitive' } },
                { brand: { contains: query.search.trim(), mode: 'insensitive' } },
                { category: { contains: query.search.trim(), mode: 'insensitive' } },
                { packagingClass: { contains: query.search.trim(), mode: 'insensitive' } },
                { quantityLabel: { contains: query.search.trim(), mode: 'insensitive' } },
                { servingSize: { contains: query.search.trim(), mode: 'insensitive' } },
                { catalogSource: { contains: query.search.trim(), mode: 'insensitive' } },
                { description: { contains: query.search.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: includeInactive ? [{ active: 'desc' }, { createdAt: 'desc' }] : [{ createdAt: 'desc' }],
    })
    const snapshot = await this.resolveProductsSnapshot(items, auth.preferredCurrency)

    const result = buildProductsResponse(items, {
      displayCurrency: auth.preferredCurrency,
      currencyService: this.currencyService,
      snapshot,
      ratesUpdatedAt: snapshot.updatedAt,
    })

    if (cacheKey) {
      void this.cache.set(cacheKey, result, 300)
    }

    return result
  }

  async invalidateProductsCache(userId: string) {
    await Promise.all([
      this.cache.del(CacheService.productsKey(userId, 'active')),
      this.cache.del(CacheService.productsKey(userId, 'all')),
    ])
  }

  private refreshFinanceSummary(workspaceUserId: string) {
    if (this.financeService) {
      void this.financeService.invalidateAndWarmSummary(workspaceUserId)
      return
    }

    void this.cache.del(CacheService.financeKey(workspaceUserId))
  }

  async createForUser(auth: AuthContext, dto: CreateProductDto, context: RequestContext) {
    assertOwnerRole(auth, 'Apenas o dono pode cadastrar produtos.')
    const workspaceUserId = resolveWorkspaceOwnerUserId(auth)
    const isCombo = dto.isCombo ?? false
    const normalizedComboItems = normalizeComboItemsInput(dto.comboItems)
    const safeName = sanitizePlainText(dto.name, 'Nome do produto', {
      allowEmpty: false,
      rejectFormula: true,
    })!
    const safeBrand = sanitizePlainText(dto.brand, 'Marca', {
      allowEmpty: true,
      rejectFormula: true,
    })
    const safeCategory = sanitizePlainText(dto.category, 'Categoria', {
      allowEmpty: false,
      rejectFormula: true,
    })!
    const safePackagingClass = sanitizePlainText(dto.packagingClass, 'Classe de cadastro', {
      allowEmpty: false,
      rejectFormula: true,
    })!
    const safeMeasurementUnit = sanitizePlainText(dto.measurementUnit, 'Unidade de medida', {
      allowEmpty: false,
      rejectFormula: true,
    })!
    const safeDescription = sanitizePlainText(dto.description, 'Descricao', {
      allowEmpty: true,
      rejectFormula: true,
    })
    const safeQuantityLabel = sanitizePlainText(dto.quantityLabel, 'Quantidade do catalogo', {
      allowEmpty: true,
      rejectFormula: true,
    })
    const safeServingSize = sanitizePlainText(dto.servingSize, 'Porcao do catalogo', {
      allowEmpty: true,
      rejectFormula: true,
    })
    const safeImageUrl = sanitizeProductCatalogImageUrl(dto.imageUrl)
    const safeCatalogSource = sanitizePlainText(dto.catalogSource, 'Origem do catalogo', {
      allowEmpty: true,
      rejectFormula: true,
    })
    const catalogMetadata = resolveProductCatalogMetadata({
      name: safeName,
      brand: safeBrand,
      measurementUnit: safeMeasurementUnit,
      measurementValue: dto.measurementValue,
      quantityLabel: safeQuantityLabel,
      imageUrl: safeImageUrl,
      catalogSource: safeCatalogSource,
    })

    if (isCombo && normalizedComboItems.length === 0) {
      throw new BadRequestException('Produtos do tipo combo precisam informar pelo menos um componente.')
    }

    try {
      const product = await this.prisma.$transaction(async (transaction) => {
        const createdProduct = await transaction.product.create({
          data: {
            userId: workspaceUserId,
            name: safeName,
            barcode: sanitizeProductBarcode(dto.barcode, 'Codigo de barras'),
            brand: catalogMetadata.brand,
            category: safeCategory,
            packagingClass: safePackagingClass,
            measurementUnit: safeMeasurementUnit,
            measurementValue: dto.measurementValue,
            unitsPerPackage: dto.unitsPerPackage,
            isCombo,
            comboDescription: isCombo
              ? sanitizePlainText(dto.comboDescription, 'Descricao do combo', {
                  allowEmpty: true,
                  rejectFormula: true,
                })
              : null,
            description: safeDescription,
            quantityLabel: catalogMetadata.quantityLabel,
            servingSize: safeServingSize,
            imageUrl: catalogMetadata.imageUrl,
            catalogSource: catalogMetadata.catalogSource,
            unitCost: dto.unitCost,
            unitPrice: dto.unitPrice,
            currency: dto.currency,
            stock: dto.stock,
            lowStockThreshold: dto.lowStockThreshold ?? null,
            // requiresKitchen: explicit DTO value takes priority;
            // if not sent, infer from category name as safety net
            requiresKitchen: dto.requiresKitchen ?? isKitchenCategory(dto.category),
            active: true,
          },
        })

        if (isCombo) {
          const comboItemsPayload = await buildComboItemsPayload(
            transaction,
            workspaceUserId,
            createdProduct.id,
            normalizedComboItems,
          )

          await transaction.productComboItem.createMany({
            data: comboItemsPayload,
          })
        }

        return transaction.product.findUniqueOrThrow({
          where: { id: createdProduct.id },
          include: productWithComboInclude,
        })
      })
      const snapshot = await this.currencyService.getSnapshot()

      await this.auditLogService.record({
        actorUserId: resolveAuthActorUserId(auth),
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
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      this.refreshFinanceSummary(workspaceUserId)
      void this.invalidateProductsCache(workspaceUserId)

      return {
        product: toProductRecord(product, {
          displayCurrency: auth.preferredCurrency,
          currencyService: this.currencyService,
          snapshot,
        }),
      }
    } catch (error) {
      handleProductConflict(error)
    }
  }

  async updateForUser(auth: AuthContext, productId: string, dto: UpdateProductDto, context: RequestContext) {
    assertOwnerRole(auth, 'Apenas o dono pode editar produtos.')
    const workspaceUserId = resolveWorkspaceOwnerUserId(auth)
    const existingProduct = await this.requireOwnedProduct(workspaceUserId, productId)
    const normalizedComboItems = dto.comboItems ? normalizeComboItemsInput(dto.comboItems) : null
    const nextIsCombo = dto.isCombo ?? existingProduct.isCombo

    assertComboUpdateRules(nextIsCombo, dto, normalizedComboItems, existingProduct.isCombo)

    try {
      const product = await this.prisma.$transaction(async (transaction) => {
        const updatedProduct = await transaction.product.update({
          where: { id: existingProduct.id },
          data: buildProductUpdateData(dto, nextIsCombo),
        })

        if (!nextIsCombo) {
          await transaction.productComboItem.deleteMany({
            where: {
              comboProductId: updatedProduct.id,
            },
          })
        } else if (normalizedComboItems) {
          const comboItemsPayload = await buildComboItemsPayload(
            transaction,
            workspaceUserId,
            updatedProduct.id,
            normalizedComboItems,
          )

          await transaction.productComboItem.deleteMany({
            where: {
              comboProductId: updatedProduct.id,
            },
          })
          await transaction.productComboItem.createMany({
            data: comboItemsPayload,
          })
        }

        return transaction.product.findUniqueOrThrow({
          where: { id: updatedProduct.id },
          include: productWithComboInclude,
        })
      })
      const snapshot = await this.currencyService.getSnapshot()

      await this.auditLogService.record({
        actorUserId: resolveAuthActorUserId(auth),
        event: 'product.updated',
        resource: 'product',
        resourceId: product.id,
        metadata: {
          updatedFields: Object.keys(dto),
          isCombo: product.isCombo,
          comboItemsCount: product.comboComponents.length,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      this.refreshFinanceSummary(workspaceUserId)
      void this.invalidateProductsCache(workspaceUserId)

      return {
        product: toProductRecord(product, {
          displayCurrency: auth.preferredCurrency,
          currencyService: this.currencyService,
          snapshot,
        }),
      }
    } catch (error) {
      handleProductConflict(error)
    }
  }

  async bulkRestockForUser(
    auth: AuthContext,
    dto: {
      mode?: 'low_stock' | 'all_active'
      targetStock?: number
    },
    context: RequestContext,
  ) {
    assertOwnerRole(auth, 'Apenas o dono pode reabastecer produtos em massa.')
    const workspaceUserId = resolveWorkspaceOwnerUserId(auth)
    const mode = dto.mode ?? 'low_stock'
    const targetStock = Math.max(1, dto.targetStock ?? BULK_RESTOCK_TARGET_STOCK)

    const activeProducts = await this.prisma.product.findMany({
      where: {
        userId: workspaceUserId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        stock: true,
        lowStockThreshold: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const selectedProducts = activeProducts.filter((product) => {
      const desiredStock = Math.max(
        targetStock,
        product.lowStockThreshold != null ? product.lowStockThreshold * BULK_RESTOCK_THRESHOLD_MULTIPLIER : 0,
      )

      if (mode === 'all_active') {
        return product.stock < desiredStock
      }

      return product.stock <= 0 || product.stock < targetStock || (product.lowStockThreshold != null && product.stock <= product.lowStockThreshold)
    })

    if (selectedProducts.length === 0) {
      return {
        summary: {
          mode,
          targetStock,
          matchedCount: 0,
          updatedCount: 0,
        },
        products: [],
      }
    }

    const updates = selectedProducts.map((product) => {
      const desiredStock = Math.max(
        targetStock,
        product.lowStockThreshold != null ? product.lowStockThreshold * BULK_RESTOCK_THRESHOLD_MULTIPLIER : 0,
      )

      return {
        id: product.id,
        name: product.name,
        previousStock: product.stock,
        nextStock: desiredStock,
      }
    })

    await this.prisma.$transaction(
      updates.map((product) =>
        this.prisma.product.update({
          where: { id: product.id },
          data: { stock: product.nextStock },
        }),
      ),
    )

    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
      event: 'product.bulk_restocked',
      resource: 'product',
      resourceId: workspaceUserId,
      metadata: {
        mode,
        targetStock,
        updatedCount: updates.length,
        productIds: updates.map((product) => product.id),
      },
      severity: AuditSeverity.INFO,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    this.refreshFinanceSummary(workspaceUserId)
    void this.invalidateProductsCache(workspaceUserId)

    return {
      summary: {
        mode,
        targetStock,
        matchedCount: selectedProducts.length,
        updatedCount: updates.length,
      },
      products: updates,
    }
  }

  async archiveForUser(auth: AuthContext, productId: string, context: RequestContext) {
    return this.toggleActiveState(auth, productId, false, context)
  }

  async restoreForUser(auth: AuthContext, productId: string, context: RequestContext) {
    return this.toggleActiveState(auth, productId, true, context)
  }

  async deleteForUser(auth: AuthContext, productId: string, context: RequestContext) {
    assertOwnerRole(auth, 'Apenas o dono pode excluir produtos.')
    const workspaceUserId = resolveWorkspaceOwnerUserId(auth)
    const existingProduct = await this.requireOwnedProduct(workspaceUserId, productId)

    if (existingProduct.active) {
      throw new ConflictException('Arquive o produto antes de excluir em definitivo.')
    }

    const combosUsingProduct = await this.prisma.productComboItem.findMany({
      where: {
        componentProductId: existingProduct.id,
      },
      select: {
        comboProduct: {
          select: {
            id: true,
            name: true,
            active: true,
          },
        },
      },
      take: 5,
    })

    if (combosUsingProduct.length > 0) {
      const comboNames = [...new Set(combosUsingProduct.map((item) => item.comboProduct.name).filter(Boolean))]
      throw new ConflictException(
        `Este produto ainda compõe ${comboNames.length > 1 ? 'combos' : 'um combo'}: ${comboNames.join(', ')}. Atualize ou remova esses combos antes de excluir em definitivo.`,
      )
    }

    await this.prisma.product.delete({
      where: { id: existingProduct.id },
    })

    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
      event: 'product.deleted',
      resource: 'product',
      resourceId: existingProduct.id,
      severity: AuditSeverity.WARN,
      metadata: {
        name: existingProduct.name,
        category: existingProduct.category,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    this.refreshFinanceSummary(workspaceUserId)
    void this.invalidateProductsCache(workspaceUserId)

    return {
      success: true,
      deletedProductId: existingProduct.id,
    }
  }

  async importForUser(auth: AuthContext, file: UploadedCsvFile | undefined, context: RequestContext) {
    assertOwnerRole(auth, 'Apenas o dono pode importar produtos.')
    const workspaceUserId = resolveWorkspaceOwnerUserId(auth)
    if (!file) {
      throw new BadRequestException('Envie um arquivo CSV para importar os produtos.')
    }

    const parsedRows = this.parseImportCsvOrThrow(file)
    if (!parsedRows.length) {
      throw new BadRequestException('O arquivo CSV esta vazio ou sem linhas validas.')
    }

    let createdCount = 0
    let updatedCount = 0
    const errors: Array<{ line: number; message: string }> = []

    for (const row of parsedRows) {
      try {
        validateImportRow(row)
        const result = await upsertImportRow(this.prisma, workspaceUserId, row)
        if (result === 'updated') {
          updatedCount += 1
        } else {
          createdCount += 1
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha inesperada ao importar a linha.'
        errors.push({ line: row.line, message })
      }
    }

    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
      event: 'product.imported',
      resource: 'product',
      metadata: {
        fileName: file.originalname,
        totalRows: parsedRows.length,
        createdCount,
        updatedCount,
        failedCount: errors.length,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    this.refreshFinanceSummary(workspaceUserId)
    void this.invalidateProductsCache(workspaceUserId)

    return {
      summary: {
        totalRows: parsedRows.length,
        createdCount,
        updatedCount,
        failedCount: errors.length,
      },
      errors,
    }
  }

  private async toggleActiveState(auth: AuthContext, productId: string, active: boolean, context: RequestContext) {
    assertOwnerRole(auth, 'Apenas o dono pode alterar o status dos produtos.')
    const workspaceUserId = resolveWorkspaceOwnerUserId(auth)
    const existingProduct = await this.requireOwnedProduct(workspaceUserId, productId)
    await this.prisma.product.update({
      where: { id: existingProduct.id },
      data: {
        active,
      },
    })
    const product = await this.prisma.product.findUniqueOrThrow({
      where: { id: existingProduct.id },
      include: productWithComboInclude,
    })

    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
      event: active ? 'product.restored' : 'product.archived',
      resource: 'product',
      resourceId: product.id,
      metadata: {
        name: product.name,
        active,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    this.refreshFinanceSummary(workspaceUserId)
    void this.invalidateProductsCache(workspaceUserId)

    const snapshot = await this.currencyService.getSnapshot()

    return {
      product: toProductRecord(product, {
        displayCurrency: auth.preferredCurrency,
        currencyService: this.currencyService,
        snapshot,
      }),
    }
  }

  private parseImportCsvOrThrow(file: UploadedCsvFile) {
    try {
      return parseProductImportCsv(file.buffer.toString('utf-8'))
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Nao foi possivel ler o CSV enviado.')
    }
  }

  private async resolveProductsSnapshot(
    items: Array<{ currency: CurrencyCode }>,
    displayCurrency: CurrencyCode,
  ): Promise<ExchangeRatesSnapshot> {
    if (items.length === 0 || items.every((item) => item.currency === displayCurrency)) {
      return { updatedAt: null, source: 'live', notice: null, rates: {} }
    }
    return this.currencyService.getSnapshot()
  }

  private async requireOwnedProduct(userId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, userId },
    })

    if (!product) {
      throw new NotFoundException('Produto nao encontrado para este usuario.')
    }

    return product
  }
}

function handleProductConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ConflictException('Ja existe um produto com este nome ou codigo de barras para a sua conta.')
  }

  throw error
}
