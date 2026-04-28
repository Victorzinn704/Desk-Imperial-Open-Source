'use client'

import { LabSignalRow, LabStatusPill } from '@/components/design-lab/lab-primitives'
import type { PedidosView } from './pedidos-environment.types'

export function PedidosLockedPreviewBoard({ view }: Readonly<{ view: PedidosView }>) {
  if (view === 'timeline') {
    return <LockedTimelinePreview />
  }

  if (view === 'kanban') {
    return <LockedKanbanPreview />
  }

  if (view === 'detalhe') {
    return <LockedDetailPreview />
  }

  if (view === 'historico') {
    return <LockedHistoryPreview />
  }

  return <LockedTablePreview />
}

function LockedTimelinePreview() {
  const entries = [
    { day: 'hoje', time: '19:42', title: 'Mesa 12 fechou no balcao', value: 'R$ 128,00', tone: 'success' as const },
    { day: 'hoje', time: '18:10', title: 'Cancelamento em delivery', value: 'R$ 42,00', tone: 'warning' as const },
    { day: 'ontem', time: '23:18', title: 'Pico do turno noturno', value: '8 pedidos', tone: 'info' as const },
  ]

  return (
    <div className="rounded-[16px] border border-dashed border-[var(--lab-border)] bg-[var(--lab-surface-raised)] p-4">
      <div className="space-y-3">
        {entries.map((entry) => (
          <div
            className="grid gap-3 rounded-[12px] border border-[var(--lab-border)] bg-[var(--lab-surface)] px-4 py-3 md:grid-cols-[88px_minmax(0,1fr)_auto]"
            key={`${entry.day}-${entry.time}-${entry.title}`}
          >
            <div className="text-xs font-medium text-[var(--lab-fg-soft)]">
              {entry.day} · {entry.time}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--lab-fg)]">{entry.title}</p>
              <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">ordem dos eventos, operador e pico comercial</p>
            </div>
            <div className="md:justify-self-end">
              <LabStatusPill tone={entry.tone}>{entry.value}</LabStatusPill>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LockedKanbanPreview() {
  const columns = [
    {
      id: 'completed',
      label: 'Concluidos',
      tone: 'success' as const,
      items: [
        { customer: 'Mesa 7', value: 'R$ 94,00', note: 'balcao' },
        { customer: 'Delivery Ana', value: 'R$ 58,00', note: 'delivery' },
      ],
    },
    {
      id: 'cancelled',
      label: 'Cancelados',
      tone: 'warning' as const,
      items: [{ customer: 'Evento Centro', value: 'R$ 36,00', note: 'revisao' }],
    },
  ]

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {columns.map((column) => (
        <div
          className="rounded-[16px] border border-dashed border-[var(--lab-border)] bg-[var(--lab-surface-raised)] p-4"
          key={column.id}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--lab-fg)]">{column.label}</p>
            <LabStatusPill tone={column.tone}>{column.items.length}</LabStatusPill>
          </div>
          <div className="mt-3 space-y-2">
            {column.items.map((item) => (
              <div
                className="rounded-[12px] border border-[var(--lab-border)] bg-[var(--lab-surface)] px-3 py-2.5"
                key={`${column.id}-${item.customer}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--lab-fg)]">{item.customer}</p>
                    <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">{item.note}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-[var(--lab-fg)]">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function LockedDetailPreview() {
  const lines = ['2x Deher Garrafa', '1x Coca-Cola Lata', '1x Batata G']

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
      <div className="rounded-[16px] border border-dashed border-[var(--lab-border)] bg-[var(--lab-surface-raised)] p-4">
        <div className="rounded-[12px] border border-[var(--lab-border)] bg-[var(--lab-surface)] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">cliente</p>
          <p className="mt-2 text-sm font-semibold text-[var(--lab-fg)]">Mesa 9 · Camila</p>
          <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">delivery · 19/04 21:18</p>
        </div>
        <div className="mt-3 rounded-[12px] border border-[var(--lab-border)] bg-[var(--lab-surface)] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">itens</p>
          <div className="mt-3 space-y-2">
            {lines.map((line) => (
              <div
                className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-2 text-sm last:border-b-0 last:pb-0"
                key={line}
              >
                <span className="text-[var(--lab-fg)]">{line}</span>
                <span className="text-[var(--lab-fg-soft)]">preview</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[16px] border border-dashed border-[var(--lab-border)] bg-[var(--lab-surface-raised)] p-4">
        <div className="space-y-0">
          <LabSignalRow label="valor" note="receita do pedido em foco" tone="success" value="R$ 148,00" />
          <LabSignalRow label="lucro" note="resultado projetado do pedido" tone="neutral" value="R$ 61,00" />
          <LabSignalRow label="status" note="situacao operacional atual" tone="info" value="Concluido" />
        </div>
      </div>
    </div>
  )
}

function LockedHistoryPreview() {
  const rows = [
    { day: '19/04', customer: 'Mesa 3', channel: 'balcao', value: 'R$ 84,00' },
    { day: '18/04', customer: 'Cliente 12', channel: 'evento', value: 'R$ 146,00' },
    { day: '17/04', customer: 'Delivery 4', channel: 'delivery', value: 'R$ 52,00' },
  ]

  return (
    <div className="rounded-[16px] border border-dashed border-[var(--lab-border)] bg-[var(--lab-surface-raised)] p-4">
      <div className="space-y-1">
        {rows.map((row) => (
          <div
            className="grid gap-3 border-b border-dashed border-[var(--lab-border)] px-1 py-3 last:border-b-0 md:grid-cols-[72px_minmax(0,1fr)_120px_100px]"
            key={`${row.day}-${row.customer}`}
          >
            <div className="text-xs font-medium text-[var(--lab-fg-soft)]">{row.day}</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--lab-fg)]">{row.customer}</p>
              <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">
                operador, horario e ocorrencias entram com a sessao
              </p>
            </div>
            <div className="text-sm text-[var(--lab-fg-soft)]">{row.channel}</div>
            <div className="text-right text-sm font-medium text-[var(--lab-fg)]">{row.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LockedTablePreview() {
  const rows = [
    { id: 'A3F81', customer: 'Mesa 12', channel: 'balcao', value: 'R$ 128,00' },
    { id: 'Q7D14', customer: 'Cliente Ana', channel: 'delivery', value: 'R$ 64,00' },
    { id: 'M2K09', customer: 'Evento Centro', channel: 'evento', value: 'R$ 210,00' },
  ]

  return (
    <div className="overflow-hidden rounded-[16px] border border-dashed border-[var(--lab-border)] bg-[var(--lab-surface-raised)]">
      <div className="grid grid-cols-[92px_minmax(0,1fr)_96px_96px] gap-3 border-b border-dashed border-[var(--lab-border)] px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">
        <span>id</span>
        <span>cliente</span>
        <span>canal</span>
        <span className="text-right">valor</span>
      </div>
      {rows.map((row) => (
        <div
          className="grid grid-cols-[92px_minmax(0,1fr)_96px_96px] gap-3 border-b border-dashed border-[var(--lab-border)] px-4 py-3 last:border-b-0"
          key={row.id}
        >
          <span className="font-mono text-xs text-[var(--lab-fg-soft)]">{row.id}</span>
          <span className="truncate text-sm font-medium text-[var(--lab-fg)]">{row.customer}</span>
          <span className="text-sm text-[var(--lab-fg-soft)]">{row.channel}</span>
          <span className="text-right text-sm font-medium text-[var(--lab-fg)]">{row.value}</span>
        </div>
      ))}
    </div>
  )
}
