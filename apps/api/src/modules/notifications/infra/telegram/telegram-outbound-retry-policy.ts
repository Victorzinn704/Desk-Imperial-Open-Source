import type { OutboundJob } from './telegram-runtime.types'

const MAX_BACKOFF_MS = 60_000

export type TelegramRetryDecision =
  | { retry: true; delayMs: number; reason: 'rate_429' | 'server_error' }
  | { retry: false }

export function resolveTelegramRetryDecision(job: OutboundJob, error: unknown): TelegramRetryDecision {
  const tooManyRequestsDelay = readTooManyRequestsDelay(error)
  if (tooManyRequestsDelay !== null) {
    return { retry: true, delayMs: tooManyRequestsDelay, reason: 'rate_429' }
  }

  if (isServerError(error)) {
    return { retry: true, delayMs: resolveServerBackoff(job), reason: 'server_error' }
  }

  return { retry: false }
}

function readTooManyRequestsDelay(error: unknown): number | null {
  if (readErrorCode(error) !== 429) {
    return null
  }

  const retryAfter = readRetryAfterSeconds(error)
  return Math.min(MAX_BACKOFF_MS, (retryAfter ?? 1) * 1_000)
}

function readRetryAfterSeconds(error: unknown) {
  if (!error || typeof error !== 'object') {
    return null
  }

  const params = (error as { parameters?: { retry_after?: number } }).parameters
  return typeof params?.retry_after === 'number' && params.retry_after > 0 ? params.retry_after : null
}

function isServerError(error: unknown) {
  const code = readErrorCode(error)
  return code !== null && code >= 500 && code < 600
}

function resolveServerBackoff(job: OutboundJob) {
  return Math.min(MAX_BACKOFF_MS, 1_000 * 2 ** Math.min(job.attempts, 5))
}

function readErrorCode(error: unknown): number | null {
  if (!error || typeof error !== 'object') {
    return null
  }

  if ('error_code' in error && typeof error.error_code === 'number') {
    return error.error_code
  }

  return 'status' in error && typeof error.status === 'number' ? error.status : null
}
