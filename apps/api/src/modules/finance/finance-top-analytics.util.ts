import type { BuyerType } from '@prisma/client'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import type { CurrencyCode, FinanceAggregationOptions } from './finance-analytics.types'

type MoneyValue = { toNumber(): number } | number | null

type FinanceGroupedOrder = {
  currency: string
  _count: { _all: number }
  _sum: { totalRevenue: MoneyValue; totalProfit: MoneyValue }
}

type TopCustomerOrder = FinanceGroupedOrder & {
  customerName: string | null
  buyerType: BuyerType | null
  buyerDocument: string | null
}

type TopCustomerEntry = {
  customerName: string
  buyerType: BuyerType | null
  buyerDocument: string | null
  orders: number
  revenue: number
  profit: number
}

type TopEmployeeOrder = FinanceGroupedOrder & {
  employeeId: string | null
  sellerCode: string | null
  sellerName: string | null
}

type TopEmployeeEntry = {
  employeeId: string | null
  employeeCode: string | null
  employeeName: string
  orders: number
  revenue: number
  profit: number
}

type RegionOrder = FinanceGroupedOrder & {
  buyerDistrict: string | null
  buyerCity: string | null
  buyerState: string | null
  buyerCountry: string | null
}

type SalesMapOrder = RegionOrder & {
  buyerLatitude: number | null
  buyerLongitude: number | null
}

type RegionEntry = {
  label: string
  city: string | null
  state: string | null
  country: string | null
  orders: number
  revenue: number
  profit: number
}

type SalesMapEntry = RegionEntry & {
  district: string | null
  latitude: number
  longitude: number
}

export function buildTopCustomers(orders: TopCustomerOrder[], options: FinanceAggregationOptions) {
  const customers = new Map<string, TopCustomerEntry>()

  for (const group of orders) {
    const customerName = group.customerName?.trim() || 'Cliente nao informado'
    const key = `${customerName}:${group.buyerType ?? 'unknown'}:${group.buyerDocument ?? ''}`
    const current = customers.get(key) ?? {
      customerName,
      buyerType: group.buyerType,
      buyerDocument: group.buyerDocument,
      orders: 0,
      revenue: 0,
      profit: 0,
    }
    applyFinancialGroup(current, group, options)
    customers.set(key, current)
  }

  return [...customers.values()].sort((left, right) => right.revenue - left.revenue).slice(0, 5)
}

export function buildTopEmployees(orders: TopEmployeeOrder[], options: FinanceAggregationOptions) {
  const employees = new Map<string, TopEmployeeEntry>()

  for (const group of orders) {
    if (!(group.employeeId || group.sellerCode || group.sellerName)) {
      continue
    }
    const employeeName = group.sellerName?.trim() || 'Funcionario nao identificado'
    const employeeKey = group.employeeId ?? group.sellerCode ?? employeeName
    const current = employees.get(employeeKey) ?? {
      employeeId: group.employeeId,
      employeeCode: group.sellerCode,
      employeeName,
      orders: 0,
      revenue: 0,
      profit: 0,
    }
    applyFinancialGroup(current, group, options)
    employees.set(employeeKey, current)
  }

  return [...employees.values()]
    .map((employee) => ({
      ...employee,
      averageTicket: employee.orders ? roundCurrency(employee.revenue / employee.orders) : 0,
    }))
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, 6)
}

export function buildTopRegions(orders: RegionOrder[], options: FinanceAggregationOptions) {
  const regions = new Map<string, RegionEntry>()

  for (const group of orders) {
    if (!(group.buyerCity || group.buyerState || group.buyerCountry)) {
      continue
    }
    const label = buildRegionLabel(group.buyerDistrict, group.buyerCity, group.buyerState, group.buyerCountry)
    const current = regions.get(label) ?? {
      label,
      city: group.buyerCity,
      state: group.buyerState,
      country: group.buyerCountry,
      orders: 0,
      revenue: 0,
      profit: 0,
    }
    applyFinancialGroup(current, group, options)
    regions.set(label, current)
  }

  return [...regions.values()].sort((left, right) => right.revenue - left.revenue).slice(0, 6)
}

export function buildSalesMap(orders: SalesMapOrder[], options: FinanceAggregationOptions) {
  const points = new Map<string, SalesMapEntry>()

  for (const group of orders) {
    if (group.buyerLatitude == null || group.buyerLongitude == null) {
      continue
    }
    const label = buildRegionLabel(group.buyerDistrict, group.buyerCity, group.buyerState, group.buyerCountry)
    const key = `${label}:${group.buyerLatitude.toFixed(4)}:${group.buyerLongitude.toFixed(4)}`
    const current = points.get(key) ?? {
      label,
      district: group.buyerDistrict,
      city: group.buyerCity,
      state: group.buyerState,
      country: group.buyerCountry,
      latitude: group.buyerLatitude,
      longitude: group.buyerLongitude,
      orders: 0,
      revenue: 0,
      profit: 0,
    }
    applyFinancialGroup(current, group, options)
    points.set(key, current)
  }

  return [...points.values()].sort((left, right) => right.revenue - left.revenue)
}

function applyFinancialGroup(
  entry: { orders: number; revenue: number; profit: number },
  group: FinanceGroupedOrder,
  options: FinanceAggregationOptions,
) {
  entry.orders += group._count._all
  entry.revenue = addConvertedAmount(entry.revenue, group._sum.totalRevenue, group.currency, options)
  entry.profit = addConvertedAmount(entry.profit, group._sum.totalProfit, group.currency, options)
}

function addConvertedAmount(
  currentValue: number,
  amount: MoneyValue,
  sourceCurrency: string,
  options: FinanceAggregationOptions,
) {
  return roundCurrency(
    currentValue +
      options.currencyService.convert({
        source: { amount: toNumber(amount), currency: sourceCurrency as CurrencyCode },
        targetCurrency: options.displayCurrency,
        snapshot: options.snapshot,
      }),
  )
}

function toNumber(value: { toNumber(): number } | number | null | undefined) {
  if (value == null) {
    return 0
  }
  return typeof value === 'number' ? value : value.toNumber()
}

function buildRegionLabel(district: string | null, city: string | null, state: string | null, country: string | null) {
  return [district, city, state, country].filter(Boolean).join(', ') || 'Regiao nao identificada'
}
