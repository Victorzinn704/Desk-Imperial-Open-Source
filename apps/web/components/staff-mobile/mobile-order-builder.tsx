'use client'

import { memo } from 'react'
import { MobileOrderBuilderLayout } from './mobile-order-builder.layout'
import type { MobileOrderBuilderProps } from './mobile-order-builder.types'
import { useMobileOrderBuilderController } from './use-mobile-order-builder-controller'

export const MobileOrderBuilder = memo(function MobileOrderBuilder({
  busy,
  checkoutDockOffset = 'navigation',
  errorMessage = null,
  initialItems,
  isLoading = false,
  isOffline = false,
  mesaLabel,
  mode,
  onCancel,
  onSubmit,
  produtos,
  secondaryAction,
  summaryItems,
}: Readonly<MobileOrderBuilderProps>) {
  const controller = useMobileOrderBuilderController({
    busy,
    initialItems,
    onSubmit,
    produtos,
  })

  return (
    <MobileOrderBuilderLayout
      busy={busy}
      checkoutDockOffset={checkoutDockOffset}
      errorMessage={errorMessage}
      isLoading={isLoading}
      isOffline={isOffline}
      mesaLabel={mesaLabel}
      mode={mode}
      secondaryAction={secondaryAction}
      summaryItems={summaryItems}
      onCancel={onCancel}
      {...controller}
    />
  )
})
