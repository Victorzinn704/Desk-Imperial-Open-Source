'use client'

import Link from 'next/link'
import {
  LabFactPill,
  LabPageHeader,
  LabPanel,
  LabSignalRow,
  LabStatusPill,
  type LabStatusTone,
} from '@/components/design-lab/lab-primitives'

type LabRouteFact = {
  label: string
  value: string
}

type LabRouteSignal = {
  label: string
  note: string
  value: string
  tone?: LabStatusTone
}

export type LabRouteLockedStateProps = {
  eyebrow: string
  title: string
  description: string
  facts: LabRouteFact[]
  signals: LabRouteSignal[]
  previewTitle: string
  previewSignals: LabRouteSignal[]
  ctaLabel: string
}

export function LabRouteLoadingState({
  message,
}: Readonly<{
  message: string
}>) {
  return (
    <LabPanel padding="md">
      <p className="text-sm text-[var(--lab-fg-soft)]">{message}</p>
    </LabPanel>
  )
}

export function LabRouteLockedState({
  eyebrow,
  title,
  description,
  facts,
  signals,
  previewTitle,
  previewSignals,
  ctaLabel,
}: Readonly<LabRouteLockedStateProps>) {
  return (
    <section className="space-y-6">
      <LabPageHeader
        description={description}
        eyebrow={eyebrow}
        title={title}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <LabPanel
          action={<LabStatusPill tone="warning">sessão necessária</LabStatusPill>}
          padding="md"
          title={`Prévia travada de ${title}`}
        >
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {facts.map((fact) => (
                <LabFactPill key={`${fact.label}`} label={fact.label} value={fact.value} />
              ))}
            </div>

            <div className="space-y-0">
              {signals.map((signal) => (
                <LabSignalRow
                  key={`${signal.label}`}
                  label={signal.label}
                  note={signal.note}
                  tone={signal.tone ?? 'neutral'}
                  value={signal.value}
                />
              ))}
            </div>

            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl border border-transparent bg-[var(--accent)] px-5 text-sm font-medium text-[var(--on-accent)] transition hover:bg-[var(--accent-strong)]"
              href="/login"
            >
              {ctaLabel}
            </Link>
          </div>
        </LabPanel>

        <LabPanel
          action={<LabStatusPill tone="info">preview</LabStatusPill>}
          padding="md"
          title={previewTitle}
        >
          <div className="space-y-0">
            {previewSignals.map((signal) => (
              <LabSignalRow
                key={`${signal.label}`}
                label={signal.label}
                note={signal.note}
                tone={signal.tone ?? 'neutral'}
                value={signal.value}
              />
            ))}
          </div>
        </LabPanel>
      </div>
    </section>
  )
}
