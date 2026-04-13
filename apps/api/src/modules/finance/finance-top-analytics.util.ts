import { roundCurrency } from '../../common/utils/number-rounding.util'
import type { BuyerType } from '@prisma/client'
import type { FinanceAggregationOptions } from './finance-analytics.util'

type CurrencyCode = 'BRL' | 'USD' | 'EUR'

export function buildTopCustomers(
  orders: Array<{
    customerName: string | null
    buyerType: BuyerType | null
    buyerDocument: string | null
    currency: string
    _count: { _all: number }
    _sum: { totalRevenue: { toNumber(): number } | number | null; totalProfit: { toNumber(): number } | number | null }
  }>,
  options: FinanceAggregationOptions,
) {
  const customers = new Map<
    string,
    { customerName: string; buyerType: BuyerType | null; buyerDocument: string | null; orders: number; revenue: number; profit: number }
  >()

  for (const group of orders) {
    const customerName = group.customerName?.trim() || 'Cliente nao informado'
    const key = `${customerName}:${group.buyerType ?? 'unknown'}:${group.buyerDocument ?? ''}`
    const current = customers.get(key) ?? {
      customerName, buyerType: group.buyerType, buyerDocument: group.buyerDocument,
      orders: 0, revenue: 0, profit: 0,
    }
    current.orders += group._count._all
    current.revenue = roundCurrency(
      current.revenue + options.currencyService.convert(toNumber(group._sum.totalRevenue), group.currency as CurrencyCode, options.displayCurrency, options.snapshot),
    )
    current.profit = roundCurrency(
      current.profit + options.currencyService.convert(toNumber(group._sum.totalProfit), group.currency as CurrencyCode, options.displayCurrency, options.snapshot),
    )
    customers.set(key, current)
  }

  return [...customers.values()].sort((left, right) => right.revenue - left.revenue).slice(0, 5)
}

export function buildTopEmployees(
  orders: Array<{
    employeeId: string | null
    sellerCode: string | null
    sellerName: string | null
    currency: string
    _count: { _all: number }
    _sum: { totalRevenue: { toNumber(): number } | number | null; totalProfit: { toNumber(): number } | number | null }
  }>,
  options: FinanceAggregationOptions,
) {
  const employees = new Map<
    string,
    { employeeId: string | null; employeeCode: string | null; employeeName: string; orders: number; revenue: number; profit: number }
  >()

  for (const group of orders) {
    if (!group.employeeId && !group.sellerCode && !group.sellerName) {
      continue
    }
    const employeeName = group.sellerName?.trim() || 'Funcionario nao identificado'
    const employeeKey = group.employeeId ?? group.sellerCode ?? employeeName
    const current = employees.get(employeeKey) ?? {
      employeeId: group.employeeId, employeeCode: group.sellerCode, employeeName,
      orders: 0, revenue: 0, profit: 0,
    }
    current.orders += group._count._all
    current.revenue = roundCurrency(
      current.revenue + options.currencyService.convert(toNumber(group._sum.totalRevenue), group.currency as CurrencyCode, options.displayCurrency, options.snapshot),
    )
    current.profit = roundCurrency(
      current.profit + options.currencyService.convert(toNumber(group._sum.totalProfit), group.currency as CurrencyCode, options.displayCurrency, options.snapshot),
    )
    employees.set(employeeKey, current)
  }

  return [...employees.values()]
    .map((employee) => ({ ...employee, averageTicket: employee.orders ? roundCurrency(employee.revenue / employee.orders) : 0 }))
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, 6)
}

export function buildTopRegions(
  orders: Array<{
    buyerDistrict: string | null
    buyerCity: string | null
    buyerState: string | null
    buyerCountry: string | null
    currency: string
    _count: { _all: number }
    _sum: { totalRevenue: { toNumber(): number } | number | null; totalProfit: { toNumber(): number } | number | null }
  }>,
  options: FinanceAggregationOptions,
) {
  const regions = new Map<
    string,
    { label: string; city: string | null; state: string | null; country: string | null; orders: number; revenue: number; profit: number }
  >()

  for (const group of orders) {
    if (!group.buyerCity && !group.buyerState && !group.buyerCountry) {
      continue
    }
    const label = buildRegionLabel(group.buyerDistrict, group.buyerCity, group.buyerState, group.buyerCountry)
    const current = regions.get(label) ?? {
      label, city: group.buyerCity, state: group.buyerState, country: group.buyerCountry,
      orders: 0, revenue: 0, profit: 0,
    }
    current.orders += group._count._all
    current.revenue = roundCurrency(
      current.revenue + options.currencyService.convert(toNumber(group._sum.totalRevenue), group.currency as CurrencyCode, options.displayCurrency, options.snapshot),
    )
    current.profit = roundCurrency(
      current.profit + options.currencyService.convert(toNumber(group._sum.totalProfit), group.currency as CurrencyCode, options.displayCurrency, options.snapshot),
    )
    regions.set(label, current)
  }

  return [...regions.values()].sort((left, right) => right.revenue - left.revenue).slice(0, 6)
}

export function buildSalesMap(
  orders: Array<{
    buyerDistrict: string | null
    buyerCity: string | null
    buyerState: string | null
    buyerCountry: string | null
    buyerLatitude: number | null
    buyerLongitude: number | null
    currency: string
    _count: { _all: number }
    _sum: { totalRevenue: { toNumber(): number } | number | null; totalProfit: { toNumber(): number } | number | null }
  }>,
  options: FinanceAggregationOptions,
) {
  const points = new Map<
    string,
    { label: string; district: string | null; city: string | null; state: string | null; country: string | null; latitude: number; longitude: number; orders: number; revenue: number; profit: number }
  >()

  for (const group of orders) {
    if (group.buyerLatitude == null || group.buyerLongitude == null) {
      continue
    }
    const label = buildRegionLabel(group.buyerDistrict, group.buyerCity, group.buyerState, group.buyerCountry)
    const key = `${label}:${group.buyerLatitude.toFixed(4)}:${group.buyerLongitude.toFixed(4)}`
    const current = points.get(key) ?? {
      label, district: group.buyerDistrict, city: group.buyerCity, state: group.buyerState, country: group.buyerCountry,
      latitude: group.buyerLatitude, longitude: group.buyerLongitude,
      orders: 0, revenue: 0, profit: 0,
    }
    current.orders += group._count._all
    current.revenue = roundCurrency(
      current.revenue + options.currencyService.convert(toNumber(group._sum.totalRevenue), group.currency as CurrencyCode, options.displayCurrency, options.snapshot),
    )
    current.profit = roundCurrency(
      current.profit + options.currencyService.convert(toNumber(group._sum.totalProfit), group.currency as CurrencyCode, options.displayCurrency, options.snapshot),
    )
    points.set(key, current)
  }

  return [...points.values()].sort((left, right) => right.revenue - left.revenue)
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
