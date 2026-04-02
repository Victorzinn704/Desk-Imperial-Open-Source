'use client'

import { TimerReset } from 'lucide-react'
import { CommercialCalendar } from '@/components/calendar/commercial-calendar'
import { DashboardSectionHeading } from '@/components/dashboard/dashboard-section-heading'

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
