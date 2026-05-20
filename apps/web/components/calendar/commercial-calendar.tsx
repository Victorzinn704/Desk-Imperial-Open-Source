'use client'

import { useCallback, useMemo, useState } from 'react'
import type { View } from 'react-big-calendar'
import type { withDragAndDropProps } from 'react-big-calendar/lib/addons/dragAndDrop'
import { addDays, endOfDay, isWithinInterval } from 'date-fns'
import { Plus, Trophy } from 'lucide-react'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import { Button } from '@/components/shared/button'
import { VascoCalendarWidget } from '@/components/shared/football-widgets'
import {
  LabFilterChip,
  LabMetricStrip,
  LabMetricStripItem,
  LabPanel,
  LabStatusPill,
} from '@/components/design-lab/lab-primitives'
import { ActivityEventContent, FootballGameRail, groupFootballGameDays } from './commercial-calendar-football'
import { ActivityModal } from './commercial-calendar-modal'
import {
  ACTIVITY_LABELS,
  ACTIVITY_STYLES,
  type ActivityFilter,
  type ActivityType,
  type CommercialActivity,
  compareActivities,
  DnDCalendar,
  eventStyleGetter,
  formatDateTime,
  getPeriodRange,
  INITIAL_ACTIVITIES,
  isSameCalendarDay,
  localizer,
  VIEW_LABELS,
} from './commercial-calendar.model'
import { PlanningRadar } from './commercial-calendar-radar'
import { CALENDAR_THEME } from './commercial-calendar.theme'

export { ActivityModal } from './commercial-calendar-modal'

