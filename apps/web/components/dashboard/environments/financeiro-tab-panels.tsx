'use client'

import type { FinanceSummaryResponse, ProductRecord } from '@contracts/contracts'
import type { FinanceiroView } from './financeiro-model'
import { ContasView, DreView, FluxoView, MovimentacaoView } from './financeiro-tab-panels.views'

export function FinanceiroTabBody({
  displayCurrency,
  finance,
  isLoading,
  products,
  view,
}: Readonly<{
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  finance: FinanceSummaryResponse | undefined
  isLoading: boolean
  products: ProductRecord[]
  view: FinanceiroView
}>) {
  const tabProps = {
    displayCurrency,
    finance,
  }

  switch (view) {
    case 'fluxo':
      return <FluxoView {...tabProps} />
    case 'dre':
      return <DreView {...tabProps} products={products} />
    case 'contas':
      return <ContasView {...tabProps} />
    default:
      return <MovimentacaoView {...tabProps} isLoading={isLoading} />
  }
}
