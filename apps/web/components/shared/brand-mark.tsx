import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

export function BrandMark({ size = 'md' }: Readonly<{ size?: 'sm' | 'md' }>) {
  return (
    <Link
      className="inline-flex items-center gap-2.5 text-sm font-semibold tracking-[0.16em] text-[var(--text-soft)] uppercase transition-colors hover:text-[var(--text-primary)]"
      href="/"
    >
      <span
        className="flex shrink-0 items-center justify-center rounded-[14px] border border-[rgba(195,164,111,0.28)] bg-[rgba(195,164,111,0.1)] text-[var(--accent)] shadow-[0_8px_24px_rgba(0,0,0,0.22),0_0_18px_rgba(195,164,111,0.12)]"
        style={{ width: size === 'sm' ? 36 : 42, height: size === 'sm' ? 36 : 42 }}
      >
        <ShieldCheck style={{ width: size === 'sm' ? 16 : 19, height: size === 'sm' ? 16 : 19 }} />
      </span>
      DESK IMPERIAL
    </Link>
  )
}
