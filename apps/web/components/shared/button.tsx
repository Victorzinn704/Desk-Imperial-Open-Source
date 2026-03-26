import type { ButtonHTMLAttributes } from 'react'
import { LoaderCircle } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-2xl border text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(195,164,111,0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        primary:
          'border-transparent bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-5 py-3 text-[var(--bg)] shadow-[0_16px_36px_rgba(212,177,106,0.28)] hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(212,177,106,0.44)] active:translate-y-0',
        secondary:
          'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] px-5 py-3 text-[var(--text-primary)] hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.09)] hover:text-white hover:shadow-[0_8px_24px_rgba(0,0,0,0.28)] active:scale-[0.98]',
        ghost:
          'border-[rgba(255,255,255,0.06)] bg-transparent px-4 py-2 text-[var(--text-soft)] hover:border-[rgba(255,255,255,0.14)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white active:scale-[0.98]',
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
