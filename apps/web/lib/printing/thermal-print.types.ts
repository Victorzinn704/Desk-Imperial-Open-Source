export type ThermalPrintProvider = 'QZ_TRAY' | 'WEB_BLUETOOTH' | 'WEB_SERIAL' | 'WEB_USB' | 'PRINTNODE'

export type ThermalPrinterConnectionState = 'idle' | 'discovering' | 'connected' | 'printing' | 'error'

export type ThermalPrinterTransport = 'queue' | 'serial' | 'bluetooth' | 'usb'

export type ThermalPrinter = {
  id: string
  name: string
  provider: ThermalPrintProvider
  isDefault?: boolean
  transport: ThermalPrinterTransport
  target: string
  details?: string
}

export type PrintableComandaItem = {
  name: string
  quantity: number
  unitPrice: number
  note?: string
}

export type PrintableComandaPayment = {
  method: string
  amount: number
  note?: string
  paidAtIso?: string
}

export type PrintableComanda = {
  id: string
  businessDocument?: string
  businessName?: string
  closedAtIso?: string
  tableLabel?: string
  customerName?: string
  customerDocument?: string
  items: PrintableComandaItem[]
  discountPercent: number
  additionalPercent: number
  openedAtIso: string
  subtotalAmount: number
  totalAmount: number
  currency: string
  operatorLabel?: string
  payments?: PrintableComandaPayment[]
}

export const PROVIDER_FALLBACK_ORDER: readonly ThermalPrintProvider[] = [
  'WEB_BLUETOOTH',
  'WEB_SERIAL',
  'QZ_TRAY',
  'WEB_USB',
] as const
