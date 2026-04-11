'use client'

import { buildThermalComandaTicket } from './comanda-thermal'
import { listQzTrayPrinters, printRawQzTrayJob } from './qz-tray.client'
import type { PrintableComanda, ThermalPrinter, ThermalPrintProvider } from './thermal-print.types'

export const DEFAULT_THERMAL_PROVIDER: ThermalPrintProvider = 'QZ_TRAY'

export async function listThermalPrinters(provider: ThermalPrintProvider) {
  switch (provider) {
    case 'QZ_TRAY':
      return listQzTrayPrinters()
    case 'PRINTNODE':
      throw new Error('PrintNode ainda nao foi configurado nesta etapa. QZ Tray e o fluxo principal.')
    default:
      return exhaustiveProvider(provider)
  }
}

export async function printThermalComanda(input: {
  provider: ThermalPrintProvider
  printerName: string
  comanda: PrintableComanda
}) {
  const rawDocument = buildThermalComandaTicket(input.comanda)

  switch (input.provider) {
    case 'QZ_TRAY':
      await printRawQzTrayJob(input.printerName, rawDocument)
      return
    case 'PRINTNODE':
      throw new Error('PrintNode ainda nao foi configurado nesta etapa. QZ Tray e o fluxo principal.')
    default:
      exhaustiveProvider(input.provider)
  }
}

export function getPreferredThermalProvider() {
  if (typeof window === 'undefined') {
    return DEFAULT_THERMAL_PROVIDER
  }

  const stored = window.localStorage.getItem('desk-imperial.thermal-provider')
  return stored === 'PRINTNODE' ? 'PRINTNODE' : DEFAULT_THERMAL_PROVIDER
}

export function getPreferredThermalPrinter(provider: ThermalPrintProvider) {
  if (typeof window === 'undefined') {
    return null
  }

  return globalThis.localStorage.getItem(`desk-imperial.thermal-printer.${provider}`)
}

export function setPreferredThermalPrinter(provider: ThermalPrintProvider, printerName: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(`desk-imperial.thermal-printer.${provider}`, printerName)
}

export function resolvePreferredPrinterName(provider: ThermalPrintProvider, printers: ThermalPrinter[]) {
  const storedPrinter = getPreferredThermalPrinter(provider)
  const storedMatch = printers.find((printer) => printer.name === storedPrinter)
  if (storedMatch) {
    return storedMatch.name
  }

  return printers.find((printer) => printer.isDefault)?.name ?? printers[0]?.name ?? ''
}

function exhaustiveProvider(provider: never): never {
  throw new Error(`Provider de impressao nao suportado: ${String(provider)}`)
}
