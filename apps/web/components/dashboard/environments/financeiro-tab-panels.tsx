'use client'

import type { FinanceSummaryResponse } from '@contracts/contracts'
import { FinanceOrdersTable } from '@/components/dashboard/finance-orders-table'
import { LabPanel, LabStatusPill, LabTable, type LabStatusTone } from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'
import { type FinanceiroView, formatPercent } from './financeiro-model'
import { FinanceSummaryRow } from './financeiro-shared'

export function FinanceiroTabBody({
  displayCurrency,
  finance,
  isLoading,
  view,
}: Readonly<{
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  finance: FinanceSummaryResponse | undefined
  isLoading: boolean
  view: FinanceiroView
}>) {
  switch (view) {
    case 'fluxo':
      return <FluxoView displayCurrency={displayCurrency} finance={finance} />
    case 'dre':
      return <DreView displayCurrency={displayCurrency} finance={finance} />
    case 'contas':
      return <ContasView displayCurrency={displayCurrency} finance={finance} />
    case 'movimentacao':
    default:
      return <MovimentacaoView displayCurrency={displayCurrency} finance={finance} isLoading={isLoading} />
  }
}

function FluxoView({
  displayCurrency,
  finance,
}: Readonly<{
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  finance: FinanceSummaryResponse | undefined
}>) {
  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <FinanceFlowAuditPanel displayCurrency={displayCurrency} finance={finance} />
        <FinanceTeamContributionPanel displayCurrency={displayCurrency} finance={finance} />
      </div>
      <FinanceOrdersBlock
        displayCurrency={displayCurrency}
        orders={finance?.recentOrders ?? []}
        subtitle="Pedidos que explicam as últimas entradas e saídas consolidadas."
        title="Últimos movimentos do caixa"
      />
    </>
  )
}

function DreView({
  displayCurrency,
  finance,
}: Readonly<{
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  finance: FinanceSummaryResponse | undefined
}>) {
  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <DreStatementPanel displayCurrency={displayCurrency} finance={finance} />
        <DreProductDriversPanel displayCurrency={displayCurrency} finance={finance} />
      </div>
      <DrePeriodBreakdownPanel displayCurrency={displayCurrency} finance={finance} />
    </>
  )
}

function ContasView({
  displayCurrency,
  finance,
}: Readonly<{
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  finance: FinanceSummaryResponse | undefined
}>) {
  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <AccountsCustomerLedgerPanel displayCurrency={displayCurrency} finance={finance} />
        <AccountsSummaryPanel displayCurrency={displayCurrency} finance={finance} />
      </div>
      <FinanceOrdersBlock
        displayCurrency={displayCurrency}
        orders={finance?.recentOrders ?? []}
        subtitle="Amostra recente de pedidos concluídos e cancelados para auditoria operacional."
        title="Pedidos financeiros do período"
      />
    </>
  )
}

function MovimentacaoView({
  displayCurrency,
  finance,
  isLoading,
}: Readonly<{
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  finance: FinanceSummaryResponse | undefined
  isLoading: boolean
}>) {
  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <FinancePeriodAuditPanel displayCurrency={displayCurrency} finance={finance} isLoading={isLoading} />
        <FinanceTopCustomersPanel displayCurrency={displayCurrency} finance={finance} />
      </div>
      <FinanceOrdersBlock
        displayCurrency={displayCurrency}
        orders={finance?.recentOrders ?? []}
        subtitle="Últimos lançamentos consolidados na superfície financeira."
        title="Lançamentos do período"
      />
    </>
  )
}

