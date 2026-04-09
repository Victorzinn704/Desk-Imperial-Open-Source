'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState, type ReactNode } from 'react'

const LazyResponsiveContainer = dynamic(() => import('recharts').then((mod) => mod.ResponsiveContainer), { ssr: false })

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
    const frameId = globalThis.requestAnimationFrame(updateReadiness)

    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => updateReadiness())
      observer.observe(host)
    }

    globalThis.addEventListener('resize', updateReadiness)

    return () => {
      globalThis.cancelAnimationFrame(frameId)
      observer?.disconnect()
      globalThis.removeEventListener('resize', updateReadiness)
    }
  }, [])

  return (
    <div className={className} ref={hostRef}>
      {isReady ? (
        <LazyResponsiveContainer height={height} minHeight={minHeight} minWidth={minWidth} width={width}>
          {children}
        </LazyResponsiveContainer>
      ) : (
        fallback
      )}
    </div>
  )
}
