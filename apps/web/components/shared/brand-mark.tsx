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

const WORDMARK_CLASS: Record<NonNullable<BrandMarkProps['wordmark']>, string> = {
  always: 'inline',
  hidden: 'hidden',
  responsive: 'hidden min-[390px]:inline',
}

const ROOT_CLASS: Record<NonNullable<BrandMarkProps['presentation']>, string> = {
  default:
    'inline-flex max-w-full items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)] transition-colors hover:text-[var(--text-primary)] sm:text-sm sm:tracking-[0.16em]',
  lab: 'lab-brand',
  wireframe: 'wireframe-brand',
}

const ICON_CLASS: Record<NonNullable<BrandMarkProps['presentation']>, string> = {
  default:
    'flex shrink-0 items-center justify-center rounded-[14px] border border-[rgba(0,140,255,0.22)] bg-[rgba(0,140,255,0.1)] text-[var(--accent)] shadow-[0_10px_28px_rgba(0,140,255,0.14)]',
  lab: 'lab-brand__icon',
  wireframe: 'wireframe-brand__mark wireframe-brand__mark--logo',
}

const LABEL_CLASS: Record<NonNullable<BrandMarkProps['presentation']>, string> = {
  default: '',
  lab: 'lab-brand__name',
  wireframe: 'wireframe-brand__name',
}

const GLYPH_CLASS: Record<NonNullable<BrandMarkProps['presentation']>, string | undefined> = {
  default: undefined,
  lab: 'lab-brand__glyph',
  wireframe: 'wireframe-brand__glyph',
}

export function BrandMark({
  ariaLabel,
  href = '/',
  onClick,
  presentation = 'default',
  size = 'md',
  title,
  wordmark = 'always',
}: BrandMarkProps) {
  const labelClass = LABEL_CLASS[presentation] || `${WORDMARK_CLASS[wordmark]} min-w-0 truncate`
  const frameSize = resolveFrameSize(presentation, size)
  const iconSize = resolveIconSize(presentation, size)

  return (
    <Link aria-label={ariaLabel} className={ROOT_CLASS[presentation]} href={href} title={title} onClick={onClick}>
      <span
        className={ICON_CLASS[presentation]}
        style={frameSize ? { height: frameSize, width: frameSize } : undefined}
      >
        <Crown className={GLYPH_CLASS[presentation]} style={{ height: iconSize, width: iconSize }} />
      </span>
      {wordmark === 'hidden' ? null : <span className={labelClass}>Desk Imperial</span>}
    </Link>
  )
}

function resolveFrameSize(
  presentation: NonNullable<BrandMarkProps['presentation']>,
  size: NonNullable<BrandMarkProps['size']>,
) {
  if (presentation !== 'default') {
    return undefined
  }

  return size === 'sm' ? 34 : 40
}

function resolveIconSize(
  presentation: NonNullable<BrandMarkProps['presentation']>,
  size: NonNullable<BrandMarkProps['size']>,
) {
  if (presentation === 'wireframe') {
    return size === 'sm' ? 15 : 16
  }

  return size === 'sm' ? 15 : 18
}
