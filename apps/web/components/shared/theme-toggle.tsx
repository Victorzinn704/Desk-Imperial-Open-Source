'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggleButton() {
  const { resolvedTheme, setTheme } = useTheme()

  if (!resolvedTheme) {
    return <div className="h-10 w-[132px] rounded-full border border-[var(--border)] bg-[var(--surface)]" />
  }

  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
  const label = resolvedTheme === 'dark' ? 'Escuro' : 'Claro'

  return (
    <button
      onClick={() => setTheme(nextTheme)}
      className="inline-flex h-10 items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 pr-3 text-left text-sm font-semibold text-[var(--text-primary)] shadow-[var(--shadow-panel)] transition-all duration-200 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-panel-strong)]"
      aria-pressed={resolvedTheme === 'dark'}
      aria-label={`Alternar para tema ${nextTheme === 'light' ? 'claro' : 'escuro'}`}
      type="button"
    >
      <span className="relative flex size-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--accent)] shadow-sm">
        <span
          className={`flex size-6 items-center justify-center rounded-full bg-[var(--surface)] transition-transform duration-200 ${
            resolvedTheme === 'dark' ? 'translate-x-[6px]' : '-translate-x-[6px]'
          }`}
        >
          {resolvedTheme === 'dark' ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
        </span>
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Tema</span>
        <span className="text-sm font-semibold text-[var(--text-primary)]">{label}</span>
      </span>
    </button>
  )
}
