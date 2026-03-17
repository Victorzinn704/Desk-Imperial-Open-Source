import { useQueryClient, useMutation } from '@tanstack/react-query'
import {
  archiveEmployee,
  archiveProduct,
  cancelOrder,
  createEmployee,
  createOrder,
  createProduct,
  importProducts,
  logout,
  restoreEmployee,
  restoreProduct,
  updateProfile,
  updateCookiePreferences,
  updateProduct,
} from '@/lib/api'
import type { OrderFormValues, ProductFormValues, ProfileFormValues } from '@/lib/validation'

/**
 * Hook centralizado para todas as mutations do dashboard
 * Facilita invalidação de queries e tratamento de erro uniformizado
 */
export function useDashboardMutations() {
  const queryClient = useQueryClient()

  // Helper functions para invalidação de queries
  const invalidateCatalog = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] })
  }

  const invalidateOrders = () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] })
    queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] })
  }

  const invalidateEmployees = () => {
    queryClient.invalidateQueries({ queryKey: ['employees'] })
    queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] })
  }

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await queryClient.cancelQueries()
      queryClient.clear()
    },
  })

  const preferenceMutation = useMutation({
    mutationFn: updateCookiePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consent', 'me'] })
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (payload) => {
      queryClient.setQueryData(['auth', 'me'], payload)
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
    },
  })

  const createProductMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => invalidateCatalog(),
  })

  const updateProductMutation = useMutation({
    mutationFn: ({ productId, values }: { productId: string; values: Parameters<typeof updateProduct>[1] }) =>
      updateProduct(productId, values),
    onSuccess: () => invalidateCatalog(),
  })

  const archiveProductMutation = useMutation({
    mutationFn: archiveProduct,
    onSuccess: () => invalidateCatalog(),
  })

  const restoreProductMutation = useMutation({
    mutationFn: restoreProduct,
    onSuccess: () => invalidateCatalog(),
  })

  const importProductsMutation = useMutation({
    mutationFn: importProducts,
    onSuccess: () => invalidateCatalog(),
  })

  const createOrderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => invalidateOrders(),
  })

  const cancelOrderMutation = useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => invalidateOrders(),
  })

  const createEmployeeMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => invalidateEmployees(),
  })

  const archiveEmployeeMutation = useMutation({
    mutationFn: archiveEmployee,
    onSuccess: () => invalidateEmployees(),
  })

  const restoreEmployeeMutation = useMutation({
    mutationFn: restoreEmployee,
    onSuccess: () => invalidateEmployees(),
  })

  return {
    logoutMutation,
    preferenceMutation,
    updateProfileMutation,
    createProductMutation,
    updateProductMutation,
    archiveProductMutation,
    restoreProductMutation,
    importProductsMutation,
    createOrderMutation,
    cancelOrderMutation,
    createEmployeeMutation,
    archiveEmployeeMutation,
    restoreEmployeeMutation,
    queryClient,
  }
}
