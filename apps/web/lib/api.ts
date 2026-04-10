// Barrel re-export — all API functions are now organized by domain.
// This file exists for backward compatibility so existing imports keep working.

export {
  apiFetch,
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
  logout,
  forgotPassword,
  requestEmailVerification,
  verifyEmail,
  resetPassword,
  fetchCurrentUser,
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
  buildOperationsLiveParams,
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
} from './api-operations'

export { fetchEmployees, createEmployee, updateEmployee, archiveEmployee, restoreEmployee } from './api-employees'

export {
  lookupPostalCode,
  fetchConsentDocuments,
  fetchConsentOverview,
  fetchOrders,
  createOrder,
  cancelOrder,
  updateCookiePreferences,
  fetchLastLogins,
  fetchActivityFeed,
} from './api-misc'

// Re-export types from their source modules
export type { AuthUser, AuthResponse } from './api-auth'
export type { EmployeeRecord, EmployeesResponse } from './api-employees'
export type { ActivityFeedEntry, CookiePreferencePayload, FetchOrdersOptions } from './api-misc'
export type {
  OperationsLiveOptions,
  OpenComandaPayload,
  ReplaceComandaPayload,
  CloseComandaPayload,
  AddComandaItemPayload,
  OpenCashSessionPayload,
  CloseCashClosurePayload,
  CreateCashMovementPayload,
  CreateMesaInput,
  UpdateMesaInput,
} from './api-operations'
export type { ProductPayload } from './api-products'
export type { EmployeePayload, UpdateEmployeePayload } from './api-employees'
export type {
  LoginPayload,
  DemoLoginPayload,
  RegisterPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  ProfilePayload,
} from './api-auth'
export type { CookiePreferences } from './api-core'
