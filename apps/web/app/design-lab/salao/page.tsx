'use client'

import { Suspense } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { buildDesignLabPdvHref } from '@/components/design-lab/design-lab-navigation'
import type { View } from '@/components/dashboard/salao'
import { SalaoEnvironment } from '@/components/dashboard/salao-environment'

function DesignLabSalaoPageContent() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab')
  const initialView =
    tab === 'planta' ? 'planta' : tab === 'configuracao' ? 'configuracao' : tab === 'comandas' ? 'comandas' : 'operacional'

  function handleViewChange(nextView: View) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', nextView)
    const nextUrl = `${pathname}?${params.toString()}`
    router.replace(nextUrl, { scroll: false })
  }

  return (
    <SalaoEnvironment
      initialView={initialView}
      onViewChange={handleViewChange}
      onOpenPdvFromMesa={(intent) => {
        router.push(
          buildDesignLabPdvHref({
            tab: 'grid',
            comandaId: intent.comandaId,
            mesaId: intent.mesaId,
            mesaLabel: intent.mesaLabel,
          }),
        )
      }}
    />
  )
}

export default function DesignLabSalaoPage() {
  return (
    <Suspense fallback={null}>
      <DesignLabSalaoPageContent />
    </Suspense>
  )
}
