import type { FinanceSummaryResponse, MarketInsightResponse } from '@contracts/contracts'

import { type ApiBody, apiFetch } from './api-core'

export async function fetchFinanceSummary() {
  return apiFetch<FinanceSummaryResponse>('/finance/summary', {
    method: 'GET',
  })
}

export async function fetchPillars() {
  return apiFetch<{
    weeklyRevenue: {
      label: string
      value: number
      currency: string
      previousValue: number
      changePercent: number
      trend: number[]
    }
    monthlyRevenue: {
      label: string
      value: number
      currency: string
      previousValue: number
      changePercent: number
      trend: number[]
    }
    profit: {
      label: string
      value: number
      currency: string
      previousValue: number
      changePercent: number
      trend: number[]
    }
    eventRevenue: {
      label: string
      value: number
      currency: string
      previousValue: number
      changePercent: number
      trend: number[]
    }
    normalRevenue: {
      label: string
      value: number
      currency: string
      previousValue: number
      changePercent: number
      trend: number[]
    }
  }>('/finance/pillars', {
    method: 'GET',
  })
}

export async function fetchMarketInsight(focus?: string) {
  const normalizedFocus = focus?.trim()

  return apiFetch<MarketInsightResponse>('/market-intelligence/insights', {
    method: 'POST',
    body: normalizedFocus ? { focus: normalizedFocus } : ({} as ApiBody),
  })
}
