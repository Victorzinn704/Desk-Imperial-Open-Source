'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggleButton() {
  const { resolvedTheme, setTheme } = useTheme()

  if (!resolvedTheme) {
    return <div className="h-10 w-[92px] rounded-full border border-[var(--border)] bg-[var(--surface)]" />
  }

  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
  const label = resolvedTheme === 'dark' ? 'Claro' : 'Escuro'

  return (
    <button
      onClick={() => setTheme(nextTheme)}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text-soft)] shadow-[var(--shadow-panel)] transition-colors duration-200 hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
      aria-label={`Alternar para tema ${nextTheme === 'light' ? 'claro' : 'escuro'}`}
      type="button"
    >
      <span className="flex size-6 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--accent)]">
        {resolvedTheme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
      </span>
      {label}
    </button>
  )
}
