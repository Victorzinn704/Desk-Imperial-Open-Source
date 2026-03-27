'use client'

import { RefreshCw } from 'lucide-react'

interface PullIndicatorProps {
  style: React.CSSProperties
  isRefreshing: boolean
  progress: number
}

/**
 * Indicador visual de pull-to-refresh.
 * Mostra ícone de refresh com rotação baseada no progresso.
 */
export function PullIndicator({ style, isRefreshing, progress }: PullIndicatorProps) {
  return (
    <div style={style}>
      <div
        className="flex size-9 items-center justify-center rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(15,15,15,0.9)] shadow-lg backdrop-blur-md"
      >
        <RefreshCw
          className="size-4 text-[var(--accent,#9b8460)]"
          style={{
            transform: `rotate(${progress * 360}deg)`,
            transition: isRefreshing ? 'none' : 'transform 0.1s linear',
            animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none',
          }}
        />
      </div>
    </div>
  )
}
