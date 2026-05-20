import { reportApiRequestMeasurementToFaro } from './observability/faro'
import { buildFetchError, reportApiErrorTelemetry, toApiError } from './api-core.errors'
import {
  fetchWithTimeout,
  getCurrentTimeMs,
  hasCsrfToken,
  persistCsrfToken,
  prepareApiRequest,
  readResponseRequestId,
} from './api-core.request'
import type { ApiFetchOptions } from './api-core.types'

export type { ApiBody, JsonBody } from './api-core.types'

export { ApiError, isLegacyOwnerLoginContractError } from './api-core.errors'
export {
  ADMIN_PIN_HINT_KEY,
  AUTH_API_TIMEOUT_MS,
  BARCODE_LOOKUP_TIMEOUT_MS,
  CSRF_COOKIE_NAMES,
  CSRF_STORAGE_KEY,
  DEFAULT_API_TIMEOUT_MS,
  POSTAL_LOOKUP_TIMEOUT_MS,
  REQUEST_ID_FORWARD_HEADER,
  REQUEST_ID_HEADER,
} from './api-core.types'
export {
  clearPersistedAdminPinHint,
  clearPersistedCsrfToken,
  resolveApiTimeoutMs,
  withOperationsOptions,
} from './api-core.request'

export async function apiFetch<T>(path: string, options: ApiFetchOptions) {
  const request = prepareApiRequest(path, options)
  const requestStartedAt = getCurrentTimeMs()
  let response: Response

  try {
    response = await fetchWithTimeout(request.url, request.init, request.timeoutMs, path)
  } catch (error) {
    const elapsedMs = Math.max(0, getCurrentTimeMs() - requestStartedAt)
    throw buildFetchError(error, elapsedMs, {
      path,
      method: request.method,
      requestId: request.clientRequestId,
    })
  }

  return handleApiResponse<T>({ path, request, requestStartedAt, response })
}

async function handleApiResponse<T>({
  path,
  request,
  requestStartedAt,
  response,
}: {
  path: string
  request: ReturnType<typeof prepareApiRequest>
  requestStartedAt: number
  response: Response
}) {
  const durationMs = Math.max(0, getCurrentTimeMs() - requestStartedAt)
  const responseRequestId = readResponseRequestId(response) ?? request.clientRequestId

  reportApiRequestMeasurementToFaro({
    path,
    method: request.method,
    status: response.status,
    durationMs,
    requestId: responseRequestId,
  })

  if (!response.ok) {
    throw await buildApiResponseError({ path, request, requestId: responseRequestId, response })
  }

  return readApiSuccessPayload<T>(response)
}

async function buildApiResponseError({
  path,
  request,
  requestId,
  response,
}: {
  path: string
  request: ReturnType<typeof prepareApiRequest>
  requestId: string | null
  response: Response
}) {
  const apiError = await toApiError(response, requestId)
  if (apiError.status >= 500) {
    reportApiErrorTelemetry(apiError, {
      path,
      method: request.method,
      requestId,
    })
  }

  return apiError
}

async function readApiSuccessPayload<T>(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return undefined as T
  }

  const payload = (await response.json()) as T
  if (hasCsrfToken(payload)) {
    persistCsrfToken(payload.csrfToken)
  }

  return payload
}
