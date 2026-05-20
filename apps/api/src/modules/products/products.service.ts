import { Inject, Injectable, Optional } from '@nestjs/common'
import type { RequestContext } from '../../common/utils/request-context.util'
import { CacheService } from '../../common/services/cache.service'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { CurrencyService } from '../currency/currency.service'
import type { FinanceService } from '../finance/finance.service'
import { AuditLogService } from '../monitoring/audit-log.service'
import type { CreateProductDto } from './dto/create-product.dto'
import type { ListProductsQueryDto } from './dto/list-products.query'
import type { UpdateProductDto } from './dto/update-product.dto'
import { createProductForUser } from './products-create.command'
import { archiveProductForUser, deleteProductForUser, restoreProductForUser } from './products-status.command'
import { importProductsForUser } from './products-import.command'
import { listProductsForUser } from './products-list.query'
import { bulkRestockProductsForUser } from './products-restock.command'
import { updateProductForUser } from './products-update.command'
import { invalidateProductsCache } from './products-service.shared'
import type { ProductsServiceDependencies, UploadedCsvFile } from './products-service.types'

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
    return listProductsForUser(this.deps, { auth, query })
  }

  async invalidateProductsCache(userId: string) {
    await invalidateProductsCache(this.deps, userId)
  }

  async createForUser(auth: AuthContext, dto: CreateProductDto, context: RequestContext) {
    return createProductForUser(this.deps, { auth, dto, context })
  }

  async updateForUser(auth: AuthContext, productId: string, dto: UpdateProductDto, context: RequestContext) {
    return updateProductForUser(this.deps, { auth, productId, dto, context })
  }

  async bulkRestockForUser(
    auth: AuthContext,
    dto: {
      mode?: 'low_stock' | 'all_active'
      targetStock?: number
    },
    context: RequestContext,
  ) {
    return bulkRestockProductsForUser(this.deps, { auth, dto, context })
  }

  async archiveForUser(auth: AuthContext, productId: string, context: RequestContext) {
    return archiveProductForUser(this.deps, { auth, productId, context })
  }

  async restoreForUser(auth: AuthContext, productId: string, context: RequestContext) {
    return restoreProductForUser(this.deps, { auth, productId, context })
  }

  async deleteForUser(auth: AuthContext, productId: string, context: RequestContext) {
    return deleteProductForUser(this.deps, { auth, productId, context })
  }

  async importForUser(auth: AuthContext, file: UploadedCsvFile | undefined, context: RequestContext) {
    return importProductsForUser(this.deps, { auth, file, context })
  }

  private get deps(): ProductsServiceDependencies {
    return {
      prisma: this.prisma,
      currencyService: this.currencyService,
      auditLogService: this.auditLogService,
      cache: this.cache,
      financeService: this.financeService,
    }
  }
}
