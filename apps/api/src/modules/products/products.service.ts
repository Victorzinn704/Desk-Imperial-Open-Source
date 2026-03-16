import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { CurrencyCode, Prisma } from '@prisma/client'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { CurrencyService } from '../currency/currency.service'
import { AuditLogService } from '../monitoring/audit-log.service'
import { parseProductImportCsv } from './products-import.util'
import { CreateProductDto } from './dto/create-product.dto'
import { ListProductsQueryDto } from './dto/list-products.query'
import { UpdateProductDto } from './dto/update-product.dto'
import { buildProductsResponse, toProductRecord } from './products.types'

type UploadedCsvFile = {
  buffer: Buffer
  originalname: string
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyService: CurrencyService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async listForUser(auth: AuthContext, query: ListProductsQueryDto) {
    const snapshot = await this.currencyService.getSnapshot()
    const items = await this.prisma.product.findMany({
      where: {
        userId: auth.userId,
        ...(query.includeInactive ? {} : { active: true }),
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
      orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
    })

    return buildProductsResponse(items, {
      displayCurrency: auth.preferredCurrency,
      currencyService: this.currencyService,
      snapshot,
      ratesUpdatedAt: snapshot.updatedAt,
    })
  }

  async createForUser(auth: AuthContext, dto: CreateProductDto, context: RequestContext) {
    try {
      const product = await this.prisma.product.create({
        data: {
          userId: auth.userId,
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
          description: sanitizePlainText(dto.description, 'Descricao', {
            allowEmpty: true,
            rejectFormula: true,
          }),
          unitCost: dto.unitCost,
          unitPrice: dto.unitPrice,
          currency: dto.currency,
          stock: dto.stock,
          active: true,
        },
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
          stock: product.stock,
          currency: product.currency,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

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
    const existingProduct = await this.requireOwnedProduct(auth.userId, productId)

    try {
      const product = await this.prisma.product.update({
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
          ...(dto.unitCost !== undefined ? { unitCost: dto.unitCost } : {}),
          ...(dto.unitPrice !== undefined ? { unitPrice: dto.unitPrice } : {}),
          ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
          ...(dto.stock !== undefined ? { stock: dto.stock } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
      })
      const snapshot = await this.currencyService.getSnapshot()

      await this.auditLogService.record({
        actorUserId: auth.userId,
        event: 'product.updated',
        resource: 'product',
        resourceId: product.id,
          metadata: {
            updatedFields: Object.keys(dto),
          },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

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

  async importForUser(
    auth: AuthContext,
    file: UploadedCsvFile | undefined,
    context: RequestContext,
  ) {
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
              userId: auth.userId,
              name: safeName,
            },
          },
        })

        await this.prisma.product.upsert({
          where: {
            userId_name: {
              userId: auth.userId,
              name: safeName,
            },
          },
          create: {
            userId: auth.userId,
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
    const existingProduct = await this.requireOwnedProduct(auth.userId, productId)
    const product = await this.prisma.product.update({
      where: { id: existingProduct.id },
      data: {
        active,
      },
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
