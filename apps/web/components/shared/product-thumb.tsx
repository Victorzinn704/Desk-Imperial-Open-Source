'use client'

import Image from 'next/image'
import { useState } from 'react'
import { buildProductInitials, resolveProductVisual } from '@/lib/product-visuals'

type ProductThumbProduct = {
  name: string
  brand?: string | null
  category?: string | null
  barcode?: string | null
  packagingClass?: string | null
  quantityLabel?: string | null
  imageUrl?: string | null
  catalogSource?: string | null
  isCombo?: boolean | null
}

type ProductThumbProps = {
  product: ProductThumbProduct
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClassMap = {
  sm: 'size-11 rounded-2xl text-[11px]',
  md: 'size-14 rounded-[18px] text-xs',
  lg: 'size-16 rounded-[20px] text-sm',
} as const

export function ProductThumb({ product, size = 'md', className }: Readonly<ProductThumbProps>) {
  const visual = resolveProductVisual(product)
  const [failedImageKey, setFailedImageKey] = useState<string | null>(null)
  const sizeClass = sizeClassMap[size]
  const visualKey = visual ? `${visual.source}:${visual.src}` : null

  if (visual && failedImageKey !== visualKey) {
    return (
      <div
        className={`relative shrink-0 overflow-hidden border border-[var(--border)] bg-[var(--surface-muted)] ${sizeClass} ${className ?? ''}`}
        data-product-visual-source={visual.source}
      >
        <Image
          fill
          alt={visual.alt}
          className="h-full w-full object-cover"
          sizes="64px"
          src={visual.src}
          unoptimized={visual.src.startsWith('data:')}
          onError={() => setFailedImageKey(visualKey)}
        />
      </div>
    )
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center border border-[var(--accent-soft)] bg-[var(--accent-soft)] font-bold tracking-[0.08em] text-[var(--accent)] ${sizeClass} ${className ?? ''}`}
      data-product-visual-source="initials"
    >
      {buildProductInitials(product.name)}
    </div>
  )
}
