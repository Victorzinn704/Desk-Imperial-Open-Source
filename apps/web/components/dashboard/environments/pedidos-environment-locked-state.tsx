'use client'

import Link from 'next/link'
import {
  LabMetricStrip,
  LabMetricStripItem,
  LabPanel,
  LabSignalRow,
  LabStatusPill,
} from '@/components/design-lab/lab-primitives'
import { buildLockedPedidosPreview } from './pedidos-environment.copy'
import { PedidosLockedPreviewBoard } from './pedidos-environment-locked-preview'
import type { PedidosHeaderStat, PedidosView, PedidosViewCopy } from './pedidos-environment.types'

// eslint-disable-next-line max-lines-per-function
export function PedidosLockedState(props: Readonly<{ copy: PedidosViewCopy; view: PedidosView }>) {
  const preview = buildLockedPedidosPreview(props.view)

  return (
    <section className="space-y-5">
      <LabPageHeaderWithPreview copy={props.copy} stats={preview.stats} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <LabPanel
          action={<LabStatusPill tone="warning">sessao necessaria</LabStatusPill>}
          padding="md"
          title={preview.primaryTitle}
        >
          <div className="space-y-4">
            <PedidosLockedPreviewBoard view={props.view} />
            <div className="space-y-0">
              {preview.primaryRows.map((row) => (
                <LabSignalRow
                  key={row.label}
                  label={row.label}
                  note={row.note}
                  tone={row.tone ?? 'neutral'}
                  value={row.value}
                />
              ))}
            </div>
            <div className="pt-1">
              <Link
                className="inline-flex h-11 items-center justify-center rounded-xl border border-transparent bg-[var(--accent)] px-5 text-sm font-medium text-[var(--on-accent)] transition hover:bg-[var(--accent-strong)]"
                href="/login"
              >
                Entrar para liberar pedidos
              </Link>
            </div>
          </div>
        </LabPanel>

        <LabPanel
          action={<LabStatusPill tone="info">preview</LabStatusPill>}
          padding="md"
          title={preview.secondaryTitle}
        >
          <div className="space-y-0">
            {preview.secondaryRows.map((row) => (
              <LabSignalRow
                key={row.label}
                label={row.label}
                note={row.note}
                tone={row.tone ?? 'neutral'}
                value={row.value}
              />
            ))}
          </div>
        </LabPanel>
      </div>
    </section>
  )
}

function LabPageHeaderWithPreview(props: Readonly<{ copy: PedidosViewCopy; stats: PedidosHeaderStat[] }>) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lab-fg-soft)]">
          {props.copy.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--lab-fg)]">{props.copy.title}</h1>
        <p className="mt-2 text-sm text-[var(--lab-fg-soft)]">{props.copy.description}</p>
      </div>
      <LabMetricStrip>
        {props.stats.map((stat) => (
          <LabMetricStripItem description={stat.description} key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </LabMetricStrip>
    </div>
  )
}
