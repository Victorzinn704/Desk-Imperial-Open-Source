'use client'

import { type OwnerFinanceViewProps } from './owner-finance-view-model'
import {
  OwnerFinanceActions,
  OwnerFinanceCategoryMix,
  OwnerFinanceHero,
  OwnerFinanceStatusBanner,
} from './owner-finance-view-sections'

export function OwnerFinanceView({
  caixaEsperado,
  categoryBreakdown = [],
  displayCurrency = 'BRL',
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
      <OwnerFinanceCategoryMix categoryBreakdown={categoryBreakdown} displayCurrency={displayCurrency} />
      <OwnerFinanceActions onOpenCash={onOpenCash} onOpenFinanceiro={onOpenFinanceiro} />
    </div>
  )
}
