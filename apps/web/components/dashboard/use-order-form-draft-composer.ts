'use client'

import { useMemo, useState } from 'react'
import type { OrderFormInputValues } from '@/lib/validation'
import type { DraftComposerState, OrderFormProps } from './order-form.types'
import { buildDraftComposerDefaults, buildDraftComposerKey } from './order-form.utils'

type DraftComposerStore = DraftComposerState & {
  key: string
}

export function useDraftComposer(products: OrderFormProps['products'], initialFormValues: OrderFormInputValues) {
  const defaults = useMemo(() => buildDraftComposerDefaults(products, initialFormValues), [initialFormValues, products])
  const key = useMemo(() => buildDraftComposerKey(products, initialFormValues), [initialFormValues, products])
  const [store, setStore] = useState<DraftComposerStore>(() => ({ key, ...defaults }))

  const composer = store.key === key ? store : { key, ...defaults }
  const update = (patch: Partial<DraftComposerState>) =>
    setStore((current) => ({
      ...(current.key === key ? current : { key, ...defaults }),
      ...patch,
      key,
    }))

  return { composer, defaults, key, reset: () => setStore({ key, ...defaults }), update }
}
