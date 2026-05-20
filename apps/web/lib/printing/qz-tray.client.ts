'use client'

import type { ThermalPrinter } from './thermal-print.types'
import { configureQzSecurity } from './qz-tray-security.client'
import { buildQzConnectionErrorMessage, buildQzHostCandidates, getQzHost } from './qz-tray-host.utils'
export {
  discoverQzHostsOnLan,
  getQzHost,
  normalizeQzHost,
  probeQzTrayHost,
  QZ_HOST_STORAGE_KEY,
  setQzHost,
} from './qz-tray-host.utils'

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type QzTrayModule = typeof import('qz-tray')

const QZ_QUEUE_PREFIX = 'qz-queue:'
const QZ_SERIAL_PREFIX = 'qz-serial:'

// Porta serial preferida ao listar dispositivos do QZ Tray. A YYX0808 deste setup
// responde em COM3 (BTHENUM Outgoing). A env var permite trocar sem editar codigo.
const QZ_PREFERRED_SERIAL_PORT = (
  (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_QZ_PREFERRED_SERIAL_PORT : '') || 'COM3'
).toUpperCase()
export const QZ_PREFERRED_SERIAL_PRINTER_ID = `${QZ_SERIAL_PREFIX}${QZ_PREFERRED_SERIAL_PORT}`

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

  const hasPreferred = serialPorts.some((port) => port.toUpperCase() === QZ_PREFERRED_SERIAL_PORT)
  const serialPrinters = serialPorts.map((port, index) => {
    const isPreferred = port.toUpperCase() === QZ_PREFERRED_SERIAL_PORT
    return {
      id: toSerialId(port),
      name: `Porta serial ${port}`,
      provider: 'QZ_TRAY' as const,
      // COM preferida (default COM3) ganha. Se nao estiver na lista, o primeiro COM vira default.
      isDefault: hasPreferred ? isPreferred : index === 0,
      transport: 'serial' as const,
      target: port,
      details: isPreferred ? 'Porta preferida (impressora termica conectada)' : 'Bluetooth/ESC-POS direto',
    }
  })

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

  return [...serialPrinters, ...queuePrinters]
}

/**
 * Quando a conexao com QZ Tray falha (ex: websocket bloqueado), o discovery retorna lista vazia.
 * Esse helper devolve uma entrada sintetica para a porta serial preferida (default COM3) — assim
 * o usuario pode tentar imprimir manualmente; se na hora do print o websocket reconectar, funciona.
 */
export function getQzFallbackSerialPrinter(): ThermalPrinter {
  return {
    id: QZ_PREFERRED_SERIAL_PRINTER_ID,
    name: `Porta serial ${QZ_PREFERRED_SERIAL_PORT}`,
    provider: 'QZ_TRAY',
    isDefault: true,
    transport: 'serial',
    target: QZ_PREFERRED_SERIAL_PORT,
    details: 'QZ Tray offline — porta preferida (sera tentada no print)',
  }
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

  // Pre-close: ignore "port not open" rejections, but surface anything else (e.g. EBUSY) so caller knows.
  await qz.serial.closePort(port).catch((err) => {
    const message = err instanceof Error ? err.message : String(err)
    if (!/not open|nao aberta|not connected|not bound/i.test(message)) {
      console.warn(`[qz-tray] pre-close de ${port} falhou: ${message}`)
    }
  })

  try {
    await qz.serial.openPort(port, DEFAULT_SERIAL_OPTIONS)
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err)
    throw new Error(buildSerialOpenErrorMessage(port, cause))
  }

  let sendError: unknown = null
  let closeError: Error | null = null
  try {
    await qz.serial.sendData(port, {
      type: 'HEX',
      data: escPosToHex(rawDocument),
    })
  } catch (err) {
    sendError = err
  } finally {
    try {
      await qz.serial.closePort(port)
    } catch (closeErr) {
      const closeMessage = closeErr instanceof Error ? closeErr.message : String(closeErr)
      // If sending succeeded but closing failed, surface the close error so the next print attempt
      // can be diagnosed instead of silently failing on a stuck port.
      if (!sendError) {
        closeError = new Error(
          `Impressao enviada mas porta ${port} nao fechou: ${closeMessage}. Reinicie QZ Tray se persistir.`,
        )
      } else {
        console.warn(`[qz-tray] post-close de ${port} falhou apos erro de envio: ${closeMessage}`)
      }
    }
  }

  if (closeError) {
    throw closeError
  }

  if (sendError) {
    throw sendError instanceof Error ? sendError : new Error(`Falha ao enviar dados para ${port}: ${String(sendError)}`)
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

async function getQzTrayModule() {
  if (!qzModulePromise) {
    qzModulePromise = import('qz-tray').then((module) => {
      const resolved = ('default' in module ? module.default : module) as QzTrayModule

      if (!securityConfigured) {
        configureQzSecurity(resolved)
        securityConfigured = true
      }

      return resolved
    })
  }

  return qzModulePromise
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
