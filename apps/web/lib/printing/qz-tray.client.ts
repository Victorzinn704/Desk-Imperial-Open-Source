'use client'

import type { ThermalPrinter } from './thermal-print.types'

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type QzTrayModule = typeof import('qz-tray')

const QZ_QUEUE_PREFIX = 'qz-queue:'
const QZ_SERIAL_PREFIX = 'qz-serial:'
export const QZ_HOST_STORAGE_KEY = 'desk-imperial.qz-host'
const LOCAL_QZ_HOSTS = ['localhost', '127.0.0.1', 'localhost.qz.io'] as const

const DEFAULT_SERIAL_OPTIONS = {
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: 'NONE',
  flowControl: 'NONE',
} as const

let qzModulePromise: Promise<QzTrayModule> | null = null
let securityConfigured = false
let qzActiveHost: string | null = null

export async function listQzTrayPrinters(): Promise<ThermalPrinter[]> {
  const qz = await ensureQzTrayConnection()
  const [defaultPrinterResult, printerResult, serialResult] = await Promise.allSettled([
    qz.printers.getDefault(),
    qz.printers.find(),
    qz.serial?.findPorts?.() ?? Promise.resolve([]),
  ])

  const defaultPrinterName = defaultPrinterResult.status === 'fulfilled' ? defaultPrinterResult.value : ''
  const printerNames = normalizeList(printerResult.status === 'fulfilled' ? printerResult.value : [])
  const serialPorts = normalizeList(serialResult.status === 'fulfilled' ? serialResult.value : [])
    .filter((port) => /^COM\d+$/i.test(port))
    .sort(compareComPorts)

  const serialPrinters = serialPorts.map((port, index) => ({
    id: toSerialId(port),
    name: `Porta serial ${port}`,
    provider: 'QZ_TRAY' as const,
    isDefault: index === 0,
    transport: 'serial' as const,
    target: port,
    details: 'Bluetooth/ESC-POS direto - recomendado para impressoras Bluetooth',
  }))

  const hasSerial = serialPrinters.length > 0

  const queuePrinters = printerNames.map((printerName) => ({
    id: toQueueId(printerName),
    name: printerName,
    provider: 'QZ_TRAY' as const,
    isDefault: !hasSerial && printerName === defaultPrinterName,
    transport: 'queue' as const,
    target: printerName,
    details: 'Fila do Windows (requer Spooler ativo)',
  }))

  // Serial ports listed first because Bluetooth thermal printers must use the serial path.
  return [...serialPrinters, ...queuePrinters]
}

export async function printRawQzTrayJob(printerId: string, rawDocument: string) {
  const qz = await ensureQzTrayConnection()
  const target = parsePrinterTarget(printerId)

  if (target.transport === 'serial') {
    if (!qz.serial) {
      throw new Error('QZ Tray nao expoe suporte serial nesta maquina.')
    }
    await printViaSerial(qz, target.target, rawDocument)
    return
  }

  const config = qz.configs.create(target.target, {
    encoding: 'CP437',
    copies: 1,
  })

  await qz.print(config, [{ type: 'raw', format: 'command', flavor: 'plain', data: rawDocument }])
}

async function printViaSerial(qz: QzTrayModule, port: string, rawDocument: string) {
  if (!qz.serial) {
    throw new Error('QZ Tray nao expoe suporte serial nesta maquina.')
  }

  await qz.serial.closePort(port).catch(() => undefined)

  try {
    await qz.serial.openPort(port, DEFAULT_SERIAL_OPTIONS)
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err)
    throw new Error(buildSerialOpenErrorMessage(port, cause))
  }

  try {
    await qz.serial.sendData(port, {
      type: 'HEX',
      data: escPosToHex(rawDocument),
    })
  } finally {
    await qz.serial.closePort(port).catch(() => undefined)
  }
}

function buildSerialOpenErrorMessage(port: string, cause: string) {
  return [
    `Nao foi possivel abrir ${port}.`,
    'Verifique: (1) QZ Tray rodando como Administrador,',
    '(2) impressora ligada e pareada,',
    '(3) tente a outra porta COM na lista.',
    `Detalhe: ${cause}`,
  ].join(' ')
}

function escPosToHex(raw: string): string {
  return Array.from(raw)
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
}

