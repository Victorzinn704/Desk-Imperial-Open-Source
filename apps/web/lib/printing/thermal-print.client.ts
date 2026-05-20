'use client'

import { buildThermalComandaTicket } from './comanda-thermal'
import { listQzTrayPrinters, printRawQzTrayJob } from './qz-tray.client'
import {
  markThermalPrinterVerified,
  resolvePreferredPrinterId,
  setPreferredThermalPrinter,
} from './thermal-print-preference.utils'
import { isWebBluetoothSupported, listWebBluetoothPrinters, printRawWebBluetoothJob } from './web-bluetooth.client'
import { isWebSerialSupported, listWebSerialPrinters, printRawWebSerialJob } from './web-serial.client'
import { isWebUsbSupported, listWebUsbPrinters, printRawWebUsbJob } from './web-usb.client'
import {
  type PrintableComanda,
  PROVIDER_FALLBACK_ORDER,
  type ThermalPrinter,
  type ThermalPrintProvider,
} from './thermal-print.types'

export {
  getPreferredThermalPrinter,
  markThermalPrinterVerified,
  resolvePreferredPrinterId,
  setPreferredThermalPrinter,
} from './thermal-print-preference.utils'

export const DEFAULT_THERMAL_PROVIDER: ThermalPrintProvider = 'QZ_TRAY'
const PROVIDER_STORAGE_KEY = 'desk-imperial.thermal-provider'

export async function listThermalPrinters(provider: ThermalPrintProvider) {
  switch (provider) {
    case 'QZ_TRAY':
      return listQzTrayPrinters()
    case 'WEB_BLUETOOTH':
      return listWebBluetoothPrinters()
    case 'WEB_SERIAL':
      return listWebSerialPrinters()
    case 'WEB_USB':
      return listWebUsbPrinters()
    case 'PRINTNODE':
      throw new Error('PrintNode ainda nao foi configurado. QZ Tray e o fluxo principal.')
    default:
      return exhaustiveProvider(provider)
  }
}

export async function printThermalComanda(input: {
  provider: ThermalPrintProvider
  printerId: string
  comanda: PrintableComanda
}) {
  const rawDocument = buildThermalComandaTicket(input.comanda)
  await printRawByProvider(input.provider, input.printerId, rawDocument)
  markThermalPrinterVerified(input.provider, input.printerId)
}

export async function printThermalComandaWithFallback(input: {
  comanda: PrintableComanda
  preferredProvider: ThermalPrintProvider
  preferredPrinterId: string
  enabledProviders?: readonly ThermalPrintProvider[]
}): Promise<{ provider: ThermalPrintProvider; printerId: string }> {
  const rawDocument = buildThermalComandaTicket(input.comanda)
  const enabled = input.enabledProviders ?? listSupportedProviders()
  const order = orderProvidersForFallback(input.preferredProvider, enabled)

  if (order.length === 0) {
    throw new AggregateThermalPrintError(
      'Nenhuma rota de impressao habilitada neste navegador. Conecte uma impressora em "Configuracoes de impressao".',
      [],
    )
  }

  const attempts: { provider: ThermalPrintProvider; error: unknown }[] = []
  let providersWithoutPrinter = 0

  for (const provider of order) {
    let printerId: string
    try {
      printerId = provider === input.preferredProvider ? input.preferredPrinterId : await resolvePrinterIdFor(provider)
    } catch (error) {
      attempts.push({ provider, error: new Error(`Falha ao listar impressoras: ${describeError(error)}`) })
      continue
    }

    if (!printerId) {
      providersWithoutPrinter += 1
      attempts.push({
        provider,
        error: new Error('Nenhuma impressora pareada para esta rota.'),
      })
      continue
    }

    try {
      await printRawByProvider(provider, printerId, rawDocument)
      markThermalPrinterVerified(provider, printerId)
      return { provider, printerId }
    } catch (error) {
      attempts.push({ provider, error })
    }
  }

  const allMissing = providersWithoutPrinter === order.length
  const headline = allMissing
    ? 'Nenhuma impressora pareada em nenhuma rota habilitada. Abra "Configuracoes de impressao" e conecte uma.'
    : 'Todas as rotas de impressao falharam. Verifique impressora ligada/pareada e tente de novo.'
  throw new AggregateThermalPrintError(headline, attempts)
}

function describeError(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }
  return String(error ?? 'desconhecido')
}

