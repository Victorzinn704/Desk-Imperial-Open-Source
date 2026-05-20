'use client'

import { useState } from 'react'
import type { TerminalPaymentMethod } from '@/lib/api'
import type { Comanda } from './pdv-types'
import { buildPreviewSummary } from './pdv-comanda-preview-modal.model'
import { PreviewBody, PreviewFooter, PreviewHeader, PreviewStats } from './pdv-comanda-preview-sections'

type PdvComandaPreviewModalProps = Readonly<{
  busy?: boolean
  comanda: Comanda
  terminalPaymentBusy?: boolean
  onClose: () => void
  onCharge: () => void
  onEdit: () => void
  onPrint?: (comanda: Comanda) => Promise<void>
  onTerminalPayment?: (comandaId: string, amount: number, method: TerminalPaymentMethod) => Promise<unknown>
}>

export function PdvComandaPreviewModal({
  busy = false,
  comanda,
  terminalPaymentBusy = false,
  onCharge,
  onClose,
  onEdit,
  onPrint,
  onTerminalPayment,
}: PdvComandaPreviewModalProps) {
  const [terminalMethod, setTerminalMethod] = useState<TerminalPaymentMethod>('DEBIT')
  const summary = buildPreviewSummary(comanda)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] px-4">
      <button
        aria-label="Fechar resumo da comanda"
        className="absolute inset-0 border-0 bg-transparent p-0"
        type="button"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-panel-strong)]">
        <PreviewHeader comanda={comanda} onClose={onClose} />
        <PreviewStats summary={summary} />
        <PreviewBody
          comanda={comanda}
          summary={summary}
          terminalMethod={terminalMethod}
          terminalPaymentBusy={terminalPaymentBusy}
          onMethodChange={setTerminalMethod}
          onTerminalPayment={onTerminalPayment}
        />
        <PreviewFooter
          busy={busy}
          chargeLabel={summary.chargeLabel}
          comanda={comanda}
          onCharge={onCharge}
          onEdit={onEdit}
          onPrint={onPrint}
        />
      </div>
    </div>
  )
}
