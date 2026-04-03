import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  fetchConsentOverview,
  fetchCurrentUser,
  fetchEmployees,
  fetchFinanceSummary,
  fetchOrders,
  fetchProducts,
} from '@/lib/api'

type DashboardQueryOptions = {
  enableConsent?: boolean
  enableProducts?: boolean
  enableOrders?: boolean
  enableEmployees?: boolean
  enableFinance?: boolean
  includeInactiveProducts?: boolean
}

/**
 * Hook centralizado para todas as queries do dashboard
 * Evita duplicação de lógica de queries e simplifica o componente pai
 */
export function useDashboardQueries(options: DashboardQueryOptions = {}) {
  const sessionQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const userId = sessionQuery.data?.user.userId
  const enableConsent = options.enableConsent ?? true
  const enableProducts = options.enableProducts ?? true
  const enableOrders = options.enableOrders ?? true
  const enableEmployees = options.enableEmployees ?? true
  const enableFinance = options.enableFinance ?? true
  const includeInactiveProducts = options.includeInactiveProducts ?? false

  const consentQuery = useQuery({
    queryKey: ['consent', 'me'],
    queryFn: fetchConsentOverview,
    enabled: Boolean(userId) && enableConsent,
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })

  const productsQuery = useQuery({
    queryKey: ['products', includeInactiveProducts ? 'all' : 'active'],
    queryFn: () => fetchProducts({ includeInactive: includeInactiveProducts }),
    enabled: Boolean(userId) && enableProducts,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })

  const ordersQuery = useQuery({
    queryKey: ['orders', 'summary'],
    queryFn: () => fetchOrders({ includeCancelled: false, includeItems: false }),
    enabled: Boolean(userId) && enableOrders,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const isOwner = sessionQuery.data?.user.role === 'OWNER'

  const employeesQuery = useQuery({
    queryKey: ['employees'],
    queryFn: fetchEmployees,
    enabled: Boolean(userId) && isOwner && enableEmployees,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const financeQuery = useQuery({
    queryKey: ['finance', 'summary'],
    queryFn: fetchFinanceSummary,
    enabled: Boolean(userId) && isOwner && enableFinance,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  return {
    sessionQuery,
    consentQuery,
    productsQuery,
    ordersQuery,
    employeesQuery,
    financeQuery,
  }
}
