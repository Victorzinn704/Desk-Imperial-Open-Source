import { BadGatewayException } from '@nestjs/common'
import type { MarketInsightModelPayload } from './market-intelligence.types'

export function normalizeInsightPayload(rawText: string) {
  const parsed = parseInsightPayload(rawText)
  const insight = {
    summary: normalizeString(parsed.summary),
    forecast: normalizeString(parsed.forecast),
    opportunities: normalizeStringArray(parsed.opportunities, 3),
    risks: normalizeStringArray(parsed.risks, 3),
    nextActions: normalizeStringArray(parsed.nextActions, 4),
  }

  if (!isCompleteInsightPayload(insight)) {
    throw new BadGatewayException('A resposta da IA veio incompleta para o dashboard executivo.')
  }

  return insight
}

function parseInsightPayload(rawText: string): MarketInsightModelPayload {
  try {
    return JSON.parse(rawText) as MarketInsightModelPayload
  } catch {
    throw new BadGatewayException('A IA retornou um formato invalido para a leitura executiva.')
  }
}

function isCompleteInsightPayload(insight: {
  summary: string
  forecast: string
  opportunities: string[]
  risks: string[]
  nextActions: string[]
}) {
  return Boolean(
    insight.summary &&
    insight.forecast &&
    insight.opportunities.length &&
    insight.risks.length &&
    insight.nextActions.length,
  )
}

function normalizeString(value: unknown) {
  if (typeof value !== 'string') {
    return ''
  }
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeStringArray(value: unknown, maxItems: number) {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, maxItems)
}
