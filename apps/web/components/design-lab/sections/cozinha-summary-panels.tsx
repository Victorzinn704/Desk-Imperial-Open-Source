'use client'

import type { OperationsKitchenResponse } from '@contracts/contracts'
import {
  LabFactPill,
  LabPanel,
  LabSignalRow,
  LabStatusPill,
  type LabStatusTone,
} from '@/components/design-lab/lab-primitives'

type KitchenSummary = {
  queued: number
  inPreparation: number
  ready: number
  total: number
  activeMesas: number
  pressureTone: LabStatusTone
  hottestItem: OperationsKitchenResponse['items'][number] | null
  oldestQueuedLabel: string
}

export function buildKitchenSummary(data: OperationsKitchenResponse | undefined): KitchenSummary {
  const queued = data?.statusCounts.queued ?? 0
  const inPreparation = data?.statusCounts.inPreparation ?? 0
  const ready = data?.statusCounts.ready ?? 0
  const total = data?.items.length ?? 0
  const activeMesas = new Set((data?.items ?? []).map((item) => item.mesaLabel)).size
  const oldestQueued =
    [...(data?.items ?? [])]
      .filter((item) => item.kitchenQueuedAt)
      .sort(
        (left, right) => new Date(left.kitchenQueuedAt ?? 0).getTime() - new Date(right.kitchenQueuedAt ?? 0).getTime(),
      )[0] ?? null

  return {
    queued,
    inPreparation,
    ready,
    total,
    activeMesas,
    pressureTone: resolvePressureTone(queued, inPreparation, ready),
    hottestItem: data?.items[0] ?? null,
    oldestQueuedLabel: oldestQueued?.kitchenQueuedAt ? formatElapsed(oldestQueued.kitchenQueuedAt) : 'agora',
  }
}

export function CozinhaSummaryPanels({ summary }: Readonly<{ summary: KitchenSummary }>) {
  return (
    <LabPanel
      action={<LabStatusPill tone={summary.pressureTone}>{resolvePressureLabel(summary)}</LabStatusPill>}
      padding="md"
      title="Radar da cozinha"
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_320px] xl:items-start">
        <div className="space-y-5">
          <div className="overflow-hidden rounded-[18px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)]">
            <div className="grid gap-px bg-[var(--lab-border)] sm:grid-cols-2 2xl:grid-cols-4">
              <KitchenStripMetric label="na fila" value={String(summary.queued)} />
              <KitchenStripMetric label="em preparo" value={String(summary.inPreparation)} />
              <KitchenStripMetric label="prontos" value={String(summary.ready)} />
              <KitchenStripMetric label="mesas ativas" value={String(summary.activeMesas)} />
            </div>
          </div>

          <div className="space-y-0">
            <KitchenSignalRow
              label="na fila"
              note="pedidos aguardando início"
              tone={summary.queued > 0 ? 'warning' : 'neutral'}
              value={String(summary.queued)}
            />
            <KitchenSignalRow
              label="em preparo"
              note="itens sob execução agora"
              tone={summary.inPreparation > 0 ? 'info' : 'neutral'}
              value={String(summary.inPreparation)}
            />
            <KitchenSignalRow
              label="prontos"
              note="pedidos que já podem sair"
              tone={summary.ready > 0 ? 'success' : 'neutral'}
              value={String(summary.ready)}
            />
            <KitchenSignalRow
              label="próxima ação"
              note="o próximo passo operacional já vem pronto"
              tone={resolveNextActionTone(summary)}
              value={resolveNextActionLabel(summary)}
            />
          </div>
        </div>

        <div className="space-y-4 rounded-[18px] border border-dashed border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">item de topo</p>
            <p className="mt-2 text-sm font-semibold text-[var(--lab-fg)]">
              {summary.hottestItem ? summary.hottestItem.productName : 'sem leitura'}
            </p>
            <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">
              {summary.hottestItem
                ? `mesa ${summary.hottestItem.mesaLabel} · ${summary.hottestItem.quantity}x · ${summary.oldestQueuedLabel}`
                : 'a primeira leitura útil aparece quando um ticket entrar na fila'}
            </p>
            {summary.hottestItem?.notes ? (
              <p className="mt-3 text-xs text-[var(--lab-fg-soft)]">{summary.hottestItem.notes}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <LabFactPill label="tickets" value={String(summary.total)} />
            <LabFactPill
              label="mesa do topo"
              value={summary.hottestItem ? summary.hottestItem.mesaLabel : 'sem leitura'}
            />
            <LabFactPill label="fila desde" value={summary.total > 0 ? summary.oldestQueuedLabel : 'agora'} />
          </div>

          <div className="space-y-0">
            <KitchenMetaRow label="pressão" tone={summary.pressureTone} value={resolvePressureLabel(summary)} />
            <KitchenMetaRow
              label="cozinheiro do topo"
              tone="neutral"
              value={summary.hottestItem?.employeeName ?? 'sem leitura'}
            />
            <KitchenMetaRow
              label="status"
              tone={summary.total > 0 ? 'info' : 'success'}
              value={summary.total > 0 ? 'operação viva' : 'cozinha livre'}
            />
          </div>
        </div>
      </div>
    </LabPanel>
  )
}

function resolvePressureTone(queued: number, inPreparation: number, ready: number): LabStatusTone {
  if (queued > inPreparation) {
    return 'warning'
  }

  if (inPreparation > 0) {
    return 'info'
  }

  if (ready > 0) {
    return 'success'
  }

  return 'neutral'
}

function resolvePressureLabel(summary: KitchenSummary) {
  if (summary.queued > summary.inPreparation) {
    return 'fila puxando'
  }

  if (summary.ready > 0) {
    return 'saída pendente'
  }

  return 'equilíbrio'
}

function resolveNextActionLabel(summary: KitchenSummary) {
  if (summary.queued > 0) {
    return 'iniciar preparo'
  }

  if (summary.ready > 0) {
    return 'entregar pratos'
  }

  return 'manter fluxo'
}

function resolveNextActionTone(summary: KitchenSummary): LabStatusTone {
  if (summary.queued > 0) {
    return 'warning'
  }

  if (summary.ready > 0) {
    return 'success'
  }

  return 'neutral'
}

function KitchenSignalRow({
  label,
  note,
  tone,
  value,
}: Readonly<{
  label: string
  note: string
  tone: LabStatusTone
  value: string
}>) {
  return <LabSignalRow label={label} note={note} tone={tone} value={value} />
}

function KitchenMetaRow({
  label,
  tone,
  value,
}: Readonly<{
  label: string
  tone: LabStatusTone
  value: string
}>) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-3 last:border-b-0 last:pb-0">
      <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">{label}</span>
      <LabStatusPill tone={tone}>{value}</LabStatusPill>
    </div>
  )
}

function KitchenStripMetric({
  label,
  value,
}: Readonly<{
  label: string
  value: string
}>) {
  return (
    <div className="bg-[var(--lab-surface)] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[var(--lab-fg)]">{value}</p>
    </div>
  )
}

function formatElapsed(isoDate: string) {
  const diffMs = Math.max(0, Date.now() - new Date(isoDate).getTime())
  const mins = Math.floor(diffMs / 60_000)

  if (mins < 1) {
    return 'agora'
  }

  if (mins === 1) {
    return '1 min'
  }

  return `${mins} min`
}
