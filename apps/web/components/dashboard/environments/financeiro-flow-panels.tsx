'use client'

import { LabPanel, LabStatusPill, LabTable } from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'
import { buildFlowAuditColumns, buildTimelineAuditColumns } from './financeiro-tab-panels.columns'
import { FinanceProgressRow, ProgressRowValue } from './financeiro-progress-list'
import {
  buildFlowAuditRows,
  buildTimelineAuditRows,
  calculateSharePercent,
  type FinanceLoadingPanelProps,
  type FinancePanelProps,
} from './financeiro-tab-panels.model'

export function FinancePeriodAuditPanel({ displayCurrency, finance, isLoading }: FinanceLoadingPanelProps) {
  const rows = buildTimelineAuditRows(finance?.revenueTimeline ?? [])

  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{rows.length} períodos</LabStatusPill>}
      padding="md"
      subtitle="Leitura direta para comparar receita, lucro, pedidos e ticket sem depender de gráfico."
      title="Fechamento por período"
    >
      {isLoading ? (
        <AuditLoadingState />
      ) : (
        <LabTable
          dense
          className="rounded-none border-0 bg-transparent"
          columns={buildTimelineAuditColumns({ displayCurrency })}
          emptyDescription="Sem períodos suficientes para fechar a leitura."
          emptyTitle="Nenhum período consolidado"
          rowKey="label"
          rows={rows}
        />
      )}
    </LabPanel>
  )
}

export function FinanceFlowAuditPanel({ displayCurrency, finance }: FinancePanelProps) {
  const rows = buildFlowAuditRows(finance?.revenueTimeline ?? [])

  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{rows.length} janelas</LabStatusPill>}
      padding="md"
      subtitle="Entrada, saída, resultado e ticket por janela do caixa."
      title="Janelas do caixa"
    >
      <LabTable
        dense
        className="rounded-none border-0 bg-transparent"
        columns={buildFlowAuditColumns({ displayCurrency })}
        emptyDescription="Sem histórico suficiente para montar o fluxo agora."
        emptyTitle="Nenhuma janela consolidada"
        rowKey="label"
        rows={rows}
      />
    </LabPanel>
  )
}

export function FinanceTeamContributionPanel({ displayCurrency, finance }: FinancePanelProps) {
  const ranking = finance?.topEmployees.slice(0, 4) ?? []
  const totalRevenue = ranking.reduce((sum, employee) => sum + employee.revenue, 0)

  return (
    <LabPanel
      action={<LabStatusPill tone="info">{ranking.length} nomes</LabStatusPill>}
      padding="md"
      subtitle="Quem mais puxou caixa no recorte, com ticket médio e volume."
      title="Equipe com maior giro"
    >
      <div className="space-y-4">
        {ranking.length > 0 ? (
          ranking.map((employee) => {
            const share = calculateSharePercent({ total: totalRevenue, value: employee.revenue })

            return (
              <FinanceProgressRow
                aside={
                  <ProgressRowValue
                    label={`${share.toFixed(0)}% do caixa`}
                    value={formatCurrency(employee.revenue, displayCurrency)}
                  />
                }
                key={`${employee.employeeName}-${employee.orders}`}
                shareLabel=""
                sharePercent={share}
                subtitle={`${employee.orders} pedidos · ticket ${formatCurrency(employee.averageTicket, displayCurrency)}`}
                title={employee.employeeName}
              />
            )
          })
        ) : (
          <p className="text-sm text-[var(--lab-fg-soft)]">Sem responsáveis suficientes para leitura agora.</p>
        )}
      </div>
    </LabPanel>
  )
}

function AuditLoadingState() {
  return (
    <div className="rounded-[12px] border border-dashed border-[var(--lab-border)] px-4 py-10 text-center text-sm text-[var(--lab-fg-soft)]">
      Carregando períodos financeiros...
    </div>
  )
}
