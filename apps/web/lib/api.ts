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

export type {
  AuthResponse,
  AuthUser,
  CookiePreferences,
  DemoLoginPayload,
  EvaluationAccess,
  ForgotPasswordPayload,
  LoginPayload,
  ProfilePayload,
  RegisterPayload,
  ResetPasswordPayload,
  SimpleMessageResponse,
  VerificationChallengeResponse,
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

export type { ProductPayload } from './api-products'

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
  createComandaPayment,
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

export type {
  AddComandaItemPayload,
  CloseCashClosurePayload,
  CloseCashSessionPayload,
  CloseComandaPayload,
  ComandaDraftItemPayload,
  CreateComandaPaymentPayload,
  CreateCashMovementPayload,
  OpenCashSessionPayload,
  OperationsLiveOptions,
} from './api-operations'

export { fetchEmployees, createEmployee, updateEmployee, archiveEmployee, restoreEmployee } from './api-employees'

export type { EmployeePayload, EmployeeRecord, EmployeesResponse, UpdateEmployeePayload } from './api-employees'

export {
  lookupBarcodeCatalog,
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
export { searchCatalogImages } from './api-media'

export type {
  ActivityFeedEntry,
  BarcodeCatalogLookupResponse,
  ConsentDocument,
  ConsentOverview,
  CookiePreferencePayload,
  FetchOrdersOptions,
  LastLoginEntry,
  OrderPayload,
  PostalCodeLookupResponse,
} from './api-misc'
export type { CatalogImageCandidate } from './api-media'