export async function resolveThermalPrinterSelection(provider: ThermalPrintProvider) {
  const printers = await listThermalPrinters(provider)
  const printerId = resolvePreferredPrinterId(provider, printers)

  if (printerId) {
    setPreferredThermalPrinter(provider, printerId)
  }

  return {
    printer: printers.find((printer) => printer.id === printerId),
    printerId,
    printers,
  }
}

export function getPreferredThermalProvider(): ThermalPrintProvider {
  if (typeof window === 'undefined') {
    return DEFAULT_THERMAL_PROVIDER
  }

  const stored = window.localStorage.getItem(PROVIDER_STORAGE_KEY) as ThermalPrintProvider | null
  if (stored && isKnownProvider(stored)) {
    return stored
  }
  return DEFAULT_THERMAL_PROVIDER
}

export function setPreferredThermalProvider(provider: ThermalPrintProvider) {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(PROVIDER_STORAGE_KEY, provider)
}

export function listSupportedProviders(): ThermalPrintProvider[] {
  const providers: ThermalPrintProvider[] = ['QZ_TRAY']
  if (isWebBluetoothSupported()) {
    providers.push('WEB_BLUETOOTH')
  }
  if (isWebSerialSupported()) {
    providers.push('WEB_SERIAL')
  }
  if (isWebUsbSupported()) {
    providers.push('WEB_USB')
  }
  return providers
}

export function isProviderSupported(provider: ThermalPrintProvider): boolean {
  switch (provider) {
    case 'QZ_TRAY':
      return true
    case 'WEB_BLUETOOTH':
      return isWebBluetoothSupported()
    case 'WEB_SERIAL':
      return isWebSerialSupported()
    case 'WEB_USB':
      return isWebUsbSupported()
    case 'PRINTNODE':
      return false
    default:
      return false
  }
}

export class AggregateThermalPrintError extends Error {
  readonly attempts: ReadonlyArray<{ provider: ThermalPrintProvider; error: unknown }>

  constructor(message: string, attempts: ReadonlyArray<{ provider: ThermalPrintProvider; error: unknown }>) {
    const detail = attempts
      .map(({ provider, error }) => `${provider}: ${error instanceof Error ? error.message : String(error)}`)
      .join(' | ')
    super(`${message}${detail ? ` (${detail})` : ''}`)
    this.name = 'AggregateThermalPrintError'
    this.attempts = attempts
  }
}

async function printRawByProvider(provider: ThermalPrintProvider, printerId: string, rawDocument: string) {
  switch (provider) {
    case 'QZ_TRAY':
      await printRawQzTrayJob(printerId, rawDocument)
      return
    case 'WEB_BLUETOOTH':
      await printRawWebBluetoothJob(printerId, rawDocument)
      return
    case 'WEB_SERIAL':
      await printRawWebSerialJob(printerId, rawDocument)
      return
    case 'WEB_USB':
      await printRawWebUsbJob(printerId, rawDocument)
      return
    case 'PRINTNODE':
      throw new Error('PrintNode ainda nao foi configurado. QZ Tray e o fluxo principal.')
    default:
      exhaustiveProvider(provider)
  }
}

async function resolvePrinterIdFor(provider: ThermalPrintProvider) {
  if (!isProviderSupported(provider)) {
    return ''
  }

  const printers = await listThermalPrinters(provider).catch(() => [] as ThermalPrinter[])
  return resolvePreferredPrinterId(provider, printers)
}

function orderProvidersForFallback(
  preferred: ThermalPrintProvider,
  enabled: readonly ThermalPrintProvider[],
): ThermalPrintProvider[] {
  const enabledSet = new Set(enabled.filter(isProviderSupported))
  const ordered: ThermalPrintProvider[] = []
  if (enabledSet.has(preferred)) {
    ordered.push(preferred)
  }
  for (const provider of PROVIDER_FALLBACK_ORDER) {
    if (provider !== preferred && enabledSet.has(provider)) {
      ordered.push(provider)
    }
  }
  return ordered
}

function isKnownProvider(value: string): value is ThermalPrintProvider {
  return (
    value === 'QZ_TRAY' ||
    value === 'WEB_BLUETOOTH' ||
    value === 'WEB_SERIAL' ||
    value === 'WEB_USB' ||
    value === 'PRINTNODE'
  )
}

function exhaustiveProvider(provider: never): never {
  throw new Error(`Provider de impressao nao suportado: ${String(provider)}`)
}
