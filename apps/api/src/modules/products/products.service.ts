import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { CurrencyCode } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { assertOwnerRole, resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { CurrencyService } from '../currency/currency.service'
import type { ExchangeRatesSnapshot } from '../currency/currency.service'
import { AuditLogService } from '../monitoring/audit-log.service'
import { parseProductImportCsv } from './products-import.util'
import type { CreateProductDto } from './dto/create-product.dto'
import type { ListProductsQueryDto } from './dto/list-products.query'
import type { UpdateProductDto } from './dto/update-product.dto'
import type { ProductComboItemDto } from './dto/product-combo-item.dto'
import { buildProductsResponse, toProductRecord } from './products.types'
import { CacheService } from '../../common/services/cache.service'
import { isKitchenCategory } from '../../common/utils/is-kitchen-category.util'

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

@Injectable()
export class ProductsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CurrencyService) private readonly currencyService: CurrencyService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    private readonly cache: CacheService,
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
      if (cached) return cached
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
                { brand: { contains: query.search.trim(), mode: 'insensitive' } },
                { category: { contains: query.search.trim(), mode: 'insensitive' } },
                { packagingClass: { contains: query.search.trim(), mode: 'insensitive' } },
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

  async createForUser(auth: AuthContext, dto: CreateProductDto, context: RequestContext) {
    assertOwnerRole(auth, 'Apenas o dono pode cadastrar produtos.')
    const workspaceUserId = resolveWorkspaceOwnerUserId(auth)
    const isCombo = dto.isCombo ?? false
    const normalizedComboItems = this.normalizeComboItemsInput(dto.comboItems)

    if (isCombo && normalizedComboItems.length === 0) {
      throw new BadRequestException('Produtos do tipo combo precisam informar pelo menos um componente.')
    }

    try {
      const product = await this.prisma.$transaction(async (transaction) => {
        const createdProduct = await transaction.product.create({
          data: {
            userId: workspaceUserId,
            name: sanitizePlainText(dto.name, 'Nome do produto', {
              allowEmpty: false,
              rejectFormula: true,
            })!,
            brand: sanitizePlainText(dto.brand, 'Marca', {
              allowEmpty: true,
              rejectFormula: true,
            }),
            category: sanitizePlainText(dto.category, 'Categoria', {
              allowEmpty: false,
              rejectFormula: true,
            })!,
            packagingClass: sanitizePlainText(dto.packagingClass, 'Classe de cadastro', {
              allowEmpty: false,
              rejectFormula: true,
            })!,
            measurementUnit: sanitizePlainText(dto.measurementUnit, 'Unidade de medida', {
              allowEmpty: false,
              rejectFormula: true,
            })!,
            measurementValue: dto.measurementValue,
            unitsPerPackage: dto.unitsPerPackage,
            isCombo,
            comboDescription: isCombo
              ? sanitizePlainText(dto.comboDescription, 'Descricao do combo', {
                  allowEmpty: true,
                  rejectFormula: true,
                })
              : null,
            description: sanitizePlainText(dto.description, 'Descricao', {
              allowEmpty: true,
              rejectFormula: true,
            }),
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
          const comboItemsPayload = await this.buildComboItemsPayload(
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
        actorUserId: auth.userId,
        event: 'product.created',
        resource: 'product',
        resourceId: product.id,
        metadata: {
          name: product.name,
          brand: product.brand,
          category: product.category,
          packagingClass: product.packagingClass,
          measurementUnit: product.measurementUnit,
          measurementValue: Number(product.measurementValue),
          unitsPerPackage: product.unitsPerPackage,
          isCombo: product.isCombo,
          comboItemsCount: product.comboComponents.length,
          stock: product.stock,
          currency: product.currency,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      void this.cache.del(CacheService.financeKey(workspaceUserId))
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
    const normalizedComboItems = dto.comboItems ? this.normalizeComboItemsInput(dto.comboItems) : null
    const nextIsCombo = dto.isCombo ?? existingProduct.isCombo

    if (!nextIsCombo && normalizedComboItems && normalizedComboItems.length > 0) {
      throw new BadRequestException('Remova os componentes ou marque o produto como combo antes de salvar.')
    }

    if (nextIsCombo && dto.comboItems !== undefined && normalizedComboItems && normalizedComboItems.length === 0) {
      throw new BadRequestException('Produtos do tipo combo precisam de pelo menos um componente.')
    }

    if (dto.isCombo === true && !existingProduct.isCombo && dto.comboItems === undefined) {
      throw new BadRequestException('Ao ativar um combo, informe os itens de composição.')
    }

    try {
      const product = await this.prisma.$transaction(async (transaction) => {
        const updatedProduct = await transaction.product.update({
          where: { id: existingProduct.id },
          data: {
            ...(dto.name !== undefined
              ? {
                  name: sanitizePlainText(dto.name, 'Nome do produto', {
                    allowEmpty: false,
                    rejectFormula: true,
                  })!,
                }
              : {}),
            ...(dto.brand !== undefined
              ? {
                  brand: sanitizePlainText(dto.brand, 'Marca', {
                    allowEmpty: true,
                    rejectFormula: true,
                  }),
                }
              : {}),
            ...(dto.category !== undefined
              ? {
                  category: sanitizePlainText(dto.category, 'Categoria', {
                    allowEmpty: false,
                    rejectFormula: true,
                  })!,
                }
              : {}),
            ...(dto.packagingClass !== undefined
              ? {
                  packagingClass: sanitizePlainText(dto.packagingClass, 'Classe de cadastro', {
                    allowEmpty: false,
                    rejectFormula: true,
                  })!,
                }
              : {}),
            ...(dto.measurementUnit !== undefined
              ? {
                  measurementUnit: sanitizePlainText(dto.measurementUnit, 'Unidade de medida', {
                    allowEmpty: false,
                    rejectFormula: true,
                  })!,
                }
              : {}),
            ...(dto.measurementValue !== undefined ? { measurementValue: dto.measurementValue } : {}),
            ...(dto.unitsPerPackage !== undefined ? { unitsPerPackage: dto.unitsPerPackage } : {}),
            ...(dto.description !== undefined
              ? {
                  description: sanitizePlainText(dto.description, 'Descricao', {
                    allowEmpty: true,
                    rejectFormula: true,
                  }),
                }
              : {}),
            ...(dto.isCombo !== undefined ? { isCombo: dto.isCombo } : {}),
            ...(nextIsCombo
              ? dto.comboDescription !== undefined
                ? {
                    comboDescription: sanitizePlainText(dto.comboDescription, 'Descricao do combo', {
                      allowEmpty: true,
                      rejectFormula: true,
                    }),
                  }
                : {}
              : {
                  comboDescription: null,
                }),
            ...(dto.unitCost !== undefined ? { unitCost: dto.unitCost } : {}),
            ...(dto.unitPrice !== undefined ? { unitPrice: dto.unitPrice } : {}),
            ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
            ...(dto.stock !== undefined ? { stock: dto.stock } : {}),
            ...(dto.active !== undefined ? { active: dto.active } : {}),
            ...(dto.requiresKitchen !== undefined ? { requiresKitchen: dto.requiresKitchen } : {}),
          },
        })

        if (!nextIsCombo) {
          await transaction.productComboItem.deleteMany({
            where: {
              comboProductId: updatedProduct.id,
            },
          })
        } else if (normalizedComboItems) {
          const comboItemsPayload = await this.buildComboItemsPayload(
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
        actorUserId: auth.userId,
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

      void this.cache.del(CacheService.financeKey(workspaceUserId))
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

  async archiveForUser(auth: AuthContext, productId: string, context: RequestContext) {
    return this.toggleActiveState(auth, productId, false, context)
  }

  async restoreForUser(auth: AuthContext, productId: string, context: RequestContext) {
    return this.toggleActiveState(auth, productId, true, context)
  }

  async importForUser(auth: AuthContext, file: UploadedCsvFile | undefined, context: RequestContext) {
    assertOwnerRole(auth, 'Apenas o dono pode importar produtos.')
    const workspaceUserId = resolveWorkspaceOwnerUserId(auth)
    if (!file) {
      throw new BadRequestException('Envie um arquivo CSV para importar os produtos.')
    }

    let parsedRows
    try {
      parsedRows = parseProductImportCsv(file.buffer.toString('utf-8'))
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Nao foi possivel ler o CSV enviado.')
    }
    if (!parsedRows.length) {
      throw new BadRequestException('O arquivo CSV esta vazio ou sem linhas validas.')
    }

    let createdCount = 0
    let updatedCount = 0
    const errors: Array<{ line: number; message: string }> = []

    for (const row of parsedRows) {
      try {
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

        const safeName = sanitizePlainText(row.name, 'Nome do produto', {
          allowEmpty: false,
          rejectFormula: true,
        })!
        const safeCategory = sanitizePlainText(row.category, 'Categoria', {
          allowEmpty: false,
          rejectFormula: true,
        })!
        const safeBrand = sanitizePlainText(row.brand, 'Marca', {
          allowEmpty: true,
          rejectFormula: true,
        })
        const safePackagingClass = sanitizePlainText(row.packagingClass, 'Classe de cadastro', {
          allowEmpty: false,
          rejectFormula: true,
        })!
        const safeMeasurementUnit = sanitizePlainText(row.measurementUnit, 'Unidade de medida', {
          allowEmpty: false,
          rejectFormula: true,
        })!
        const safeDescription = sanitizePlainText(row.description, 'Descricao', {
          allowEmpty: true,
          rejectFormula: true,
        })

        const existing = await this.prisma.product.findUnique({
          where: {
            userId_name: {
              userId: workspaceUserId,
              name: safeName,
            },
          },
        })

        await this.prisma.product.upsert({
          where: {
            userId_name: {
              userId: workspaceUserId,
              name: safeName,
            },
          },
          create: {
            userId: workspaceUserId,
            name: safeName,
            brand: safeBrand,
            category: safeCategory,
            packagingClass: safePackagingClass,
            measurementUnit: safeMeasurementUnit,
            measurementValue: row.measurementValue,
            unitsPerPackage: row.unitsPerPackage,
            description: safeDescription,
            unitCost: row.unitCost,
            unitPrice: row.unitPrice,
            currency: row.currency as CurrencyCode,
            stock: row.stock,
            requiresKitchen: isKitchenCategory(safeCategory),
            active: true,
          },
          update: {
            brand: safeBrand,
            category: safeCategory,
            packagingClass: safePackagingClass,
            measurementUnit: safeMeasurementUnit,
            measurementValue: row.measurementValue,
            unitsPerPackage: row.unitsPerPackage,
            description: safeDescription,
            unitCost: row.unitCost,
            unitPrice: row.unitPrice,
            currency: row.currency as CurrencyCode,
            stock: row.stock,
            // On update via CSV, only override requiresKitchen if it
            // was explicitly false (i.e. not yet set) — preserve manual config
            requiresKitchen: isKitchenCategory(safeCategory) ? true : undefined,
            active: true,
          },
        })

        if (existing) {
          updatedCount += 1
        } else {
          createdCount += 1
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha inesperada ao importar a linha.'
        errors.push({
          line: row.line,
          message,
        })
      }
    }

    await this.auditLogService.record({
      actorUserId: auth.userId,
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

    void this.cache.del(CacheService.financeKey(workspaceUserId))
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
      actorUserId: auth.userId,
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

    void this.cache.del(CacheService.financeKey(workspaceUserId))
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

  private async requireOwnedProduct(userId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        userId,
      },
    })

    if (!product) {
      throw new NotFoundException('Produto nao encontrado para este usuario.')
    }

    return product
  }

  private normalizeComboItemsInput(items: ProductComboItemDto[] | undefined) {
    if (!items?.length) {
      return []
    }

    const groupedByProduct = new Map<
      string,
      {
        productId: string
        quantityPackages: number
        quantityUnits: number
      }
    >()

    for (const item of items) {
      const productId = item.productId.trim()
      if (!productId) {
        throw new BadRequestException('Cada componente do combo precisa informar um produto válido.')
      }

      const quantityPackages = Math.max(0, item.quantityPackages ?? 0)
      const quantityUnits = Math.max(0, item.quantityUnits ?? 0)

      if (quantityPackages === 0 && quantityUnits === 0) {
        throw new BadRequestException('Cada componente do combo precisa de quantidade em caixa ou unidade.')
      }

      const existing = groupedByProduct.get(productId)
      if (existing) {
        existing.quantityPackages += quantityPackages
        existing.quantityUnits += quantityUnits
        continue
      }

      groupedByProduct.set(productId, {
        productId,
        quantityPackages,
        quantityUnits,
      })
    }

    return Array.from(groupedByProduct.values())
  }

  private async buildComboItemsPayload(
    transaction: Prisma.TransactionClient,
    workspaceUserId: string,
    comboProductId: string,
    normalizedItems: Array<{
      productId: string
      quantityPackages: number
      quantityUnits: number
    }>,
  ) {
    if (!normalizedItems.length) {
      throw new BadRequestException('Produtos do tipo combo precisam de pelo menos um componente.')
    }

    const products = await transaction.product.findMany({
      where: {
        userId: workspaceUserId,
        id: {
          in: normalizedItems.map((item) => item.productId),
        },
      },
      select: {
        id: true,
        unitsPerPackage: true,
      },
    })
    const productsById = new Map(products.map((product) => [product.id, product]))

    for (const item of normalizedItems) {
      if (item.productId === comboProductId) {
        throw new BadRequestException('Um combo não pode conter ele mesmo como componente.')
      }

      if (!productsById.has(item.productId)) {
        throw new NotFoundException('Um ou mais componentes do combo não foram encontrados nesta conta.')
      }
    }

    return normalizedItems.map((item) => {
      const component = productsById.get(item.productId)!
      const safeUnitsPerPackage = Math.max(1, component.unitsPerPackage)
      const totalUnits = item.quantityPackages * safeUnitsPerPackage + item.quantityUnits

      if (totalUnits <= 0) {
        throw new BadRequestException('A composição do combo precisa resultar em pelo menos uma unidade.')
      }

      if (safeUnitsPerPackage <= 1) {
        return {
          comboProductId,
          componentProductId: item.productId,
          quantityPackages: 0,
          quantityUnits: totalUnits,
          totalUnits,
        }
      }

      return {
        comboProductId,
        componentProductId: item.productId,
        quantityPackages: Math.floor(totalUnits / safeUnitsPerPackage),
        quantityUnits: totalUnits % safeUnitsPerPackage,
        totalUnits,
      }
    })
  }

  private async resolveProductsSnapshot(
    items: Array<{
      currency: CurrencyCode
    }>,
    displayCurrency: CurrencyCode,
  ): Promise<ExchangeRatesSnapshot> {
    if (items.length === 0 || items.every((item) => item.currency === displayCurrency)) {
      return {
        updatedAt: null,
        source: 'live',
        notice: null,
        rates: {},
      }
    }

    return this.currencyService.getSnapshot()
  }
}

function isSupportedCurrency(value: string) {
  return value === 'BRL' || value === 'USD' || value === 'EUR'
}

function handleProductConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ConflictException('Ja existe um produto com este nome para a sua conta.')
  }

  throw error
}
