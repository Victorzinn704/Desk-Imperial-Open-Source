import * as api from './api'

type EndpointWrapperCase = {
  expectedMethod: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  expectedPath: string
  run: () => Promise<unknown>
}

function endpoint(
  expectedMethod: EndpointWrapperCase['expectedMethod'],
  expectedPath: string,
  run: EndpointWrapperCase['run'],
): EndpointWrapperCase {
  return { expectedMethod, expectedPath, run }
}

const get = (path: string, run: EndpointWrapperCase['run']) => endpoint('GET', path, run)
const post = (path: string, run: EndpointWrapperCase['run']) => endpoint('POST', path, run)
const patch = (path: string, run: EndpointWrapperCase['run']) => endpoint('PATCH', path, run)
const remove = (path: string, run: EndpointWrapperCase['run']) => endpoint('DELETE', path, run)

export const STANDARD_ENDPOINT_WRAPPER_CASES = [
  post('/auth/demo', () => api.loginDemo({ loginMode: 'STAFF', employeeCode: 'E01' })),
  post('/auth/register', () =>
    api.register({
      fullName: 'Joao',
      email: 'joao@deskimperial.com',
      companyStreetLine1: 'Rua A',
      companyStreetNumber: '10',
      companyDistrict: 'Centro',
      companyCity: 'Joinville',
      companyState: 'SC',
      companyPostalCode: '89239000',
      companyCountry: 'BR',
      hasEmployees: true,
      employeeCount: 5,
      password: '123456',
      acceptTerms: true,
      acceptPrivacy: true,
    }),
  ),
  post('/auth/forgot-password', () => api.forgotPassword({ email: 'a@b.com' })),
  post('/auth/verify-email/request', () => api.requestEmailVerification({ email: 'a@b.com' })),
  post('/auth/verify-email/confirm', () => api.verifyEmail({ email: 'a@b.com', code: '123456' })),
  post('/auth/reset-password', () => api.resetPassword({ email: 'a@b.com', code: '123456', password: 'new-pass' })),
  patch('/auth/profile', () => api.updateProfile({ fullName: 'Joao', preferredCurrency: 'BRL' })),
  get('/consent/documents', () => api.fetchConsentDocuments()),
  get('/consent/me', () => api.fetchConsentOverview()),
  get('/finance/summary', () => api.fetchFinanceSummary()),
  get('/finance/pillars', () => api.fetchPillars()),
  post('/market-intelligence/insights', () => api.fetchMarketInsight(' sell more combos ')),
  get('/employees', () => api.fetchEmployees()),
  get('/operations/summary?businessDate=2026-04-03', () => api.fetchOperationsSummary('2026-04-03')),
  get('/operations/comandas/c-99/details', () => api.fetchComandaDetails('c-99')),
  get('/operations/mesas', () => api.fetchMesas()),
  post('/operations/mesas', () => api.createMesa({ label: 'Mesa 10', capacity: 4 })),
  patch('/operations/mesas/mesa-10', () => api.updateMesa('mesa-10', { section: 'Varanda' })),
  get('/auth/activity', () => api.fetchLastLogins()),
  get('/auth/activity-feed', () => api.fetchActivityFeed()),
  post('/operations/comandas/c-9/assign?includeSnapshot=false', () => api.assignComanda('c-9', 'emp-1')),
  post('/operations/comandas/c-9/status?includeSnapshot=false', () => api.updateComandaStatus('c-9', 'READY')),
  post('/operations/comandas/c-9/status?includeSnapshot=false', () => api.cancelComanda('c-9')),
  post('/operations/comandas/c-9/close?includeSnapshot=false', () => api.closeComanda('c-9', { notes: 'fechado' })),
  post('/operations/comandas/c-9/terminal-payment-intents', () =>
    api.createComandaTerminalPaymentIntent('c-9', { method: 'CREDIT' }),
  ),
  post('/operations/cash-sessions?includeSnapshot=false', () => api.openCashSession({ openingCashAmount: 100 })),
  post('/operations/closures/close?includeSnapshot=false', () => api.closeCashClosure({ countedCashAmount: 100 })),
  post('/operations/cash-sessions/cash-1/movements?includeSnapshot=false', () =>
    api.createCashMovement('cash-1', { type: 'SUPPLY', amount: 50 }),
  ),
  post('/operations/cash-sessions/cash-1/close?includeSnapshot=false', () =>
    api.closeCashSession('cash-1', { countedCashAmount: 100 }),
  ),
  patch('/operations/kitchen-items/item-1/status', () => api.updateKitchenItemStatus('item-1', 'READY')),
  post('/employees', () => api.createEmployee({ displayName: 'Maria' })),
  patch('/employees/emp-10', () => api.updateEmployee('emp-10', { displayName: 'Maria A.' })),
  remove('/employees/emp-10', () => api.archiveEmployee('emp-10')),
  patch('/employees/emp-10/access/password', () => api.rotateEmployeePassword('emp-10')),
  post('/employees/emp-10/restore', () => api.restoreEmployee('emp-10')),
  post('/orders/order-1/cancel', () => api.cancelOrder('order-1')),
  post('/consent/preferences', () => api.updateCookiePreferences({ analytics: true, marketing: false })),
  patch('/products/product-1', () => api.updateProduct('product-1', { active: true })),
  remove('/products/product-1', () => api.archiveProduct('product-1')),
  post('/products/product-1/restore', () => api.restoreProduct('product-1')),
  remove('/products/product-1/permanent', () => api.deleteProductPermanently('product-1')),
] satisfies EndpointWrapperCase[]
