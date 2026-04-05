'use client'

import { useState, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar'
import withDragAndDrop, { type withDragAndDropProps } from 'react-big-calendar/lib/addons/dragAndDrop'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays, Plus, X } from 'lucide-react'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Setup ────────────────────────────────────────────────────────────────────

const locales = { 'pt-BR': ptBR }

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: ptBR }),
  getDay,
  locales,
})

const DnDCalendar = withDragAndDrop<CommercialActivity>(Calendar)

// ─── Colors ───────────────────────────────────────────────────────────────────

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

// ─── Event styling ────────────────────────────────────────────────────────────

function eventStyleGetter(event: CommercialActivity) {
  const colors = ACTIVITY_COLORS[event.type]
  return {
    style: {
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      color: colors.text,
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: 600,
      padding: '2px 6px',
      cursor: 'grab',
    },
  }
}

// ─── New/Edit Activity Modal ──────────────────────────────────────────────────

type ActivityModalProps = {
  activity?: CommercialActivity | null
  initialStart?: Date
  onSave: (data: Omit<CommercialActivity, 'id'>) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

export function ActivityModal({ activity, initialStart, onSave, onDelete, onClose }: Readonly<ActivityModalProps>) {
  const titleInputId = 'commercial-activity-title'
  const startInputId = 'commercial-activity-start'
  const endInputId = 'commercial-activity-end'
  const descriptionInputId = 'commercial-activity-description'
  const impactInputId = 'commercial-activity-impact'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Fechar atividade comercial"
        className="absolute inset-0 border-0 bg-black/70 p-0 backdrop-blur-sm"
        type="button"
        onClick={onClose}
      />
      <div className="imperial-card relative z-10 w-full max-w-md">
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
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]"
              htmlFor={titleInputId}
            >
              Nome
            </label>
            <input
              autoFocus
              id={titleInputId}
              className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm text-white outline-none focus:border-[rgba(52,242,127,0.3)] placeholder:text-[var(--text-soft)]"
              placeholder="Ex: Happy Hour, Jogo do Flamengo..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <p className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
              Tipo
            </p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ACTIVITY_LABELS) as ActivityType[]).map((t) => {
                const isActive = type === t
                const c = ACTIVITY_COLORS[t]
                return (
                  <button
                    key={t}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
                    style={{
                      background: isActive ? c.bg : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isActive ? c.border : 'rgba(255,255,255,0.08)'}`,
                      color: isActive ? c.text : 'var(--text-soft)',
                    }}
                    type="button"
                    onClick={() => setType(t)}
                  >
                    <span className="size-2 rounded-full" style={{ background: isActive ? c.dot : '#7a8896' }} />
                    {ACTIVITY_LABELS[t]}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]"
                htmlFor={startInputId}
              >
                Início
              </label>
              <input
                id={startInputId}
                className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm text-white outline-none focus:border-[rgba(52,242,127,0.3)] [color-scheme:dark]"
                type="datetime-local"
                value={startStr}
                onChange={(e) => setStartStr(e.target.value)}
              />
            </div>
            <div>
              <label
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]"
                htmlFor={endInputId}
              >
                Fim
              </label>
              <input
                id={endInputId}
                className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm text-white outline-none focus:border-[rgba(52,242,127,0.3)] [color-scheme:dark]"
                type="datetime-local"
                value={endStr}
                onChange={(e) => setEndStr(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]"
              htmlFor={descriptionInputId}
            >
              Descrição (opcional)
            </label>
            <textarea
              id={descriptionInputId}
              className="w-full resize-none rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm text-white outline-none focus:border-[rgba(52,242,127,0.3)] placeholder:text-[var(--text-soft)]"
              placeholder="Detalhes da atividade..."
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div>
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]"
              htmlFor={impactInputId}
            >
              Impacto esperado em vendas %
            </label>
            <input
              id={impactInputId}
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
          {isEditing && onDelete && activity && (
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
          )}
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

// ─── Próximos eventos widget ──────────────────────────────────────────────────

function UpcomingEvents({ activities }: { activities: CommercialActivity[] }) {
  const upcoming = activities
    .filter((a) => a.start >= new Date())
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 4)

  if (upcoming.length === 0) return null

  return (
    <div className="imperial-card-soft rounded-[20px] p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">Próximas atividades</p>
      <div className="space-y-2">
        {upcoming.map((a) => {
          const c = ACTIVITY_COLORS[a.type]
          return (
            <div key={a.id} className="flex items-center gap-3">
              <span className="size-2 shrink-0 rounded-full" style={{ background: c.dot }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{a.title}</p>
              </div>
              <p className="shrink-0 text-xs text-[var(--text-soft)]">{format(a.start, 'dd/MM', { locale: ptBR })}</p>
              {a.impactoEsperado && (
                <span className="shrink-0 rounded-full bg-[rgba(52,242,127,0.1)] px-2 py-0.5 text-[10px] font-bold text-[#36f57c]">
                  +{a.impactoEsperado}%
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Calendar ─────────────────────────────────────────────────────────────

export function CommercialCalendar() {
  const [activities, setActivities] = useState<CommercialActivity[]>(INITIAL_ACTIVITIES)
  const [view, setView] = useState<View>('month')
  const [date, setDate] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [selectedSlotStart, setSelectedSlotStart] = useState<Date | undefined>()
  const [editingActivity, setEditingActivity] = useState<CommercialActivity | null>(null)

  // ── Drag: move event ──────────────────────────────────────────────────────
  const onEventDrop = useCallback<NonNullable<withDragAndDropProps<CommercialActivity>['onEventDrop']>>(
    ({ event, start, end }) => {
      setActivities((prev) =>
        prev.map((a) => (a.id === event.id ? { ...a, start: new Date(start), end: new Date(end) } : a)),
      )
    },
    [],
  )

  // ── Drag: resize event ────────────────────────────────────────────────────
  const onEventResize = useCallback<NonNullable<withDragAndDropProps<CommercialActivity>['onEventResize']>>(
    ({ event, start, end }) => {
      setActivities((prev) =>
        prev.map((a) => (a.id === event.id ? { ...a, start: new Date(start), end: new Date(end) } : a)),
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
      setActivities((prev) => prev.map((a) => (a.id === editingActivity.id ? { ...a, ...data } : a)))
      setEditingActivity(null)
    } else {
      setActivities((prev) => [...prev, { ...data, id: String(Date.now()) }])
      setShowModal(false)
      setSelectedSlotStart(undefined)
    }
  }

  function handleDelete(id: string) {
    setActivities((prev) => prev.filter((a) => a.id !== id))
  }

  const messages = {
    month: 'Mês',
    week: 'Semana',
    day: 'Dia',
    agenda: 'Agenda',
    today: 'Hoje',
    previous: '‹',
    next: '›',
    noEventsInRange: 'Nenhuma atividade neste período.',
    showMore: (total: number) => `+ ${total} mais`,
  }

  const totalImpacto = activities
    .filter((a) => a.impactoEsperado !== undefined)
    .reduce((sum, a) => sum + (a.impactoEsperado ?? 0), 0)

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Legenda */}
          <div className="flex flex-wrap gap-3">
            {(Object.keys(ACTIVITY_LABELS) as ActivityType[]).map((t) => {
              const c = ACTIVITY_COLORS[t]
              const count = activities.filter((a) => a.type === t).length
              return (
                <span key={t} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: c.text }}>
                  <span className="size-2.5 rounded-full" style={{ background: c.dot }} />
                  {ACTIVITY_LABELS[t]}
                  {count > 0 && (
                    <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: c.bg }}>
                      {count}
                    </span>
                  )}
                </span>
              )
            })}
          </div>

          {/* Impact total badge */}
          {totalImpacto > 0 && (
            <span className="rounded-full border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.07)] px-2.5 py-1 text-xs font-semibold text-[#8fffb9]">
              +{totalImpacto}% impacto planejado
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-soft)]">Arraste para mover eventos</span>
          <button
            className="flex items-center gap-2 rounded-[14px] border border-[rgba(52,242,127,0.4)] bg-[rgba(52,242,127,0.1)] px-4 py-2.5 text-sm font-semibold text-[#36f57c] transition-all hover:bg-[rgba(52,242,127,0.18)]"
            type="button"
            onClick={() => {
              setSelectedSlotStart(new Date())
              setShowModal(true)
            }}
          >
            <Plus className="size-4" />
            Nova Atividade
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
        {/* Calendar */}
        <div className="imperial-cal imperial-card-soft overflow-hidden rounded-[24px]">
          <style>{`
            .imperial-cal .rbc-calendar { background: transparent !important; color: #e2ddd6; font-family: inherit; }
            .imperial-cal .rbc-toolbar { padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.06); background: transparent !important; }
            .imperial-cal .rbc-toolbar button { color: #7a8896; background: transparent; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 6px 14px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
            .imperial-cal .rbc-toolbar button:hover { color: #fff; border-color: rgba(255,255,255,0.18); background: rgba(255,255,255,0.04); }
            .imperial-cal .rbc-toolbar button.rbc-active { color: #36f57c; border-color: rgba(52,242,127,0.4); background: rgba(52,242,127,0.1); }
            .imperial-cal .rbc-toolbar button.rbc-active:hover { background: rgba(52,242,127,0.16); }
            .imperial-cal .rbc-toolbar-label { font-size: 15px; font-weight: 600; color: #fff; }

            .imperial-cal .rbc-header { padding: 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #7a8896; border-bottom: 1px solid rgba(255,255,255,0.06) !important; background: transparent !important; }
            .imperial-cal .rbc-header + .rbc-header { border-left: 1px solid rgba(255,255,255,0.05) !important; }
            .imperial-cal .rbc-header a, .imperial-cal .rbc-header a:visited { color: #7a8896; text-decoration: none; }

            .imperial-cal .rbc-month-view { border: none !important; background: transparent !important; }
            .imperial-cal .rbc-month-row + .rbc-month-row { border-top: 1px solid rgba(255,255,255,0.05) !important; }
            .imperial-cal .rbc-day-bg + .rbc-day-bg { border-left: 1px solid rgba(255,255,255,0.04) !important; }
            .imperial-cal .rbc-off-range-bg { background: rgba(0,0,0,0.25) !important; }
            .imperial-cal .rbc-today { background: rgba(52,242,127,0.04) !important; }
            .imperial-cal .rbc-date-cell { padding: 6px 8px; font-size: 12px; font-weight: 600; color: #7a8896; }
            .imperial-cal .rbc-date-cell.rbc-now a { color: #36f57c; }

            .imperial-cal .rbc-time-view { border: none !important; background: transparent !important; }
            .imperial-cal .rbc-time-view .rbc-row { background: transparent !important; }
            .imperial-cal .rbc-time-header { border-bottom: 1px solid rgba(255,255,255,0.06) !important; background: transparent !important; }
            .imperial-cal .rbc-time-header-content { border-left: 1px solid rgba(255,255,255,0.05) !important; background: transparent !important; }
            .imperial-cal .rbc-time-header-gutter { background: transparent !important; }
            .imperial-cal .rbc-allday-cell { background: transparent !important; }
            .imperial-cal .rbc-time-content { background: transparent !important; border-top: 1px solid rgba(255,255,255,0.06) !important; }
            .imperial-cal .rbc-time-content > * + * > * { border-left: 1px solid rgba(255,255,255,0.05) !important; }
            .imperial-cal .rbc-time-gutter { background: transparent !important; }
            .imperial-cal .rbc-time-column { background: transparent !important; }
            .imperial-cal .rbc-timeslot-group { border-bottom: 1px solid rgba(255,255,255,0.04) !important; background: transparent !important; }
            .imperial-cal .rbc-time-slot { color: #4a5568; font-size: 11px; background: transparent !important; }
            .imperial-cal .rbc-label { color: #4a5568; font-size: 11px; padding: 0 8px; background: transparent !important; }
            .imperial-cal .rbc-day-slot { background: transparent !important; }
            .imperial-cal .rbc-day-slot .rbc-time-slot { border-top: 1px solid rgba(255,255,255,0.025) !important; background: transparent !important; }
            .imperial-cal .rbc-day-slot .rbc-events-container { margin-right: 8px; }
            .imperial-cal .rbc-current-time-indicator { background: #36f57c !important; height: 2px; box-shadow: 0 0 6px rgba(52,242,127,0.5); }
            .imperial-cal .rbc-slot-selection { background: rgba(52,242,127,0.1) !important; border: 1px solid rgba(52,242,127,0.3) !important; }

            .imperial-cal .rbc-event { outline: none !important; }
            .imperial-cal .rbc-event:focus { outline: 2px solid rgba(52,242,127,0.4) !important; }
            .imperial-cal .rbc-event-label { font-size: 11px; }
            .imperial-cal .rbc-show-more { color: #36f57c; font-size: 11px; font-weight: 600; background: transparent; }

            .imperial-cal .rbc-agenda-view { background: transparent !important; }
            .imperial-cal .rbc-agenda-view table { color: #e2ddd6; border-color: rgba(255,255,255,0.06) !important; width: 100%; background: transparent !important; }
            .imperial-cal .rbc-agenda-view table thead { background: rgba(255,255,255,0.03) !important; }
            .imperial-cal .rbc-agenda-view table thead th { color: #7a8896; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid rgba(255,255,255,0.06) !important; padding: 8px 12px; }
            .imperial-cal .rbc-agenda-view tbody > tr > td { border-bottom: 1px solid rgba(255,255,255,0.04) !important; padding: 8px 12px; background: transparent !important; }
            .imperial-cal .rbc-agenda-view tbody > tr > td + td { border-left: 1px solid rgba(255,255,255,0.04) !important; }
            .imperial-cal .rbc-agenda-date-cell, .imperial-cal .rbc-agenda-time-cell { color: #7a8896; font-size: 12px; }
            .imperial-cal .rbc-agenda-event-cell { color: #e2ddd6; }

            .imperial-cal .rbc-addons-dnd .rbc-addons-dnd-drag-preview { opacity: 0.75; }
            .imperial-cal .rbc-addons-dnd-resizable { cursor: grab; }
            .imperial-cal .rbc-addons-dnd-resize-ns-anchor { height: 6px; background: rgba(52,242,127,0.4); cursor: ns-resize; border-radius: 0 0 6px 6px; }
            .imperial-cal .rbc-addons-dnd-resize-ew-anchor { width: 6px; background: rgba(52,242,127,0.4); cursor: ew-resize; }
          `}</style>

          <DnDCalendar
            culture="pt-BR"
            date={date}
            defaultView="month"
            eventPropGetter={eventStyleGetter}
            events={activities}
            localizer={localizer}
            messages={messages}
            resizable
            selectable
            style={{ height: 620 }}
            view={view}
            onEventDrop={onEventDrop}
            onEventResize={onEventResize}
            onNavigate={setDate}
            onSelectEvent={(event) => setEditingActivity(event as CommercialActivity)}
            onSelectSlot={handleSelectSlot}
            onView={setView}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <UpcomingEvents activities={activities} />

          {/* Stats */}
          <div className="imperial-card-soft rounded-[20px] p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">Resumo do mês</p>
            {(Object.keys(ACTIVITY_LABELS) as ActivityType[]).map((t) => {
              const c = ACTIVITY_COLORS[t]
              const count = activities.filter((a) => a.type === t).length
              const impact = activities
                .filter((a) => a.type === t && a.impactoEsperado)
                .reduce((sum, a) => sum + (a.impactoEsperado ?? 0), 0)
              if (count === 0) return null
              return (
                <div key={t} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: c.dot }} />
                    <span className="text-sm text-white">{ACTIVITY_LABELS[t]}</span>
                    <span className="text-xs text-[var(--text-soft)]">({count})</span>
                  </div>
                  {impact > 0 && <span className="text-xs font-semibold text-[#36f57c]">+{impact}%</span>}
                </div>
              )
            })}
            <div className="flex items-center gap-2 border-t border-[rgba(255,255,255,0.06)] pt-3">
              <CalendarDays className="size-3.5 text-[var(--text-soft)]" />
              <span className="text-xs text-[var(--text-soft)]">{activities.length} atividades no total</span>
            </div>
          </div>

          {/* Tip */}
          <div className="rounded-[16px] border border-[rgba(52,242,127,0.12)] bg-[rgba(52,242,127,0.04)] p-4">
            <p className="text-xs font-semibold text-[#8fffb9]">Como usar</p>
            <ul className="mt-2 space-y-1.5 text-xs text-[var(--text-soft)]">
              <li>• Clique em um dia para criar</li>
              <li>• Arraste para mover de data</li>
              <li>• Arraste a borda para redimensionar</li>
              <li>• Clique no evento para editar</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <ActivityModal
          initialStart={selectedSlotStart}
          onClose={() => {
            setShowModal(false)
            setSelectedSlotStart(undefined)
          }}
          onSave={handleSave}
        />
      )}

      {editingActivity && (
        <ActivityModal
          activity={editingActivity}
          onClose={() => setEditingActivity(null)}
          onDelete={handleDelete}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
