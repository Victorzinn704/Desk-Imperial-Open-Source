'use client'

import { memo } from 'react'
import { Printer, RefreshCw } from 'lucide-react'
import type { ThermalPrinter, ThermalPrinterConnectionState } from '@/lib/printing'

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

function PrinterSectionBody({
  connectionState,
  printers,
  selectedPrinterId,
  statusMessage,
  onChoosePrinter,
}: Readonly<{
  connectionState: ThermalPrinterConnectionState
  printers: ThermalPrinter[]
  selectedPrinterId: string
  statusMessage: string
  onChoosePrinter: (printerId: string) => void
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
