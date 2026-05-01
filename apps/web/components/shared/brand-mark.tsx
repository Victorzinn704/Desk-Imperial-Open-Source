import Link from 'next/link'
import type { MouseEventHandler } from 'react'
import { Crown } from 'lucide-react'

type BrandMarkProps = Readonly<{
  ariaLabel?: string
  href?: string
  onClick?: MouseEventHandler<HTMLAnchorElement>
  presentation?: 'default' | 'lab' | 'wireframe'
  size?: 'sm' | 'md'
  title?: string
  wordmark?: 'always' | 'responsive' | 'hidden'
}>

export function BrandMark({
  ariaLabel,
  href = '/',
  onClick,
  presentation = 'default',
  size = 'md',
  title,
  wordmark = 'always',
}: BrandMarkProps) {
  const wordmarkClass =
    wordmark === 'hidden' ? 'hidden' : wordmark === 'responsive' ? 'hidden min-[390px]:inline' : 'inline'
  const rootClass =
    presentation === 'lab'
      ? 'lab-brand'
      : presentation === 'wireframe'
        ? 'wireframe-brand'
        : 'inline-flex max-w-full items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)] transition-colors hover:text-[var(--text-primary)] sm:text-sm sm:tracking-[0.16em]'
  const iconClass =
    presentation === 'lab'
      ? 'lab-brand__icon'
      : presentation === 'wireframe'
        ? 'wireframe-brand__mark wireframe-brand__mark--logo'
        : 'flex shrink-0 items-center justify-center rounded-[14px] border border-[rgba(0,140,255,0.22)] bg-[rgba(0,140,255,0.1)] text-[var(--accent)] shadow-[0_10px_28px_rgba(0,140,255,0.14)]'
  const labelClass =
    presentation === 'lab'
      ? 'lab-brand__name'
      : presentation === 'wireframe'
        ? 'wireframe-brand__name'
        : `${wordmarkClass} min-w-0 truncate`
  const frameSize =
    presentation === 'default'
      ? size === 'sm'
        ? 34
        : 40
      : undefined
  const iconSize =
    presentation === 'wireframe'
      ? size === 'sm'
        ? 15
        : 16
      : size === 'sm'
        ? 15
        : 18

  return (
    <Link
      aria-label={ariaLabel}
      className={rootClass}
      href={href}
      title={title}
      onClick={onClick}
    >
      <span
        className={iconClass}
        style={frameSize ? { width: frameSize, height: frameSize } : undefined}
      >
        <Crown
          className={presentation === 'lab' ? 'lab-brand__glyph' : presentation === 'wireframe' ? 'wireframe-brand__glyph' : undefined}
          style={{ width: iconSize, height: iconSize }}
        />
      </span>
      {wordmark === 'hidden' ? null : <span className={labelClass}>Desk Imperial</span>}
    </Link>
  )
}
