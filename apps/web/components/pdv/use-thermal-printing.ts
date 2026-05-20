'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_THERMAL_PROVIDER,
  getPreferredThermalPrinter,
  getPreferredThermalProvider,
  getQzFallbackSerialPrinter,
  listSupportedProviders,
  listThermalPrinters,
  type PrintableComanda,
  printThermalComanda,
  printThermalComandaWithFallback,
  QZ_PREFERRED_SERIAL_PRINTER_ID,
  resolvePreferredPrinterId,
  setPreferredThermalPrinter,
  type ThermalPrinter,
  type ThermalPrinterConnectionState,
} from '@/lib/printing'

// O PDV roda no desktop. Mantemos somente a porta serial preferida (default COM3) na UI
// pra evitar confusao com COM4 (incoming BT) ou filas Windows que nao respondem nessa maquina.
function applyDesktopQzFilter(provider: ReturnType<typeof getPreferredThermalProvider>, printers: ThermalPrinter[]) {
  if (provider !== 'QZ_TRAY') {
    return printers
  }
  const onlyPreferred = printers.filter((printer) => printer.id === QZ_PREFERRED_SERIAL_PRINTER_ID)
  if (onlyPreferred.length > 0) {
    return onlyPreferred
  }
  return [getQzFallbackSerialPrinter()]
}

export function useThermalPrinting() {
  const [provider] = useState(() => getPreferredThermalProvider())
  const printerState = useThermalPrinterDiscovery(provider)

  async function printComanda(comanda: PrintableComanda) {
    printerState.setConnectionState('printing')
    printerState.setStatusMessage('Enviando comanda para a impressora termica...')

    try {
      // Always re-resolve from the latest discovery to avoid stale closure / disconnected port.
      const refreshed = await printerState.refreshPrinters({ silent: true })
      const candidatePrinters = refreshed.printers
      const candidatePrinterId =
        candidatePrinters.find((p) => p.id === printerState.selectedPrinterId)?.id || refreshed.selectedPrinterId

      if (!candidatePrinterId) {
        throw new Error('Nenhuma impressora termica esta pareada. Conecte uma em "Configuracoes de impressao".')
      }

      const selectedPrinter = await printWithQzRecovery({
        comanda,
        printerId: candidatePrinterId,
        provider,
        printerState,
        refreshedPrinters: candidatePrinters,
      })

      printerState.setConnectionState('connected')
      printerState.setStatusMessage(`Comanda enviada para ${selectedPrinter?.name ?? candidatePrinterId}.`)
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

async function printWithQzRecovery(params: {
  comanda: PrintableComanda
  printerId: string
  provider: ReturnType<typeof getPreferredThermalProvider>
  printerState: ReturnType<typeof useThermalPrinterDiscovery>
  refreshedPrinters?: ThermalPrinter[]
}) {
  try {
    await printThermalComanda({ provider: params.provider, printerId: params.printerId, comanda: params.comanda })
    return findPrinter(params.refreshedPrinters ?? params.printerState.printers, params.printerId)
  } catch (primaryError) {
    const refreshed = await params.printerState.refreshPrinters({ silent: true })
    const retryPrinterId = refreshed.selectedPrinterId || params.printerId

    if (retryPrinterId) {
      try {
        await printThermalComanda({ provider: params.provider, printerId: retryPrinterId, comanda: params.comanda })
        return findPrinter(refreshed.printers, retryPrinterId)
      } catch {
        // fallthrough to multi-route fallback
      }
    }

    try {
      const result = await printThermalComandaWithFallback({
        comanda: params.comanda,
        preferredProvider: params.provider,
        preferredPrinterId: retryPrinterId || params.printerId,
        enabledProviders: listSupportedProviders(),
      })
      return findPrinter(refreshed.printers, result.printerId)
    } catch {
      throw primaryError
    }
  }
}

function findPrinter(printers: ThermalPrinter[], printerId: string) {
  return printers.find((printer) => printer.id === printerId)
}

function useThermalPrinterDiscovery(provider: ReturnType<typeof getPreferredThermalProvider>) {
  const [printers, setPrinters] = useState<ThermalPrinter[]>([])
  const [selectedPrinterId, setSelectedPrinterId] = useState(() => getPreferredThermalPrinter(provider) ?? '')
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
    const fallback = buildDiscoveryFallback(provider)
    setPrinters(fallback.printers)
    setSelectedPrinterId(fallback.selectedPrinterId)
    setConnectionState('idle')
    setStatusMessage(
      fallback.printers.length > 0
        ? 'QZ Tray nao detectado, mas a porta preferida fica disponivel para tentar print.'
        : 'QZ Tray nao detectado. Clique em "Atualizar" para tentar conectar.',
    )
    return fallback
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
    const fallback = buildDiscoveryFallback(provider)
    setPrinters(fallback.printers)
    setSelectedPrinterId(fallback.selectedPrinterId)
    setConnectionState('error')
    const baseMessage = normalizeThermalError(error)
    setStatusMessage(
      fallback.printers.length > 0 ? `${baseMessage} Porta preferida disponivel para tentativa manual.` : baseMessage,
    )
    return fallback
  }
}

function buildDiscoveryFallback(provider: ReturnType<typeof getPreferredThermalProvider>) {
  const stored = getPreferredThermalPrinter(provider)
  if (provider === 'QZ_TRAY') {
    const fallbackPrinter = getQzFallbackSerialPrinter()
    return {
      printers: [fallbackPrinter],
      selectedPrinterId: stored && stored !== fallbackPrinter.id ? stored : fallbackPrinter.id,
    }
  }
  return {
    printers: [] as ThermalPrinter[],
    selectedPrinterId: stored ?? '',
  }
}

async function discoverThermalPrinters(
  provider: ReturnType<typeof getPreferredThermalProvider>,
  setPrinters: (printers: ThermalPrinter[]) => void,
  setSelectedPrinterId: (printerId: string) => void,
  setConnectionState: (state: ThermalPrinterConnectionState) => void,
  setStatusMessage: (message: string) => void,
) {
  const rawPrinters = await listThermalPrinters(provider)
  const discoveredPrinters = applyDesktopQzFilter(provider, rawPrinters)
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
