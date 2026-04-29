'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_THERMAL_PROVIDER,
  getPreferredThermalProvider,
  listThermalPrinters,
  type PrintableComanda,
  printThermalComanda,
  resolvePreferredPrinterId,
  setPreferredThermalPrinter,
  type ThermalPrinter,
  type ThermalPrinterConnectionState,
} from '@/lib/printing'

export function useThermalPrinting() {
  const [provider] = useState(() => getPreferredThermalProvider())
  const printerState = useThermalPrinterDiscovery(provider)

  async function printComanda(comanda: PrintableComanda) {
    printerState.setConnectionState('printing')
    printerState.setStatusMessage('Enviando comanda para a impressora termica...')

    try {
      const refreshed = printerState.selectedPrinterId ? null : await printerState.refreshPrinters()
      const printerId = printerState.selectedPrinterId || refreshed?.selectedPrinterId

      if (!printerId) {
        throw new Error('Nenhuma impressora termica foi selecionada.')
      }

      const availablePrinters = refreshed?.printers ?? printerState.printers
      const selectedPrinter = availablePrinters.find((printer) => printer.id === printerId)
      await printThermalComanda({
        provider,
        printerId,
        comanda,
      })

      printerState.setConnectionState('connected')
      printerState.setStatusMessage(`Comanda enviada para ${selectedPrinter?.name ?? printerId}.`)
    } catch (error) {
      printerState.setConnectionState('error')
      printerState.setStatusMessage(normalizeThermalError(error))
      throw error
    }
  }

  return {
    provider,
    printers: printerState.printers,
    selectedPrinterId: printerState.selectedPrinterId,
    connectionState: printerState.connectionState,
    statusMessage: printerState.statusMessage,
    choosePrinter: printerState.choosePrinter,
    refreshPrinters: printerState.refreshPrinters,
    printComanda,
  }
}

function useThermalPrinterDiscovery(provider: ReturnType<typeof getPreferredThermalProvider>) {
  const [printers, setPrinters] = useState<ThermalPrinter[]>([])
  const [selectedPrinterId, setSelectedPrinterId] = useState('')
  const [connectionState, setConnectionState] = useState<ThermalPrinterConnectionState>('idle')
  const [statusMessage, setStatusMessage] = useState('QZ Tray pronto para ser conectado ao abrir a comanda.')
  const refreshPrinters = useThermalPrinterRefresh(
    provider,
    setPrinters,
    setSelectedPrinterId,
    setConnectionState,
    setStatusMessage,
  )

  useEffect(() => {
    if (provider === DEFAULT_THERMAL_PROVIDER) {
      void refreshPrinters({ silent: true })
    }
  }, [provider, refreshPrinters])

  function choosePrinter(printerId: string) {
    setSelectedPrinterId(printerId)
    setPreferredThermalPrinter(provider, printerId)
  }

  return {
    choosePrinter,
    connectionState,
    printers,
    refreshPrinters,
    selectedPrinterId,
    setConnectionState,
    setStatusMessage,
    statusMessage,
  }
}

function useThermalPrinterRefresh(
  provider: ReturnType<typeof getPreferredThermalProvider>,
  setPrinters: (printers: ThermalPrinter[]) => void,
  setSelectedPrinterId: (printerId: string) => void,
  setConnectionState: (state: ThermalPrinterConnectionState) => void,
  setStatusMessage: (message: string) => void,
) {
  return useCallback(
    async (options?: { silent?: boolean }) =>
      options?.silent
        ? discoverThermalPrintersSilently(
            provider,
            setPrinters,
            setSelectedPrinterId,
            setConnectionState,
            setStatusMessage,
          )
        : discoverThermalPrintersWithFeedback(
            provider,
            setPrinters,
            setSelectedPrinterId,
            setConnectionState,
            setStatusMessage,
          ),
    [provider, setConnectionState, setPrinters, setSelectedPrinterId, setStatusMessage],
  )
}

async function discoverThermalPrintersSilently(
  provider: ReturnType<typeof getPreferredThermalProvider>,
  setPrinters: (printers: ThermalPrinter[]) => void,
  setSelectedPrinterId: (printerId: string) => void,
  setConnectionState: (state: ThermalPrinterConnectionState) => void,
  setStatusMessage: (message: string) => void,
) {
  try {
    return await discoverThermalPrinters(
      provider,
      setPrinters,
      setSelectedPrinterId,
      setConnectionState,
      setStatusMessage,
    )
  } catch {
    setPrinters([])
    setSelectedPrinterId('')
    setConnectionState('idle')
    setStatusMessage('QZ Tray nao detectado. Clique em "Atualizar" para tentar conectar.')
    return {
      printers: [] as ThermalPrinter[],
      selectedPrinterId: '',
    }
  }
}

async function discoverThermalPrintersWithFeedback(
  provider: ReturnType<typeof getPreferredThermalProvider>,
  setPrinters: (printers: ThermalPrinter[]) => void,
  setSelectedPrinterId: (printerId: string) => void,
  setConnectionState: (state: ThermalPrinterConnectionState) => void,
  setStatusMessage: (message: string) => void,
) {
  setConnectionState('discovering')
  setStatusMessage('Buscando impressoras termicas conectadas ao QZ Tray...')
  try {
    return await discoverThermalPrinters(
      provider,
      setPrinters,
      setSelectedPrinterId,
      setConnectionState,
      setStatusMessage,
    )
  } catch (error) {
    setPrinters([])
    setSelectedPrinterId('')
    setConnectionState('error')
    setStatusMessage(normalizeThermalError(error))
    return {
      printers: [] as ThermalPrinter[],
      selectedPrinterId: '',
    }
  }
}

async function discoverThermalPrinters(
  provider: ReturnType<typeof getPreferredThermalProvider>,
  setPrinters: (printers: ThermalPrinter[]) => void,
  setSelectedPrinterId: (printerId: string) => void,
  setConnectionState: (state: ThermalPrinterConnectionState) => void,
  setStatusMessage: (message: string) => void,
) {
  try {
    const discoveredPrinters = await listThermalPrinters(provider)
    const resolvedPrinterId = resolvePreferredPrinterId(provider, discoveredPrinters)

    setPrinters(discoveredPrinters)
    setSelectedPrinterId(resolvedPrinterId)
    if (resolvedPrinterId) {
      setPreferredThermalPrinter(provider, resolvedPrinterId)
    }

    setConnectionState('connected')
    setStatusMessage(describeDiscoveredPrinters(discoveredPrinters))
    return {
      printers: discoveredPrinters,
      selectedPrinterId: resolvedPrinterId,
    }
  } catch (error) {
    throw error
  }
}

function normalizeThermalError(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Nao foi possivel concluir a operacao de impressao termica.'
}

function describeDiscoveredPrinters(printers: ThermalPrinter[]) {
  if (!printers.length) {
    return 'QZ Tray conectado, mas nenhuma impressora termica foi encontrada.'
  }

  const queueCount = printers.filter((printer) => printer.transport === 'queue').length
  const serialPorts = printers.filter((printer) => printer.transport === 'serial').map((printer) => printer.target)

  if (queueCount === 0 && serialPorts.length > 0) {
    return `QZ Tray conectado. Sem fila do Windows; use a porta serial ${serialPorts.join(', ')} para a termica Bluetooth.`
  }

  if (queueCount > 0 && serialPorts.length > 0) {
    return `${queueCount} fila(s) do Windows e ${serialPorts.length} porta(s) serial(is) detectadas no QZ Tray.`
  }

  return `${printers.length} impressora(s) encontrada(s) no QZ Tray.`
}
