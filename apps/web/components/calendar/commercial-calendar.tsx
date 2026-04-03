'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, ArrowRight, CalendarDays, Plus, X } from 'lucide-react'

export type ActivityType = 'evento' | 'jogo' | 'promocao' | 'reuniao' | 'outro'

export type CommercialActivity = {
  id: string
  title: string
  type: ActivityType
  start: Date
  end: Date
  descricao?: string
  impactoEsperado?: number
}

type ManualCalendarView = 'week' | 'month' | 'agenda'

const ACTIVITY_COLORS: Record<ActivityType, { bg: string; border: string; text: string; dot: string }> = {
  evento: { bg: 'rgba(239,68,68,0.16)', border: 'rgba(239,68,68,0.4)', text: '#fca5a5', dot: '#ef4444' },
  jogo: { bg: 'rgba(234,179,8,0.16)', border: 'rgba(234,179,8,0.4)', text: '#fde047', dot: '#eab308' },
  promocao: { bg: 'rgba(54,245,124,0.14)', border: 'rgba(54,245,124,0.38)', text: '#86efac', dot: '#36f57c' },
  reuniao: { bg: 'rgba(96,165,250,0.14)', border: 'rgba(96,165,250,0.38)', text: '#93c5fd', dot: '#60a5fa' },
  outro: { bg: 'rgba(168,85,247,0.14)', border: 'rgba(168,85,247,0.38)', text: '#c4b5fd', dot: '#a855f7' },
}

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  evento: 'Evento',
  jogo: 'Jogo',
  promocao: 'Promoção',
  reuniao: 'Reunião',
  outro: 'Outro',
}

const INITIAL_ACTIVITIES: CommercialActivity[] = [
  {
    id: '1',
    title: 'Happy Hour Sexta',
    type: 'promocao',
    start: new Date(2026, 2, 21, 17, 0),
    end: new Date(2026, 2, 21, 20, 0),
    descricao: 'Desconto de 20% em bebidas',
    impactoEsperado: 35,
  },
  {
    id: '2',
    title: 'Jogo do Brasileirão',
    type: 'jogo',
    start: new Date(2026, 2, 23, 16, 0),
    end: new Date(2026, 2, 23, 18, 0),
    descricao: 'Transmissão no telão',
    impactoEsperado: 60,
  },
  {
    id: '3',
    title: 'Lançamento Cardápio Verão',
    type: 'evento',
    start: new Date(2026, 2, 28, 19, 0),
    end: new Date(2026, 2, 28, 23, 0),
    descricao: 'Novos pratos e bebidas sazonais',
    impactoEsperado: 45,
  },
]

