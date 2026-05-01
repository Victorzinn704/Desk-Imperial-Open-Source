'use client'
/* eslint-disable max-lines */

import { memo, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { maskDocument } from '@/lib/document-validation'
import { formatCurrency } from '@/lib/currency'
import type { ThermalPrinter, ThermalPrinterConnectionState } from '@/lib/printing'
import { PrinterSection } from './printer-section'
import { StatusButtons } from './status-buttons'
import { SaveButtons } from './save-buttons'
import { documentBorderColor } from '../helpers'
import type { Comanda } from '../../pdv-types'

type FormPaneProps = Readonly<{
  clienteDocumento: string
  clienteNome: string
  acrescimo: number
  desconto: number
  bruto: number
  total: number
  itemCount: number
  mesa: string
  notes: string
  comanda?: Comanda | null
  connectionState: ThermalPrinterConnectionState
  docLabel: string
  docValidation: { valid: boolean; message?: string }
  isBusy: boolean
  isEditing: boolean
  itensLength: number
  saveError: string | null
  selectedPrinterId: string
  statusMessage: string
  printers: ThermalPrinter[]
  onChoosePrinter: (printerId: string) => void
  onClose: () => void
  onRefreshPrinters: () => void
  requirePin: (action: () => void, title: string, description: string) => void
  onSave: () => void
  onSaveAndPrint: () => void
  onStatusChange?: (comanda: Comanda, status: Comanda['status']) => Promise<void>
  onSetAcrescimo: (value: number) => void
  onSetClienteDocumento: (value: string) => void
  onSetClienteNome: (value: string) => void
  onSetDesconto: (value: number) => void
  onSetMesa: (value: string) => void
  onSetNotes: (value: string) => void
}>

export const ComandaFormPane = memo(function ComandaFormPane(props: FormPaneProps) {
  return (
    <div className="flex min-h-0 flex-col overflow-y-auto border-b border-[var(--border)] xl:border-b-0 xl:border-r">
      <ComandaPartyFields
        clienteNome={props.clienteNome}
        mesa={props.mesa}
        onSetClienteNome={props.onSetClienteNome}
        onSetMesa={props.onSetMesa}
      />
      <ComandaDocumentField
        clienteDocumento={props.clienteDocumento}
        docLabel={props.docLabel}
        docValidation={props.docValidation}
        onSetClienteDocumento={props.onSetClienteDocumento}
      />
      <ComandaNotesField notes={props.notes} onSetNotes={props.onSetNotes} />
      <ComandaPercentFields
        acrescimo={props.acrescimo}
        desconto={props.desconto}
        onSetAcrescimo={props.onSetAcrescimo}
        onSetDesconto={props.onSetDesconto}
      />
      <ComandaTotalCard bruto={props.bruto} itemCount={props.itemCount} total={props.total} />
      <ComandaStatusSection
        comanda={props.comanda}
        isBusy={props.isBusy}
        isEditing={props.isEditing}
        requirePin={props.requirePin}
        onClose={props.onClose}
        onStatusChange={props.onStatusChange}
      />
      <ComandaFooter
        connectionState={props.connectionState}
        hasItems={props.itensLength > 0}
        isBusy={props.isBusy}
        isEditing={props.isEditing}
        printers={props.printers}
        saveError={props.saveError}
        selectedPrinterId={props.selectedPrinterId}
        statusMessage={props.statusMessage}
        onChoosePrinter={props.onChoosePrinter}
        onRefreshPrinters={props.onRefreshPrinters}
        onSave={props.onSave}
        onSaveAndPrint={props.onSaveAndPrint}
      />
    </div>
  )
})

function ComandaPartyFields({
  clienteNome,
  mesa,
  onSetClienteNome,
  onSetMesa,
}: Readonly<{
  clienteNome: string
  mesa: string
  onSetClienteNome: (value: string) => void
  onSetMesa: (value: string) => void
}>) {
  return (
    <div className="grid grid-cols-2 gap-3 p-4 pb-2">
      <InputField label="Mesa" placeholder="Ex: 4" value={mesa} onChange={onSetMesa} />
      <InputField label="Cliente" placeholder="Nome (opcional)" value={clienteNome} onChange={onSetClienteNome} />
    </div>
  )
}

function ComandaDocumentField({
  clienteDocumento,
  docLabel,
  docValidation,
  onSetClienteDocumento,
}: Readonly<{
  clienteDocumento: string
  docLabel: string
  docValidation: { valid: boolean; message?: string }
  onSetClienteDocumento: (value: string) => void
}>) {
  const documentInputId = 'comanda-cliente-documento'
  return (
    <div className="px-4 pb-3">
      <label
        className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]"
        htmlFor={documentInputId}
      >
        CPF / CNPJ
        {clienteDocumento ? <DocumentValidationChip docLabel={docLabel} docValidation={docValidation} /> : null}
      </label>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-[12px] border bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors"
          id={documentInputId}
          inputMode="numeric"
          placeholder="000.000.000-00 ou 00.000.000/0001-00"
          style={{ borderColor: documentBorderColor(clienteDocumento, docValidation.valid) }}
          value={clienteDocumento}
          onChange={(event) => onSetClienteDocumento(maskDocument(event.target.value))}
        />
        {clienteDocumento ? (
          <button
            className="rounded-[12px] border border-[var(--border)] px-2.5 text-[var(--text-soft)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            type="button"
            onClick={() => onSetClienteDocumento('')}
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  )
}

function DocumentValidationChip({
  docLabel,
  docValidation,
}: Readonly<{
  docLabel: string
  docValidation: { valid: boolean; message?: string }
}>) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{
        background: docValidation.valid
          ? 'color-mix(in srgb, var(--success) 12%, transparent)'
          : 'color-mix(in srgb, var(--danger) 12%, transparent)',
        color: docValidation.valid ? 'var(--success)' : 'var(--danger)',
      }}
    >
      {docValidation.valid ? `${docLabel} valido` : (docValidation.message ?? `${docLabel} invalido`)}
    </span>
  )
}

