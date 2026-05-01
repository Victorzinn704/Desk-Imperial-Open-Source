'use client'

import { type ButtonHTMLAttributes, useRef } from 'react'
import { cn } from '@/lib/utils'

type SpotlightButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
}

export function SpotlightButton({ className, children, loading, disabled, ...props }: SpotlightButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = ref.current
    if (!btn) {return}
    const rect = btn.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    btn.style.setProperty('--spotlight-x', `${x}%`)
    btn.style.setProperty('--spotlight-y', `${y}%`)
  }

  const handleMouseLeave = () => {
    ref.current?.style.setProperty('--spotlight-x', '50%')
    ref.current?.style.setProperty('--spotlight-y', '50%')
  }

  return (
    <button
      className={cn(
        'btn-spotlight inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-soft)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition-all duration-200 hover:border-[var(--accent)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      disabled={disabled || loading}
      ref={ref}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      {...props}
    >
      {children}
    </button>
  )
}
