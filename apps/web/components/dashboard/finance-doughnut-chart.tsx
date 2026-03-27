'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { formatCompactCurrency } from '@/lib/currency'

const COLORS = ['#36f57c', '#2265d8', '#C9A84C', '#f04438', '#a78bfa', '#38bdf8', '#fb923c', '#e879f9']

type Props = {
  categoryBreakdown: FinanceSummaryResponse['categoryBreakdown']
  displayCurrency: FinanceSummaryResponse['displayCurrency']
}

export function FinanceDoughnutChart({ categoryBreakdown, displayCurrency }: Props) {
  const data = categoryBreakdown
    .filter((c) => c.inventorySalesValue > 0)
    .map((c) => ({
      name: c.category,
      value: c.inventorySalesValue,
    }))

  if (data.length === 0) {
    return (
      <div className="flex size-[120px] items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]">
        <span className="text-xs text-[var(--text-soft)]">Sem dados</span>
      </div>
    )
  }

  return (
    <div className="size-[120px] shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={36}
            outerRadius={56}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [formatCompactCurrency(Number(value), displayCurrency), name]}
            contentStyle={{
              background: 'rgba(18,24,20,0.97)',
              border: '1px solid rgba(52,242,127,0.18)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '12px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
