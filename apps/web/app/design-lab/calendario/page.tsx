import { CalendarDays, Grip, Trophy } from 'lucide-react'
import { CommercialCalendar } from '@/components/calendar/commercial-calendar'
import { LabPageHeader, LabStatusPill } from '@/components/design-lab/lab-primitives'

export default function DesignLabCalendarioPage() {
  return (
    <section className="space-y-6">
      <LabPageHeader
        eyebrow="Gestao comercial"
        title="Calendario de atividades"
        description="Planeje promocoes, jogos, eventos e reunioes em uma leitura unica, com superficie limpa e previsivel em light e dark."
        meta={
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">
                Leitura do modulo
              </span>
              <LabStatusPill
                tone="info"
                icon={<CalendarDays className="size-3" />}
              >
                mes, semana e agenda
              </LabStatusPill>
            </div>
            <div className="space-y-2 text-sm text-[var(--lab-fg-soft)]">
              <div className="flex items-center gap-2">
                <Grip className="size-4 text-[var(--lab-blue)]" />
                Arraste eventos e redimensione duracoes sem sair da agenda.
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="size-4 text-[var(--lab-warning)]" />
                Jogos do Brasil seguem visiveis como sinal de movimento.
              </div>
            </div>
          </div>
        }
      />

      <CommercialCalendar />
    </section>
  )
}