function ComandaNotesField({
  notes,
  onSetNotes,
}: Readonly<{
  notes: string
  onSetNotes: (value: string) => void
}>) {
  const notesInputId = 'comanda-notes'
  return (
    <div className="px-4 pb-3">
      <label
        className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]"
        htmlFor={notesInputId}
      >
        Observação da comanda
      </label>
      <textarea
        className="min-h-[84px] w-full resize-none rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-soft)] focus:border-[var(--accent)]"
        id={notesInputId}
        placeholder="Ex: cliente na varanda, entregar junto, prioridade alta"
        value={notes}
        onChange={(event) => onSetNotes(event.target.value)}
      />
    </div>
  )
}

function ComandaPercentFields({
  acrescimo,
  desconto,
  onSetAcrescimo,
  onSetDesconto,
}: Readonly<{
  acrescimo: number
  desconto: number
  onSetAcrescimo: (value: number) => void
  onSetDesconto: (value: number) => void
}>) {
  return (
    <div className="grid grid-cols-2 gap-3 px-4 pt-1">
      <PercentField label="Desconto %" value={desconto} onChange={onSetDesconto} />
      <PercentField label="Acréscimo %" value={acrescimo} onChange={onSetAcrescimo} />
    </div>
  )
}

function ComandaTotalCard({
  bruto,
  itemCount,
  total,
}: Readonly<{
  bruto: number
  itemCount: number
  total: number
}>) {
  return (
    <div
      className="m-4 flex items-center justify-between rounded-[14px] border px-4 py-3"
      style={{
        borderColor: 'color-mix(in srgb, var(--success) 20%, var(--border))',
        backgroundColor: 'color-mix(in srgb, var(--success) 8%, var(--surface))',
      }}
    >
      <div>
        {bruto !== total ? (
          <p className="text-xs text-[var(--text-soft)] line-through">{formatCurrency(bruto, 'BRL')}</p>
        ) : null}
        <p className="text-xl font-bold text-[var(--success)]">{formatCurrency(total, 'BRL')}</p>
      </div>
      <p className="text-xs text-[var(--text-soft)]">{itemCount} itens</p>
    </div>
  )
}

function ComandaStatusSection({
  comanda,
  isBusy,
  isEditing,
  onClose,
  onStatusChange,
  requirePin,
}: Readonly<{
  comanda?: Comanda | null
  isBusy: boolean
  isEditing: boolean
  onClose: () => void
  onStatusChange?: (comanda: Comanda, status: Comanda['status']) => Promise<void>
  requirePin: (action: () => void, title: string, description: string) => void
}>) {
  if (!(isEditing && onStatusChange && comanda)) {
    return null
  }

  return (
    <StatusButtons
      comanda={comanda}
      isBusy={isBusy}
      requirePin={requirePin}
      onClose={onClose}
      onStatusChange={onStatusChange}
    />
  )
}

function ComandaFooter(
  props: Readonly<{
    connectionState: ThermalPrinterConnectionState
    hasItems: boolean
    isBusy: boolean
    isEditing: boolean
    onChoosePrinter: (printerId: string) => void
    onRefreshPrinters: () => void
    onSave: () => void
    onSaveAndPrint: () => void
    printers: ThermalPrinter[]
    saveError: string | null
    selectedPrinterId: string
    statusMessage: string
  }>,
) {
  return (
    <div className="border-t border-[var(--border)] p-4 pb-5">
      <SaveButtons
        connectionState={props.connectionState}
        hasItems={props.hasItems}
        isBusy={props.isBusy}
        isEditing={props.isEditing}
        onSave={props.onSave}
        onSaveAndPrint={props.onSaveAndPrint}
      />

      {props.saveError ? <p className="mt-3 text-xs text-[var(--danger)]">{props.saveError}</p> : null}

      <div className="mt-4">
        <PrinterSection
          connectionState={props.connectionState}
          isBusy={props.isBusy}
          printers={props.printers}
          selectedPrinterId={props.selectedPrinterId}
          statusMessage={props.statusMessage}
          onChoosePrinter={props.onChoosePrinter}
          onRefreshPrinters={props.onRefreshPrinters}
        />
      </div>
    </div>
  )
}

function InputField({
  label,
  placeholder,
  value,
  onChange,
}: Readonly<{
  inputId?: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}>) {
  const inputId = `comanda-input-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`
  return (
    <div>
      <label
        className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]"
        htmlFor={inputId}
      >
        {label}
      </label>
      <input
        className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        id={inputId}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

function PercentField({
  label,
  value,
  onChange,
}: Readonly<{
  label: string
  value: number
  onChange: (value: number) => void
}>) {
  const [draftValue, setDraftValue] = useState(String(value))
  const inputId = `comanda-percent-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`

  useEffect(() => {
    setDraftValue(String(value))
  }, [value])

  const commitValue = () => {
    const numericValue = Number(draftValue)
    const normalizedValue = Number.isFinite(numericValue) ? Math.min(100, Math.max(0, numericValue)) : 0
    setDraftValue(String(normalizedValue))
    onChange(normalizedValue)
  }

  return (
    <div>
      <label
        className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]"
        htmlFor={inputId}
      >
        {label}
      </label>
      <input
        className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        id={inputId}
        max="100"
        min="0"
        type="number"
        value={draftValue}
        onBlur={commitValue}
        onChange={(event) => setDraftValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commitValue()
          }
        }}
      />
    </div>
  )
}
