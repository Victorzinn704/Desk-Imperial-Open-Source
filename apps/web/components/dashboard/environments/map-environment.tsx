'use client'

import Link from 'next/link'
import type { CurrencyCode } from '@contracts/contracts'
import { ApiError } from '@/lib/api'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import {
  LabPageHeader,
  LabPanel,
  LabStatusPill,
} from '@/components/design-lab/lab-primitives'
import { MapSection } from '@/components/dashboard/map-section'
import { formatCurrency } from '@/lib/currency'

export function MapEnvironment() {
  const { financeQuery, ordersQuery, sessionQuery } = useDashboardQueries({ section: 'map' })

  const user = sessionQuery.data?.user
  if (!user) {
    return <MapAuthState />
  }

  const finance = financeQuery.data
  const displayCurrency = (finance?.displayCurrency ?? user.preferredCurrency ?? 'BRL') as CurrencyCode
  const mapError = financeQuery.error instanceof ApiError ? financeQuery.error.message : null
  const totalOrderCount = ordersQuery.data?.totals.completedOrders
  const revenue = finance?.totals.currentMonthRevenue ?? 0
  const profit = finance?.totals.currentMonthProfit ?? 0
  const mappedOrders = finance?.salesMap.reduce((sum, point) => sum + point.orders, 0) ?? 0
  const coveragePct =
    totalOrderCount && totalOrderCount > 0 ? Math.min(100, Math.round((mappedOrders / totalOrderCount) * 100)) : 0

  return (
    <section className="space-y-6">
      <LabPageHeader
        description="Cobertura geográfica e concentração."
        eyebrow="Inteligência territorial"
        title="Mapa de vendas"
      >
        <MapHeaderStrip
          items={[
            { label: 'pedidos', value: String(totalOrderCount ?? 0) },
            { label: 'receita', value: formatCurrency(revenue, displayCurrency) },
            { label: 'lucro', value: formatCurrency(profit, displayCurrency) },
            { label: 'cobertura', value: `${coveragePct}%` },
          ]}
        />
      </LabPageHeader>

      <MapSection
        displayCurrency={displayCurrency}
        error={mapError}
        finance={finance}
        isLoading={financeQuery.isLoading}
        totalOrderCount={totalOrderCount}
      />
    </section>
  )
}

function MapAuthState() {
  return (
    <section className="space-y-6">
      <LabPageHeader
        description="Cobertura geográfica e concentração."
        eyebrow="Inteligência territorial"
        meta={
          <div className="space-y-3">
            <MapMetaRow label="sessão" tone="warning" value="entrar" />
            <MapMetaRow label="dados" tone="neutral" value="bloqueados" />
            <MapMetaRow label="mapa" tone="info" value="territorial" />
          </div>
        }
        title="Mapa de vendas"
      >
        <MapHeaderStrip
          items={[
            { label: 'pedidos', value: '0' },
            { label: 'receita', value: 'R$ 0,00' },
            { label: 'lucro', value: 'R$ 0,00' },
            { label: 'canais', value: '0/0' },
          ]}
        />
      </LabPageHeader>

      <LabPanel
        action={
          <Link
            className="inline-flex h-9 items-center rounded-[8px] border border-[var(--lab-blue-border)] bg-[var(--lab-blue-soft)] px-3 text-sm font-medium text-[var(--lab-blue)] transition hover:bg-[var(--lab-surface-hover)]"
            href="/login"
          >
            Entrar
          </Link>
        }
        padding="md"
        title="Autenticação necessária"
      >
        <MapHeaderStrip
          items={[
            { label: 'território', value: 'bloqueado' },
            { label: 'bairros', value: '0' },
            { label: 'canais', value: '0' },
            { label: 'pedidos', value: '0' },
          ]}
        />
      </LabPanel>
    </section>
  )
}

function MapMetaRow({
  label,
  tone,
  value,
}: Readonly<{
  label: string
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
  value: string
}>) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-3 last:border-b-0 last:pb-0">
      <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">{label}</span>
      <LabStatusPill tone={tone}>{value}</LabStatusPill>
    </div>
  )
}

function MapHeaderStrip({
  items,
}: Readonly<{
  items: Array<{ label: string; value: string }>
}>) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)]">
      <div className="grid gap-px bg-[var(--lab-border)] sm:grid-cols-2 2xl:grid-cols-4">
        {items.map((item) => (
          <div className="bg-[var(--lab-surface)] px-4 py-4" key={item.label}>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">{item.label}</p>
            <p className="mt-2 text-lg font-semibold text-[var(--lab-fg)]">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
