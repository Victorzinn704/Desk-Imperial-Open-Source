'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { OwnerCurrentUser } from './owner-mobile-shell-types'
import {
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

export function useOwnerMobileShellQueries(currentUser: OwnerCurrentUser | null) {
  const enabled = Boolean(currentUser)
  const operationsQuery = useOwnerOperationsQuery(enabled)
  const productsQuery = useOwnerProductsQuery(enabled)
  const ordersQuery = useOwnerOrdersQuery(enabled)
  const kitchenQuery = useOwnerKitchenQuery(enabled)
  const summaryQuery = useOwnerSummaryQuery(enabled)

  return {
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
    summaryErrorMessage: getErrorMessage(summaryQuery.error),
    summaryLoading: summaryQuery.isLoading && !summaryQuery.data,
  }
}
