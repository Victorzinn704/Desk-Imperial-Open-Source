import type { LabStatusTone } from '@/components/design-lab/lab-primitives'

export type PortfolioMetricItem = {
  description: string
  label: string
  value: string
}

export type PortfolioSignalItem = {
  label: string
  note: string
  tone: LabStatusTone
  value: string
}

export type PortfolioActionCardModel = {
  description: string
  label: string
  statLabel: string
  statValue: string
}