function FinanceTopCustomersPanel({
  displayCurrency,
  finance,
}: Readonly<{
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  finance?: FinanceSummaryResponse
}>) {
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
            const share = totalRevenue > 0 ? (customer.revenue / totalRevenue) * 100 : 0
            return (
              <div className="space-y-2" key={`${customer.customerName}-${customer.orders}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--lab-fg)]">{customer.customerName}</p>
                    <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">{customer.orders} pedidos no período</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium text-[var(--lab-fg)]">
                      {formatCurrency(customer.revenue, displayCurrency)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">{share.toFixed(0)}% da receita</p>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--lab-surface-hover)]">
                  <div
                    className="h-full rounded-full bg-[var(--lab-blue)]"
                    style={{ width: `${Math.max(8, Math.min(share, 100))}%` }}
                  />
                </div>
              </div>
            )
          })
        ) : (
          <p className="text-sm text-[var(--lab-fg-soft)]">Sem clientes suficientes para leitura agora.</p>
        )}
      </div>
    </LabPanel>
  )
}

function FinancePeriodAuditPanel({
  displayCurrency,
  finance,
  isLoading,
}: Readonly<{
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  finance?: FinanceSummaryResponse
  isLoading: boolean
}>) {
  const timeline = finance?.revenueTimeline ?? []
  const rows = buildTimelineAuditRows(timeline)

  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{timeline.length || 0} períodos</LabStatusPill>}
      padding="md"
      subtitle="Leitura direta para comparar receita, lucro, pedidos e ticket sem depender de gráfico."
      title="Fechamento por período"
    >
      {isLoading ? (
        <div className="rounded-[12px] border border-dashed border-[var(--lab-border)] px-4 py-10 text-center text-sm text-[var(--lab-fg-soft)]">
          Carregando períodos financeiros...
        </div>
      ) : rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-dashed border-[var(--lab-border)] text-left text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">
                <th className="px-0 py-3 font-semibold">Período</th>
                <th className="px-0 py-3 font-semibold text-right">Receita</th>
                <th className="px-0 py-3 font-semibold text-right">Lucro</th>
                <th className="px-0 py-3 font-semibold text-right">Pedidos</th>
                <th className="px-0 py-3 font-semibold text-right">Ticket</th>
                <th className="px-0 py-3 font-semibold text-right">Delta</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-b border-dashed border-[var(--lab-border)] last:border-b-0" key={row.label}>
                  <td className="px-0 py-3 font-medium text-[var(--lab-fg)]">{row.label}</td>
                  <td className="px-0 py-3 text-right text-[var(--lab-fg)]">
                    {formatCurrency(row.revenue, displayCurrency)}
                  </td>
                  <td className="px-0 py-3 text-right text-[var(--lab-fg-soft)]">
                    {formatCurrency(row.profit, displayCurrency)}
                  </td>
                  <td className="px-0 py-3 text-right text-[var(--lab-fg-soft)]">{row.orders}</td>
                  <td className="px-0 py-3 text-right text-[var(--lab-fg-soft)]">
                    {formatCurrency(row.averageTicket, displayCurrency)}
                  </td>
                  <td className="px-0 py-3 text-right">
                    {row.revenueDelta === null ? (
                      <span className="text-xs text-[var(--lab-fg-soft)]">—</span>
                    ) : (
                      <LabStatusPill tone={row.revenueDelta >= 0 ? 'success' : 'danger'}>
                        {row.revenueDelta >= 0 ? '+' : ''}
                        {formatPercent(row.revenueDelta)}
                      </LabStatusPill>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-[12px] border border-dashed border-[var(--lab-border)] px-4 py-10 text-center text-sm text-[var(--lab-fg-soft)]">
          Sem períodos suficientes para fechar a leitura.
        </div>
      )}
    </LabPanel>
  )
}

function buildTimelineAuditRows(timeline: FinanceSummaryResponse['revenueTimeline']) {
  const computed = timeline.map((row, index) => {
    const previous = index > 0 ? timeline[index - 1] : null
    const revenueDelta =
      previous && previous.revenue > 0 ? Number((((row.revenue - previous.revenue) / previous.revenue) * 100).toFixed(1)) : null
    const averageTicket = row.orders > 0 ? row.revenue / row.orders : 0

    return {
      label: row.label,
      revenue: row.revenue,
      profit: row.profit,
      orders: row.orders,
      averageTicket,
      revenueDelta,
    }
  })

  return computed.reverse()
}

function FinanceOrdersBlock({
  displayCurrency,
  orders,
  subtitle,
  title,
}: Readonly<{
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  orders: FinanceSummaryResponse['recentOrders']
  subtitle?: string
  title: string
}>) {
  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{orders.length} itens</LabStatusPill>}
      padding="md"
      subtitle={subtitle}
      title={title}
    >
      <FinanceOrdersTable displayCurrency={displayCurrency as FinanceSummaryResponse['displayCurrency']} orders={orders} />
    </LabPanel>
  )
}

function FinanceFlowAuditPanel({
  displayCurrency,
  finance,
}: Readonly<{
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  finance?: FinanceSummaryResponse
}>) {
  const rows = buildFlowAuditRows(finance?.revenueTimeline ?? [])

  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{rows.length || 0} janelas</LabStatusPill>}
      padding="md"
      subtitle="Entrada, saída, resultado e ticket por janela do caixa."
      title="Janelas do caixa"
    >
      <LabTable
        className="rounded-none border-0 bg-transparent"
        columns={[
          {
            id: 'label',
            header: 'Período',
            cell: (row: FlowAuditRow) => <span className="font-medium text-[var(--lab-fg)]">{row.label}</span>,
          },
          {
            id: 'revenue',
            header: 'Entrada',
            align: 'right',
            cell: (row: FlowAuditRow) => formatCurrency(row.revenue, displayCurrency),
            className: 'text-[var(--lab-fg)]',
          },
          {
            id: 'cost',
            header: 'Saída',
            align: 'right',
            cell: (row: FlowAuditRow) => formatCurrency(row.cost, displayCurrency),
          },
          {
            id: 'profit',
            header: 'Resultado',
            align: 'right',
            cell: (row: FlowAuditRow) => formatCurrency(row.profit, displayCurrency),
            className: 'text-[var(--lab-fg)]',
          },
          {
            id: 'orders',
            header: 'Pedidos',
            align: 'right',
            cell: (row: FlowAuditRow) => row.orders,
          },
          {
            id: 'ticket',
            header: 'Ticket',
            align: 'right',
            cell: (row: FlowAuditRow) => formatCurrency(row.averageTicket, displayCurrency),
          },
        ]}
        dense
        emptyDescription="Sem histórico suficiente para montar o fluxo agora."
        emptyTitle="Nenhuma janela consolidada"
        rowKey="label"
        rows={rows}
      />
    </LabPanel>
  )
}

function FinanceTeamContributionPanel({
  displayCurrency,
  finance,
}: Readonly<{
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  finance?: FinanceSummaryResponse
}>) {
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
            const share = totalRevenue > 0 ? (employee.revenue / totalRevenue) * 100 : 0
            return (
              <div className="space-y-2" key={`${employee.employeeName}-${employee.orders}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--lab-fg)]">{employee.employeeName}</p>
                    <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">
                      {employee.orders} pedidos · ticket {formatCurrency(employee.averageTicket, displayCurrency)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium text-[var(--lab-fg)]">
                      {formatCurrency(employee.revenue, displayCurrency)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">{share.toFixed(0)}% do caixa</p>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--lab-surface-hover)]">
                  <div
                    className="h-full rounded-full bg-[var(--lab-blue)]"
                    style={{ width: `${Math.max(8, Math.min(share, 100))}%` }}
                  />
                </div>
              </div>
            )
          })
        ) : (
          <p className="text-sm text-[var(--lab-fg-soft)]">Sem responsáveis suficientes para leitura agora.</p>
        )}
      </div>
    </LabPanel>
  )
}

