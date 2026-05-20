'use client'

import { LabPageHeader, LabStatusPill } from '@/components/design-lab/lab-primitives'
import { VascoNextMatchWidget } from '@/components/shared/football-widgets'
import { formatCurrency } from '@/lib/currency'
import { useOverviewEnvironmentState } from './overview-environment.controller'
import {
  buildTargetPlan,
  marginLabTone,
  signedPercent,
  stockLabTone,
  trendLabTone,
} from './overview-environment.content'
import { formatPercent, type OverviewSnapshot } from './overview-environment.model'
import { LabMetaRow, OverviewExecutivePanel, OverviewLockedState } from './overview-environment.shared'

export function DesignLabOverviewEnvironment() {
  const state = useOverviewEnvironmentState()

  if (state.kind === 'locked') {
    return <OverviewLockedState />
  }

  const { finance, isLoading, products, snapshot } = state.props
  const plan = buildTargetPlan(snapshot, { minimumGap: 1200, multiplier: 1.14, orderFactor: 18 })

  return (
    <section className="space-y-6">
      <LabPageHeader
        asideClassName="xl:max-w-[690px]"
        description="Receita, lucro, ticket e alertas."
        eyebrow="visão geral da operação"
        meta={<DesignLabOverviewMeta snapshot={snapshot} />}
        metaContainerClassName="border-0 bg-transparent p-0 xl:max-w-none"
        title="Overview"
      >
        <DesignLabOverviewPills snapshot={snapshot} />
      </LabPageHeader>

      <OverviewExecutivePanel
        dailyRevenueNeed={plan.dailyRevenueNeed}
        finance={finance}
        isLoading={isLoading}
        products={products}
        snapshot={snapshot}
        targetProgress={plan.targetProgress}
        targetRevenue={plan.targetRevenue}
      />
    </section>
  )
}

function DesignLabOverviewMeta({ snapshot }: Readonly<{ snapshot: OverviewSnapshot }>) {
  return (
    <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
      <VascoNextMatchWidget compact className="border-[var(--lab-border)] bg-[var(--lab-surface)]" />
      <div className="flex h-full flex-col rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-surface)] p-4">
        <div className="space-y-3">
          <LabMetaRow label="Empresa" tone="neutral" value={snapshot.companyName} />
          <LabMetaRow
            label="Receita vs mês anterior"
            tone={trendLabTone({ value: snapshot.revenueGrowth })}
            value={signedPercent({ value: snapshot.revenueGrowth })}
          />
          <LabMetaRow
            label="Lucro do mês"
            tone={trendLabTone({ value: snapshot.currentProfit })}
            value={formatCurrency(snapshot.currentProfit, snapshot.displayCurrency)}
          />
          <LabMetaRow
            label="Estoque crítico"
            tone={stockLabTone(snapshot)}
            value={stockLabel(snapshot.lowStockItems)}
          />
        </div>
      </div>
    </div>
  )
}

function DesignLabOverviewPills({ snapshot }: Readonly<{ snapshot: OverviewSnapshot }>) {
  const pills = [
    { label: `ticket ${formatCurrency(snapshot.averageTicket, snapshot.displayCurrency)}`, tone: 'info' as const },
    { label: `margem ${formatPercent(snapshot.averageMargin)}`, tone: marginLabTone(snapshot) },
    {
      label: snapshot.lowStockItems > 0 ? 'reposição no radar' : 'estoque estável',
      tone: stockLabTone(snapshot),
    },
    ...(snapshot.topProductName ? [{ label: `destaque ${snapshot.topProductName}`, tone: 'neutral' as const }] : []),
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {pills.map((pill) => (
        <LabStatusPill key={pill.label} tone={pill.tone}>
          {pill.label}
        </LabStatusPill>
      ))}
    </div>
  )
}

function stockLabel(lowStockItems: number) {
  return lowStockItems > 0 ? `${lowStockItems} itens` : 'Sem alerta'
}
