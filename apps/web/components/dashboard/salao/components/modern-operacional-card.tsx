import { type KeyboardEventHandler, memo } from 'react'
import { Armchair, ArrowUpRight, Receipt, UserRound } from 'lucide-react'
import type { Comanda, Mesa } from '@/components/pdv/pdv-types'
import {
  buildModernOperacionalCardModel,
  type ModernCardMetric,
  type ModernOperacionalCardModel,
} from './modern-operacional-card.model'
import { getSalaoToneStyle } from '../theme'

interface ModernOperacionalCardProps {
  mesa: Mesa
  comanda: Comanda | undefined
  garcomName: string | undefined
  urgency: 0 | 1 | 2 | 3
  onClick?: () => void
}

export const ModernOperacionalCard = memo(function ModernOperacionalCard({
  mesa,
  comanda,
  garcomName,
  urgency,
  onClick,
}: ModernOperacionalCardProps) {
  const model = buildModernOperacionalCardModel({ comanda, garcomName, mesa, urgency })
  const interactiveProps = buildInteractiveProps(onClick)

  return (
    <div
      className={buildCardClassName(interactiveProps.isInteractive)}
      style={resolveCardStyle(model)}
      {...interactiveProps.props}
    >
      <CardHeader mesa={mesa} model={model} />
      <MetricGrid metrics={model.metrics.slice(0, 2)} spacingClassName="mt-4" />
      <MetricGrid metrics={model.metrics.slice(2)} spacingClassName="mt-3" />
      <CardFooter footerLabel={model.footerLabel} isInteractive={interactiveProps.isInteractive} />
    </div>
  )
})

function CardHeader({ mesa, model }: Readonly<{ mesa: Mesa; model: ModernOperacionalCardModel }>) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-3">
        <span
          className="inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={getSalaoToneStyle(model.statusTone)}
        >
          {model.statusLabel}
        </span>
        <MesaIdentity clientLabel={model.clientLabel} mesaNumber={mesa.numero} />
      </div>
      <MesaBadges capacityLabel={model.capacityLabel} waiterLabel={model.waiterLabel} />
    </div>
  )
}

function MesaIdentity({ clientLabel, mesaNumber }: Readonly<{ clientLabel: string; mesaNumber: string }>) {
  return (
    <div className="min-w-0 space-y-1">
      <h4 className="truncate text-lg font-semibold tracking-tight text-[var(--text-primary)]">{mesaNumber}</h4>
      <p className="truncate text-sm text-[var(--text-soft)]" title={clientLabel}>
        {clientLabel}
      </p>
    </div>
  )
}

function MesaBadges({ capacityLabel, waiterLabel }: Readonly<{ capacityLabel: string; waiterLabel: string }>) {
  return (
    <div className="flex flex-col items-end gap-2 text-right">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
        <Armchair className="size-3.5" />
        {capacityLabel}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] font-medium text-[var(--text-soft)]">
        <UserRound className="size-3.5" />
        {waiterLabel}
      </span>
    </div>
  )
}

function MetricGrid({
  metrics,
  spacingClassName,
}: Readonly<{ metrics: ModernCardMetric[]; spacingClassName: string }>) {
  return (
    <div className={`${spacingClassName} grid grid-cols-2 gap-3`}>
      {metrics.map((metric) => (
        <MetricCell key={`${metric.label}:${metric.value}`} metric={metric} />
      ))}
    </div>
  )
}

function CardFooter({ footerLabel, isInteractive }: Readonly<{ footerLabel: string; isInteractive: boolean }>) {
  return (
    <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-3">
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <Receipt className="size-3.5" />
        <span>{footerLabel}</span>
      </div>
      {isInteractive ? <OpenPdvAction /> : null}
    </div>
  )
}

function OpenPdvAction() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">
      Abrir PDV
      <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </span>
  )
}

const MetricCell = memo(function MetricCell({ metric }: Readonly<{ metric: ModernCardMetric }>) {
  return (
    <div className="rounded-2xl border px-3 py-2.5" style={getSalaoToneStyle(metric.tone)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">{metric.label}</p>
      <p className="mt-1 text-sm font-semibold leading-5 text-[var(--text-primary)]">{metric.value}</p>
    </div>
  )
})

function buildCardClassName(isInteractive: boolean) {
  const baseClassName =
    'group flex h-full min-h-[208px] flex-col rounded-[24px] border bg-[var(--surface)] p-4 shadow-[var(--shadow-panel)] transition-colors'

  if (!isInteractive) {
    return baseClassName
  }

  return `${baseClassName} cursor-pointer hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]`
}

function buildInteractiveProps(onClick: (() => void) | undefined) {
  if (!onClick) {
    return { isInteractive: false, props: {} }
  }

  return {
    isInteractive: true,
    props: {
      onClick,
      onKeyDown: createActivationKeyHandler(onClick),
      role: 'button' as const,
      tabIndex: 0,
    },
  }
}

function createActivationKeyHandler(onClick: () => void): KeyboardEventHandler<HTMLDivElement> {
  return (event) => {
    if (!isActivationKey(event.key)) {
      return
    }

    event.preventDefault()
    onClick()
  }
}

function isActivationKey(key: string) {
  return key === 'Enter' || key === ' '
}

function resolveCardStyle(model: ModernOperacionalCardModel) {
  const borderColor =
    model.urgencyTone === 'neutral' ? 'var(--border)' : getSalaoToneStyle(model.urgencyTone).borderColor
  return { borderColor }
}
