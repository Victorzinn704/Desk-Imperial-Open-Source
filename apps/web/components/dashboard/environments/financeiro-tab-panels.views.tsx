'use client'

import {
  AccountsCustomerLedgerPanel,
  AccountsSummaryPanel,
  FinanceTopCustomersPanel,
} from './financeiro-accounts-panels'
import { DrePeriodBreakdownPanel, DreProductDriversPanel, DreStatementPanel } from './financeiro-dre-panels'
import { FinanceFlowAuditPanel, FinancePeriodAuditPanel, FinanceTeamContributionPanel } from './financeiro-flow-panels'
import { FinanceOrdersBlock } from './financeiro-orders-panel'
import type {
  FinanceLoadingPanelProps,
  FinancePanelProps,
  FinanceProductsPanelProps,
} from './financeiro-tab-panels.model'

export function FluxoView(props: FinancePanelProps) {
  return (
    <>
      <div className="workspace-notebook-split workspace-notebook-split--rail-360">
        <FinanceFlowAuditPanel {...props} />
        <FinanceTeamContributionPanel {...props} />
      </div>
      <FinanceOrdersBlock
        displayCurrency={props.displayCurrency}
        orders={props.finance?.recentOrders ?? []}
        subtitle="Pedidos que explicam as últimas entradas e saídas consolidadas."
        title="Últimos movimentos do caixa"
      />
    </>
  )
}

export function DreView(props: FinanceProductsPanelProps) {
  return (
    <>
      <div className="workspace-notebook-split workspace-notebook-split--rail-360">
        <DreStatementPanel {...props} />
        <DreProductDriversPanel {...props} />
      </div>
      <DrePeriodBreakdownPanel {...props} />
    </>
  )
}

export function ContasView(props: FinancePanelProps) {
  return (
    <>
      <div className="workspace-notebook-split workspace-notebook-split--rail-360">
        <AccountsCustomerLedgerPanel {...props} />
        <AccountsSummaryPanel {...props} />
      </div>
      <FinanceOrdersBlock
        displayCurrency={props.displayCurrency}
        orders={props.finance?.recentOrders ?? []}
        subtitle="Amostra recente de pedidos concluídos e cancelados para auditoria operacional."
        title="Pedidos financeiros do período"
      />
    </>
  )
}

export function MovimentacaoView(props: FinanceLoadingPanelProps) {
  return (
    <>
      <div className="workspace-notebook-split workspace-notebook-split--rail-360">
        <FinancePeriodAuditPanel {...props} />
        <FinanceTopCustomersPanel {...props} />
      </div>
      <FinanceOrdersBlock
        displayCurrency={props.displayCurrency}
        orders={props.finance?.recentOrders ?? []}
        subtitle="Últimos lançamentos consolidados na superfície financeira."
        title="Lançamentos do período"
      />
    </>
  )
}
