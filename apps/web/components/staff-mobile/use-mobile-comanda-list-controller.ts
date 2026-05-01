'use client'

import { useEffect, useMemo, useRef } from 'react'
import { sortMobileComandas } from './mobile-comanda-list.helpers'
import type { MobileComandaListProps } from './mobile-comanda-list.types'

export function useMobileComandaListController({
  comandas,
  focusedId,
}: Pick<MobileComandaListProps, 'comandas' | 'focusedId'>) {
  const active = useMemo(() => comandas, [comandas])
  const focusedRef = useRef<HTMLLIElement | null>(null)
  const sorted = useMemo(() => sortMobileComandas(active, focusedId), [active, focusedId])

  useEffect(() => {
    if (focusedId && typeof focusedRef.current?.scrollIntoView === 'function') {
      focusedRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [focusedId])

  return { active, focusedRef, sorted }
}
