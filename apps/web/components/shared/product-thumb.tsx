'use client'

import Image from 'next/image'
import { useCallback, useState } from 'react'
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
  visualPolicy?: 'default' | 'real-only'
}

const sizeClassMap = {
  sm: 'size-11 rounded-2xl text-[11px]',
  md: 'size-14 rounded-[18px] text-xs',
  lg: 'size-16 rounded-[20px] text-sm',
} as const

const imageSizesMap = {
  sm: '44px',
  md: '56px',
  lg: '(min-width: 1800px) 15vw, (min-width: 1536px) 17vw, (min-width: 1280px) 20vw, (min-width: 1024px) 24vw, 42vw',
} as const

export function ProductThumb({
  product,
  size = 'md',
  className,
  visualPolicy = 'default',
}: Readonly<ProductThumbProps>) {
  const visual = visualPolicy === 'real-only' ? resolveRealCatalogVisual(product) : resolveProductVisual(product)
  const [failedImageKey, setFailedImageKey] = useState<string | null>(null)
  const sizeClass = sizeClassMap[size]
  const imageSizes = imageSizesMap[size]
  const visualKey = visual ? `${visual.source}:${visual.src}` : null
  const imageClassName = 'h-full w-full object-cover'
  const handleImageError = useCallback(() => {
    setFailedImageKey(visualKey)
  }, [visualKey])

  if (visual && failedImageKey !== visualKey) {
    return (
      <div
        className={`relative shrink-0 overflow-hidden border border-[var(--border)] bg-[var(--surface-muted)] ${sizeClass} ${className ?? ''}`}
        data-product-visual-source={visual.source}
      >
        <Image
          fill
          alt={visual.alt}
          className={imageClassName}
          sizes={imageSizes}
          src={visual.src}
          unoptimized={visual.src.startsWith('data:')}
          onError={handleImageError}
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

function resolveRealCatalogVisual(product: ProductThumbProduct) {
  const sanitizedImageUrl = sanitizeHttpVisualUrl(product.imageUrl)
  if (!sanitizedImageUrl) {
    return null
  }

  return {
    src: sanitizedImageUrl,
    alt: `Foto de ${product.name}`,
    source: 'catalog' as const,
  }
}

function sanitizeHttpVisualUrl(value: string | null | undefined) {
  const normalized = value?.trim()
  if (!normalized) {
    return null
  }

  if (normalized.startsWith('/api/barcode/image/')) {
    return normalized
  }

  try {
    const parsedUrl = new URL(normalized)
    if (parsedUrl.protocol !== 'https:') {
      return null
    }

    return parsedUrl.toString()
  } catch {
    return null
  }
}
