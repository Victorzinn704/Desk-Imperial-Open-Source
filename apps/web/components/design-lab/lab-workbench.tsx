'use client'

import { useEffect, useId, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type LabWorkbenchProps = {
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  toolbar?: ReactNode
  onClose: () => void
  closeLabel?: string
  bodyClassName?: string
  className?: string
}

export function LabWorkbench({
  title,
  description,
  children,
  toolbar,
  onClose,
  closeLabel = 'Fechar superfície',
  bodyClassName = 'lab-workbench-open',
  className,
}: LabWorkbenchProps) {
  const titleId = useId()

  useEffect(() => {
    document.body.classList.add(bodyClassName)
    return () => {
      document.body.classList.remove(bodyClassName)
    }
  }, [bodyClassName])

  return (
    <div className="lab-workbench fixed inset-0 z-[80] flex items-stretch justify-center p-0" role="presentation">
      <button
        aria-label={closeLabel}
        className="lab-workbench__backdrop absolute inset-0 border-0 bg-black/60 p-0 backdrop-blur-sm"
        type="button"
        onClick={onClose}
      />

      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className={cn(
          'lab-workbench__dialog relative z-10 flex h-full w-full flex-col overflow-hidden bg-[var(--lab-bg)] text-[var(--lab-fg)]',
          className,
        )}
        role="dialog"
      >
        <div className="lab-workbench__header border-b border-[var(--lab-border)] bg-[var(--lab-surface)]">
          <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-4 px-4 py-4 sm:px-5 lg:px-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--lab-blue)]">Superficie acionada</p>
                <h2 className="mt-2 text-xl font-semibold leading-tight text-[var(--lab-fg)]" id={titleId}>{title}</h2>
                {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--lab-fg-soft)]">{description}</p> : null}
              </div>
              <button
                aria-label={closeLabel}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-[14px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] text-[var(--lab-fg-soft)] transition-colors hover:border-[var(--lab-border-strong)] hover:bg-[var(--lab-surface-hover)] hover:text-[var(--lab-fg)]"
                type="button"
                onClick={onClose}
              >
                <X className="size-4" />
              </button>
            </div>

            {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
          </div>
        </div>

        <div className="lab-workbench__body min-h-0 flex-1 overflow-y-auto bg-[var(--lab-bg)]">
          <div className="mx-auto w-full max-w-[1360px] px-4 py-5 sm:px-5 sm:py-6 lg:px-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
