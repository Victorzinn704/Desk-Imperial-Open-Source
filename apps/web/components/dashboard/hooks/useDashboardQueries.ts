import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  fetchConsentOverview,
  fetchCurrentUser,
  fetchEmployees,
  fetchFinanceSummary,
  fetchOrders,
  fetchProducts,
} from '@/lib/api'

/**
 * Hook centralizado para todas as queries do dashboard
 * Evita duplicação de lógica de queries e simplifica o componente pai
 */
export function useDashboardQueries() {
  const sessionQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const userId = sessionQuery.data?.user.userId

  const consentQuery = useQuery({
    queryKey: ['consent', 'me'],
    queryFn: fetchConsentOverview,
    enabled: Boolean(userId),
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })

  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const isOwner = sessionQuery.data?.user.role === 'OWNER'

  const employeesQuery = useQuery({
    queryKey: ['employees'],
    queryFn: fetchEmployees,
    enabled: Boolean(userId) && isOwner,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const financeQuery = useQuery({
    queryKey: ['finance', 'summary'],
    queryFn: fetchFinanceSummary,
    enabled: Boolean(userId) && isOwner,
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
