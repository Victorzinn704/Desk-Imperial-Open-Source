'use client'

import type { ThermalPrinter } from './thermal-print.types'

export const WEB_USB_PREFIX = 'web-usb:'
const PRINTER_CLASS_CODE = 0x07

type CachedUsbConnection = {
  device: USBDevice
  endpoint: number
  interfaceNumber: number
}

let cachedUsb: CachedUsbConnection | null = null

export function isWebUsbSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof (navigator as Navigator & { usb?: unknown }).usb !== 'undefined'
}

export async function requestWebUsbPrinter(): Promise<ThermalPrinter> {
  ensureSupported()
  const device = await navigator.usb.requestDevice({ filters: [{ classCode: PRINTER_CLASS_CODE }] })
  await connectDevice(device)
  return toThermalPrinter(device)
}

export async function listWebUsbPrinters(): Promise<ThermalPrinter[]> {
  if (!isWebUsbSupported()) {
    return []
  }
  const devices = await navigator.usb.getDevices()
  return devices
    .filter((device) =>
      device.configuration?.interfaces.some((i) => i.alternates.some((a) => a.interfaceClass === PRINTER_CLASS_CODE)),
    )
    .map((device, index) => ({ ...toThermalPrinter(device), isDefault: index === 0 }))
}

export async function printRawWebUsbJob(_printerId: string, rawDocument: string) {
  ensureSupported()
  const connection = await ensureConnection()
  const bytes = new TextEncoder().encode(rawDocument)
  await connection.device.transferOut(connection.endpoint, bytes)
}

function ensureSupported() {
  if (!isWebUsbSupported()) {
    throw new Error('Web USB nao esta disponivel neste navegador. Use Chrome/Edge no PC.')
  }
}

async function ensureConnection(): Promise<CachedUsbConnection> {
  if (cachedUsb?.device.opened) {
    return cachedUsb
  }
  const devices = await navigator.usb.getDevices()
  const device = devices[0]
  if (!device) {
    throw new Error('Nenhum dispositivo USB autorizado. Toque em "Conectar" para escolher uma impressora.')
  }
  await connectDevice(device)
  if (!cachedUsb) {
    throw new Error('Falha ao abrir dispositivo USB.')
  }
  return cachedUsb
}

async function connectDevice(device: USBDevice) {
  if (!device.opened) {
    await device.open()
  }
  if (device.configuration === null) {
    await device.selectConfiguration(1)
  }

  const printerInterface = resolvePrinterInterface(device)

  await device.claimInterface(printerInterface.interfaceNumber)

  const outEndpoint = resolvePrinterOutEndpoint(printerInterface)

  cachedUsb = {
    device,
    endpoint: outEndpoint.endpointNumber,
    interfaceNumber: printerInterface.interfaceNumber,
  }
}

function resolvePrinterInterface(device: USBDevice) {
  const printerInterface = device.configuration?.interfaces.find((usbInterface) =>
    usbInterface.alternates.some((alternate) => alternate.interfaceClass === PRINTER_CLASS_CODE),
  )

  if (!printerInterface) {
    throw new Error('Nenhuma interface de impressora detectada neste dispositivo USB.')
  }

  return printerInterface
}

function resolvePrinterOutEndpoint(printerInterface: USBInterface) {
  const printerAlternate = printerInterface.alternates.find(
    (alternate) => alternate.interfaceClass === PRINTER_CLASS_CODE,
  )
  const outEndpoint = printerAlternate?.endpoints.find((endpoint) => endpoint.direction === 'out')

  if (!outEndpoint) {
    throw new Error('Nenhum endpoint de saida (OUT) encontrado na impressora USB.')
  }

  return outEndpoint
}

function toThermalPrinter(device: USBDevice): ThermalPrinter {
  const vendor = device.vendorId.toString(16).toUpperCase().padStart(4, '0')
  const product = device.productId.toString(16).toUpperCase().padStart(4, '0')
  const id = `${WEB_USB_PREFIX}${vendor}-${product}`
  const name = device.productName || `USB ${vendor}:${product}`
  return {
    id,
    name,
    provider: 'WEB_USB',
    transport: 'usb',
    target: `${vendor}:${product}`,
    details: 'Conectada via Web USB (sem QZ Tray).',
  }
}
