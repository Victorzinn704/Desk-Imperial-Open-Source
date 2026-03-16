import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

export function BrandMark() {
  return (
    <Link className="inline-flex items-center gap-3 text-sm font-semibold tracking-[0.18em] text-[var(--text-muted)] uppercase" href="/">
      <span className="flex size-11 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(212,177,106,0.12)] text-[var(--accent)] shadow-[0_12px_30px_rgba(0,0,0,0.24)]">
        <ShieldCheck className="size-5" />
      </span>
      Desk Imperial
    </Link>
  )
}