function DreStatementPanel({
  displayCurrency,
  finance,
}: Readonly<{
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  finance?: FinanceSummaryResponse
}>) {
  const totals = finance?.totals
  const revenue = totals?.currentMonthRevenue ?? 0
  const profit = totals?.currentMonthProfit ?? 0
  const realizedCost = totals?.realizedCost ?? Math.max(0, revenue - profit)
  const completedOrders = totals?.completedOrders ?? 0
  const averageTicket = completedOrders > 0 ? revenue / completedOrders : 0
  const rows = [
    { label: 'Receita bruta', value: formatCurrency(revenue, displayCurrency), tone: 'neutral' as const },
    { label: 'Custo realizado', value: formatCurrency(realizedCost, displayCurrency), tone: 'warning' as const },
    { label: 'Lucro líquido', value: formatCurrency(profit, displayCurrency), tone: profit >= 0 ? ('success' as const) : ('danger' as const) },
    { label: 'Margem média', value: formatPercent(totals?.averageMarginPercent ?? 0), tone: 'info' as const },
    { label: 'Markup médio', value: formatPercent(totals?.averageMarkupPercent ?? 0), tone: 'neutral' as const },
    { label: 'Ticket médio', value: formatCurrency(averageTicket, displayCurrency), tone: 'neutral' as const },
    { label: 'Pedidos concluídos', value: String(completedOrders), tone: 'neutral' as const },
  ]

  return (
    <LabPanel
      action={<LabStatusPill tone={profit >= 0 ? 'success' : 'danger'}>{formatCurrency(profit, displayCurrency)}</LabStatusPill>}
      padding="md"
      subtitle="Demonstrativo objetivo do resultado, sem repetir o hero."
      title="DRE resumido"
    >
      <div className="space-y-2">
        {rows.map((row) => (
          <FinanceSummaryRow key={row.label} label={row.label} tone={row.tone} value={row.value} />
        ))}
      </div>
    </LabPanel>
  )
}

