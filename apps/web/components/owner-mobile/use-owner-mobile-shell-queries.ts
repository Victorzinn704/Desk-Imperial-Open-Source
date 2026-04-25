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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : null
}

function useOwnerOperationsQuery(enabled: boolean) {
  return useQuery({
    queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY,
    queryFn: () => fetchOperationsLive({ includeCashMovements: false, compactMode: true }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}

type OwnerMobileShellQueryScope = Readonly<{
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
  })
}

function useOwnerKitchenQuery(enabled: boolean) {
  return useQuery({
    queryKey: OPERATIONS_KITCHEN_QUERY_KEY,
    queryFn: () => fetchOperationsKitchen(),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 10_000,
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
    refetchOnReconnect: true,
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
    refetchOnReconnect: true,
  })
}

function buildOwnerQueryEnablement(enabled: boolean, scope: OwnerMobileShellQueryScope) {
  const isPdvActive = scope.activeTab === 'pdv'
  return {
    finance: enabled && scope.activeTab === 'financeiro',
    kitchen: enabled && isPdvActive && scope.pdvView === 'cozinha',
    operations: enabled,
    orders: enabled && scope.activeTab === 'today',
    products: enabled && (isPdvActive || Boolean(scope.pendingAction)),
    summary: enabled && scope.activeTab === 'today',
  }
}

export function useOwnerMobileShellQueries(currentUser: OwnerCurrentUser | null, scope: OwnerMobileShellQueryScope) {
  const enabled = Boolean(currentUser)
  const queryEnablement = buildOwnerQueryEnablement(enabled, scope)
  const operationsQuery = useOwnerOperationsQuery(queryEnablement.operations)
  const productsQuery = useOwnerProductsQuery(queryEnablement.products)
  const ordersQuery = useOwnerOrdersQuery(queryEnablement.orders)
  const kitchenQuery = useOwnerKitchenQuery(queryEnablement.kitchen)
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
