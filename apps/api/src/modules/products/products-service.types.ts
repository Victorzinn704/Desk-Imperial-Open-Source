import { Prisma } from '@prisma/client'
import type { CacheService } from '../../common/services/cache.service'
import type { PrismaService } from '../../database/prisma.service'
import type { CurrencyService } from '../currency/currency.service'
import type { FinanceService } from '../finance/finance.service'
import type { AuditLogService } from '../monitoring/audit-log.service'

export type UploadedCsvFile = {
  buffer: Buffer
  originalname: string
}

export type ProductsServiceDependencies = {
  prisma: PrismaService
  currencyService: CurrencyService
  auditLogService: AuditLogService
  cache: CacheService
  financeService: FinanceService | undefined
}

export const productWithComboInclude = Prisma.validator<Prisma.ProductInclude>()({
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
