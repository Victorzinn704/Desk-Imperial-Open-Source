'use client'

import type { ThermalPrinter } from './thermal-print.types'

// Generic ESC/POS-over-BLE service UUIDs used by YYX0808, MTP-II, GoojPRT,
// most cheap Bluetooth thermal printers. We try in order until one connects.
const SUPPORTED_SERVICE_UUIDS: readonly string[] = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
]

const WRITE_CHARACTERISTIC_HINTS: readonly string[] = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  '0000ff02-0000-1000-8000-00805f9b34fb',
  '0000ffe1-0000-1000-8000-00805f9b34fb',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
]

export const WEB_BLUETOOTH_PREFIX = 'web-bt:'
const WEB_BT_DEVICE_NAME_KEY = 'desk-imperial.web-bt.device-name'
const WEB_BT_DEVICE_ID_KEY = 'desk-imperial.web-bt.device-id'

type CachedConnection = {
  device: BluetoothDevice
  characteristic: BluetoothRemoteGATTCharacteristic
}

let cachedConnection: CachedConnection | null = null

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.bluetooth?.requestDevice === 'function'
}

export async function requestWebBluetoothPrinter(): Promise<ThermalPrinter> {
  ensureSupported()

  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: SUPPORTED_SERVICE_UUIDS as unknown as BluetoothServiceUUID[],
  })

  const characteristic = await connectAndDiscoverCharacteristic(device)
  cachedConnection = { device, characteristic }
  rememberDevice(device)
  attachAutoReconnect(device)

  return toThermalPrinter(device)
}

export async function listWebBluetoothPrinters(): Promise<ThermalPrinter[]> {
  if (!isWebBluetoothSupported()) {
    return []
  }

  if (cachedConnection?.device) {
    return [toThermalPrinter(cachedConnection.device)]
  }

  const remembered = readRememberedDevice()
  if (remembered) {
    return [
      {
        id: `${WEB_BLUETOOTH_PREFIX}${remembered.id}`,
        name: remembered.name,
        provider: 'WEB_BLUETOOTH',
        isDefault: true,
        transport: 'bluetooth',
        target: remembered.id,
        details: 'Toque em "Atualizar" para reconectar via Bluetooth.',
      },
    ]
  }

  return []
}

export async function printRawWebBluetoothJob(_printerId: string, rawDocument: string) {
  ensureSupported()

  const characteristic = await ensureCharacteristic()
  const bytes = new TextEncoder().encode(rawDocument)
  await writeInChunks(characteristic, bytes)
}

function ensureSupported() {
  if (!isWebBluetoothSupported()) {
    throw new Error('Web Bluetooth nao esta disponivel neste navegador. Use Chrome/Edge no PC ou Chrome no Android.')
  }
}

async function ensureCharacteristic(): Promise<BluetoothRemoteGATTCharacteristic> {
  if (cachedConnection?.device.gatt?.connected) {
    return cachedConnection.characteristic
  }

  if (cachedConnection?.device) {
    const characteristic = await connectAndDiscoverCharacteristic(cachedConnection.device)
    cachedConnection = { device: cachedConnection.device, characteristic }
    return characteristic
  }

  throw new Error('Nenhuma impressora Bluetooth pareada. Toque em "Conectar" para escolher uma.')
}

async function connectAndDiscoverCharacteristic(device: BluetoothDevice): Promise<BluetoothRemoteGATTCharacteristic> {
  if (!device.gatt) {
    throw new Error('Esta impressora Bluetooth nao expoe um servidor GATT acessivel.')
  }

  const server = device.gatt.connected ? device.gatt : await device.gatt.connect()
  const services = await server.getPrimaryServices()

  for (const service of services) {
    if (!SUPPORTED_SERVICE_UUIDS.includes(service.uuid)) {
      continue
    }

    const characteristics = await loadServiceCharacteristics(service)
    const preferredCharacteristic = resolvePreferredWriteCharacteristic(characteristics)
    if (preferredCharacteristic) {
      return preferredCharacteristic
    }
  }

  throw new Error('Nenhuma caracteristica de escrita ESC/POS encontrada nesta impressora.')
}

async function loadServiceCharacteristics(service: BluetoothRemoteGATTService) {
  return service.getCharacteristics().catch(() => [] as BluetoothRemoteGATTCharacteristic[])
}

function resolvePreferredWriteCharacteristic(characteristics: BluetoothRemoteGATTCharacteristic[]) {
  for (const [index, candidate] of characteristics.entries()) {
    if (!isWritable(candidate)) {
      continue
    }

    if (WRITE_CHARACTERISTIC_HINTS.includes(candidate.uuid) || index === characteristics.length - 1) {
      return candidate
    }
  }

  return characteristics.find(isWritable)
}

function isWritable(c: BluetoothRemoteGATTCharacteristic) {
  return Boolean(c.properties.write || c.properties.writeWithoutResponse)
}

async function writeInChunks(characteristic: BluetoothRemoteGATTCharacteristic, bytes: Uint8Array) {
  // BLE MTU is typically 20-512 bytes. 180 is safe across cheap printers.
  const chunkSize = 180
  const useWithoutResponse = characteristic.properties.writeWithoutResponse

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const slice = bytes.slice(offset, offset + chunkSize)
    if (useWithoutResponse) {
      await characteristic.writeValueWithoutResponse(slice)
    } else {
      await characteristic.writeValueWithResponse(slice)
    }
  }
}

function attachAutoReconnect(device: BluetoothDevice) {
  device.addEventListener('gattserverdisconnected', () => {
    if (cachedConnection?.device === device) {
      cachedConnection = null
    }
  })
}

function rememberDevice(device: BluetoothDevice) {
  if (typeof window === 'undefined') {
    return
  }
  if (device.id) {
    window.localStorage.setItem(WEB_BT_DEVICE_ID_KEY, device.id)
  }
  if (device.name) {
    window.localStorage.setItem(WEB_BT_DEVICE_NAME_KEY, device.name)
  }
}

function readRememberedDevice(): { id: string; name: string } | null {
  if (typeof window === 'undefined') {
    return null
  }
  const id = window.localStorage.getItem(WEB_BT_DEVICE_ID_KEY)
  const name = window.localStorage.getItem(WEB_BT_DEVICE_NAME_KEY)
  if (!id) {
    return null
  }
  return { id, name: name ?? 'Impressora Bluetooth' }
}

function toThermalPrinter(device: BluetoothDevice): ThermalPrinter {
  return {
    id: `${WEB_BLUETOOTH_PREFIX}${device.id ?? device.name ?? 'unknown'}`,
    name: device.name ?? 'Impressora Bluetooth',
    provider: 'WEB_BLUETOOTH',
    isDefault: true,
    transport: 'bluetooth',
    target: device.id ?? device.name ?? 'unknown',
    details: 'Conectada direto pelo navegador (sem QZ Tray).',
  }
}
