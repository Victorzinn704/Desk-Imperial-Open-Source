export type ThermalPrintProvider = 'QZ_TRAY' | 'PRINTNODE'

export type ThermalPrinterConnectionState = 'idle' | 'discovering' | 'connected' | 'printing' | 'error'

export type ThermalPrinterTransport = 'queue' | 'serial'

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

export type PrintableComanda = {
  id: string
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
}