function DreProductDriversPanel({
  displayCurrency,
  finance,
}: Readonly<{
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  finance?: FinanceSummaryResponse
}>) {
  const products = finance?.topProducts.slice(0, 4) ?? []
  const totalRevenue = products.reduce((sum, product) => sum + product.inventorySalesValue, 0)

  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{products.length} produtos</LabStatusPill>}
      padding="md"
      subtitle="Produtos que mais sustentam receita e margem no resultado atual."
      title="Drivers do resultado"
    >
      <div className="space-y-4">
        {products.length > 0 ? (
          products.map((product) => {
            const share = totalRevenue > 0 ? (product.inventorySalesValue / totalRevenue) * 100 : 0
            return (
              <div className="space-y-2" key={product.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--lab-fg)]">{product.name}</p>
                    <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">
                      {product.category} · margem {formatPercent(product.marginPercent)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium text-[var(--lab-fg)]">
                      {formatCurrency(product.inventorySalesValue, displayCurrency)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">{share.toFixed(0)}% da venda líder</p>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--lab-surface-hover)]">
                  <div
                    className="h-full rounded-full bg-[var(--lab-blue)]"
                    style={{ width: `${Math.max(8, Math.min(share, 100))}%` }}
                  />
                </div>
              </div>
            )
          })
        ) : (
          <p className="text-sm text-[var(--lab-fg-soft)]">Sem produtos suficientes para leitura agora.</p>
        )}
      </div>
    </LabPanel>
  )
}

function DrePeriodBreakdownPanel({
  displayCurrency,
  finance,
}: Readonly<{
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  finance?: FinanceSummaryResponse
}>) {
  const rows = buildDreAuditRows(finance?.revenueTimeline ?? [])

  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{rows.length || 0} períodos</LabStatusPill>}
      padding="md"
      subtitle="Fechamento sequencial para entender evolução de receita, lucro e margem."
      title="Fechamento gerencial"
    >
      <LabTable
        className="rounded-none border-0 bg-transparent"
        columns={[
          {
            id: 'label',
            header: 'Período',
            cell: (row: DreAuditRow) => <span className="font-medium text-[var(--lab-fg)]">{row.label}</span>,
          },
          {
            id: 'revenue',
            header: 'Receita',
            align: 'right',
            cell: (row: DreAuditRow) => formatCurrency(row.revenue, displayCurrency),
            className: 'text-[var(--lab-fg)]',
          },
          {
            id: 'profit',
            header: 'Lucro',
            align: 'right',
            cell: (row: DreAuditRow) => formatCurrency(row.profit, displayCurrency),
            className: 'text-[var(--lab-fg)]',
          },
          {
            id: 'margin',
            header: 'Margem',
            align: 'right',
            cell: (row: DreAuditRow) => formatPercent(row.marginPercent),
          },
          {
            id: 'ticket',
            header: 'Ticket',
            align: 'right',
            cell: (row: DreAuditRow) => formatCurrency(row.averageTicket, displayCurrency),
          },
          {
            id: 'orders',
            header: 'Pedidos',
            align: 'right',
            cell: (row: DreAuditRow) => row.orders,
          },
        ]}
        dense
        emptyDescription="Sem períodos suficientes para fechar o demonstrativo."
        emptyTitle="Nenhum fechamento disponível"
        rowKey="label"
        rows={rows}
      />
    </LabPanel>
  )
}

function AccountsSummaryPanel({
  displayCurrency,
  finance,
}: Readonly<{
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  finance?: FinanceSummaryResponse
}>) {
  const totals = finance?.totals
  const completedOrders = totals?.completedOrders ?? 0
  const realizedRevenue = totals?.realizedRevenue ?? 0
  const currentMonthRevenue = totals?.currentMonthRevenue ?? 0
  const averageTicket = completedOrders > 0 ? currentMonthRevenue / completedOrders : 0
  const cancelledOrders = (finance?.recentOrders ?? []).filter((order) => order.status === 'CANCELLED').length
  const topCustomer = finance?.topCustomers[0]
  const channels = finance?.salesByChannel.slice(0, 4) ?? []

  return (
    <LabPanel
      action={<LabStatusPill tone="success">{completedOrders} concluídos</LabStatusPill>}
      padding="md"
      subtitle="Resumo consolidado do recebido, concentração comercial e risco de cancelamento."
      title="Base de recebimento"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <FinanceSummaryRow label="Recebimento consolidado" tone="success" value={formatCurrency(realizedRevenue, displayCurrency)} />
        <FinanceSummaryRow label="Ticket médio" tone="info" value={formatCurrency(averageTicket, displayCurrency)} />
        <FinanceSummaryRow label="Cancelados" tone={cancelledOrders > 0 ? 'warning' : 'success'} value={String(cancelledOrders)} />
        <FinanceSummaryRow label="Maior cliente" tone="neutral" value={topCustomer ? `${topCustomer.customerName} · ${formatCurrency(topCustomer.revenue, displayCurrency)}` : 'Sem registro'} />
      </div>
      <FinanceChannelTotals channels={channels} displayCurrency={displayCurrency} />
    </LabPanel>
  )
}

