'use client'

import { useState } from 'react'
import { Calendar, dateFnsLocalizer, type EventProps, type ResourceHeaderProps, type View } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import { format, getDay, parse, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarRange, Clock3, Layers3, ShieldCheck, UserRound, type LucideIcon } from 'lucide-react'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import type { OperationTimelineItem, OperationTimelineResource } from '@/lib/operations/operations-types'
import { formatMoney, formatShortTime, getCashSessionTone, getComandaTone } from '@/lib/operations/operations-visuals'

const locales = { 'pt-BR': ptBR }

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: ptBR }),
  getDay,
  locales,
})

type TimelineCalendarEvent = {
  id: string
  title: string
  start: Date
  end: Date
  resourceId: string
  status: OperationTimelineItem['status']
  tableLabel: string
  employeeName: string
  amount: number
}

const DnDCalendar = withDragAndDrop<TimelineCalendarEvent, OperationTimelineResource>(Calendar)

export function OperationsTimeline({
  resources,
  items,
  title = 'Linha do tempo operacional',
  description = 'Visão com drag-and-drop usando o calendário já adotado no projeto, organizada por equipe e janela do dia.',
  onEventDrop,
  onEventResize,
}: Readonly<{
  resources: OperationTimelineResource[]
  items: OperationTimelineItem[]
  title?: string
  description?: string
  onEventDrop?: (info: { id: string; start: Date; end: Date; resourceId?: string }) => void
  onEventResize?: (info: { id: string; start: Date; end: Date }) => void
}>) {
  const [view, setView] = useState<View>('day')
  const [date, setDate] = useState(() => (items[0] ? new Date(items[0].start) : new Date()))

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
  const openItems = items.filter((item) => item.status !== 'closed').length
  const calendarEvents: TimelineCalendarEvent[] = items.map((item) => ({
    id: item.id,
    title: item.title,
    start: new Date(item.start),
    end: new Date(item.end),
    resourceId: item.resourceId,
    status: item.status,
    tableLabel: item.tableLabel,
    employeeName: item.employeeName,
    amount: item.amount,
  }))

  return (
    <section className="imperial-card p-6 md:p-7">
      <header className="flex flex-col gap-4 border-b border-white/6 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Operação ao vivo</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">{description}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[640px]">
          <MiniStat icon={UserRound} label="Recursos" value={String(resources.length)} />
          <MiniStat icon={Layers3} label="Blocos" value={String(items.length)} />
          <MiniStat icon={ShieldCheck} label="Abertos" value={String(openItems)} />
          <MiniStat icon={Clock3} label="Total" value={formatMoney(totalAmount)} />
        </div>
      </header>

      <div className="mt-5 rounded-[28px] border border-white/6 bg-[rgba(255,255,255,0.02)] p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/6 pb-4">
          <div className="flex items-center gap-2 text-sm text-[var(--text-soft)]">
            <CalendarRange className="size-4" />
            Operação com `react-big-calendar` e drag-and-drop nativo do projeto
          </div>
          <div className="rounded-full border border-[rgba(52,242,127,0.18)] bg-[rgba(52,242,127,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8fffb9]">
            Sem licença premium
          </div>
        </div>

        {resources.length ? (
          <div className="operations-rbc overflow-hidden rounded-[24px] border border-white/6">
            <style jsx global>{`
              .operations-rbc .rbc-calendar {
                background: transparent !important;
                color: #e2ddd6;
                font-family: inherit;
              }
              .operations-rbc .rbc-toolbar {
                padding: 16px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                background: transparent !important;
              }
              .operations-rbc .rbc-toolbar button {
                color: #7a8896;
                background: transparent;
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 10px;
                padding: 6px 14px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.15s;
              }
              .operations-rbc .rbc-toolbar button:hover {
                color: #fff;
                border-color: rgba(255, 255, 255, 0.18);
                background: rgba(255, 255, 255, 0.04);
              }
              .operations-rbc .rbc-toolbar button.rbc-active {
                color: #36f57c;
                border-color: rgba(52, 242, 127, 0.4);
                background: rgba(52, 242, 127, 0.1);
              }
              .operations-rbc .rbc-toolbar-label {
                font-size: 15px;
                font-weight: 600;
                color: #fff;
              }

              .operations-rbc .rbc-time-view {
                border: none !important;
                background: transparent !important;
              }
              .operations-rbc .rbc-time-view .rbc-row {
                background: transparent !important;
              }
              .operations-rbc .rbc-time-header {
                border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
                background: transparent !important;
              }
              .operations-rbc .rbc-time-header-content {
                border-left: 1px solid rgba(255, 255, 255, 0.05) !important;
                background: transparent !important;
              }
              .operations-rbc .rbc-time-header-gutter {
                background: transparent !important;
                border-color: rgba(255, 255, 255, 0.06) !important;
              }
              .operations-rbc .rbc-allday-cell {
                background: transparent !important;
              }
              .operations-rbc .rbc-time-content {
                background: transparent !important;
                border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
              }
              .operations-rbc .rbc-time-content > * + * > * {
                border-left: 1px solid rgba(255, 255, 255, 0.05) !important;
              }
              .operations-rbc .rbc-time-gutter {
                background: transparent !important;
              }
              .operations-rbc .rbc-time-column {
                background: transparent !important;
              }
              .operations-rbc .rbc-timeslot-group {
                border-bottom: 1px solid rgba(255, 255, 255, 0.04) !important;
                background: transparent !important;
              }
              .operations-rbc .rbc-day-slot {
                background: transparent !important;
              }
              .operations-rbc .rbc-day-slot .rbc-time-slot {
                border-top: 1px solid rgba(255, 255, 255, 0.025) !important;
                background: transparent !important;
              }
              .operations-rbc .rbc-today {
                background: rgba(52, 242, 127, 0.03) !important;
              }

              .operations-rbc .rbc-header {
                padding: 10px 0;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.12em;
                color: #7a8896;
                background: rgba(255, 255, 255, 0.02) !important;
                border-color: rgba(255, 255, 255, 0.06) !important;
              }
              .operations-rbc .rbc-header + .rbc-header {
                border-left: 1px solid rgba(255, 255, 255, 0.05) !important;
              }
              .operations-rbc .rbc-time-slot,
              .operations-rbc .rbc-label {
                color: #4a5568;
                font-size: 11px;
                background: transparent !important;
              }
              .operations-rbc .rbc-current-time-indicator {
                background: #36f57c !important;
                height: 2px;
                box-shadow: 0 0 6px rgba(52, 242, 127, 0.5);
              }

              .operations-rbc .rbc-events-container {
                margin-right: 0;
              }
              .operations-rbc .rbc-day-slot .rbc-event {
                border: none;
                background: transparent;
              }
              .operations-rbc .rbc-event {
                outline: none !important;
              }

              .operations-rbc .rbc-addons-dnd-resizable {
                cursor: grab;
              }
              .operations-rbc .rbc-addons-dnd-resize-ns-anchor {
                height: 6px;
                background: rgba(52, 242, 127, 0.4);
                cursor: ns-resize;
                border-radius: 0 0 6px 6px;
              }
              .operations-rbc .rbc-addons-dnd-resize-ew-anchor {
                width: 6px;
                background: rgba(52, 242, 127, 0.4);
                cursor: ew-resize;
              }

              .operations-rbc .rbc-agenda-view {
                background: transparent;
              }
              .operations-rbc .rbc-agenda-view table {
                color: #e2ddd6;
                border-color: rgba(255, 255, 255, 0.06) !important;
              }
              .operations-rbc .rbc-agenda-view .rbc-agenda-date-cell,
              .operations-rbc .rbc-agenda-view .rbc-agenda-time-cell {
                color: #7a8896;
                font-size: 12px;
              }
            `}</style>

            <DnDCalendar
              culture="pt-BR"
              date={date}
              dayLayoutAlgorithm="no-overlap"
              defaultView="day"
              draggableAccessor={() => Boolean(onEventDrop)}
              eventPropGetter={(event) => {
                const tone = getComandaTone(event.status)
                return {
                  style: {
                    background: 'transparent',
                    border: 'none',
                    boxShadow: 'none',
                    padding: 0,
                  },
                  className: tone.className,
                }
              }}
              events={calendarEvents}
              localizer={localizer}
              max={buildTimeBoundary(date, 23, 0)}
              min={buildTimeBoundary(date, 8, 0)}
              messages={{
                agenda: 'Agenda',
                day: 'Dia',
                month: 'Mês',
                next: '›',
                noEventsInRange: 'Nenhuma operação neste período.',
                previous: '‹',
                showMore: (count) => `+ ${count} mais`,
                today: 'Hoje',
                week: 'Semana',
                work_week: 'Semana útil',
              }}
              onEventDrop={({ event, start, end, resourceId }) => {
                onEventDrop?.({
                  id: event.id,
                  start: new Date(start),
                  end: new Date(end),
                  resourceId: resourceId ? String(resourceId) : undefined,
                })
              }}
              onEventResize={({ event, start, end }) => {
                onEventResize?.({
                  id: event.id,
                  start: new Date(start),
                  end: new Date(end),
                })
              }}
              onNavigate={(nextDate) => setDate(nextDate)}
              onView={(nextView) => setView(nextView)}
              popup
              resizable={Boolean(onEventResize)}
              resourceIdAccessor="id"
              resourceTitleAccessor="title"
              resources={resources}
              selectable="ignoreEvents"
              step={30}
              timeslots={2}
              view={view}
              views={['day', 'week', 'agenda']}
              components={{
                event: OperationEventCard,
                resourceHeader: OperationResourceHeader,
              }}
            />
          </div>
        ) : (
          <div className="flex min-h-[320px] items-center justify-center rounded-[24px] border border-dashed border-white/8 bg-[rgba(255,255,255,0.02)]">
            <div className="max-w-md text-center">
              <Layers3 className="mx-auto size-10 text-[var(--text-soft)]/70" />
              <p className="mt-4 text-sm font-medium text-white">Nenhum recurso carregado ainda.</p>
              <p className="mt-2 text-sm text-[var(--text-soft)]">
                Assim que os dados vierem do banco, esta agenda operacional passa a refletir a equipe e as mesas com
                drag-and-drop.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function OperationEventCard({ event }: Readonly<EventProps<TimelineCalendarEvent>>) {
  const tone = getComandaTone(event.status)

  return (
    <div className="h-full rounded-[16px] border border-white/8 bg-[rgba(255,255,255,0.04)] px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${tone.className}`}
        >
          {tone.label}
        </span>
        <span className="text-[11px] text-[var(--text-soft)]">{formatMoney(event.amount)}</span>
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-white">{event.title}</p>
      <p className="truncate text-xs text-[var(--text-soft)]">
        Mesa {event.tableLabel} · {event.employeeName}
      </p>
      <p className="mt-2 text-[11px] text-[var(--text-soft)]">
        {formatShortTime(event.start.toISOString())} - {formatShortTime(event.end.toISOString())}
      </p>
    </div>
  )
}

function OperationResourceHeader({ resource }: Readonly<ResourceHeaderProps<OperationTimelineResource>>) {
  const tone = getCashSessionTone(resource.status)

  return (
    <div className="flex min-h-[56px] flex-col justify-center gap-1 px-2 py-2">
      <p className="truncate text-sm font-semibold text-white">{resource.title}</p>
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${tone.className}`}
        >
          {tone.label}
        </span>
        {resource.subtitle ? (
          <span className="truncate text-[11px] text-[var(--text-soft)]">{resource.subtitle}</span>
        ) : null}
      </div>
    </div>
  )
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: Readonly<{
  icon: LucideIcon
  label: string
  value: string
}>) {
  return (
    <div className="rounded-[18px] border border-white/6 bg-[rgba(255,255,255,0.02)] px-4 py-3">
      <Icon className="size-4 text-[var(--text-soft)]" />
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}

function buildTimeBoundary(date: Date, hours: number, minutes: number) {
  const boundary = new Date(date)
  boundary.setHours(hours, minutes, 0, 0)
  return boundary
}
