export type MarketInsightFocus = {
  value: string
}

export type RateLimitEntry = {
  count: number
  firstAttemptAt: number
  lockedUntil: number | null
}

export type MarketInsightResponse = {
  generatedAt: string
  model: string
  focus: string
  cached: boolean
  summary: string
  forecast: string
  opportunities: string[]
  risks: string[]
  nextActions: string[]
}

export type MarketInsightModelPayload = {
  summary?: unknown
  forecast?: unknown
  opportunities?: unknown
  risks?: unknown
  nextActions?: unknown
}
