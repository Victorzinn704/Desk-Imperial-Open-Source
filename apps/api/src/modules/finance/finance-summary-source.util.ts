import { OrderStatus } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { financeProductSelect } from './finance-summary-product.mapper'

const financeRecentOrderSelect = {
  id: true,
  customerName: true,
  channel: true,
  currency: true,
  status: true,
  totalRevenue: true,
  totalProfit: true,
  totalItems: true,
  createdAt: true,
} as const

export type FinanceSummarySource = Awaited<ReturnType<typeof loadFinanceSummarySource>>

export async function loadFinanceSummarySource(prisma: PrismaService, workspaceUserId: string, now: Date) {
  const window = buildFinanceSummaryWindow(now)
  const [
    products,
    recentOrders,
    allTimeAggregates,
    currentMonthAggregates,
    previousMonthAggregates,
    timelineOrders,
    channelOrders,
    customerOrders,
    employeeOrders,
    geographyOrders,
    categorySalesOrders,
  ] = await Promise.all([
    loadActiveProducts(prisma, workspaceUserId),
    loadRecentOrders(prisma, workspaceUserId),
    loadAllTimeAggregates(prisma, workspaceUserId),
    loadCurrentMonthAggregates(prisma, workspaceUserId, window.currentMonthStart),
    loadPreviousMonthAggregates(prisma, workspaceUserId, window),
    loadTimelineOrders(prisma, workspaceUserId, window.sixMonthsAgo),
    loadChannelOrders(prisma, workspaceUserId),
    loadCustomerOrders(prisma, workspaceUserId),
    loadEmployeeOrders(prisma, workspaceUserId),
    loadGeographyOrders(prisma, workspaceUserId),
    loadCategorySalesOrders(prisma, workspaceUserId),
  ])

  return {
    products,
    recentOrders,
    allTimeAggregates,
    currentMonthAggregates,
    previousMonthAggregates,
    timelineOrders,
    channelOrders,
    customerOrders,
    employeeOrders,
    geographyOrders,
    categorySalesOrders,
  }
}

function buildFinanceSummaryWindow(now: Date) {
  return {
    currentMonthStart: new Date(now.getFullYear(), now.getMonth(), 1),
    previousMonthStart: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    sixMonthsAgo: new Date(now.getFullYear(), now.getMonth() - 5, 1),
  }
}

function completedOrdersWhere(workspaceUserId: string) {
  return { userId: workspaceUserId, status: OrderStatus.COMPLETED }
}

function loadActiveProducts(prisma: PrismaService, workspaceUserId: string) {
  return prisma.product.findMany({
    where: { userId: workspaceUserId, active: true },
    select: financeProductSelect,
  })
}

function loadRecentOrders(prisma: PrismaService, workspaceUserId: string) {
  return prisma.order.findMany({
    where: { userId: workspaceUserId },
    select: financeRecentOrderSelect,
    orderBy: { createdAt: 'desc' },
    take: 5,
  })
}

function loadAllTimeAggregates(prisma: PrismaService, workspaceUserId: string) {
  return prisma.order.groupBy({
    by: ['currency'],
    where: completedOrdersWhere(workspaceUserId),
    _count: { _all: true },
    _sum: { totalRevenue: true, totalCost: true, totalProfit: true },
  })
}

function loadCurrentMonthAggregates(prisma: PrismaService, workspaceUserId: string, currentMonthStart: Date) {
  return prisma.order.groupBy({
    by: ['currency'],
    where: { ...completedOrdersWhere(workspaceUserId), createdAt: { gte: currentMonthStart } },
    _sum: { totalRevenue: true, totalProfit: true },
  })
}

function loadPreviousMonthAggregates(
  prisma: PrismaService,
  workspaceUserId: string,
  window: ReturnType<typeof buildFinanceSummaryWindow>,
) {
  return prisma.order.groupBy({
    by: ['currency'],
    where: {
      ...completedOrdersWhere(workspaceUserId),
      createdAt: { gte: window.previousMonthStart, lt: window.currentMonthStart },
    },
    _sum: { totalRevenue: true, totalProfit: true },
  })
}

function loadTimelineOrders(prisma: PrismaService, workspaceUserId: string, sixMonthsAgo: Date) {
  return prisma.order.findMany({
    where: { ...completedOrdersWhere(workspaceUserId), createdAt: { gte: sixMonthsAgo } },
    select: { createdAt: true, currency: true, totalRevenue: true, totalProfit: true },
    take: 5000,
  })
}

function loadChannelOrders(prisma: PrismaService, workspaceUserId: string) {
  return prisma.order.groupBy({
    by: ['channel', 'currency'],
    where: completedOrdersWhere(workspaceUserId),
    _count: { _all: true },
    _sum: { totalRevenue: true, totalProfit: true },
  })
}

function loadCustomerOrders(prisma: PrismaService, workspaceUserId: string) {
  return prisma.order.groupBy({
    by: ['customerName', 'buyerType', 'buyerDocument', 'currency'],
    where: completedOrdersWhere(workspaceUserId),
    _count: { _all: true },
    _sum: { totalRevenue: true, totalProfit: true },
  })
}

function loadEmployeeOrders(prisma: PrismaService, workspaceUserId: string) {
  return prisma.order.groupBy({
    by: ['employeeId', 'sellerCode', 'sellerName', 'currency'],
    where: completedOrdersWhere(workspaceUserId),
    _count: { _all: true },
    _sum: { totalRevenue: true, totalProfit: true },
  })
}

function loadGeographyOrders(prisma: PrismaService, workspaceUserId: string) {
  return prisma.order.groupBy({
    by: ['buyerDistrict', 'buyerCity', 'buyerState', 'buyerCountry', 'buyerLatitude', 'buyerLongitude', 'currency'],
    where: { ...completedOrdersWhere(workspaceUserId), buyerLatitude: { not: null } },
    _count: { _all: true },
    _sum: { totalRevenue: true, totalProfit: true },
  })
}

function loadCategorySalesOrders(prisma: PrismaService, workspaceUserId: string) {
  return prisma.orderItem.groupBy({
    by: ['category', 'currency'],
    where: { order: completedOrdersWhere(workspaceUserId) },
    _count: { _all: true },
    _sum: { quantity: true, lineRevenue: true, lineCost: true, lineProfit: true },
  })
}
