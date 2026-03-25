'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_THERMAL_PROVIDER,
  getPreferredThermalProvider,
  listThermalPrinters,
  printThermalComanda,
  resolvePreferredPrinterName,
  setPreferredThermalPrinter,
} from '@/lib/printing'
import type {
  PrintableComanda,
  ThermalPrinter,
  ThermalPrinterConnectionState,
} from '@/lib/printing'

export function useThermalPrinting() {
  const [provider] = useState(() => getPreferredThermalProvider())
  const [printers, setPrinters] = useState<ThermalPrinter[]>([])
  const [selectedPrinterName, setSelectedPrinterName] = useState('')
  const [connectionState, setConnectionState] = useState<ThermalPrinterConnectionState>('idle')
  const [statusMessage, setStatusMessage] = useState('QZ Tray pronto para ser conectado ao abrir a comanda.')
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const refreshPrinters = useCallback(async () => {
    setConnectionState('discovering')
    setStatusMessage('Buscando impressoras termicas conectadas ao QZ Tray...')

    try {
      const discoveredPrinters = await listThermalPrinters(provider)
      const resolvedPrinterName = resolvePreferredPrinterName(provider, discoveredPrinters)

      setPrinters(discoveredPrinters)
      setSelectedPrinterName(resolvedPrinterName)
      if (resolvedPrinterName) {
        setPreferredThermalPrinter(provider, resolvedPrinterName)
      }

      setConnectionState('connected')
      setStatusMessage(
        discoveredPrinters.length
          ? `${discoveredPrinters.length} impressora(s) encontrada(s) no QZ Tray.`
          : 'QZ Tray conectado, mas nenhuma impressora termica foi encontrada.',
      )

      return {
        printers: discoveredPrinters,
        selectedPrinterName: resolvedPrinterName,
      }
    } catch (error) {
      setPrinters([])
      setConnectionState('error')
      setStatusMessage(normalizeThermalError(error))
      return {
        printers: [] as ThermalPrinter[],
        selectedPrinterName: '',
      }
    }
  }, [provider])

  useEffect(() => {
    if (!isHydrated || provider !== DEFAULT_THERMAL_PROVIDER) {
      return
    }

    void refreshPrinters()
  }, [isHydrated, provider, refreshPrinters])

  function choosePrinter(printerName: string) {
    setSelectedPrinterName(printerName)
    setPreferredThermalPrinter(provider, printerName)
  }

  async function printComanda(comanda: PrintableComanda) {
    setConnectionState('printing')
    setStatusMessage('Enviando comanda para a impressora termica...')

    try {
      const printerName =
        selectedPrinterName ||
        (await refreshPrinters()).selectedPrinterName

      if (!printerName) {
        throw new Error('Nenhuma impressora termica foi selecionada.')
      }

      await printThermalComanda({
        provider,
        printerName,
        comanda,
      })

      setConnectionState('connected')
      setStatusMessage(`Comanda enviada para ${printerName}.`)
    } catch (error) {
      setConnectionState('error')
      setStatusMessage(normalizeThermalError(error))
      throw error
    }
  }

  return {
    provider,
    printers,
    selectedPrinterName,
    connectionState,
    statusMessage,
    choosePrinter,
    refreshPrinters,
    printComanda,
  }
}

function normalizeThermalError(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Nao foi possivel concluir a operacao de impressao termica.'
}
