'use client'

import { useState } from 'react'
import { Printer } from 'lucide-react'
import type { Comanda } from '@/components/pdv/pdv-types'
import {
  comandaToPrintable,
  getPreferredThermalPrinter,
  getPreferredThermalProvider,
  listThermalPrinters,
  printThermalComanda,
} from '@/lib/printing'

type PrintState = 'idle' | 'printing' | 'done' | 'error'

function useComandaQuickPrint() {
  const [state, setState] = useState<PrintState>('idle')
  const [message, setMessage] = useState('')

  async function print(comanda: Comanda) {
    setState('printing')
    setMessage('')
    try {
      const provider = getPreferredThermalProvider()
      let printerId = getPreferredThermalPrinter(provider) ?? ''
      let printerLabel = formatPrinterLabel(printerId)

      if (!printerId) {
        const printers = await listThermalPrinters(provider)
        const defaultPrinter = printers.find((p) => p.isDefault) ?? printers[0]
        if (!defaultPrinter) {
          throw new Error('Nenhuma impressora configurada. Configure no PDV primeiro.')
        }
        printerId = defaultPrinter.id
        printerLabel = defaultPrinter.name
      }

      await printThermalComanda({
        provider,
        printerId,
        comanda: comandaToPrintable(comanda),
      })

      setState('done')
      setMessage(`Enviado para ${printerLabel}`)
      setTimeout(() => setState('idle'), 3_000)
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : 'Erro ao imprimir')
      setTimeout(() => setState('idle'), 4_000)
    }
  }

  return { state, message, print }
}

export function ComandaPrintButton({ comanda }: Readonly<{ comanda: Comanda }>) {
  const { state, message, print } = useComandaQuickPrint()
  const isPrinting = state === 'printing'

  return (
    <div className="mt-3">
      <button
        className={`flex w-full items-center justify-center gap-2 rounded-[14px] border px-4 py-3 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 ${resolveButtonClass(state)}`}
        disabled={isPrinting}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        type="button"
        onClick={() => void print(comanda)}
      >
        <Printer className={`size-4 ${isPrinting ? 'animate-pulse' : ''}`} />
        {resolveButtonLabel(state)}
      </button>
      {message && state !== 'idle' ? (
        <p className={`mt-1.5 text-center text-xs ${resolveMessageClass(state)}`}>{message}</p>
      ) : null}
    </div>
  )
}

function resolveButtonClass(state: PrintState) {
  if (state === 'done') {
    return 'border-[rgba(54,245,124,0.3)] bg-[rgba(54,245,124,0.08)] text-[#36f57c]'
  }

  if (state === 'error') {
    return 'border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)] text-[#fca5a5]'
  }

  return 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-soft)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
}

function resolveButtonLabel(state: PrintState) {
  if (state === 'printing') {
    return 'Imprimindo...'
  }

  if (state === 'done') {
    return 'Enviado!'
  }

  if (state === 'error') {
    return 'Falha - tente novamente'
  }

  return 'Imprimir comanda'
}

function resolveMessageClass(state: PrintState) {
  return state === 'error' ? 'text-[#fca5a5]' : 'text-[#36f57c]'
}

function formatPrinterLabel(printerId: string) {
  return printerId.replace(/^qz-(queue|serial):/, '') || 'impressora configurada'
}
