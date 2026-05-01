import type { ButtonHTMLAttributes } from 'react'
import { LoaderCircle } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(37,99,235,0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'border border-transparent bg-[var(--accent)] text-[var(--on-accent)] shadow-sm hover:bg-[var(--accent-strong)] hover:shadow-md active:scale-[0.98]',
        secondary:
          'border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-primary)] hover:border-[var(--border)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)] active:scale-[0.98]',
        ghost:
          'border border-transparent bg-transparent text-[var(--text-soft)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)] active:scale-[0.98]',
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
