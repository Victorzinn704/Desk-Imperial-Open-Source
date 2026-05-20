'use client'

import type { ReactNode } from 'react'
import { Clock, Package, Printer, Wallet, X } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import type { TerminalPaymentMethod } from '@/lib/api'
import { type Comanda, formatElapsed } from './pdv-types'
import {
  type PreviewSummary,
  resolveCustomerLabel,
  resolvePaymentLabel,
  resolveStatusLabel,
} from './pdv-comanda-preview-modal.model'
import { TerminalPaymentPanel } from './pdv-comanda-preview-terminal'

export function PreviewHeader({ comanda, onClose }: Readonly<{ comanda: Comanda; onClose: () => void }>) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
          Resumo da comanda
        </p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
          {comanda.mesa ? `Mesa ${comanda.mesa}` : `Comanda ${comanda.id.slice(-6).toUpperCase()}`}
        </h2>
        <p className="mt-2 text-sm text-[var(--text-soft)]">
          {resolveCustomerLabel(comanda)} · {formatElapsed(comanda.abertaEm)}
        </p>
      </div>
      <button
        className="inline-flex size-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-soft)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        type="button"
        onClick={onClose}
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

export function PreviewStats({ summary }: Readonly<{ summary: PreviewSummary }>) {
  return (
    <div className="grid gap-4 border-b border-[var(--border)] px-5 py-4 md:grid-cols-4">
      <PreviewStat label="Itens" value={String(summary.itemCount)} />
      <PreviewStat label="Subtotal" value={formatCurrency(summary.subtotal, 'BRL')} />
      <PreviewStat label="Total" value={formatCurrency(summary.total, 'BRL')} />
      <PreviewStat label={resolveRemainingLabel(summary)} value={resolveRemainingValue(summary)} />
    </div>
  )
}

export function PreviewBody({
  comanda,
  onMethodChange,
  onTerminalPayment,
  summary,
  terminalMethod,
  terminalPaymentBusy,
}: Readonly<{
  comanda: Comanda
  onMethodChange: (method: TerminalPaymentMethod) => void
  onTerminalPayment?: (comandaId: string, amount: number, method: TerminalPaymentMethod) => Promise<unknown>
  summary: PreviewSummary
  terminalMethod: TerminalPaymentMethod
  terminalPaymentBusy: boolean
}>) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
      <div className="space-y-3">
        <PreviewNotes notes={comanda.notes} />
        <PreviewTerminalPayment
          comanda={comanda}
          summary={summary}
          terminalMethod={terminalMethod}
          terminalPaymentBusy={terminalPaymentBusy}
          onMethodChange={onMethodChange}
          onTerminalPayment={onTerminalPayment}
        />
        <PreviewItemsList comanda={comanda} />
        <PreviewFacts comanda={comanda} />
      </div>
    </div>
  )
}

export function PreviewFooter({
  busy,
  chargeLabel,
  comanda,
  onCharge,
  onEdit,
  onPrint,
}: Readonly<{
  busy: boolean
  chargeLabel: string
  comanda: Comanda
  onCharge: () => void
  onEdit: () => void
  onPrint?: (comanda: Comanda) => Promise<void>
}>) {
  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border)] px-5 py-4 md:flex-row md:justify-end">
      {onPrint ? (
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--border-strong)]"
          type="button"
          onClick={() => void onPrint(comanda)}
        >
          <Printer className="size-4" />
          Imprimir comanda
        </button>
      ) : null}
      <button
        className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--border-strong)]"
        type="button"
        onClick={onEdit}
      >
        Editar comanda
      </button>
      <button
        className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-transparent bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--on-accent)] transition hover:bg-[var(--accent-strong)] disabled:opacity-50"
        disabled={busy}
        type="button"
        onClick={onCharge}
      >
        {busy ? 'Abrindo...' : chargeLabel}
      </button>
    </div>
  )
}

function PreviewTerminalPayment({
  comanda,
  onMethodChange,
  onTerminalPayment,
  summary,
  terminalMethod,
  terminalPaymentBusy,
}: Readonly<{
  comanda: Comanda
  onMethodChange: (method: TerminalPaymentMethod) => void
  onTerminalPayment?: (comandaId: string, amount: number, method: TerminalPaymentMethod) => Promise<unknown>
  summary: PreviewSummary
  terminalMethod: TerminalPaymentMethod
  terminalPaymentBusy: boolean
}>) {
  if (!onTerminalPayment || summary.remainingAmount <= 0.009) {
    return null
  }

  return (
    <TerminalPaymentPanel
      amount={summary.remainingAmount}
      busy={terminalPaymentBusy}
      comandaId={comanda.id}
      method={terminalMethod}
      onMethodChange={onMethodChange}
      onTerminalPayment={onTerminalPayment}
    />
  )
}

function PreviewNotes({ notes }: Readonly<{ notes?: string }>) {
  if (!notes?.trim()) {
    return null
  }

  return (
    <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Observação</p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">{notes}</p>
    </div>
  )
}

function PreviewItemsList({ comanda }: Readonly<{ comanda: Comanda }>) {
  if (comanda.itens.length === 0) {
    return (
      <div className="rounded-[16px] border border-dashed border-[var(--border)] px-4 py-6 text-sm text-[var(--text-soft)]">
        Esta comanda ainda não carregou itens detalhados. Abra a edição para revisar ou aguarde a sincronização.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {comanda.itens.map((item, index) => (
        <PreviewItemRow item={item} key={`${item.produtoId}-${index}`} />
      ))}
    </div>
  )
}

function PreviewItemRow({ item }: Readonly<{ item: Comanda['itens'][number] }>) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{item.nome}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-soft)]">
          <span>{item.quantidade}x</span>
          <span>·</span>
          <span>{formatCurrency(item.precoUnitario, 'BRL')}</span>
          {item.observacao?.trim() ? (
            <>
              <span>·</span>
              <span className="truncate">{item.observacao}</span>
            </>
          ) : null}
        </div>
      </div>
      <span className="shrink-0 text-sm font-semibold text-[var(--accent)]">
        {formatCurrency(item.quantidade * item.precoUnitario, 'BRL')}
      </span>
    </div>
  )
}

function PreviewFacts({ comanda }: Readonly<{ comanda: Comanda }>) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <InlineFact icon={<Package className="size-3.5" />} label="Status" value={resolveStatusLabel(comanda.status)} />
      <InlineFact
        icon={<Clock className="size-3.5" />}
        label="Abertura"
        value={comanda.abertaEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      />
      <InlineFact icon={<Wallet className="size-3.5" />} label="Pagamento" value={resolvePaymentLabel(comanda)} />
    </div>
  )
}

function PreviewStat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  )
}

function InlineFact({ icon, label, value }: Readonly<{ icon: ReactNode; label: string; value: string }>) {
  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{value}</p>
    </div>
  )
}

function resolveRemainingLabel(summary: PreviewSummary) {
  return summary.remainingAmount > 0.009 ? 'Em aberto' : 'Quitado'
}

function resolveRemainingValue(summary: PreviewSummary) {
  const amount = summary.remainingAmount > 0.009 ? summary.remainingAmount : summary.paidAmount || summary.total
  return formatCurrency(amount, 'BRL')
}
