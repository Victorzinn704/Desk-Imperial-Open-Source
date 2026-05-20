'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { OwnerCurrentUser, OwnerMobileTab, OwnerPdvView, PendingAction } from './owner-mobile-shell-types'
import {
  fetchFinanceSummary,
  fetchOperationsKitchen,
  fetchOperationsLive,
  fetchOperationsSummary,
  fetchOrders,
  fetchProducts,
} from '@/lib/api'
import {
  OPERATIONS_KITCHEN_QUERY_KEY,
  OPERATIONS_LIVE_COMPACT_QUERY_KEY,
  OPERATIONS_SUMMARY_QUERY_KEY,
} from '@/lib/operations'
import type { RealtimeStatus } from '@/components/operations/use-operations-realtime'

const MOBILE_REALTIME_FALLBACK_REFETCH_MS = 1_500
const OWNER_KITCHEN_WARM_TABS = new Set<OwnerMobileTab>(['today', 'pdv'])

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : null
}

function resolveFallbackRefetchInterval(enabled: boolean, realtimeStatus: RealtimeStatus) {
  return enabled && realtimeStatus !== 'connected' ? MOBILE_REALTIME_FALLBACK_REFETCH_MS : false
}

function useOwnerOperationsQuery(enabled: boolean, realtimeStatus: RealtimeStatus) {
  return useQuery({
    queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY,
    queryFn: () => fetchOperationsLive({ includeCashMovements: false, compactMode: true }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchInterval: resolveFallbackRefetchInterval(enabled, realtimeStatus),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}

export type OwnerMobileShellQueryScope = Readonly<{
  activeTab: OwnerMobileTab
  pdvView: OwnerPdvView
  pendingAction: PendingAction | null
}>

function useOwnerProductsQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => fetchProducts(),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })
}

function useOwnerOrdersQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['orders', 'summary'],
    queryFn: () => fetchOrders({ includeCancelled: false, includeItems: false }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

function useOwnerKitchenQuery(enabled: boolean, realtimeStatus: RealtimeStatus) {
  return useQuery({
    queryKey: OPERATIONS_KITCHEN_QUERY_KEY,
    queryFn: () => fetchOperationsKitchen(),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchInterval: resolveFallbackRefetchInterval(enabled, realtimeStatus),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}

function useOwnerSummaryQuery(enabled: boolean) {
  return useQuery({
    queryKey: OPERATIONS_SUMMARY_QUERY_KEY,
    queryFn: () => fetchOperationsSummary(),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

function useOwnerFinanceQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['finance', 'summary', 'owner-mobile'],
    queryFn: () => fetchFinanceSummary(),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

export function buildOwnerQueryEnablement(enabled: boolean, scope: OwnerMobileShellQueryScope) {
  const isPdvActive = scope.activeTab === 'pdv'

  return {
    finance: enabled && scope.activeTab === 'financeiro',
    kitchen: enabled && shouldKeepOwnerKitchenWarm(scope),
    operations: enabled,
    orders: enabled && scope.activeTab === 'today',
    products: enabled && shouldLoadOwnerProducts(scope, isPdvActive),
    summary: enabled && scope.activeTab === 'today',
  }
}

function shouldKeepOwnerKitchenWarm(scope: OwnerMobileShellQueryScope) {
  if (OWNER_KITCHEN_WARM_TABS.has(scope.activeTab)) {
    return true
  }

  return Boolean(scope.pendingAction)
}

function shouldLoadOwnerProducts(scope: OwnerMobileShellQueryScope, isPdvActive: boolean) {
  if (isPdvActive) {
    return true
  }

  return Boolean(scope.pendingAction)
}

export function useOwnerMobileShellQueries(
  currentUser: OwnerCurrentUser | null,
  scope: OwnerMobileShellQueryScope,
  realtimeStatus: RealtimeStatus,
) {
  const enabled = Boolean(currentUser)
  const queryEnablement = buildOwnerQueryEnablement(enabled, scope)
  const operationsQuery = useOwnerOperationsQuery(queryEnablement.operations, realtimeStatus)
  const productsQuery = useOwnerProductsQuery(queryEnablement.products)
  const ordersQuery = useOwnerOrdersQuery(queryEnablement.orders)
  const kitchenQuery = useOwnerKitchenQuery(queryEnablement.kitchen, realtimeStatus)
  const summaryQuery = useOwnerSummaryQuery(queryEnablement.summary)
  const financeQuery = useOwnerFinanceQuery(queryEnablement.finance)

  return {
    financeQuery,
    kitchenQuery,
    operationsQuery,
    ordersQuery,
    productsQuery,
    summaryQuery,
    kitchenErrorMessage: getErrorMessage(kitchenQuery.error),
    kitchenLoading: kitchenQuery.isLoading && !kitchenQuery.data,
    operationsErrorMessage: getErrorMessage(operationsQuery.error),
    operationsLoading: operationsQuery.isLoading && !operationsQuery.data,
    ordersErrorMessage: getErrorMessage(ordersQuery.error),
    ordersLoading: ordersQuery.isLoading && !ordersQuery.data,
    productsErrorMessage: getErrorMessage(productsQuery.error),
    productsLoading: productsQuery.isLoading && !productsQuery.data,
    financeErrorMessage: getErrorMessage(financeQuery.error),
    financeLoading: financeQuery.isLoading && !financeQuery.data,
    summaryErrorMessage: getErrorMessage(summaryQuery.error),
    summaryLoading: summaryQuery.isLoading && !summaryQuery.data,
  }
}
