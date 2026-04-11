'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import type { RealtimeStatus } from '@/components/operations/use-operations-realtime'

interface ConnectionBannerProps {
  status: RealtimeStatus
}

/**
 * Banner que aparece quando a conexão WebSocket cai por >5 segundos.
 * Mostra alerta de "dados podem estar defasados" com animação de slide.
 * Quando reconecta, mostra "Reconectado!" por 2 segundos antes de sumir.
 */
export function ConnectionBanner({ status }: ConnectionBannerProps) {
  const [showBanner, setShowBanner] = useState(false)
  const [wasDisconnected, setWasDisconnected] = useState(false)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    if (status === 'disconnected') {
      // Aguarda 5 segundos antes de mostrar o banner
      const timer = setTimeout(() => {
        setShowBanner(true)
        setWasDisconnected(true)
      }, 5_000)
      return () => clearTimeout(timer)
    }

    if (status === 'connected' && wasDisconnected) {
      // Reconectou — mostra mensagem de sucesso brevemente
      setShowBanner(false) // eslint-disable-line react-hooks/set-state-in-effect
      setShowReconnected(true)
      setWasDisconnected(false)
      const timer = setTimeout(() => setShowReconnected(false), 2_500)
      return () => clearTimeout(timer)
    }

    setShowBanner(false)
  }, [status, wasDisconnected])

  if (showReconnected) {
    return (
      <div
        className="flex items-center justify-center gap-2 bg-[rgba(52,211,153,0.12)] px-4 py-2.5 text-sm font-semibold text-[#34d399] border-b border-[rgba(52,211,153,0.2)]"
        style={{ animation: 'slideDown 0.3s ease-out' }}
      >
        <Wifi className="size-4" />
        Reconectado!
      </div>
    )
  }

  if (!showBanner) {return null}

  return (
    <div
      className="flex items-center justify-center gap-2 bg-[rgba(248,113,113,0.1)] px-4 py-2.5 text-sm font-semibold text-[#fca5a5] border-b border-[rgba(248,113,113,0.2)]"
      style={{ animation: 'slideDown 0.3s ease-out' }}
    >
      <WifiOff className="size-4 animate-pulse" />
      Sem conexão — os dados podem estar defasados
    </div>
  )
}
