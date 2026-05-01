import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  fetchConsentOverview,
  fetchCurrentUser,
  fetchEmployees,
  fetchFinanceSummary,
  fetchOrders,
  fetchProducts,
} from '@/lib/api'
import type { DashboardSectionId } from '@/components/dashboard/dashboard-navigation'

type UseDashboardQueriesOptions = {
  section?: DashboardSectionId
}

function resolveSectionRequirements(section?: DashboardSectionId) {
  const sectionRequiresConsent = section === undefined || section === 'settings'
  const sectionRequiresProducts =
    section === undefined || ['overview', 'financeiro', 'pedidos', 'sales', 'portfolio', 'pdv'].includes(section)
  const sectionRequiresOrders =
    section === undefined || ['overview', 'financeiro', 'pedidos', 'sales', 'map'].includes(section)
  const sectionRequiresEmployees =
    section === undefined ||
    ['overview', 'financeiro', 'pedidos', 'equipe', 'sales', 'portfolio', 'payroll', 'settings'].includes(section)
  const sectionRequiresFinance =
    section === undefined ||
    ['overview', 'financeiro', 'pedidos', 'equipe', 'sales', 'portfolio', 'payroll', 'map'].includes(section)

  return {
    sectionRequiresConsent,
    sectionRequiresProducts,
    sectionRequiresOrders,
    sectionRequiresEmployees,
    sectionRequiresFinance,
  }
}

export function useDashboardScopedQueries({
  isOwner,
  section,
  userId,
}: {
  userId?: string
  isOwner: boolean
  section?: DashboardSectionId
}) {
  const {
    sectionRequiresConsent,
    sectionRequiresProducts,
    sectionRequiresOrders,
    sectionRequiresEmployees,
    sectionRequiresFinance,
  } = resolveSectionRequirements(section)

  const consentQuery = useQuery({
    queryKey: ['consent', 'me'],
    queryFn: fetchConsentOverview,
    enabled: Boolean(userId) && sectionRequiresConsent,
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    enabled: Boolean(userId) && sectionRequiresProducts,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })

  const ordersQuery = useQuery({
    queryKey: ['orders', 'summary'],
    queryFn: () => fetchOrders({ includeCancelled: false, includeItems: false }),
    enabled: Boolean(userId) && sectionRequiresOrders,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const employeesQuery = useQuery({
    queryKey: ['employees'],
    queryFn: fetchEmployees,
    enabled: Boolean(userId) && isOwner && sectionRequiresEmployees,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const financeQuery = useQuery({
    queryKey: ['finance', 'summary'],
    queryFn: fetchFinanceSummary,
    enabled: Boolean(userId) && isOwner && sectionRequiresFinance,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  return {
    consentQuery,
    productsQuery,
    ordersQuery,
    employeesQuery,
    financeQuery,
  }
}

/**
 * Hook centralizado para todas as queries do dashboard
 * Evita duplicação de lógica de queries e simplifica o componente pai
 */
export function useDashboardQueries({ section }: UseDashboardQueriesOptions = {}) {
  const sessionQuery = useDashboardSessionQuery()

  const userId = sessionQuery.data?.user.userId
  const isOwner = sessionQuery.data?.user.role === 'OWNER'

  const scopedQueries = useDashboardScopedQueries({
    userId,
    isOwner,
    section,
  })

  return {
    sessionQuery,
    ...scopedQueries,
  }
}

export function useDashboardSessionQuery() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}
