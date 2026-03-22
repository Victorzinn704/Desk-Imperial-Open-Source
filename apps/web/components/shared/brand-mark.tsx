import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

export function BrandMark() {
  return (
    <Link className="inline-flex items-center gap-3 text-sm font-semibold tracking-[0.18em] text-label uppercase" href="/">
      <span className="flex size-11 items-center justify-center rounded-2xl border border-border-strong bg-accent/15 text-accent shadow-[0_12px_30px_rgb(0_0_0/0.24)]">
        <ShieldCheck className="size-5" />
      </span>
      DESK IMPERIAL
    </Link>
  )
}
