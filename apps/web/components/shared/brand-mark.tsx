import Link from 'next/link'
import { Crown } from 'lucide-react'

type BrandMarkProps = Readonly<{
  size?: 'sm' | 'md'
  wordmark?: 'always' | 'responsive' | 'hidden'
}>

export function BrandMark({ size = 'md', wordmark = 'always' }: BrandMarkProps) {
  const wordmarkClass =
    wordmark === 'hidden' ? 'hidden' : wordmark === 'responsive' ? 'hidden min-[390px]:inline' : 'inline'

  return (
    <Link
      className="inline-flex max-w-full items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)] transition-colors hover:text-[var(--text-primary)] sm:gap-2.5 sm:text-sm sm:tracking-[0.16em]"
      href="/"
    >
      <span
        className="flex shrink-0 items-center justify-center rounded-[10px] border border-accent/20 bg-accent/10 text-accent shadow-[0_10px_24px_rgba(0,140,255,0.16)]"
        style={{ width: size === 'sm' ? 34 : 38, height: size === 'sm' ? 34 : 38 }}
      >
        <Crown style={{ width: size === 'sm' ? 15 : 17, height: size === 'sm' ? 15 : 17 }} />
      </span>
      {wordmark === 'hidden' ? null : <span className={`${wordmarkClass} min-w-0 truncate`}>Desk Imperial</span>}
    </Link>
  )
}
