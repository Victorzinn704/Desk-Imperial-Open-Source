'use client'

import { memo } from 'react'
import { Printer, RefreshCw } from 'lucide-react'
import type { ThermalPrinter, ThermalPrinterConnectionState } from '@/lib/printing'

type PrinterSectionProps = {
  printers: ThermalPrinter[]
  selectedPrinterName: string
  connectionState: ThermalPrinterConnectionState
  statusMessage: string
  isBusy: boolean
  onChoosePrinter: (name: string) => void
  onRefreshPrinters: () => void
}

export const PrinterSection = memo(function PrinterSection({
  printers,
  selectedPrinterName,
  connectionState,
  statusMessage,
  isBusy,
  onChoosePrinter,
  onRefreshPrinters,
}: PrinterSectionProps) {
  return (
    <div className="rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text-soft)]">
            <Printer className="size-4" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Comanda termica</p>
            <p className="mt-1 text-sm text-[var(--text-primary)]">QZ Tray agora. PrintNode fica como segunda via.</p>
          </div>
        </div>

        <button
          className="flex items-center gap-2 rounded-[12px] border border-[rgba(255,255,255,0.08)] px-3 py-2 text-xs font-semibold text-[var(--text-soft)] transition-colors hover:border-[rgba(255,255,255,0.18)] hover:text-[var(--text-primary)]"
          type="button"
          disabled={isBusy}
          onClick={onRefreshPrinters}
        >
          <RefreshCw className={`size-3.5 ${connectionState === 'discovering' ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <div className="mt-3 grid gap-3">
        <select
          className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(9,11,17,0.9)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[rgba(52,242,127,0.3)]"
          value={selectedPrinterName}
          onChange={(event) => onChoosePrinter(event.target.value)}
        >
          <option value="">Selecione uma impressora termica</option>
          {printers.map((printer) => (
            <option key={printer.id} value={printer.name}>
              {printer.name}
              {printer.isDefault ? ' (padrao)' : ''}
            </option>
          ))}
        </select>

        <p
          className={`text-xs leading-6 ${
            connectionState === 'error'
              ? 'text-[#fca5a5]'
              : connectionState === 'connected'
                ? 'text-[#86efac]'
                : 'text-[var(--text-soft)]'
          }`}
        >
          {statusMessage}
        </p>
      </div>
    </div>
  )
})
