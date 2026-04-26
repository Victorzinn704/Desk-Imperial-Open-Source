'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchOperationsKitchen, fetchOperationsLive, fetchOrders, fetchProducts } from '@/lib/api'
import { OPERATIONS_KITCHEN_QUERY_KEY, OPERATIONS_LIVE_COMPACT_QUERY_KEY } from '@/lib/operations'
import type { StaffMobileCurrentUser, StaffMobileShellQueryScope } from './staff-mobile-shell-types'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : null
}

function useStaffOperationsQuery(enabled: boolean) {
  return useQuery({
    queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY,
    queryFn: () => fetchOperationsLive({ includeCashMovements: false, compactMode: true }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}

function useStaffKitchenQuery(enabled: boolean) {
  return useQuery({
    queryKey: OPERATIONS_KITCHEN_QUERY_KEY,
    queryFn: () => fetchOperationsKitchen(),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}

function useStaffProductsQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => fetchProducts(),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })
}

function useStaffOrdersHistoryQuery(enabled: boolean, employeeId: string | null) {
  return useQuery({
    queryKey: ['staff-orders-history', employeeId ?? 'none'],
    queryFn: () => fetchOrders({ includeCancelled: true, includeItems: true, limit: 50 }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}

export function buildStaffQueryEnablement(enabled: boolean, scope: StaffMobileShellQueryScope) {
  const isOrderFlowActive = scope.activeTab === 'pedido' || Boolean(scope.pendingAction)

  return {
    kitchen: enabled && (scope.activeTab === 'cozinha' || isOrderFlowActive),
    operations: enabled,
    ordersHistory: enabled && scope.activeTab === 'historico',
    products: enabled && isOrderFlowActive,
  }
}

export function useStaffMobileShellQueries(currentUser: StaffMobileCurrentUser, scope: StaffMobileShellQueryScope) {
  const enabled = Boolean(currentUser)
  const queryEnablement = buildStaffQueryEnablement(enabled, scope)
  const operationsQuery = useStaffOperationsQuery(queryEnablement.operations)
  const kitchenQuery = useStaffKitchenQuery(queryEnablement.kitchen)
  const productsQuery = useStaffProductsQuery(queryEnablement.products)
  const ordersHistoryQuery = useStaffOrdersHistoryQuery(
    Boolean(currentUser?.employeeId) && queryEnablement.ordersHistory,
    currentUser?.employeeId ?? null,
  )

  return {
    kitchenQuery,
    operationsQuery,
    ordersHistoryQuery,
    productsQuery,
    kitchenErrorMessage: getErrorMessage(kitchenQuery.error),
    kitchenLoading: kitchenQuery.isLoading && !kitchenQuery.data,
    operationsErrorMessage: getErrorMessage(operationsQuery.error),
    operationsLoading: operationsQuery.isLoading && !operationsQuery.data,
    productsErrorMessage: getErrorMessage(productsQuery.error),
    productsLoading: productsQuery.isLoading && !productsQuery.data,
  }
}
