'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

type LabRouteTab = {
  id: string
  href: string
  emoji?: string
  label: string
  description?: string
}

export function LabRouteTabs({
  activeId,
  tabs,
}: Readonly<{
  activeId: string
  tabs: LabRouteTab[]
}>) {
  return (
    <nav aria-label="Subseções do lab" className="lab-route-tabs">
      {tabs.map((tab) => {
        const active = tab.id === activeId

        return (
          <Link
            className={cn('lab-route-tab', active && 'lab-route-tab--active')}
            href={tab.href}
            key={tab.id}
            title={tab.description}
          >
            {tab.emoji ? <span aria-hidden="true">{tab.emoji}</span> : null}
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
