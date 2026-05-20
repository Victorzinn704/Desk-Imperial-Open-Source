'use client'

import type { ThermalPrinter } from './thermal-print.types'

export const WEB_SERIAL_PREFIX = 'web-serial:'
const WEB_SERIAL_BAUD_KEY = 'desk-imperial.web-serial.baud-rate'

type CachedSerialConnection = {
  port: SerialPort
  writer: WritableStreamDefaultWriter<Uint8Array>
}

let cachedSerial: CachedSerialConnection | null = null

export function isWebSerialSupported(): boolean {
  return (
    typeof navigator !== 'undefined' && typeof (navigator as Navigator & { serial?: unknown }).serial !== 'undefined'
  )
}

export async function requestWebSerialPrinter(): Promise<ThermalPrinter> {
  ensureSupported()
  const port = await navigator.serial.requestPort()
  await openPort(port)

  return toThermalPrinter(port)
}

export async function listWebSerialPrinters(): Promise<ThermalPrinter[]> {
  if (!isWebSerialSupported()) {
    return []
  }
  const ports = await navigator.serial.getPorts()
  return ports.map((port, index) => ({ ...toThermalPrinter(port), isDefault: index === 0 }))
}

export async function printRawWebSerialJob(_printerId: string, rawDocument: string) {
  ensureSupported()
  const writer = await ensureWriter()
  const bytes = new TextEncoder().encode(rawDocument)
  await writer.write(bytes)
}

export async function disconnectWebSerial() {
  if (!cachedSerial) {
    return
  }
  try {
    await cachedSerial.writer.close()
  } catch {
    // ignore
  }
  try {
    await cachedSerial.port.close()
  } catch {
    // ignore
  }
  cachedSerial = null
}

function getWebSerialBaudRate(): number {
  if (typeof window === 'undefined') {
    return 9600
  }
  const stored = window.localStorage.getItem(WEB_SERIAL_BAUD_KEY)
  const parsed = stored ? Number(stored) : Number.NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 9600
}

function ensureSupported() {
  if (!isWebSerialSupported()) {
    throw new Error('Web Serial nao esta disponivel neste navegador. Use Chrome/Edge no PC.')
  }
}

async function ensureWriter() {
  if (cachedSerial?.writer && cachedSerial.port.writable) {
    return cachedSerial.writer
  }
  const ports = await navigator.serial.getPorts()
  const port = ports[0]
  if (!port) {
    throw new Error('Nenhuma porta serial autorizada. Toque em "Conectar" para escolher uma.')
  }
  await openPort(port)
  if (!cachedSerial) {
    throw new Error('Falha ao preparar writer da porta serial.')
  }
  return cachedSerial.writer
}

async function openPort(port: SerialPort) {
  if (cachedSerial && cachedSerial.port !== port) {
    await disconnectWebSerial()
  }

  if (!port.writable) {
    await port.open({ baudRate: getWebSerialBaudRate() })
  }

  if (!port.writable) {
    throw new Error('Porta serial nao pode ser aberta para escrita.')
  }

  const writer = port.writable.getWriter()
  cachedSerial = { port, writer }
}

function toThermalPrinter(port: SerialPort): ThermalPrinter {
  const info = typeof port.getInfo === 'function' ? port.getInfo() : {}
  const vendor = info.usbVendorId ? `VID:${info.usbVendorId.toString(16).toUpperCase()}` : ''
  const product = info.usbProductId ? `PID:${info.usbProductId.toString(16).toUpperCase()}` : ''
  const idSuffix = [vendor, product].filter(Boolean).join('-') || 'serial'
  return {
    id: `${WEB_SERIAL_PREFIX}${idSuffix}`,
    name: vendor || product ? `Serial ${vendor} ${product}`.trim() : 'Impressora serial USB',
    provider: 'WEB_SERIAL',
    transport: 'serial',
    target: idSuffix,
    details: 'Conectada via Web Serial (sem QZ Tray).',
  }
}
