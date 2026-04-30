'use client'

import { memo, useState } from 'react'
import { Printer, RefreshCw } from 'lucide-react'
import { getQzHost, setQzHost, type ThermalPrinter, type ThermalPrinterConnectionState } from '@/lib/printing'

type PrinterSectionProps = {
  printers: ThermalPrinter[]
  selectedPrinterId: string
  connectionState: ThermalPrinterConnectionState
  statusMessage: string
  isBusy: boolean
  onChoosePrinter: (printerId: string) => void
  onRefreshPrinters: () => void
}

export const PrinterSection = memo(function PrinterSection({
  printers,
  selectedPrinterId,
  connectionState,
  statusMessage,
  isBusy,
  onChoosePrinter,
  onRefreshPrinters,
}: PrinterSectionProps) {
  return (
    <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-3">
      <PrinterSectionHeader connectionState={connectionState} isBusy={isBusy} onRefreshPrinters={onRefreshPrinters} />
      <PrinterSectionBody
        connectionState={connectionState}
        printers={printers}
        selectedPrinterId={selectedPrinterId}
        statusMessage={statusMessage}
        onChoosePrinter={onChoosePrinter}
        onRefreshPrinters={onRefreshPrinters}
      />
    </div>
  )
})

function PrinterSectionHeader({
  connectionState,
  isBusy,
  onRefreshPrinters,
}: Readonly<{
  connectionState: ThermalPrinterConnectionState
  isBusy: boolean
  onRefreshPrinters: () => void
}>) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[12px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-soft)]">
          <Printer className="size-4" />
        </span>
        <PrinterSectionTitle stateLabel={getPrinterStateLabel(connectionState)} />
      </div>
      <RefreshPrintersButton connectionState={connectionState} isBusy={isBusy} onRefreshPrinters={onRefreshPrinters} />
    </div>
  )
}

function PrinterSectionTitle({ stateLabel }: Readonly<{ stateLabel: string }>) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Comanda termica</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <p className="text-sm text-[var(--text-primary)]">QZ Tray prioritario</p>
        <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
          {stateLabel}
        </span>
      </div>
      <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">PrintNode entra so como segunda via.</p>
    </div>
  )
}

function RefreshPrintersButton({
  connectionState,
  isBusy,
  onRefreshPrinters,
}: Readonly<{
  connectionState: ThermalPrinterConnectionState
  isBusy: boolean
  onRefreshPrinters: () => void
}>) {
  return (
    <button
      className="flex shrink-0 items-center gap-2 rounded-[12px] border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-soft)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
      disabled={isBusy}
      type="button"
      onClick={onRefreshPrinters}
    >
      <RefreshCw className={`size-3.5 ${connectionState === 'discovering' ? 'animate-spin' : ''}`} />
      Atualizar
    </button>
  )
}

function QzHostInput({ onRefreshPrinters }: Readonly<{ onRefreshPrinters: () => void }>) {
  const [host, setHost] = useState(() => getQzHost())
  const [draft, setDraft] = useState(() => getQzHost())
  const [expanded, setExpanded] = useState(false)

  function applyHost() {
    const trimmed = setQzHost(draft)
    setDraft(trimmed)
    setHost(trimmed)
    onRefreshPrinters()
  }

  const isDirty = draft.trim() !== host
  const isLan = host !== 'localhost' && host !== '127.0.0.1'

  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
      <QzHostSummary expanded={expanded} host={host} isLan={isLan} onToggle={() => setExpanded((v) => !v)} />
      {expanded ? <QzHostEditor draft={draft} isDirty={isDirty} onApply={applyHost} onDraftChange={setDraft} /> : null}
    </div>
  )
}

function QzHostSummary({
  expanded,
  host,
  isLan,
  onToggle,
}: Readonly<{
  expanded: boolean
  host: string
  isLan: boolean
  onToggle: () => void
}>) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">QZ Tray Host</p>
        <p className="mt-0.5 truncate text-xs text-[var(--text-primary)]">
          {isLan ? host : 'localhost (somente este PC)'}
        </p>
      </div>
      <button
        className="shrink-0 text-[10px] font-semibold text-[var(--accent,#008cff)] hover:underline"
        type="button"
        onClick={onToggle}
      >
        {expanded ? 'fechar' : 'editar'}
      </button>
    </div>
  )
}

function QzHostEditor({
  draft,
  isDirty,
  onApply,
  onDraftChange,
}: Readonly<{
  draft: string
  isDirty: boolean
  onApply: () => void
  onDraftChange: (value: string) => void
}>) {
  return (
    <div className="mt-2 flex gap-2">
      <input
        className="min-w-0 flex-1 rounded-[8px] border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        placeholder="ex: 192.168.1.10 ou localhost"
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onApply()}
      />
      <button className={resolveHostApplyClass(isDirty)} type="button" onClick={onApply}>
        Aplicar
      </button>
    </div>
  )
}

function resolveHostApplyClass(isDirty: boolean) {
  return [
    'shrink-0 rounded-[8px] border px-3 py-1.5 text-xs font-semibold transition-colors',
    isDirty
      ? 'border-[var(--accent)] bg-[rgba(0,140,255,0.1)] text-[var(--accent,#008cff)]'
      : 'border-[var(--border)] text-[var(--text-soft)]',
  ].join(' ')
}

function PrinterSectionBody({
  connectionState,
  printers,
  selectedPrinterId,
  statusMessage,
  onChoosePrinter,
  onRefreshPrinters,
}: Readonly<{
  connectionState: ThermalPrinterConnectionState
  printers: ThermalPrinter[]
  selectedPrinterId: string
  statusMessage: string
  onChoosePrinter: (printerId: string) => void
  onRefreshPrinters: () => void
}>) {
  return (
    <div className="mt-3 grid gap-3">
      <select
        className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        value={selectedPrinterId}
        onChange={(event) => onChoosePrinter(event.target.value)}
      >
        <option value="">Selecione uma impressora termica</option>
        {printers.map((printer) => (
          <option key={printer.id} value={printer.id}>
            {formatPrinterOptionLabel(printer)}
          </option>
        ))}
      </select>
      {printers.some((p) => p.transport === 'serial') ? (
        <p className="rounded-[12px] border border-[rgba(0,140,255,0.2)] bg-[rgba(0,140,255,0.06)] px-3 py-2 text-xs leading-5 text-[var(--accent,#008cff)]">
          Impressora Bluetooth (YYX0808)? Use <strong>Porta serial COM3</strong> ou COM4 - nao a fila do Windows.
        </p>
      ) : null}
      <QzHostInput onRefreshPrinters={onRefreshPrinters} />
      <p
        className={`rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs leading-5 ${getPrinterToneClass(connectionState)}`}
      >
        {statusMessage}
      </p>
    </div>
  )
}

function formatPrinterOptionLabel(printer: ThermalPrinter) {
  const suffixes = [printer.isDefault ? 'padrao' : '', printer.details ?? ''].filter(Boolean)
  return suffixes.length ? `${printer.name} - ${suffixes.join(' - ')}` : printer.name
}

function getPrinterToneClass(connectionState: ThermalPrinterConnectionState) {
  if (connectionState === 'error') {
    return 'text-[var(--danger)]'
  }
  if (connectionState === 'connected') {
    return 'text-[var(--success)]'
  }
  return 'text-[var(--text-soft)]'
}

function getPrinterStateLabel(connectionState: ThermalPrinterConnectionState) {
  if (connectionState === 'discovering') {
    return 'buscando'
  }
  if (connectionState === 'connected') {
    return 'conectado'
  }
  if (connectionState === 'error') {
    return 'falha'
  }
  return 'aguardando'
}
