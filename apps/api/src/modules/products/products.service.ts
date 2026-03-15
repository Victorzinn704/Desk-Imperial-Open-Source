import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { RequestContext } from '../../common/utils/request-context.util'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { AuditLogService } from '../monitoring/audit-log.service'
import { CreateProductDto } from './dto/create-product.dto'
import { ListProductsQueryDto } from './dto/list-products.query'
import { UpdateProductDto } from './dto/update-product.dto'
import { buildProductsResponse, toProductRecord } from './products.types'

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async listForUser(auth: AuthContext, query: ListProductsQueryDto) {
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
                { category: { contains: query.search.trim(), mode: 'insensitive' } },
                { description: { contains: query.search.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
    })

    return buildProductsResponse(items)
  }

  async createForUser(auth: AuthContext, dto: CreateProductDto, context: RequestContext) {
    try {
      const product = await this.prisma.product.create({
        data: {
          userId: auth.userId,
          name: dto.name.trim(),
          category: dto.category.trim(),
          description: dto.description?.trim() || null,
          unitCost: dto.unitCost,
          unitPrice: dto.unitPrice,
          stock: dto.stock,
          active: true,
        },
      })

      await this.auditLogService.record({
        actorUserId: auth.userId,
        event: 'product.created',
        resource: 'product',
        resourceId: product.id,
        metadata: {
          name: product.name,
          category: product.category,
          stock: product.stock,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      return {
        product: toProductRecord(product),
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
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.category !== undefined ? { category: dto.category.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
          ...(dto.unitCost !== undefined ? { unitCost: dto.unitCost } : {}),
          ...(dto.unitPrice !== undefined ? { unitPrice: dto.unitPrice } : {}),
          ...(dto.stock !== undefined ? { stock: dto.stock } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
      })

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
        product: toProductRecord(product),
      }
    } catch (error) {
      handleProductConflict(error)
    }
  }

  async archiveForUser(auth: AuthContext, productId: string, context: RequestContext) {
    return this.toggleActiveState(auth.userId, productId, false, context)
  }

  async restoreForUser(auth: AuthContext, productId: string, context: RequestContext) {
    return this.toggleActiveState(auth.userId, productId, true, context)
  }

  private async toggleActiveState(userId: string, productId: string, active: boolean, context: RequestContext) {
    const existingProduct = await this.requireOwnedProduct(userId, productId)
    const product = await this.prisma.product.update({
      where: { id: existingProduct.id },
      data: {
        active,
      },
    })

    await this.auditLogService.record({
      actorUserId: userId,
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

    return {
      product: toProductRecord(product),
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

function handleProductConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ConflictException('Ja existe um produto com este nome para a sua conta.')
  }

  throw error
}
