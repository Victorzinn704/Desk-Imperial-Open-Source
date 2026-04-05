'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ResponsiveContainer } from 'recharts'

type ChartResponsiveContainerProps = {
  children: ReactNode
  className?: string
  fallback?: ReactNode
  width?: number | `${number}%`
  height?: number | `${number}%`
  minWidth?: number
  minHeight?: number
}

export function ChartResponsiveContainer({
  children,
  className = 'h-full w-full',
  fallback = <div aria-hidden="true" className="h-full w-full" />,
  width = '100%',
  height = '100%',
  minWidth = 1,
  minHeight = 1,
}: Readonly<ChartResponsiveContainerProps>) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) {
      return
    }

    const updateReadiness = () => {
      const hasSize = host.clientWidth > 0 && host.clientHeight > 0
      setIsReady((current) => (current === hasSize ? current : hasSize))
    }

    updateReadiness()
    const frameId = window.requestAnimationFrame(updateReadiness)

    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => updateReadiness())
      observer.observe(host)
    }

    window.addEventListener('resize', updateReadiness)

    return () => {
      window.cancelAnimationFrame(frameId)
      observer?.disconnect()
      window.removeEventListener('resize', updateReadiness)
    }
  }, [])

  return (
    <div className={className} ref={hostRef}>
      {isReady ? (
        <ResponsiveContainer height={height} minHeight={minHeight} minWidth={minWidth} width={width}>
          {children}
        </ResponsiveContainer>
      ) : (
        fallback
      )}
    </div>
  )
}
