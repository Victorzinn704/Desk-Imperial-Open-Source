import { Injectable } from '@nestjs/common'
import { OrderStatus } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { roundCurrency, roundPercent, toProductRecord } from '../products/products.types'

export type FinanceSummaryResponse = {
  totals: {
    activeProducts: number
    inventoryUnits: number
    inventoryCostValue: number
    inventorySalesValue: number
    potentialProfit: number
    realizedRevenue: number
    realizedCost: number
    realizedProfit: number
    completedOrders: number
    currentMonthRevenue: number
    currentMonthProfit: number
    previousMonthRevenue: number
    previousMonthProfit: number
    revenueGrowthPercent: number
    profitGrowthPercent: number
    averageMarginPercent: number
    averageMarkupPercent: number
    lowStockItems: number
  }
  categoryBreakdown: Array<{
    category: string
    products: number
    units: number
    inventoryCostValue: number
    inventorySalesValue: number
    potentialProfit: number
  }>
  topProducts: Array<{
    id: string
    name: string
    category: string
    stock: number
    inventoryCostValue: number
    inventorySalesValue: number
    potentialProfit: number
    marginPercent: number
  }>
  recentOrders: Array<{
    id: string
    customerName: string | null
    channel: string | null
    status: 'COMPLETED' | 'CANCELLED'
    totalRevenue: number
    totalProfit: number
    totalItems: number
    createdAt: string
  }>
}

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummaryForUser(auth: AuthContext): Promise<FinanceSummaryResponse> {
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousMonthEnd = currentMonthStart

    const [products, orders, recentOrders] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          userId: auth.userId,
          active: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.order.findMany({
        where: {
          userId: auth.userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.order.findMany({
        where: {
          userId: auth.userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
      }),
    ])

    const records = products.map(toProductRecord)
    const completedOrders = orders.filter((order) => order.status === OrderStatus.COMPLETED)
    const currentMonthOrders = completedOrders.filter((order) => order.createdAt >= currentMonthStart)
    const previousMonthOrders = completedOrders.filter(
      (order) => order.createdAt >= previousMonthStart && order.createdAt < previousMonthEnd,
    )
    const realizedRevenue = roundCurrency(completedOrders.reduce((total, order) => total + Number(order.totalRevenue), 0))
    const realizedCost = roundCurrency(completedOrders.reduce((total, order) => total + Number(order.totalCost), 0))
    const realizedProfit = roundCurrency(completedOrders.reduce((total, order) => total + Number(order.totalProfit), 0))
    const currentMonthRevenue = roundCurrency(
      currentMonthOrders.reduce((total, order) => total + Number(order.totalRevenue), 0),
    )
    const currentMonthProfit = roundCurrency(
      currentMonthOrders.reduce((total, order) => total + Number(order.totalProfit), 0),
    )
    const previousMonthRevenue = roundCurrency(
      previousMonthOrders.reduce((total, order) => total + Number(order.totalRevenue), 0),
    )
    const previousMonthProfit = roundCurrency(
      previousMonthOrders.reduce((total, order) => total + Number(order.totalProfit), 0),
    )
    const totals = {
      activeProducts: records.length,
      inventoryUnits: records.reduce((total, item) => total + item.stock, 0),
      inventoryCostValue: roundCurrency(records.reduce((total, item) => total + item.inventoryCostValue, 0)),
      inventorySalesValue: roundCurrency(records.reduce((total, item) => total + item.inventorySalesValue, 0)),
      potentialProfit: roundCurrency(records.reduce((total, item) => total + item.potentialProfit, 0)),
      realizedRevenue,
      realizedCost,
      realizedProfit,
      completedOrders: completedOrders.length,
      currentMonthRevenue,
      currentMonthProfit,
      previousMonthRevenue,
      previousMonthProfit,
      revenueGrowthPercent: calculateGrowthPercent(currentMonthRevenue, previousMonthRevenue),
      profitGrowthPercent: calculateGrowthPercent(currentMonthProfit, previousMonthProfit),
      averageMarginPercent: 0,
      averageMarkupPercent: 0,
      lowStockItems: records.filter((item) => item.stock <= 10).length,
    }

    totals.averageMarginPercent =
      totals.inventorySalesValue > 0 ? roundPercent((totals.potentialProfit / totals.inventorySalesValue) * 100) : 0
    totals.averageMarkupPercent =
      totals.inventoryCostValue > 0 ? roundPercent((totals.potentialProfit / totals.inventoryCostValue) * 100) : 0

    const categoryMap = new Map<string, FinanceSummaryResponse['categoryBreakdown'][number]>()

    for (const record of records) {
      const current =
        categoryMap.get(record.category) ??
        {
          category: record.category,
          products: 0,
          units: 0,
          inventoryCostValue: 0,
          inventorySalesValue: 0,
          potentialProfit: 0,
        }

      current.products += 1
      current.units += record.stock
      current.inventoryCostValue = roundCurrency(current.inventoryCostValue + record.inventoryCostValue)
      current.inventorySalesValue = roundCurrency(current.inventorySalesValue + record.inventorySalesValue)
      current.potentialProfit = roundCurrency(current.potentialProfit + record.potentialProfit)

      categoryMap.set(record.category, current)
    }

    return {
      totals,
      categoryBreakdown: [...categoryMap.values()].sort((left, right) => right.potentialProfit - left.potentialProfit),
      topProducts: records
        .slice()
        .sort((left, right) => right.potentialProfit - left.potentialProfit)
        .slice(0, 5)
        .map((record) => ({
          id: record.id,
          name: record.name,
          category: record.category,
          stock: record.stock,
          inventoryCostValue: record.inventoryCostValue,
          inventorySalesValue: record.inventorySalesValue,
          potentialProfit: record.potentialProfit,
          marginPercent: record.marginPercent,
        })),
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        customerName: order.customerName,
        channel: order.channel,
        status: order.status,
        totalRevenue: Number(order.totalRevenue),
        totalProfit: Number(order.totalProfit),
        totalItems: order.totalItems,
        createdAt: order.createdAt.toISOString(),
      })),
    }
  }
}

function calculateGrowthPercent(currentValue: number, previousValue: number) {
  if (previousValue === 0) {
    return currentValue > 0 ? 100 : 0
  }

  return roundPercent(((currentValue - previousValue) / previousValue) * 100)
}
