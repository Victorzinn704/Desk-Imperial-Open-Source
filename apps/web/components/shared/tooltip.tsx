'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

type TooltipProps = {
  content: string
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export function Tooltip({ content, children, side = 'top', className }: Readonly<TooltipProps>) {
  const [visible, setVisible] = useState(false)

  const positionClasses: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  const arrowClasses: Record<string, string> = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-[rgba(30,38,48,0.96)] border-t-4 border-x-4 border-x-transparent border-b-0',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[rgba(30,38,48,0.96)] border-b-4 border-x-4 border-x-transparent border-t-0',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-[rgba(30,38,48,0.96)] border-l-4 border-y-4 border-y-transparent border-r-0',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-[rgba(30,38,48,0.96)] border-r-4 border-y-4 border-y-transparent border-l-0',
  }

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}

      <span
        aria-hidden={!visible}
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(30,38,48,0.96)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] shadow-[0_8px_32px_rgba(0,0,0,0.40)] backdrop-blur-xl',
          'transition-all duration-150',
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
          positionClasses[side],
          className,
        )}
      >
        {content}
        <span className={cn('absolute h-0 w-0', arrowClasses[side])} />
      </span>
    </span>
  )
}
