'use client'

import type { OrderRecord } from '@contracts/contracts'
import { LabFactPill, LabPanel, LabSignalRow, LabStatusPill } from '@/components/design-lab/lab-primitives'
import { buildPedidosSummaryConfig } from './pedidos-environment.copy'
import type { PedidosInsights, PedidosView } from './pedidos-environment.types'

// eslint-disable-next-line max-lines-per-function
export function PedidosLabSummary(
  props: Readonly<{ currency: OrderRecord['displayCurrency']; insights: PedidosInsights; view: PedidosView }>,
) {
  const config = buildPedidosSummaryConfig(props)

  return (
    <LabPanel
      action={<LabStatusPill tone="info">{config.primaryAction}</LabStatusPill>}
      padding="md"
      subtitle={config.secondaryTitle}
      title={config.primaryTitle}
    >
      <div className="space-y-5">
        {config.primaryFacts && config.primaryFacts.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {config.primaryFacts.map((fact) => (
              <LabFactPill key={fact.label} label={fact.label} value={fact.value} />
            ))}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-0">
            {config.primaryRows.map((row) => (
              <LabSignalRow
                key={row.label}
                label={row.label}
                note={row.note}
                tone={row.tone ?? 'neutral'}
                value={row.value}
              />
            ))}
          </div>

          <div className="space-y-4 border-t border-dashed border-[var(--lab-border)] pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lab-fg-soft)]">
                {config.secondaryTitle}
              </p>
              <LabStatusPill tone="neutral">{config.secondaryAction}</LabStatusPill>
            </div>

            <div className="space-y-0">
              {config.secondaryRows.map((row) => (
                <LabSignalRow
                  key={row.label}
                  label={row.label}
                  note={row.note}
                  tone={row.tone ?? 'neutral'}
                  value={row.value}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </LabPanel>
  )
}