type ActivityModalProps = {
  activity?: CommercialActivity | null
  initialStart?: Date
  onSave: (data: Omit<CommercialActivity, 'id'>) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

function ActivityModal({ activity, initialStart, onSave, onDelete, onClose }: Readonly<ActivityModalProps>) {
  const isEditing = Boolean(activity)
  const [title, setTitle] = useState(activity?.title ?? '')
  const [type, setType] = useState<ActivityType>(activity?.type ?? 'evento')
  const [descricao, setDescricao] = useState(activity?.descricao ?? '')
  const [impacto, setImpacto] = useState<number | ''>(activity?.impactoEsperado ?? '')

  const defaultDate = initialStart ?? activity?.start ?? new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const toInput = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

  const [startStr, setStartStr] = useState(toInput(activity?.start ?? defaultDate))
  const [endStr, setEndStr] = useState(toInput(activity?.end ?? new Date(defaultDate.getTime() + 2 * 60 * 60 * 1000)))

  function handleSave() {
    if (!title.trim()) return
    onSave({
      title: title.trim(),
      type,
      start: new Date(startStr),
      end: new Date(endStr),
      descricao: descricao || undefined,
      impactoEsperado: impacto !== '' ? Number(impacto) : undefined,
    })
  }

  const colors = ACTIVITY_COLORS[type]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="imperial-card relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] p-6">
          <h2 className="text-lg font-semibold text-white">
            {isEditing ? 'Editar Atividade' : 'Nova Atividade Comercial'}
          </h2>
          <button
            className="flex size-8 items-center justify-center rounded-[12px] border border-[rgba(255,255,255,0.08)] text-[var(--text-soft)] hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
              Nome
            </label>
            <input
              autoFocus
              className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm text-white outline-none focus:border-[rgba(52,242,127,0.3)] placeholder:text-[var(--text-soft)]"
              placeholder="Ex: Happy Hour, Jogo do Flamengo..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
              Tipo
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ACTIVITY_LABELS) as ActivityType[]).map((entry) => {
                const isActive = type === entry
                const tone = ACTIVITY_COLORS[entry]
                return (
                  <button
                    key={entry}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
                    style={{
                      background: isActive ? tone.bg : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isActive ? tone.border : 'rgba(255,255,255,0.08)'}`,
                      color: isActive ? tone.text : 'var(--text-soft)',
                    }}
                    type="button"
                    onClick={() => setType(entry)}
                  >
                    <span className="size-2 rounded-full" style={{ background: isActive ? tone.dot : '#7a8896' }} />
                    {ACTIVITY_LABELS[entry]}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                Início
              </label>
              <input
                className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm text-white outline-none focus:border-[rgba(52,242,127,0.3)] [color-scheme:dark]"
                type="datetime-local"
                value={startStr}
                onChange={(e) => setStartStr(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                Fim
              </label>
              <input
                className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm text-white outline-none focus:border-[rgba(52,242,127,0.3)] [color-scheme:dark]"
                type="datetime-local"
                value={endStr}
                onChange={(e) => setEndStr(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
              Descrição (opcional)
            </label>
            <textarea
              className="w-full resize-none rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm text-white outline-none focus:border-[rgba(52,242,127,0.3)] placeholder:text-[var(--text-soft)]"
              placeholder="Detalhes da atividade..."
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
              Impacto esperado em vendas %
            </label>
            <input
              className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm text-white outline-none focus:border-[rgba(52,242,127,0.3)] placeholder:text-[var(--text-soft)]"
              max="200"
              min="0"
              placeholder="Ex: 30"
              type="number"
              value={impacto}
              onChange={(e) => setImpacto(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex gap-3 border-t border-[rgba(255,255,255,0.06)] p-6">
          {isEditing && onDelete && activity ? (
            <button
              className="rounded-[14px] border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-4 py-3 text-sm font-semibold text-[#fca5a5] hover:bg-[rgba(239,68,68,0.14)]"
              type="button"
              onClick={() => {
                onDelete(activity.id)
                onClose()
              }}
            >
              Excluir
            </button>
          ) : null}
          <button
            className="flex-1 rounded-[14px] py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!title.trim()}
            style={{
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              color: colors.text,
            }}
            type="button"
            onClick={handleSave}
          >
            {isEditing ? 'Salvar Alterações' : 'Criar Atividade'}
          </button>
        </div>
      </div>
    </div>
  )
}

function UpcomingEvents({ activities }: { activities: CommercialActivity[] }) {
  const upcoming = activities
    .filter((activity) => activity.start >= new Date())
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 4)

  if (upcoming.length === 0) return null

  return (
    <div className="imperial-card-soft rounded-[20px] p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">Próximas atividades</p>
      <div className="space-y-2">
        {upcoming.map((activity) => {
          const tone = ACTIVITY_COLORS[activity.type]
          return (
            <div key={activity.id} className="flex items-center gap-3">
              <span className="size-2 shrink-0 rounded-full" style={{ background: tone.dot }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{activity.title}</p>
              </div>
              <p className="shrink-0 text-xs text-[var(--text-soft)]">
                {format(activity.start, 'dd/MM', { locale: ptBR })}
              </p>
              {activity.impactoEsperado ? (
                <span className="shrink-0 rounded-full bg-[rgba(52,242,127,0.1)] px-2 py-0.5 text-[10px] font-bold text-[#36f57c]">
                  +{activity.impactoEsperado}%
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function CommercialCalendar() {
  const [activities, setActivities] = useState<CommercialActivity[]>(INITIAL_ACTIVITIES)
  const [view, setView] = useState<ManualCalendarView>('week')
  const [date, setDate] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [selectedSlotStart, setSelectedSlotStart] = useState<Date | undefined>()
  const [editingActivity, setEditingActivity] = useState<CommercialActivity | null>(null)

  const visibleRange = useMemo(() => {
    if (view === 'week') {
      return {
        start: startOfWeek(date, { locale: ptBR }),
        end: endOfWeek(date, { locale: ptBR }),
      }
    }

    if (view === 'month') {
      return {
        start: startOfWeek(startOfMonth(date), { locale: ptBR }),
        end: endOfWeek(endOfMonth(date), { locale: ptBR }),
      }
    }

    return {
      start: startOfWeek(date, { locale: ptBR }),
      end: addWeeks(endOfWeek(date, { locale: ptBR }), 3),
    }
  }, [date, view])

  const visibleDays = useMemo(
    () => eachDayOfInterval({ start: visibleRange.start, end: visibleRange.end }),
    [visibleRange],
  )

  const visibleActivities = useMemo(
    () =>
      [...activities]
        .filter((activity) => activity.end >= visibleRange.start && activity.start <= visibleRange.end)
        .sort((a, b) => a.start.getTime() - b.start.getTime()),
    [activities, visibleRange],
  )

  const totalImpacto = visibleActivities.reduce((sum, activity) => sum + (activity.impactoEsperado ?? 0), 0)
  const promoCount = visibleActivities.filter((activity) => activity.type === 'promocao').length
  const eventCount = visibleActivities.length

  const groupedByDay = useMemo(() => {
    const map = new Map<string, CommercialActivity[]>()

    for (const day of visibleDays) {
      map.set(day.toDateString(), [])
    }

    for (const activity of visibleActivities) {
      const key = new Date(activity.start).toDateString()
      const bucket = map.get(key)
      if (bucket) bucket.push(activity)
    }

    return map
  }, [visibleActivities, visibleDays])

  const navigate = useCallback(
    (direction: 'prev' | 'next') => {
      setDate((current) => {
        if (view === 'week') {
          return direction === 'prev' ? subWeeks(current, 1) : addWeeks(current, 1)
        }
        if (view === 'month') {
          return direction === 'prev' ? subMonths(current, 1) : addMonths(current, 1)
        }
        return direction === 'prev' ? subWeeks(current, 4) : addWeeks(current, 4)
      })
    },
    [view],
  )

  const openNewActivity = useCallback((start: Date) => {
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap gap-3">
            {(Object.keys(ACTIVITY_LABELS) as ActivityType[]).map((entry) => {
              const tone = ACTIVITY_COLORS[entry]
              const count = activities.filter((activity) => activity.type === entry).length
              return (
                <span
                  key={entry}
                  className="flex items-center gap-1.5 text-xs font-medium"
                  style={{ color: tone.text }}
                >
                  <span className="size-2.5 rounded-full" style={{ background: tone.dot }} />
                  {ACTIVITY_LABELS[entry]}
                  {count > 0 ? (
                    <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: tone.bg }}>
                      {count}
                    </span>
                  ) : null}
                </span>
              )
            })}
          </div>

          {totalImpacto > 0 ? (
            <span className="rounded-full border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.07)] px-2.5 py-1 text-xs font-semibold text-[#8fffb9]">
              +{totalImpacto}% impacto planejado
            </span>
          ) : null}
        </div>

        <button
          className="flex items-center gap-2 rounded-[14px] border border-[rgba(52,242,127,0.4)] bg-[rgba(52,242,127,0.1)] px-4 py-2.5 text-sm font-semibold text-[#36f57c] transition-all hover:bg-[rgba(52,242,127,0.18)]"
          type="button"
          onClick={() => openNewActivity(new Date())}
        >
          <Plus className="size-4" />
          Nova Atividade
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="imperial-card-soft rounded-[24px] p-4">
          <div className="flex flex-col gap-4 border-b border-[rgba(255,255,255,0.06)] pb-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <button
                className="flex size-9 items-center justify-center rounded-xl border border-[rgba(255,255,255,0.08)] text-[var(--text-soft)] transition hover:border-[rgba(255,255,255,0.14)] hover:text-white"
                type="button"
                onClick={() => navigate('prev')}
              >
                <ArrowLeft className="size-4" />
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                  Agenda comercial
                </p>
                <h3 className="mt-1 text-lg font-semibold text-white">
                  {formatRangeLabel(view, visibleRange.start, visibleRange.end)}
                </h3>
              </div>
              <button
                className="flex size-9 items-center justify-center rounded-xl border border-[rgba(255,255,255,0.08)] text-[var(--text-soft)] transition hover:border-[rgba(255,255,255,0.14)] hover:text-white"
                type="button"
                onClick={() => navigate('next')}
              >
                <ArrowRight className="size-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ['week', 'Semana'],
                  ['month', 'Mês'],
                  ['agenda', 'Agenda'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    view === id
                      ? 'bg-[rgba(52,242,127,0.12)] text-[#8fffb9]'
                      : 'bg-[rgba(255,255,255,0.04)] text-[var(--text-soft)] hover:text-white'
                  }`}
                  type="button"
                  onClick={() => setView(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            {view === 'week' ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
                {visibleDays.slice(0, 7).map((day) => (
                  <DayColumn
                    key={day.toISOString()}
                    activities={groupedByDay.get(day.toDateString()) ?? []}
                    day={day}
                    onCreate={openNewActivity}
                    onEdit={setEditingActivity}
                  />
                ))}
              </div>
            ) : null}

            {view === 'month' ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
                {visibleDays.map((day) => (
                  <MonthCell
                    key={day.toISOString()}
                    activities={groupedByDay.get(day.toDateString()) ?? []}
                    day={day}
                    inMonth={isSameMonth(day, date)}
                    onCreate={openNewActivity}
                    onEdit={setEditingActivity}
                  />
                ))}
              </div>
            ) : null}

            {view === 'agenda' ? (
              <div className="space-y-4">
                {visibleDays
                  .filter((day) => (groupedByDay.get(day.toDateString()) ?? []).length > 0)
                  .map((day) => (
                    <AgendaDaySection
                      key={day.toISOString()}
                      activities={groupedByDay.get(day.toDateString()) ?? []}
                      day={day}
                      onCreate={openNewActivity}
                      onEdit={setEditingActivity}
                    />
                  ))}
                {visibleActivities.length === 0 ? <EmptyAgenda onCreate={openNewActivity} /> : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <UpcomingEvents activities={activities} />

          <div className="imperial-card-soft rounded-[20px] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">Resumo do recorte</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MetricPill label="Atividades" value={String(eventCount)} />
              <MetricPill label="Promoções" value={String(promoCount)} tone="success" />
              <MetricPill label="Impacto" value={`+${totalImpacto}%`} tone="accent" />
              <MetricPill
                label="Janela"
                value={view === 'week' ? '7 dias' : view === 'month' ? 'Mês' : '30 dias'}
                tone="info"
              />
            </div>
          </div>

          <div className="rounded-[16px] border border-[rgba(52,242,127,0.12)] bg-[rgba(52,242,127,0.04)] p-4">
            <p className="text-xs font-semibold text-[#8fffb9]">Leitura manual</p>
            <ul className="mt-2 space-y-1.5 text-xs text-[var(--text-soft)]">
              <li>• Clique em um dia para criar</li>
              <li>• Clique em um card para editar</li>
              <li>• Use a visão semanal para ritmo operacional</li>
              <li>• Use agenda para enxergar o calendário como lista real</li>
            </ul>
          </div>
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

function DayColumn({
  day,
  activities,
  onCreate,
  onEdit,
}: Readonly<{
  day: Date
  activities: CommercialActivity[]
  onCreate: (day: Date) => void
  onEdit: (activity: CommercialActivity) => void
}>) {
  return (
    <div className="rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
            {format(day, 'EEEE', { locale: ptBR })}
          </p>
          <p className={`mt-1 text-sm font-semibold ${isToday(day) ? 'text-[#8fffb9]' : 'text-white'}`}>
            {format(day, "dd 'de' MMM", { locale: ptBR })}
          </p>
        </div>
        <button
          className="rounded-full border border-[rgba(255,255,255,0.08)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)] transition hover:border-[rgba(255,255,255,0.14)] hover:text-white"
          type="button"
          onClick={() => onCreate(day)}
        >
          Novo
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {activities.length ? (
          activities.map((activity) => <ActivityCard activity={activity} compact key={activity.id} onEdit={onEdit} />)
        ) : (
          <button
            className="flex min-h-[132px] w-full flex-col items-center justify-center rounded-[16px] border border-dashed border-[rgba(255,255,255,0.08)] text-center text-sm text-[var(--text-soft)] transition hover:border-[rgba(255,255,255,0.14)] hover:text-white"
            type="button"
            onClick={() => onCreate(day)}
          >
            <Plus className="mb-2 size-4" />
            Sem atividade
          </button>
        )}
      </div>
    </div>
  )
}

function MonthCell({
  day,
  activities,
  inMonth,
  onCreate,
  onEdit,
}: Readonly<{
  day: Date
  activities: CommercialActivity[]
  inMonth: boolean
  onCreate: (day: Date) => void
  onEdit: (activity: CommercialActivity) => void
}>) {
  return (
    <div
      className={`rounded-[18px] border p-3 ${
        inMonth
          ? 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]'
          : 'border-[rgba(255,255,255,0.04)] bg-[rgba(0,0,0,0.16)]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className={`text-sm font-semibold ${isToday(day) ? 'text-[#8fffb9]' : inMonth ? 'text-white' : 'text-[var(--text-soft)]'}`}
        >
          {format(day, 'dd/MM', { locale: ptBR })}
        </p>
        <button
          className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)] transition hover:text-white"
          type="button"
          onClick={() => onCreate(day)}
        >
          +
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {activities.slice(0, 2).map((activity) => (
          <ActivityCard activity={activity} compact key={activity.id} onEdit={onEdit} />
        ))}
        {activities.length > 2 ? (
          <button
            className="rounded-full bg-[rgba(255,255,255,0.04)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]"
            type="button"
            onClick={() => onEdit(activities[0])}
          >
            +{activities.length - 2} mais
          </button>
        ) : null}
        {!activities.length ? <div className="min-h-10 rounded-[12px] bg-[rgba(255,255,255,0.02)]" /> : null}
      </div>
    </div>
  )
}

function AgendaDaySection({
  day,
  activities,
  onCreate,
  onEdit,
}: Readonly<{
  day: Date
  activities: CommercialActivity[]
  onCreate: (day: Date) => void
  onEdit: (activity: CommercialActivity) => void
}>) {
  return (
    <div className="rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
            {format(day, 'EEEE', { locale: ptBR })}
          </p>
          <h3 className={`mt-1 text-lg font-semibold ${isToday(day) ? 'text-[#8fffb9]' : 'text-white'}`}>
            {format(day, "dd 'de' MMMM", { locale: ptBR })}
          </h3>
        </div>
        <button
          className="rounded-full border border-[rgba(255,255,255,0.08)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)] transition hover:border-[rgba(255,255,255,0.14)] hover:text-white"
          type="button"
          onClick={() => onCreate(day)}
        >
          Nova atividade
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {activities.map((activity) => (
          <ActivityCard activity={activity} key={activity.id} onEdit={onEdit} />
        ))}
      </div>
    </div>
  )
}

function ActivityCard({
  activity,
  compact = false,
  onEdit,
}: Readonly<{
  activity: CommercialActivity
  compact?: boolean
  onEdit: (activity: CommercialActivity) => void
}>) {
  const tone = ACTIVITY_COLORS[activity.type]

  return (
    <button
      className={`w-full rounded-[16px] border px-3 py-3 text-left transition hover:translate-y-[-1px] ${
        compact ? 'min-h-[86px]' : 'min-h-[116px]'
      }`}
      style={{
        background: tone.bg,
        borderColor: tone.border,
      }}
      type="button"
      onClick={() => onEdit(activity)}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: tone.text }}
        >
          <span className="size-2 rounded-full" style={{ background: tone.dot }} />
          {ACTIVITY_LABELS[activity.type]}
        </span>
        <span className="text-[11px] text-[var(--text-soft)]">
          {format(activity.start, 'HH:mm', { locale: ptBR })} — {format(activity.end, 'HH:mm', { locale: ptBR })}
        </span>
      </div>

      <p className="mt-2 text-sm font-semibold text-white">{activity.title}</p>
      {!compact && activity.descricao ? (
        <p className="mt-2 text-xs leading-6 text-[var(--text-soft)]">{activity.descricao}</p>
      ) : null}
      {activity.impactoEsperado ? (
        <span className="mt-3 inline-flex rounded-full bg-[rgba(52,242,127,0.12)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8fffb9]">
          +{activity.impactoEsperado}% impacto esperado
        </span>
      ) : null}
    </button>
  )
}

function MetricPill({
  label,
  value,
  tone = 'default',
}: Readonly<{
  label: string
  value: string
  tone?: 'default' | 'success' | 'accent' | 'info'
}>) {
  const toneClass =
    tone === 'success'
      ? 'border-[rgba(52,242,127,0.14)] bg-[rgba(52,242,127,0.08)] text-[#8fffb9]'
      : tone === 'accent'
        ? 'border-[rgba(201,168,76,0.14)] bg-[rgba(201,168,76,0.08)] text-[#f4d78b]'
        : tone === 'info'
          ? 'border-[rgba(96,165,250,0.14)] bg-[rgba(96,165,250,0.08)] text-[#93c5fd]'
          : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-white'

  return (
    <div className={`rounded-[16px] border px-3 py-3 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

function EmptyAgenda({ onCreate }: { onCreate: (day: Date) => void }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[20px] border border-dashed border-[rgba(255,255,255,0.08)] text-center">
      <CalendarDays className="size-8 text-[var(--text-soft)]" />
      <p className="mt-4 text-sm font-medium text-white">Nenhuma atividade neste recorte.</p>
      <p className="mt-2 text-sm text-[var(--text-soft)]">
        Crie uma nova ação comercial para alimentar o calendário manual.
      </p>
      <button
        className="mt-4 rounded-full border border-[rgba(255,255,255,0.08)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)] transition hover:border-[rgba(255,255,255,0.14)] hover:text-white"
        type="button"
        onClick={() => onCreate(new Date())}
      >
        Criar atividade
      </button>
    </div>
  )
}

function formatRangeLabel(view: ManualCalendarView, start: Date, end: Date) {
  if (view === 'week') {
    return `${format(start, "dd 'de' MMM", { locale: ptBR })} — ${format(end, "dd 'de' MMM", { locale: ptBR })}`
  }

  if (view === 'month') {
    return format(startOfMonth(start), "MMMM 'de' yyyy", { locale: ptBR })
  }

  return `${format(start, "dd 'de' MMM", { locale: ptBR })} — ${format(end, "dd 'de' MMM", { locale: ptBR })}`
}
