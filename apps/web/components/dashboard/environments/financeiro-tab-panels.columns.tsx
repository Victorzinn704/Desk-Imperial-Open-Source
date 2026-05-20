'use client'

import { LabStatusPill, type LabTableColumn } from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'
import { formatPercent } from './financeiro-model'
import type {
  CustomerLedgerRow,
  DreAuditRow,
  FinanceDisplayCurrency,
  FlowAuditRow,
  TimelineAuditRow,
} from './financeiro-tab-panels.model'

type CurrencyContext = Readonly<{
  displayCurrency: FinanceDisplayCurrency
}>

export function buildTimelineAuditColumns({
  displayCurrency,
}: CurrencyContext): Array<LabTableColumn<TimelineAuditRow>> {
  return [
    {
      id: 'label',
      header: 'Período',
      cell: (row) => <span className="font-medium text-[var(--lab-fg)]">{row.label}</span>,
    },
    {
      id: 'revenue',
      header: 'Receita',
      align: 'right',
      cell: (row) => formatCurrency(row.revenue, displayCurrency),
      className: 'text-[var(--lab-fg)]',
    },
    {
      id: 'profit',
      header: 'Lucro',
      align: 'right',
      cell: (row) => formatCurrency(row.profit, displayCurrency),
    },
    { id: 'orders', header: 'Pedidos', align: 'right', cell: (row) => row.orders },
    {
      id: 'ticket',
      header: 'Ticket',
      align: 'right',
      cell: (row) => formatCurrency(row.averageTicket, displayCurrency),
    },
    { id: 'delta', header: 'Delta', align: 'right', cell: renderTimelineDelta },
  ]
}

export function buildFlowAuditColumns({ displayCurrency }: CurrencyContext): Array<LabTableColumn<FlowAuditRow>> {
  return [
    {
      id: 'label',
      header: 'Período',
      cell: (row) => <span className="font-medium text-[var(--lab-fg)]">{row.label}</span>,
    },
    {
      id: 'revenue',
      header: 'Entrada',
      align: 'right',
      cell: (row) => formatCurrency(row.revenue, displayCurrency),
      className: 'text-[var(--lab-fg)]',
    },
    { id: 'cost', header: 'Saída', align: 'right', cell: (row) => formatCurrency(row.cost, displayCurrency) },
    {
      id: 'profit',
      header: 'Resultado',
      align: 'right',
      cell: (row) => formatCurrency(row.profit, displayCurrency),
      className: 'text-[var(--lab-fg)]',
    },
    { id: 'orders', header: 'Pedidos', align: 'right', cell: (row) => row.orders },
    {
      id: 'ticket',
      header: 'Ticket',
      align: 'right',
      cell: (row) => formatCurrency(row.averageTicket, displayCurrency),
    },
  ]
}

export function buildDreAuditColumns({ displayCurrency }: CurrencyContext): Array<LabTableColumn<DreAuditRow>> {
  return [
    {
      id: 'label',
      header: 'Período',
      cell: (row) => <span className="font-medium text-[var(--lab-fg)]">{row.label}</span>,
    },
    {
      id: 'revenue',
      header: 'Receita',
      align: 'right',
      cell: (row) => formatCurrency(row.revenue, displayCurrency),
      className: 'text-[var(--lab-fg)]',
    },
    {
      id: 'profit',
      header: 'Lucro',
      align: 'right',
      cell: (row) => formatCurrency(row.profit, displayCurrency),
      className: 'text-[var(--lab-fg)]',
    },
    { id: 'margin', header: 'Margem', align: 'right', cell: (row) => formatPercent(row.marginPercent) },
    {
      id: 'ticket',
      header: 'Ticket',
      align: 'right',
      cell: (row) => formatCurrency(row.averageTicket, displayCurrency),
    },
    { id: 'orders', header: 'Pedidos', align: 'right', cell: (row) => row.orders },
  ]
}

export function buildCustomerLedgerColumns({
  displayCurrency,
}: CurrencyContext): Array<LabTableColumn<CustomerLedgerRow>> {
  return [
    {
      id: 'customer',
      header: 'Cliente',
      cell: renderCustomerIdentity,
    },
    { id: 'orders', header: 'Pedidos', align: 'right', cell: (row) => row.orders },
    {
      id: 'revenue',
      header: 'Receita',
      align: 'right',
      cell: (row) => formatCurrency(row.revenue, displayCurrency),
      className: 'text-[var(--lab-fg)]',
    },
    {
      id: 'ticket',
      header: 'Ticket',
      align: 'right',
      cell: (row) => formatCurrency(row.orders > 0 ? row.revenue / row.orders : 0, displayCurrency),
    },
    {
      id: 'profit',
      header: 'Lucro',
      align: 'right',
      cell: (row) => formatCurrency(row.profit, displayCurrency),
    },
  ]
}

function renderTimelineDelta(row: TimelineAuditRow) {
  if (row.revenueDelta === null) {
    return <span className="text-xs text-[var(--lab-fg-soft)]">—</span>
  }

  return (
    <LabStatusPill tone={row.revenueDelta >= 0 ? 'success' : 'danger'}>
      {row.revenueDelta >= 0 ? '+' : ''}
      {formatPercent(row.revenueDelta)}
    </LabStatusPill>
  )
}

function renderCustomerIdentity(row: CustomerLedgerRow) {
  return (
    <div>
      <p className="font-medium text-[var(--lab-fg)]">{row.customerName}</p>
      <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">{row.buyerType === 'COMPANY' ? 'empresa' : 'pessoa'}</p>
    </div>
  )
}
