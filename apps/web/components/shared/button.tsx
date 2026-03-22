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
          'border-transparent bg-[linear-gradient(135deg,var(--color-accent),var(--color-desk-accent-strong))] px-5 py-3 text-accent-foreground shadow-[0_16px_36px_rgb(212_177_106/0.28)] hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgb(212_177_106/0.44)] active:translate-y-0',
        secondary:
          'border-white/10 bg-white/5 px-5 py-3 text-foreground hover:border-white/20 hover:bg-white/[0.09] hover:text-white hover:shadow-[0_8px_24px_rgb(0_0_0/0.28)] active:scale-[0.98]',
        outline:
          'border-white/12 bg-transparent px-5 py-3 text-foreground hover:border-white/22 hover:bg-white/[0.04] hover:text-white active:scale-[0.98]',
        ghost:
          'border-white/[0.06] bg-transparent px-4 py-2 text-muted-foreground hover:border-white/14 hover:bg-white/5 hover:text-white active:scale-[0.98]',
        destructive:
          'border-destructive/25 bg-destructive/[0.08] px-5 py-3 text-destructive hover:border-destructive/40 hover:bg-destructive/[0.14] hover:shadow-[0_8px_24px_rgb(212_115_115/0.18)] active:scale-[0.98]',
      },
      size: {
        sm: 'h-9 px-4 text-xs',
        md: 'h-11 px-5 text-sm',
        lg: 'h-13 px-6 text-base',
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
