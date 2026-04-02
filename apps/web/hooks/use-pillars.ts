'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchPillars } from '@/lib/api'

export type PillarData = {
  label: string
  value: number
  currency: string
  previousValue: number
  changePercent: number
  trend: number[]
}

export function usePillars() {
  return useQuery({
    queryKey: ['pillars'],
    queryFn: fetchPillars,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 30 * 60 * 1000, // 30 minutos
  })
}
