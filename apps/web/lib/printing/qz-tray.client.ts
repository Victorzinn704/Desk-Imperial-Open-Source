'use client'

import type { ThermalPrinter } from './thermal-print.types'

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type QzTrayModule = typeof import('qz-tray')

let qzModulePromise: Promise<QzTrayModule> | null = null
let securityConfigured = false

export async function listQzTrayPrinters(): Promise<ThermalPrinter[]> {
  const qz = await ensureQzTrayConnection()
  const [defaultPrinterName, foundPrinters] = await Promise.all([
    qz.printers.getDefault().catch(() => ''),
    qz.printers.find(),
  ])

  const printerNames = normalizePrinterList(foundPrinters)
  return printerNames.map((printerName) => ({
    id: printerName,
    name: printerName,
    provider: 'QZ_TRAY',
    isDefault: printerName === defaultPrinterName,
  }))
}

export async function printRawQzTrayJob(printerName: string, rawDocument: string) {
  const qz = await ensureQzTrayConnection()
  const config = qz.configs.create(printerName, {
    encoding: 'CP437',
    copies: 1,
  })

  await qz.print(config, [rawDocument])
}

async function ensureQzTrayConnection() {
  const qz = await getQzTrayModule()

  if (!qz.websocket.isActive()) {
    await qz.websocket.connect({
      retries: 1,
      delay: 0,
    })
  }

  return qz
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

function normalizePrinterList(printers: string[] | string) {
  if (Array.isArray(printers)) {
    return printers
  }

  return printers ? [printers] : []
}
