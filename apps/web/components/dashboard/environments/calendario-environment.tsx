'use client'

import dynamic from 'next/dynamic'
import { TimerReset } from 'lucide-react'
import { DashboardSectionHeading } from '@/components/dashboard/dashboard-section-heading'
import { CalendarSkeleton } from '@/components/shared/lazy-components'

const CommercialCalendar = dynamic(
  () => import('@/components/calendar/commercial-calendar').then((m) => m.CommercialCalendar),
  {
    ssr: false,
    loading: () => <CalendarSkeleton />,
  },
)

export function CalendarioEnvironment() {
  return (
    <section className="space-y-6">
      <DashboardSectionHeading
        description="Arraste eventos para trocar datas, redimensione para ajustar duração. Clique em um dia para criar nova atividade."
        eyebrow="Agenda comercial"
        icon={TimerReset}
        title="Calendário de Atividades"
      />
      <CommercialCalendar />
    </section>
  )
}
