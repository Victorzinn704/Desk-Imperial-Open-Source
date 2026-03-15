import type { ButtonHTMLAttributes } from 'react'
import { LoaderCircle } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-2xl border text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        primary:
          'border-transparent bg-[var(--accent)] px-5 py-3 text-[var(--bg)] shadow-[0_16px_36px_rgba(212,177,106,0.24)] hover:-translate-y-0.5 hover:bg-[var(--accent-strong)]',
        secondary:
          'border-[var(--border)] bg-[var(--surface-soft)] px-5 py-3 text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)]',
        ghost:
          'border-transparent bg-transparent px-4 py-2 text-[var(--text-soft)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]',
      },
      size: {
        sm: 'h-10 px-4 text-sm',
        md: 'h-12 px-5 text-sm',
        lg: 'h-14 px-6 text-base',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean
  }

export function Button({
  className,
  children,
  loading = false,
  disabled,
  variant,
  size,
  fullWidth,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : null}
      {children}
    </button>
  )
}
