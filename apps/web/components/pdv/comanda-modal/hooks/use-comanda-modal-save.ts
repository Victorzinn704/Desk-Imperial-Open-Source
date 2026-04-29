'use client'

import { useCallback, useState } from 'react'
import type { PrintableComanda } from '@/lib/printing'
import type { Comanda, ComandaItem } from '../../pdv-types'
import type { SaveComandaPayload } from '../types'

type UseComandaModalSaveArgs = Readonly<{
  acrescimo: number
  clienteDocumento: string
  clienteNome: string
  desconto: number
  isBusyGuard: boolean
  itens: ComandaItem[]
  mesa: string
  notes: string
  onClose: () => void
  onSave: (data: SaveComandaPayload) => Promise<Comanda>
  printComanda: (comanda: PrintableComanda) => Promise<void>
  toPrintableComanda: (comanda: Comanda) => PrintableComanda
}>

type RunComandaSaveArgs = Readonly<
  UseComandaModalSaveArgs & {
    options?: { printAfterSave?: boolean }
    setIsSubmitting: (value: boolean) => void
    setSaveError: (value: string | null) => void
  }
>

async function saveComandaAndMaybePrint({
  onClose,
  onSave,
  payload,
  printAfterSave,
  printComanda,
  toPrintableComanda,
}: Readonly<{
  onClose: () => void
  onSave: (data: SaveComandaPayload) => Promise<Comanda>
  payload: SaveComandaPayload
  printAfterSave?: boolean
  printComanda: (comanda: PrintableComanda) => Promise<void>
  toPrintableComanda: (comanda: Comanda) => PrintableComanda
}>) {
  const savedComanda = await onSave(payload)
  if (printAfterSave) {
    await printComanda(toPrintableComanda(savedComanda))
  }
  onClose()
}

async function runComandaSave({
  acrescimo,
  clienteDocumento,
  clienteNome,
  desconto,
  isBusyGuard,
  itens,
  mesa,
  notes,
  onClose,
  onSave,
  options,
  printComanda,
  setIsSubmitting,
  setSaveError,
  toPrintableComanda,
}: RunComandaSaveArgs) {
  if (itens.length === 0 || isBusyGuard) {
    return
  }

  setSaveError(null)
  setIsSubmitting(true)

  try {
    await saveComandaAndMaybePrint({
      onClose,
      onSave,
      payload: { mesa, clienteNome, clienteDocumento, notes, itens, desconto, acrescimo },
      printAfterSave: options?.printAfterSave,
      printComanda,
      toPrintableComanda,
    })
  } catch (error) {
    setSaveError(error instanceof Error ? error.message : 'Nao foi possivel imprimir a comanda.')
  } finally {
    setIsSubmitting(false)
  }
}

// eslint-disable-next-line max-lines-per-function
export function useComandaModalSave(args: UseComandaModalSaveArgs) {
  const {
    acrescimo,
    clienteDocumento,
    clienteNome,
    desconto,
    isBusyGuard,
    itens,
    mesa,
    notes,
    onClose,
    onSave,
    printComanda,
    toPrintableComanda,
  } = args
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleSave = useCallback(
    (options?: { printAfterSave?: boolean }) =>
      runComandaSave({
        acrescimo,
        clienteDocumento,
        clienteNome,
        desconto,
        isBusyGuard,
        itens,
        mesa,
        notes,
        onClose,
        onSave,
        options,
        printComanda,
        setIsSubmitting,
        setSaveError,
        toPrintableComanda,
      }),
    [
      acrescimo,
      clienteDocumento,
      clienteNome,
      desconto,
      isBusyGuard,
      itens,
      mesa,
      notes,
      onClose,
      onSave,
      printComanda,
      toPrintableComanda,
    ],
  )

  return {
    handleSave,
    isSubmitting,
    saveError,
  }
}
