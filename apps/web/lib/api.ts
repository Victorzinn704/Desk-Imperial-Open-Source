// Barrel re-export — all API functions are now organized by domain.
// This file exists for backward compatibility so existing imports keep working.

export {
  ApiError,
  clearPersistedAdminPinHint,
  clearPersistedCsrfToken,
  resolveApiTimeoutMs,
  isLegacyOwnerLoginContractError,
} from './api-core'

export {
  login,
  loginDemo,
  register,
  forgotPassword,
  requestEmailVerification,
  verifyEmail,
  resetPassword,
  fetchCurrentUser,
  logout,
  updateProfile,
} from './api-auth'

export {
  fetchProducts,
  createProduct,
  updateProduct,
  archiveProduct,
  restoreProduct,
  deleteProductPermanently,
  importProducts,
} from './api-products'

export { fetchFinanceSummary, fetchPillars, fetchMarketInsight } from './api-finance'

export {
  fetchOperationsLive,
  fetchComandaDetails,
  openCashSession,
  closeCashClosure,
  updateKitchenItemStatus,
  fetchMesas,
  createMesa,
  updateMesa,
} from './api-operations'

export {
  fetchEmployees,
  createEmployee,
  updateEmployee,
  archiveEmployee,
  restoreEmployee,
} from './api-employees'

export {
  lookupPostalCode,
  fetchConsentDocuments,
  fetchOrders,
  createOrder,
  cancelOrder,
  updateCookiePreferences,
  fetchActivityFeed,
} from './api-misc'

// Re-export types from their source modules
export type { AuthUser } from './api-auth'
export type { EmployeeRecord } from './api-employees'
export type { ActivityFeedEntry, CookiePreferencePayload, CookiePreferences } from './api-misc'
