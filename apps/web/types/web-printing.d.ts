// Minimal ambient typings for Web Bluetooth, Web Serial and Web USB.
// Avoids pulling in @types/web-bluetooth / @types/w3c-web-serial / @types/w3c-web-usb just for printing.
// Each section only declares what apps/web/lib/printing/* actually consumes.

// ---------- Web Bluetooth ----------
type BluetoothServiceUUID = number | string

interface BluetoothRemoteGATTCharacteristicProperties {
  readonly write: boolean
  readonly writeWithoutResponse: boolean
  readonly read: boolean
  readonly notify: boolean
  readonly indicate: boolean
}

interface BluetoothRemoteGATTCharacteristic {
  readonly uuid: string
  readonly properties: BluetoothRemoteGATTCharacteristicProperties
  writeValueWithResponse(value: BufferSource): Promise<void>
  writeValueWithoutResponse(value: BufferSource): Promise<void>
}

interface BluetoothRemoteGATTService {
  readonly uuid: string
  getCharacteristics(uuid?: BluetoothServiceUUID): Promise<BluetoothRemoteGATTCharacteristic[]>
}

interface BluetoothRemoteGATTServer {
  readonly connected: boolean
  connect(): Promise<BluetoothRemoteGATTServer>
  disconnect(): void
  getPrimaryServices(uuid?: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService[]>
}

interface BluetoothDevice extends EventTarget {
  readonly id: string
  readonly name?: string
  readonly gatt?: BluetoothRemoteGATTServer
}

interface BluetoothLEScanFilter {
  services?: BluetoothServiceUUID[]
  name?: string
  namePrefix?: string
}

interface RequestDeviceOptions {
  filters?: BluetoothLEScanFilter[]
  optionalServices?: BluetoothServiceUUID[]
  acceptAllDevices?: boolean
}

interface Bluetooth extends EventTarget {
  requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>
  getDevices?(): Promise<BluetoothDevice[]>
}

interface Navigator {
  readonly bluetooth: Bluetooth
}

// ---------- Web Serial ----------
interface SerialPortInfo {
  usbVendorId?: number
  usbProductId?: number
}

interface SerialOptions {
  baudRate: number
  dataBits?: 7 | 8
  stopBits?: 1 | 2
  parity?: 'none' | 'even' | 'odd'
  flowControl?: 'none' | 'hardware'
}

interface SerialPort extends EventTarget {
  readonly readable: ReadableStream<Uint8Array> | null
  readonly writable: WritableStream<Uint8Array> | null
  open(options: SerialOptions): Promise<void>
  close(): Promise<void>
  getInfo(): SerialPortInfo
}

interface Serial extends EventTarget {
  requestPort(options?: { filters?: { usbVendorId?: number; usbProductId?: number }[] }): Promise<SerialPort>
  getPorts(): Promise<SerialPort[]>
}

interface Navigator {
  readonly serial: Serial
}

// ---------- Web USB ----------
interface USBEndpoint {
  readonly endpointNumber: number
  readonly direction: 'in' | 'out'
  readonly type: 'bulk' | 'interrupt' | 'isochronous'
}

interface USBAlternateInterface {
  readonly alternateSetting: number
  readonly interfaceClass: number
  readonly endpoints: USBEndpoint[]
}

interface USBInterface {
  readonly interfaceNumber: number
  readonly alternates: USBAlternateInterface[]
}

interface USBConfiguration {
  readonly configurationValue: number
  readonly interfaces: USBInterface[]
}

interface USBOutTransferResult {
  readonly bytesWritten: number
  readonly status: 'ok' | 'stall' | 'babble'
}

interface USBDevice {
  readonly vendorId: number
  readonly productId: number
  readonly productName?: string
  readonly opened: boolean
  readonly configuration: USBConfiguration | null
  open(): Promise<void>
  close(): Promise<void>
  selectConfiguration(configurationValue: number): Promise<void>
  claimInterface(interfaceNumber: number): Promise<void>
  releaseInterface(interfaceNumber: number): Promise<void>
  transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>
}

interface USBDeviceFilter {
  classCode?: number
  vendorId?: number
  productId?: number
}

interface USBDeviceRequestOptions {
  filters: USBDeviceFilter[]
}

interface USB extends EventTarget {
  requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>
  getDevices(): Promise<USBDevice[]>
}

interface Navigator {
  readonly usb: USB
}
