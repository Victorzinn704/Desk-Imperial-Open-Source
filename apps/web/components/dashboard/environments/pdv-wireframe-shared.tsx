import type { Comanda } from '@/components/pdv/pdv-types'

export function ComandaStatusPill({ status }: Readonly<{ status: Comanda['status'] }>) {
  const copy = statusCopy[status]
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${copy.className}`}>
      {copy.label}
    </span>
  )
}

export function StampPill({ children }: Readonly<{ children: string }>) {
  return (
    <span className="inline-flex rounded-full border border-[color-mix(in_srgb,var(--accent)_34%,var(--paper))] px-2.5 py-1 text-[11px] font-medium text-[var(--accent-strong)]">
      {children}
    </span>
  )
}

const statusCopy = {
  aberta: {
    label: 'aberta',
    className:
      'border-[color-mix(in_srgb,var(--accent)_32%,var(--paper))] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent-strong)]',
  },
  em_preparo: {
    label: 'preparando',
    className:
      'border-[color-mix(in_srgb,var(--warning)_28%,var(--paper))] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] text-[var(--warning)]',
  },
  pronta: {
    label: 'pronto',
    className:
      'border-[color-mix(in_srgb,var(--success)_28%,var(--paper))] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)]',
  },
  cancelada: {
    label: 'cancelada',
    className:
      'border-[color-mix(in_srgb,var(--danger)_28%,var(--paper))] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]',
  },
  fechada: {
    label: 'fechada',
    className: 'border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] text-[var(--text-soft)]',
  },
} as const