export function CommercialCalendar() {
  const [activities, setActivities] = useState<CommercialActivity[]>(INITIAL_ACTIVITIES)
  const [view, setView] = useState<View>('month')
  const [date, setDate] = useState(new Date())
  const [filter, setFilter] = useState<ActivityFilter>('all')
  const [showModal, setShowModal] = useState(false)
  const [selectedSlotStart, setSelectedSlotStart] = useState<Date | undefined>()
  const [editingActivity, setEditingActivity] = useState<CommercialActivity | null>(null)

  const onEventDrop = useCallback<NonNullable<withDragAndDropProps<CommercialActivity>['onEventDrop']>>(
    ({ event, start, end }) => {
      setActivities((prev) =>
        prev.map((activity) =>
          activity.id === event.id ? { ...activity, start: new Date(start), end: new Date(end) } : activity,
        ),
      )
    },
    [],
  )

  const onEventResize = useCallback<NonNullable<withDragAndDropProps<CommercialActivity>['onEventResize']>>(
    ({ event, start, end }) => {
      setActivities((prev) =>
        prev.map((activity) =>
          activity.id === event.id ? { ...activity, start: new Date(start), end: new Date(end) } : activity,
        ),
      )
    },
    [],
  )

  const handleSelectSlot = useCallback(({ start }: { start: Date }) => {
    setSelectedSlotStart(start)
    setShowModal(true)
  }, [])

  function handleSave(data: Omit<CommercialActivity, 'id'>) {
    if (editingActivity) {
      setActivities((prev) =>
        prev.map((activity) => (activity.id === editingActivity.id ? { ...activity, ...data } : activity)),
      )
      setEditingActivity(null)
      return
    }

    setActivities((prev) => [...prev, { ...data, id: String(Date.now()) }])
    setShowModal(false)
    setSelectedSlotStart(undefined)
  }

  function handleDelete(id: string) {
    setActivities((prev) => prev.filter((activity) => activity.id !== id))
  }

  const messages = {
    month: 'Mes',
    week: 'Semana',
    work_week: 'Semana',
    day: 'Dia',
    agenda: 'Agenda',
    today: 'Hoje',
    previous: '‹',
    next: '›',
    noEventsInRange: 'Nenhuma atividade neste periodo.',
    showMore: (total: number) => `+ ${total} mais`,
  }

  const filteredActivities = useMemo(() => {
    const scoped = filter === 'all' ? activities : activities.filter((activity) => activity.type === filter)
    return [...scoped].sort(compareActivities)
  }, [activities, filter])

  const periodRange = useMemo(() => getPeriodRange(view, date), [date, view])

  const now = new Date()
  const todayActivities = filteredActivities.filter((activity) => isSameCalendarDay(activity.start, now))
  const upcomingActivities = filteredActivities
    .filter((activity) => activity.start >= now)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
  const nextActivity = upcomingActivities[0]
  const nextSevenDaysActivities = upcomingActivities.filter((activity) =>
    isWithinInterval(activity.start, { start: now, end: endOfDay(addDays(now, 7)) }),
  )
  const periodActivities = filteredActivities.filter((activity) =>
    isWithinInterval(activity.start, { start: periodRange.start, end: periodRange.end }),
  )
  const periodFootballGameDays = groupFootballGameDays(periodActivities)
  const periodImpacto = periodActivities.reduce((sum, activity) => sum + (activity.impactoEsperado ?? 0), 0)
  const nextSevenDaysImpact = nextSevenDaysActivities.reduce(
    (sum, activity) => sum + (activity.impactoEsperado ?? 0),
    0,
  )

  const summaryRows = (Object.keys(ACTIVITY_LABELS) as ActivityType[])
    .map((type) => {
      const style = ACTIVITY_STYLES[type]
      const count = periodActivities.filter((activity) => activity.type === type).length
      const impact = periodActivities
        .filter((activity) => activity.type === type && activity.impactoEsperado)
        .reduce((sum, activity) => sum + (activity.impactoEsperado ?? 0), 0)

      return { type, style, count, impact }
    })
    .filter((row) => row.count > 0)

  const leadingType = (Object.keys(ACTIVITY_LABELS) as ActivityType[]).reduce<ActivityType | undefined>(
    (leader, type) => {
      const leaderCount = leader ? periodActivities.filter((activity) => activity.type === leader).length : -1
      const typeCount = periodActivities.filter((activity) => activity.type === type).length

      return typeCount > leaderCount ? type : leader
    },
    undefined,
  )
  const calendarHeight =
    view === 'month'
      ? 'clamp(520px, 66vh, 610px)'
      : view === 'agenda'
        ? 'clamp(500px, 62vh, 560px)'
        : 'clamp(560px, 72vh, 680px)'

  return (
    <div className="space-y-5">
      <LabMetricStrip columnsClassName="lg:grid-cols-2 2xl:grid-cols-4">
        <LabMetricStripItem
          description={
            todayActivities.length > 0
              ? `${todayActivities.length} atividade${todayActivities.length > 1 ? 's' : ''} no dia.`
              : 'Sem atividade agendada hoje.'
          }
          label="Hoje"
          value={
            todayActivities.length > 0 ? (
              String(todayActivities.length)
            ) : (
              <span className="text-[var(--lab-fg-muted)]">0</span>
            )
          }
        />
        <LabMetricStripItem
          description={nextActivity ? nextActivity.title : 'Nao ha novo gatilho comercial programado.'}
          label="Proxima atividade"
          value={nextActivity ? formatDateTime(nextActivity.start) : 'Sem agenda'}
        />
        <LabMetricStripItem
          description={
            nextSevenDaysActivities.length > 0
              ? `Impacto somado de +${nextSevenDaysImpact}%.`
              : 'Nenhuma atividade na proxima janela.'
          }
          label="7 dias"
          value={
            nextSevenDaysActivities.length > 0 ? (
              String(nextSevenDaysActivities.length)
            ) : (
              <span className="text-[var(--lab-fg-muted)]">0</span>
            )
          }
        />
        <LabMetricStripItem
          description={`${VIEW_LABELS[view]} aberta em ${periodRange.label}.`}
          label="Recorte atual"
          value={
            periodActivities.length > 0 ? (
              String(periodActivities.length)
            ) : (
              <span className="text-[var(--lab-fg-muted)]">0</span>
            )
          }
        />
      </LabMetricStrip>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <LabFilterChip
            active={filter === 'all'}
            count={activities.length}
            label="Todas"
            onClick={() => setFilter('all')}
          />
          {(Object.keys(ACTIVITY_LABELS) as ActivityType[]).map((type) => (
            <LabFilterChip
              active={filter === type}
              count={activities.filter((activity) => activity.type === type).length}
              key={type}
              label={ACTIVITY_LABELS[type]}
              onClick={() => setFilter(type)}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filter !== 'all' ? (
            <LabStatusPill tone={ACTIVITY_STYLES[filter].tone}>Filtro: {ACTIVITY_LABELS[filter]}</LabStatusPill>
          ) : null}
          {periodImpacto > 0 ? <LabStatusPill tone="success">+{periodImpacto}% no recorte</LabStatusPill> : null}
          <Button
            size="md"
            type="button"
            onClick={() => {
              setSelectedSlotStart(new Date())
              setShowModal(true)
            }}
          >
            <Plus className="size-4" />
            Nova atividade
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <LabPanel
          action={<LabStatusPill tone="info">{VIEW_LABELS[view]}</LabStatusPill>}
          className="overflow-hidden"
          contentClassName="p-0"
          padding="none"
          subtitle={`${periodActivities.length} atividade${periodActivities.length === 1 ? '' : 's'} no recorte aberto em ${periodRange.label}.`}
          title="Agenda do periodo"
        >
          <FootballGameRail gameDays={periodFootballGameDays} onOpenGame={setEditingActivity} />

          <div className="imperial-cal overflow-hidden">
            <style>{CALENDAR_THEME}</style>
            <DnDCalendar
              resizable
              selectable
              components={{
                event: ActivityEventContent,
              }}
              culture="pt-BR"
              date={date}
              defaultView="month"
              eventPropGetter={eventStyleGetter}
              events={filteredActivities}
              localizer={localizer}
              messages={messages}
              style={{ height: calendarHeight }}
              view={view}
              onEventDrop={onEventDrop}
              onEventResize={onEventResize}
              onNavigate={setDate}
              onSelectEvent={(event) => setEditingActivity(event as CommercialActivity)}
              onSelectSlot={handleSelectSlot}
              onView={setView}
            />
          </div>
        </LabPanel>

        <div className="space-y-4">
          <PlanningRadar
            filteredActivitiesCount={filteredActivities.length}
            leadingType={leadingType}
            nextActivity={nextActivity}
            nextSevenDaysActivities={nextSevenDaysActivities}
            periodActivities={periodActivities}
            summaryRows={summaryRows}
          />

          {filter === 'all' || filter === 'jogo' ? (
            <LabPanel
              action={
                <LabStatusPill icon={<Trophy className="size-3" />} tone="info">
                  vasco
                </LabStatusPill>
              }
              contentClassName="p-0"
              padding="none"
              subtitle="A agenda interna prioriza os cariocas; o widget mantém a leitura oficial do Vasco."
              title="Widget oficial do Vasco"
            >
              <VascoCalendarWidget className="rounded-none border-0 bg-transparent" />
            </LabPanel>
          ) : null}
        </div>
      </div>

      {showModal ? (
        <ActivityModal
          initialStart={selectedSlotStart}
          onClose={() => {
            setShowModal(false)
            setSelectedSlotStart(undefined)
          }}
          onSave={handleSave}
        />
      ) : null}

      {editingActivity ? (
        <ActivityModal
          activity={editingActivity}
          onClose={() => setEditingActivity(null)}
          onDelete={handleDelete}
          onSave={handleSave}
        />
      ) : null}
    </div>
  )
}