function AccountsCustomerLedgerPanel({
  displayCurrency,
  finance,
}: Readonly<{
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  finance?: FinanceSummaryResponse
}>) {
  const customers = finance?.topCustomers.slice(0, 6) ?? []

  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{customers.length} clientes</LabStatusPill>}
      padding="md"
      subtitle="Concentração por cliente para acompanhar quem sustenta recebimento e ticket."
      title="Clientes que mais pesam"
    >
      <LabTable
        className="rounded-none border-0 bg-transparent"
        columns={[
          {
            id: 'customer',
            header: 'Cliente',
            cell: (row: FinanceSummaryResponse['topCustomers'][number]) => (
              <div>
                <p className="font-medium text-[var(--lab-fg)]">{row.customerName}</p>
                <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">{row.buyerType === 'COMPANY' ? 'empresa' : 'pessoa'}</p>
              </div>
            ),
          },
          {
            id: 'orders',
            header: 'Pedidos',
            align: 'right',
            cell: (row: FinanceSummaryResponse['topCustomers'][number]) => row.orders,
          },
          {
            id: 'revenue',
            header: 'Receita',
            align: 'right',
            cell: (row: FinanceSummaryResponse['topCustomers'][number]) => formatCurrency(row.revenue, displayCurrency),
            className: 'text-[var(--lab-fg)]',
          },
          {
            id: 'ticket',
            header: 'Ticket',
            align: 'right',
            cell: (row: FinanceSummaryResponse['topCustomers'][number]) =>
              formatCurrency(row.orders > 0 ? row.revenue / row.orders : 0, displayCurrency),
          },
          {
            id: 'profit',
            header: 'Lucro',
            align: 'right',
            cell: (row: FinanceSummaryResponse['topCustomers'][number]) => formatCurrency(row.profit, displayCurrency),
          },
        ]}
        dense
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
  channels: FinanceSummaryResponse['salesByChannel']
  displayCurrency: FinanceSummaryResponse['displayCurrency']
}>) {
  return (
    <div className="mt-5 space-y-2">
      {channels.map((channel) => (
        <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-2 last:border-b-0 last:pb-0" key={channel.channel}>
          <span className="text-sm text-[var(--lab-fg)]">{channel.channel}</span>
          <span className="text-sm text-[var(--lab-fg-soft)]">
            {channel.orders} pedidos · {formatCurrency(channel.revenue, displayCurrency)}
          </span>
        </div>
      ))}
    </div>
  )
}

type FlowAuditRow = {
  label: string
  revenue: number
  cost: number
  profit: number
  orders: number
  averageTicket: number
}

type DreAuditRow = {
  label: string
  revenue: number
  profit: number
  marginPercent: number
  orders: number
  averageTicket: number
}

function buildFlowAuditRows(timeline: FinanceSummaryResponse['revenueTimeline']): FlowAuditRow[] {
  return timeline
    .map((row) => ({
      label: row.label,
      revenue: row.revenue,
      cost: Math.max(0, row.revenue - row.profit),
      profit: row.profit,
      orders: row.orders,
      averageTicket: row.orders > 0 ? row.revenue / row.orders : 0,
    }))
    .reverse()
}

function buildDreAuditRows(timeline: FinanceSummaryResponse['revenueTimeline']): DreAuditRow[] {
  return timeline
    .map((row) => ({
      label: row.label,
      revenue: row.revenue,
      profit: row.profit,
      marginPercent: row.revenue > 0 ? (row.profit / row.revenue) * 100 : 0,
      orders: row.orders,
      averageTicket: row.orders > 0 ? row.revenue / row.orders : 0,
    }))
    .reverse()
}
