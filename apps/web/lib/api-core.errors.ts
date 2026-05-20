import { resolveApiBaseUrl } from './api-base-url'
import { reportApiErrorToFaro, reportApiRequestMeasurementToFaro } from './observability/faro'
import type { ApiRequestTelemetryContext } from './api-core.types'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly requestId: string | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class ApiTimeoutError extends Error {
  constructor(
    public readonly timeoutMs: number,
    public readonly requestPath: string,
  ) {
    super(`Request timed out after ${timeoutMs}ms`)
    this.name = 'ApiTimeoutError'
  }
}

export function buildFetchError(
  error: unknown,
  elapsedMs: number,
  context: Required<ApiRequestTelemetryContext>,
): ApiError {
  if (error instanceof ApiTimeoutError) {
    return buildTimeoutApiError(error, elapsedMs, context)
  }

  return buildConnectionApiError(elapsedMs, context)
}

export async function toApiError(response: Response, requestId: string | null) {
  const fallbackMessage = getFallbackApiErrorMessage(response.status)
  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.includes('application/json')) {
    return new ApiError(fallbackMessage, response.status, requestId)
  }

  const payload = (await response.json()) as { message?: string | string[] }
  const message = Array.isArray(payload.message) ? payload.message.join(' ') : payload.message

  return new ApiError(message || fallbackMessage, response.status, requestId)
}

export function isLegacyOwnerLoginContractError(error: ApiError) {
  if (error.status !== 400) {
    return false
  }

  const normalizedMessage = error.message.toLowerCase()
  return (
    normalizedMessage.includes('property loginmode should not exist') ||
    normalizedMessage.includes('property companyemail should not exist') ||
    normalizedMessage.includes('property employeecode should not exist')
  )
}

export function reportApiErrorTelemetry(error: ApiError, context: ApiRequestTelemetryContext) {
  reportApiErrorToFaro(error, {
    path: context.path,
    method: context.method,
    status: error.status,
    requestId: context.requestId ?? error.requestId,
  })
}

function buildTimeoutApiError(
  error: ApiTimeoutError,
  elapsedMs: number,
  context: Required<ApiRequestTelemetryContext>,
) {
  const apiError = new ApiError(
    `A requisicao demorou demais (${Math.ceil(error.timeoutMs / 1000)}s). Tente novamente.`,
    504,
    context.requestId,
  )

  reportApiErrorTelemetry(apiError, context)
  reportApiRequestMeasurementToFaro({
    ...context,
    status: 504,
    durationMs: Math.max(elapsedMs, error.timeoutMs),
  })

  return apiError
}

function buildConnectionApiError(elapsedMs: number, context: Required<ApiRequestTelemetryContext>) {
  const apiError = new ApiError(
    `Nao foi possivel conectar com a API em ${resolveApiBaseUrl()}. Verifique se o backend esta ativo.`,
    0,
    context.requestId,
  )

  reportApiErrorTelemetry(apiError, context)
  reportApiRequestMeasurementToFaro({
    ...context,
    status: 0,
    durationMs: elapsedMs,
  })

  return apiError
}

function getFallbackApiErrorMessage(status: number) {
  return status >= 500 ? 'O servidor encontrou um erro inesperado.' : 'Nao foi possivel concluir a requisicao.'
}
