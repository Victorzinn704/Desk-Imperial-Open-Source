'use client'

import { type OwnerFinanceViewProps } from './owner-finance-view-model'
import { OwnerFinanceActions, OwnerFinanceHero, OwnerFinanceStatusBanner } from './owner-finance-view-sections'

export function OwnerFinanceView({
  caixaEsperado,
  errorMessage,
  isOffline,
  lucroRealizado,
  onOpenCash,
  onOpenFinanceiro,
  ticketMedio,
  todayOrderCount,
  todayRevenue,
}: OwnerFinanceViewProps) {
  return (
    <div className="space-y-4 p-3 pb-6">
      <OwnerFinanceStatusBanner errorMessage={errorMessage} isOffline={isOffline} />
      <OwnerFinanceHero
        caixaEsperado={caixaEsperado}
        lucroRealizado={lucroRealizado}
        ticketMedio={ticketMedio}
        todayOrderCount={todayOrderCount}
        todayRevenue={todayRevenue}
      />
      <OwnerFinanceActions onOpenCash={onOpenCash} onOpenFinanceiro={onOpenFinanceiro} />
    </div>
  )
}
