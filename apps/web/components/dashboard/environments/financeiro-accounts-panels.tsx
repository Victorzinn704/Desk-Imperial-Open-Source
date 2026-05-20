'use client'

import { LabPanel, LabStatusPill, LabTable } from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'
import { FinanceSummaryRow } from './financeiro-shared'
import { buildCustomerLedgerColumns } from './financeiro-tab-panels.columns'
import { FinanceProgressRow, ProgressRowValue } from './financeiro-progress-list'
import { buildAccountsSummaryModel } from './financeiro-tab-summary.model'
import { calculateSharePercent, type FinancePanelProps } from './financeiro-tab-panels.model'

export function FinanceTopCustomersPanel({ displayCurrency, finance }: FinancePanelProps) {
  const customers = finance?.topCustomers.slice(0, 4) ?? []
  const totalRevenue = customers.reduce((sum, customer) => sum + customer.revenue, 0)

  return (
    <LabPanel
      action={<LabStatusPill tone="info">{customers.length} clientes</LabStatusPill>}
      padding="md"
      subtitle="Concentração de receita por cliente no recorte atual."
      title="Clientes com maior peso"
    >
      <div className="space-y-4">
        {customers.length > 0 ? (
          customers.map((customer) => {
            const share = calculateSharePercent({ total: totalRevenue, value: customer.revenue })

            return (
              <FinanceProgressRow
                aside={
                  <ProgressRowValue
                    label={`${share.toFixed(0)}% da receita`}
                    value={formatCurrency(customer.revenue, displayCurrency)}
                  />
                }
                key={`${customer.customerName}-${customer.orders}`}
                shareLabel=""
                sharePercent={share}
                subtitle={`${customer.orders} pedidos no período`}
                title={customer.customerName}
              />
            )
          })
        ) : (
          <p className="text-sm text-[var(--lab-fg-soft)]">Sem clientes suficientes para leitura agora.</p>
        )}
      </div>
    </LabPanel>
  )
}

export function AccountsSummaryPanel(props: FinancePanelProps) {
  const model = buildAccountsSummaryModel(props)

  return (
    <LabPanel
      action={<LabStatusPill tone="success">{model.completedOrders} concluídos</LabStatusPill>}
      padding="md"
      subtitle="Resumo consolidado do recebido, concentração comercial e risco de cancelamento."
      title="Base de recebimento"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {model.rows.map((row) => (
          <FinanceSummaryRow key={row.label} label={row.label} tone={row.tone} value={row.value} />
        ))}
      </div>
      <FinanceChannelTotals channels={model.channels} displayCurrency={props.displayCurrency} />
    </LabPanel>
  )
}

export function AccountsCustomerLedgerPanel({ displayCurrency, finance }: FinancePanelProps) {
  const customers = finance?.topCustomers.slice(0, 6) ?? []

  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{customers.length} clientes</LabStatusPill>}
      padding="md"
      subtitle="Concentração por cliente para acompanhar quem sustenta recebimento e ticket."
      title="Clientes que mais pesam"
    >
      <LabTable
        dense
        className="rounded-none border-0 bg-transparent"
        columns={buildCustomerLedgerColumns({ displayCurrency })}
        emptyDescription="Sem clientes suficientes para leitura de contas agora."
        emptyTitle="Nenhum cliente consolidado"
        rowKey={(row) => `${row.customerName}-${row.orders}`}
        rows={customers}
      />
    </LabPanel>
  )
}

function FinanceChannelTotals({
  channels,
  displayCurrency,
}: Readonly<{
  channels: NonNullable<ReturnType<typeof buildAccountsSummaryModel>['channels']>
  displayCurrency: FinancePanelProps['displayCurrency']
}>) {
  return (
    <div className="mt-5 space-y-2">
      {channels.map((channel) => (
        <div
          className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-2 last:border-b-0 last:pb-0"
          key={channel.channel}
        >
          <span className="text-sm text-[var(--lab-fg)]">{channel.channel}</span>
          <span className="text-sm text-[var(--lab-fg-soft)]">
            {channel.orders} pedidos · {formatCurrency(channel.revenue, displayCurrency)}
          </span>
        </div>
      ))}
    </div>
  )
}
