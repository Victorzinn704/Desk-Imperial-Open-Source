'use client'

import { useState } from 'react'
import {
  isProviderSupported,
  requestWebBluetoothPrinter,
  requestWebSerialPrinter,
  requestWebUsbPrinter,
  resolveThermalPrinterSelection,
  type ThermalPrintProvider,
} from '@/lib/printing'

export type RouteState = 'idle' | 'pairing' | 'testing' | 'ok' | 'error'

export type RouteController = {
  provider: ThermalPrintProvider
  state: RouteState
  message: string
  pair: () => Promise<void>
  test: () => Promise<void>
}

export const ALL_PROVIDERS: readonly ThermalPrintProvider[] = [
  'QZ_TRAY',
  'WEB_BLUETOOTH',
  'WEB_SERIAL',
  'WEB_USB',
] as const

export function useRouteController(provider: ThermalPrintProvider): RouteController {
  const supported = isProviderSupported(provider)
  const [state, setState] = useState<RouteState>('idle')
  const [message, setMessage] = useState('')

  async function pair() {
    if (!supported) {
      return
    }

    setState('pairing')
    setMessage(`Pareando ${getProviderLabel(provider)}...`)

    try {
      await pairProvider(provider)
      setState('ok')
      setMessage(`${getProviderLabel(provider)} pareada.`)
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : 'Falha no pareamento.')
    }
  }

  async function test() {
    if (!supported) {
      return
    }

    setState('testing')
    setMessage(`Testando ${getProviderLabel(provider)}...`)

    try {
      const selection = await resolveThermalPrinterSelection(provider)
      if (!selection.printerId) {
        throw new Error('Nenhuma impressora encontrada para esta rota.')
      }

      setState('ok')
      setMessage(`Pronto: ${selection.printer?.name ?? selection.printerId}`)
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : 'Falha ao testar a rota.')
    }
  }

  return { provider, state, message, pair, test }
}

export function getProviderLabel(provider: ThermalPrintProvider): string {
  switch (provider) {
    case 'QZ_TRAY':
      return 'QZ Tray (PC)'
    case 'WEB_BLUETOOTH':
      return 'Bluetooth direto (BLE)'
    case 'WEB_SERIAL':
      return 'Serial USB direto'
    case 'WEB_USB':
      return 'USB direto'
    case 'PRINTNODE':
      return 'PrintNode'
    default:
      return provider
  }
}

export function getProviderShortLabel(provider: ThermalPrintProvider): string {
  switch (provider) {
    case 'QZ_TRAY':
      return 'QZ'
    case 'WEB_BLUETOOTH':
      return 'BT'
    case 'WEB_SERIAL':
      return 'Serial'
    case 'WEB_USB':
      return 'USB'
    case 'PRINTNODE':
      return 'PrintNode'
    default:
      return provider
  }
}

export function getProviderHint(provider: ThermalPrintProvider): string {
  switch (provider) {
    case 'QZ_TRAY':
      return 'Servico instalado no PC. Funciona com fila do Windows e portas COM.'
    case 'WEB_BLUETOOTH':
      return 'Conecta por Web Bluetooth BLE. Se a YYX0808 nao aparecer no Android, ela provavelmente usa Bluetooth classico/SPP; nesse caso use QZ Tray no PC ou rota serial.'
    case 'WEB_SERIAL':
      return 'Impressoras USB-serial (Bematech, Elgin, Epson) sem QZ.'
    case 'WEB_USB':
      return 'Impressoras USB classicas (classe 7) sem QZ.'
    default:
      return ''
  }
}

export function getUnsupportedReason(provider: ThermalPrintProvider): string {
  switch (provider) {
    case 'WEB_BLUETOOTH':
      return 'Exige HTTPS/PWA e Chrome/Edge com Web Bluetooth. iOS Safari nao suporta, e impressoras Bluetooth classico/SPP nao aparecem no seletor BLE.'
    case 'WEB_SERIAL':
      return 'Disponivel em Chrome/Edge no PC. Mobile e iOS nao suportam.'
    case 'WEB_USB':
      return 'Disponivel em Chrome/Edge no PC. Mobile e iOS nao suportam.'
    default:
      return 'Indisponivel neste navegador.'
  }
}

export function getMessageToneClass(state: RouteState) {
  if (state === 'ok') {
    return 'text-[#36f57c]'
  }

  if (state === 'error') {
    return 'text-[#fca5a5]'
  }

  return 'text-[var(--text-soft)]'
}

async function pairProvider(provider: ThermalPrintProvider) {
  switch (provider) {
    case 'WEB_BLUETOOTH':
      await requestWebBluetoothPrinter()
      return
    case 'WEB_SERIAL':
      await requestWebSerialPrinter()
      return
    case 'WEB_USB':
      await requestWebUsbPrinter()
      return
    default:
      return
  }
}