async function ensureQzTrayConnection() {
  const qz = await getQzTrayModule()
  const host = getQzHost()
  const hostCandidates = buildQzHostCandidates(host)

  if (qz.websocket.isActive() && !qzActiveHost) {
    qzActiveHost = host
  }

  if (qz.websocket.isActive() && qzActiveHost !== host) {
    await qz.websocket.disconnect().catch(() => undefined)
    qzActiveHost = null
  }

  if (!qz.websocket.isActive()) {
    let lastError: unknown = null

    for (const candidate of hostCandidates) {
      try {
        await qz.websocket.connect({
          host: candidate,
          retries: candidate === host ? 5 : 2,
          delay: 0.5,
        })
        qzActiveHost = candidate
        return qz
      } catch (error) {
        lastError = error
        await qz.websocket.disconnect().catch(() => undefined)
      }
    }

    throw new Error(buildQzConnectionErrorMessage(host, lastError))
  }

  return qz
}

export function getQzHost(): string {
  if (typeof window === 'undefined') {
    return 'localhost'
  }
  return normalizeQzHost(window.localStorage.getItem(QZ_HOST_STORAGE_KEY) ?? 'localhost')
}

export function setQzHost(host: string): string {
  const normalized = normalizeQzHost(host)

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(QZ_HOST_STORAGE_KEY, normalized)
  }

  return normalized
}

export function normalizeQzHost(host: string): string {
  const trimmed = host
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^wss?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/:(8181|8182|8282|8283|8383|8384|8484|8485)$/i, '')

  return trimmed || 'localhost'
}

async function getQzTrayModule() {
  if (!qzModulePromise) {
    qzModulePromise = import('qz-tray').then((module) => {
      const resolved = ('default' in module ? module.default : module) as QzTrayModule

      if (!securityConfigured) {
        configureUnsignedQzSecurity(resolved)
        securityConfigured = true
      }

      return resolved
    })
  }

  return qzModulePromise
}

function configureUnsignedQzSecurity(qz: QzTrayModule) {
  qz.security.setCertificatePromise((resolve) => resolve(null))
  qz.security.setSignaturePromise(() => (resolve) => resolve(''))
  qz.security.setSignatureAlgorithm('SHA256')
}

function parsePrinterTarget(printerId: string): Pick<ThermalPrinter, 'transport' | 'target'> {
  if (printerId.startsWith(QZ_QUEUE_PREFIX)) {
    return {
      transport: 'queue',
      target: printerId.slice(QZ_QUEUE_PREFIX.length),
    }
  }

  if (printerId.startsWith(QZ_SERIAL_PREFIX)) {
    return {
      transport: 'serial',
      target: printerId.slice(QZ_SERIAL_PREFIX.length),
    }
  }

  if (/^COM\d+$/i.test(printerId)) {
    return {
      transport: 'serial',
      target: printerId,
    }
  }

  return {
    transport: 'queue',
    target: printerId,
  }
}

function normalizeList(items: string[] | string) {
  if (Array.isArray(items)) {
    return items.filter(Boolean)
  }

  return items ? [items] : []
}

function toQueueId(printerName: string) {
  return `${QZ_QUEUE_PREFIX}${printerName}`
}

function toSerialId(port: string) {
  return `${QZ_SERIAL_PREFIX}${port.toUpperCase()}`
}

function compareComPorts(left: string, right: string) {
  const leftValue = Number(left.replace(/\D/g, ''))
  const rightValue = Number(right.replace(/\D/g, ''))
  return leftValue - rightValue
}

function buildQzHostCandidates(host: string) {
  const normalized = normalizeQzHost(host)
  if (LOCAL_QZ_HOSTS.includes(normalized as (typeof LOCAL_QZ_HOSTS)[number])) {
    return [normalized]
  }

  return [normalized, 'localhost']
}

function buildQzConnectionErrorMessage(host: string, error: unknown) {
  const detail = error instanceof Error ? error.message : String(error ?? 'desconhecido')

  if (!LOCAL_QZ_HOSTS.includes(host as (typeof LOCAL_QZ_HOSTS)[number])) {
    return [
      `Nao foi possivel conectar ao QZ Tray em ${host}.`,
      'Se voce estiver neste PC, volte o host para localhost.',
      `Se voce estiver no celular, confirme o IP do PC e aceite o certificado em https://${host}:8181.`,
      `Detalhe: ${detail}`,
    ].join(' ')
  }

  return [
    `Nao foi possivel conectar ao QZ Tray em ${host}.`,
    'Confirme se o QZ Tray esta aberto, autorizado e com a impressora pareada neste PC.',
    `Detalhe: ${detail}`,
  ].join(' ')
}
