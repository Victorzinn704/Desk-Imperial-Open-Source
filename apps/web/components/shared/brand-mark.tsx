import Link from 'next/link'
import { Crown } from 'lucide-react'

export function BrandMark({ size = 'md' }: Readonly<{ size?: 'sm' | 'md' }>) {
  return (
    <Link
      className="inline-flex items-center gap-2.5 text-sm font-semibold tracking-[0.16em] text-[var(--text-soft)] uppercase transition-colors hover:text-[var(--text-primary)]"
      href="/"
    >
      <span
        className="flex shrink-0 items-center justify-center rounded-[10px] border border-[rgba(195,164,111,0.35)] bg-gradient-to-br from-[rgba(195,164,111,0.18)] to-[rgba(195,164,111,0.06)] text-[var(--accent)] shadow-[0_4px_16px_rgba(195,164,111,0.15)]"
        style={{ width: size === 'sm' ? 34 : 38, height: size === 'sm' ? 34 : 38 }}
      >
        <Crown style={{ width: size === 'sm' ? 15 : 17, height: size === 'sm' ? 15 : 17 }} />
      </span>
      DESK IMPERIAL
    </Link>
  )
}
