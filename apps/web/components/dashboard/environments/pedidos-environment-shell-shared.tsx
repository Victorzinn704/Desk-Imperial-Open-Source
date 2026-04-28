'use client'

import type { LucideIcon } from 'lucide-react'
import { LabMetric, LabStatusPill, type LabStatusTone } from '@/components/design-lab/lab-primitives'

export function PedidosMetricTile(
  props: Readonly<{ hint: string; icon: LucideIcon; label: string; tone?: LabStatusTone; value: string }>,
) {
  return (
    <LabMetric
      className="h-full"
      delta={toneLabel(props.tone ?? 'info')}
      deltaTone={props.tone ?? 'info'}
      hint={props.hint}
      icon={props.icon}
      label={props.label}
      value={props.value}
    />
  )
}

export function PedidosPanelStats(
  props: Readonly<{ items: Array<{ label: string; tone?: LabStatusTone; value: string }> }>,
) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {props.items.map((item, index) => (
        <div
          className={index > 0 ? 'xl:border-l xl:border-dashed xl:border-[var(--lab-border)] xl:pl-4' : ''}
          key={item.label}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">
            {item.label}
          </p>
          <p className={`mt-1 truncate text-sm font-medium ${toneTextClass(item.tone ?? 'neutral')}`}>{item.value}</p>
        </div>
      ))}
    </div>
  )
}

export function StatusPill({ status }: Readonly<{ status: 'COMPLETED' | 'CANCELLED' }>) {
  return (
    <LabStatusPill tone={status === 'COMPLETED' ? 'success' : 'danger'}>
      {status === 'COMPLETED' ? 'Concluido' : 'Cancelado'}
    </LabStatusPill>
  )
}

function toneLabel(tone: LabStatusTone) {
  switch (tone) {
    case 'success':
      return 'ok'
    case 'danger':
      return 'risco'
    case 'warning':
      return 'fila'
    case 'neutral':
      return 'base'
    case 'info':
    default:
      return 'leitura'
  }
}

function toneTextClass(tone: LabStatusTone) {
  switch (tone) {
    case 'success':
      return 'text-[var(--lab-success)]'
    case 'danger':
      return 'text-[var(--lab-danger)]'
    case 'warning':
      return 'text-[var(--lab-warning)]'
    case 'info':
      return 'text-[var(--lab-blue)]'
    case 'neutral':
    default:
      return 'text-[var(--lab-fg)]'
  }
}
