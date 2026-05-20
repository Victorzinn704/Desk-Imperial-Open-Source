import type { Request } from 'express'
import type { CacheService } from '../../common/services/cache.service'
import type { PrismaService } from '../../database/prisma.service'
import type { AdminPinService } from '../admin-pin/admin-pin.service'
import type { CurrencyService } from '../currency/currency.service'
import type { FinanceService } from '../finance/finance.service'
import type { GeocodingService } from '../geocoding/geocoding.service'
import type { AuditLogService } from '../monitoring/audit-log.service'

export type OrdersServiceDependencies = {
  prisma: PrismaService
  currencyService: CurrencyService
  geocodingService: GeocodingService
  auditLogService: AuditLogService
  adminPinService: AdminPinService
  cache: CacheService
  financeService: FinanceService | undefined
}

export type OrdersHttpRequest = Request

export const orderProductInventoryInclude = {
  comboComponents: {
    include: {
      componentProduct: {
        select: {
          id: true,
          name: true,
          stock: true,
          unitCost: true,
          currency: true,
        },
      },
    },
  },
} as const

export const orderItemSelect = {
  id: true,
  productId: true,
  productName: true,
  category: true,
  quantity: true,
  currency: true,
  unitPrice: true,
  unitCost: true,
  lineRevenue: true,
  lineCost: true,
  lineProfit: true,
} as const

export const orderListSelect = {
  id: true,
  comandaId: true,
  customerName: true,
  buyerType: true,
  buyerDocument: true,
  buyerDistrict: true,
  buyerCity: true,
  buyerState: true,
  buyerCountry: true,
  employeeId: true,
  sellerCode: true,
  sellerName: true,
  channel: true,
  notes: true,
  currency: true,
  status: true,
  totalRevenue: true,
  totalCost: true,
  totalProfit: true,
  totalItems: true,
  createdAt: true,
  updatedAt: true,
  cancelledAt: true,
} as const

export const orderListWithItemsSelect = {
  ...orderListSelect,
  items: {
    select: orderItemSelect,
  },
} as const
