'use client'

import { useMemo } from 'react'
import { type Control, useWatch } from 'react-hook-form'
import type { OrderFormInputValues, OrderFormValues } from '@/lib/validation'
import type { CartItemValue } from './order-form.types'

export function useCurrentItems(control: Control<OrderFormInputValues, undefined, OrderFormValues>) {
  const watchedItems = useWatch({
    control,
    name: 'items',
  }) as CartItemValue[] | undefined

  return useMemo(() => watchedItems ?? [], [watchedItems])
}
