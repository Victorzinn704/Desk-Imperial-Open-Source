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
  fetchOperationsKitchen,
  fetchOperationsSummary,
  fetchComandaDetails,
  openComanda,
  addComandaItem,
  addComandaItems,
  replaceComanda,
  assignComanda,
  updateComandaStatus,
  cancelComanda,
  closeComanda,
  openCashSession,
  closeCashClosure,
  createCashMovement,
  closeCashSession,
  updateKitchenItemStatus,
  fetchMesas,
  createMesa,
  updateMesa,
  type OpenComandaPayload,
  type ReplaceComandaPayload,
  type CreateMesaInput,
  type UpdateMesaInput,
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
  fetchConsentOverview,
  fetchOrders,
  createOrder,
  cancelOrder,
  updateCookiePreferences,
  fetchActivityFeed,
  fetchLastLogins,
} from './api-misc'

// Re-export types from their source modules
export type { AuthUser, AuthResponse, LoginPayload } from './api-auth'
export type { EmployeeRecord } from './api-employees'
export type { ActivityFeedEntry, CookiePreferencePayload } from './api-misc'
export type { CookiePreferences } from './api-core'
