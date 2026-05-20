const FILTER_CHIP_TONE_CLASS = {
  danger: 'border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]',
  info: 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]',
  success: 'border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]',
  warning: 'border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning)]',
} as const

export type FilterChipTone = keyof typeof FILTER_CHIP_TONE_CLASS

export function FilterChip({
  active,
  label,
  onClick,
  tone,
}: Readonly<{
  active: boolean
  label: string
  onClick: () => void
  tone: FilterChipTone
}>) {
  return (
    <button
      className={`rounded-full border px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
        active
          ? FILTER_CHIP_TONE_CLASS[tone]
          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-soft)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]'
      }`}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  )
}
