'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

type TooltipProps = {
  content: string
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export function Tooltip({ content, children, side = 'top', className }: Readonly<TooltipProps>) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const [mounted, setMounted] = useState(false)
  const ref = useRef<HTMLSpanElement | null>(null)

  useEffect(() => { setMounted(true) }, [])

  function handleShow() {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect()
      const GAP = 12
      let top = 0
      let left = 0
      
      if (side === 'top') {
        top = r.top + window.scrollY - GAP
        left = r.left + r.width / 2
      } else if (side === 'bottom') {
        top = r.bottom + window.scrollY + GAP
        left = r.left + r.width / 2
      } else if (side === 'left') {
        top = r.top + window.scrollY + r.height / 2
        left = r.left - GAP
      } else {
        top = r.top + window.scrollY + r.height / 2
        left = r.right + GAP
      }
      setCoords({ top, left: Math.min(left, window.innerWidth - 8) })
    }
    setVisible(true)
  }

  const transformMap: Record<string, string> = {
    top: 'translateX(-50%) translateY(-100%)',
    bottom: 'translateX(-50%)',
    left: 'translateX(-100%) translateY(-50%)',
    right: 'translateY(-50%)',
  }

  const arrowClasses: Record<string, string> = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-[rgba(30,38,48,0.96)] border-t-4 border-x-4 border-x-transparent border-b-0',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[rgba(30,38,48,0.96)] border-b-4 border-x-4 border-x-transparent border-t-0',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-[rgba(30,38,48,0.96)] border-l-4 border-y-4 border-y-transparent border-r-0',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-[rgba(30,38,48,0.96)] border-r-4 border-y-4 border-y-transparent border-l-0',
  }

  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={handleShow}
      onMouseLeave={() => setVisible(false)}
      onFocus={handleShow}
      onBlur={() => setVisible(false)}
    >
      {children}

      {mounted && createPortal(
        <span
          aria-hidden={!visible}
          role="tooltip"
          className={cn(
            'pointer-events-none fixed z-[9999] whitespace-nowrap rounded-lg border border-[rgba(255,255,255,0.12)] bg-[rgba(23,28,34,0.98)] px-3.5 py-2 text-xs font-medium text-[rgba(255,255,255,0.95)] shadow-[0_12px_48px_rgba(0,0,0,0.48)] backdrop-blur-sm',
            'transition-[opacity,transform] duration-200 ease-out',
            visible 
              ? 'opacity-100 scale-100 pointer-events-auto' 
              : 'opacity-0 scale-90 pointer-events-none',
            className,
          )}
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            transform: transformMap[side],
          }}
        >
          {content}
          <span className={cn('absolute h-0 w-0', arrowClasses[side])} />
        </span>,
        document.body,
      )}
    </span>
  )
}
