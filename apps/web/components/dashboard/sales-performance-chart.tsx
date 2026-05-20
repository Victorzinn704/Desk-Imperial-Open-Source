'use client'
/* eslint-disable no-restricted-imports */

import type { CurrencyCode } from '@contracts/contracts'
import { Bar, CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis } from 'recharts'

type SalesPerformanceChartProps = Readonly<{
  mode: 'revenue-profit' | 'orders-ticket'
  timeline: Array<Record<string, unknown>>
  displayCurrency: string
  formatCompactFn: (value: number, currency: CurrencyCode) => string
  tooltipContent: React.ReactElement
  isAnimationActive: boolean
}>

function buildChartData(mode: SalesPerformanceChartProps['mode'], timeline: SalesPerformanceChartProps['timeline']) {
  if (mode !== 'orders-ticket') {
    return timeline
  }

  return timeline.map((entry) => {
    const revenue = Number(entry.revenue ?? 0)
    const orders = Number(entry.orders ?? 0)
    return {
      ...entry,
      averageTicket: orders > 0 ? Number((revenue / orders).toFixed(2)) : 0,
    }
  })
}

function OrdersTicketAxes({
  displayCurrency,
  formatCompactFn,
}: Pick<SalesPerformanceChartProps, 'displayCurrency' | 'formatCompactFn'>) {
  return (
    <>
      <YAxis
        axisLine={false}
        tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
        tickLine={false}
        width={42}
        yAxisId="orders"
      />
      <YAxis
        axisLine={false}
        orientation="right"
        tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
        tickFormatter={(value: number) => formatCompactFn(value, displayCurrency as CurrencyCode)}
        tickLine={false}
        width={68}
        yAxisId="ticket"
      />
    </>
  )
}

function RevenueProfitAxis({
  displayCurrency,
  formatCompactFn,
}: Pick<SalesPerformanceChartProps, 'displayCurrency' | 'formatCompactFn'>) {
  return (
    <YAxis
      axisLine={false}
      tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
      tickFormatter={(value: number) => formatCompactFn(value, displayCurrency as CurrencyCode)}
      tickLine={false}
      width={68}
    />
  )
}

export function SalesPerformanceChart({
  mode,
  timeline,
  displayCurrency,
  formatCompactFn,
  tooltipContent,
  isAnimationActive,
}: SalesPerformanceChartProps) {
  const chartData = buildChartData(mode, timeline)
  const isOrdersTicket = mode === 'orders-ticket'

  return (
    <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
      <XAxis axisLine={false} dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} />
      {isOrdersTicket ? (
        <OrdersTicketAxes displayCurrency={displayCurrency} formatCompactFn={formatCompactFn} />
      ) : (
        <RevenueProfitAxis displayCurrency={displayCurrency} formatCompactFn={formatCompactFn} />
      )}
      <Tooltip content={tooltipContent} />
      <Bar
        dataKey={isOrdersTicket ? 'orders' : 'revenue'}
        fill="var(--accent)"
        fillOpacity={0.2}
        isAnimationActive={isAnimationActive}
        maxBarSize={28}
        name={isOrdersTicket ? 'Pedidos' : 'Receita'}
        radius={[4, 4, 0, 0]}
        stroke="var(--accent)"
        strokeOpacity={0.35}
        yAxisId={isOrdersTicket ? 'orders' : undefined}
      />
      <Line
        dataKey={isOrdersTicket ? 'averageTicket' : 'profit'}
        dot={{ fill: isOrdersTicket ? '#C9A84C' : 'var(--success)', r: 2.5, strokeWidth: 0 }}
        isAnimationActive={isAnimationActive}
        name={isOrdersTicket ? 'Ticket médio' : 'Lucro'}
        stroke={isOrdersTicket ? '#C9A84C' : 'var(--success)'}
        strokeWidth={2.1}
        type="monotone"
        yAxisId={isOrdersTicket ? 'ticket' : undefined}
      />
    </ComposedChart>
  )
}
