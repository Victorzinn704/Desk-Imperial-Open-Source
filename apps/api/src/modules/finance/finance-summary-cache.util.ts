import type { FinanceSummaryResponse } from '@contracts/contracts'

export const FINANCE_SUMMARY_FRESH_TTL_SECONDS = 120
export const FINANCE_SUMMARY_STALE_TTL_SECONDS = 300
export const FINANCE_SUMMARY_REFRESH_AHEAD_MS = 90_000

export type FinanceSummaryCacheEntry = {
  payload: FinanceSummaryResponse
  cachedAt: string
}

export function unwrapFinanceSummaryCache(
  entry: FinanceSummaryCacheEntry | FinanceSummaryResponse | null,
): FinanceSummaryResponse | null {
  if (!entry) {
    return null
  }

  return isFinanceSummaryCacheEntry(entry) ? entry.payload : entry
}

export function shouldRefreshFinanceSummaryCache(entry: FinanceSummaryCacheEntry | FinanceSummaryResponse | null) {
  const ageMs = getFinanceSummaryCacheAgeMs(entry)
  if (ageMs == null) {
    return false
  }

  return ageMs >= FINANCE_SUMMARY_REFRESH_AHEAD_MS
}

export function getFinanceSummaryCacheAgeMs(entry: FinanceSummaryCacheEntry | FinanceSummaryResponse | null) {
  if (!(entry && isFinanceSummaryCacheEntry(entry))) {
    return null
  }

  const ageMs = Date.now() - Date.parse(entry.cachedAt)
  return Number.isFinite(ageMs) ? ageMs : null
}

function isFinanceSummaryCacheEntry(
  entry: FinanceSummaryCacheEntry | FinanceSummaryResponse,
): entry is FinanceSummaryCacheEntry {
  return typeof entry === 'object' && entry !== null && 'payload' in entry && 'cachedAt' in entry
}
