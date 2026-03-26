import { useQuery } from '@tanstack/react-query'
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
  })

  const userId = sessionQuery.data?.user.userId

  const consentQuery = useQuery({
    queryKey: ['consent', 'me'],
    queryFn: fetchConsentOverview,
    enabled: Boolean(userId),
    retry: false,
  })

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    enabled: Boolean(userId),
  })

  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
    enabled: Boolean(userId),
  })

  const isOwner = sessionQuery.data?.user.role === 'OWNER'

  const employeesQuery = useQuery({
    queryKey: ['employees'],
    queryFn: fetchEmployees,
    enabled: Boolean(userId) && isOwner,
  })

  const financeQuery = useQuery({
    queryKey: ['finance', 'summary'],
    queryFn: fetchFinanceSummary,
    enabled: Boolean(userId) && isOwner,
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
