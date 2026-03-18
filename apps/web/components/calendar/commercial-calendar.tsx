'use client'

import { useState, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, X } from 'lucide-react'
import 'react-big-calendar/lib/css/react-big-calendar.css'

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

// ─── Config ───────────────────────────────────────────────────────────────────

const locales = { 'pt-BR': ptBR }

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: ptBR }),
  getDay,
  locales,
})

const ACTIVITY_COLORS: Record<ActivityType, { bg: string; border: string; text: string; dot: string }> = {
  evento:   { bg: 'rgba(239,68,68,0.16)',   border: 'rgba(239,68,68,0.4)',   text: '#fca5a5', dot: '#ef4444' },
  jogo:     { bg: 'rgba(234,179,8,0.16)',   border: 'rgba(234,179,8,0.4)',   text: '#fde047', dot: '#eab308' },
  promocao: { bg: 'rgba(54,245,124,0.14)',  border: 'rgba(54,245,124,0.38)', text: '#86efac', dot: '#36f57c' },
  reuniao:  { bg: 'rgba(96,165,250,0.14)',  border: 'rgba(96,165,250,0.38)', text: '#93c5fd', dot: '#60a5fa' },
  outro:    { bg: 'rgba(168,85,247,0.14)',  border: 'rgba(168,85,247,0.38)', text: '#c4b5fd', dot: '#a855f7' },
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
]

// ─── Event style ──────────────────────────────────────────────────────────────

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
    },
  }
}

// ─── New Activity Modal ───────────────────────────────────────────────────────

type NewActivityModalProps = {
  initialStart?: Date
  onSave: (activity: Omit<CommercialActivity, 'id'>) => void
  onClose: () => void
}

function NewActivityModal({ initialStart, onSave, onClose }: Readonly<NewActivityModalProps>) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<ActivityType>('evento')
  const [descricao, setDescricao] = useState('')
  const [impacto, setImpacto] = useState<number | ''>('')

  const defaultDate = initialStart ?? new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const toInput = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

  const [startStr, setStartStr] = useState(toInput(defaultDate))
  const [endStr, setEndStr] = useState(toInput(new Date(defaultDate.getTime() + 2 * 60 * 60 * 1000)))

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
      <div
        className="imperial-card relative w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] p-6">
          <h2 className="text-lg font-semibold text-white">Nova Atividade Comercial</h2>
          <button
            className="flex size-8 items-center justify-center rounded-[12px] border border-[rgba(255,255,255,0.08)] text-[var(--text-soft)] hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {/* Title */}
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

          {/* Type selector */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
              Tipo
            </label>
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

          {/* Start / End */}
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

          {/* Descricao */}
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

          {/* Impacto */}
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

        <div className="border-t border-[rgba(255,255,255,0.06)] p-6">
          <button
            className="w-full rounded-[14px] py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!title.trim()}
            style={{
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              color: colors.text,
            }}
            type="button"
            onClick={handleSave}
          >
            Salvar Atividade
          </button>
        </div>
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
  const [selectedEvent, setSelectedEvent] = useState<CommercialActivity | null>(null)

  const handleSelectSlot = useCallback(({ start }: { start: Date }) => {
    setSelectedSlotStart(start)
    setShowModal(true)
  }, [])

  const handleSave = useCallback((data: Omit<CommercialActivity, 'id'>) => {
    setActivities((prev) => [
      ...prev,
      { ...data, id: String(Date.now()) },
    ])
    setShowModal(false)
    setSelectedSlotStart(undefined)
  }, [])

  const handleDeleteEvent = (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id))
    setSelectedEvent(null)
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

  return (
    <div className="space-y-4">
      {/* Legenda + botão nova atividade */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          {(Object.keys(ACTIVITY_LABELS) as ActivityType[]).map((t) => {
            const c = ACTIVITY_COLORS[t]
            return (
              <span
                key={t}
                className="flex items-center gap-1.5 text-xs font-medium"
                style={{ color: c.text }}
              >
                <span className="size-2.5 rounded-full" style={{ background: c.dot }} />
                {ACTIVITY_LABELS[t]}
              </span>
            )
          })}
        </div>

        <button
          className="flex items-center gap-2 rounded-[14px] border border-[rgba(52,242,127,0.4)] bg-[rgba(52,242,127,0.1)] px-4 py-2.5 text-sm font-semibold text-[#36f57c] transition-all hover:bg-[rgba(52,242,127,0.18)]"
          type="button"
          onClick={() => { setSelectedSlotStart(new Date()); setShowModal(true) }}
        >
          <Plus className="size-4" />
          Nova Atividade
        </button>
      </div>

      {/* Calendar */}
      <div className="imperial-card-soft overflow-hidden rounded-[24px]">
        <style>{`
          .rbc-calendar { background: transparent; color: #e2e8f0; font-family: inherit; }
          .rbc-toolbar { padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.06); }
          .rbc-toolbar button { color: #7a8896; background: transparent; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 6px 14px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
          .rbc-toolbar button:hover { color: #fff; border-color: rgba(255,255,255,0.18); background: rgba(255,255,255,0.04); }
          .rbc-toolbar button.rbc-active { color: #36f57c; border-color: rgba(52,242,127,0.4); background: rgba(52,242,127,0.1); }
          .rbc-toolbar-label { font-size: 15px; font-weight: 600; color: #fff; }
          .rbc-header { padding: 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #7a8896; border-bottom: 1px solid rgba(255,255,255,0.06); }
          .rbc-header + .rbc-header { border-left: 1px solid rgba(255,255,255,0.05); }
          .rbc-month-view { border: none; }
          .rbc-month-row + .rbc-month-row { border-top: 1px solid rgba(255,255,255,0.05); }
          .rbc-day-bg + .rbc-day-bg { border-left: 1px solid rgba(255,255,255,0.04); }
          .rbc-off-range-bg { background: rgba(0,0,0,0.2); }
          .rbc-today { background: rgba(52,242,127,0.04); }
          .rbc-date-cell { padding: 6px 8px; font-size: 12px; font-weight: 600; color: #7a8896; }
          .rbc-date-cell.rbc-now { color: #36f57c; }
          .rbc-event { outline: none; cursor: pointer; }
          .rbc-event:focus { outline: 2px solid rgba(52,242,127,0.4); }
          .rbc-show-more { color: #36f57c; font-size: 11px; font-weight: 600; background: transparent; }
          .rbc-agenda-view table { color: #e2e8f0; }
          .rbc-agenda-view .rbc-agenda-date-cell, .rbc-agenda-view .rbc-agenda-time-cell { color: #7a8896; font-size: 12px; }
          .rbc-time-view { border: none; }
          .rbc-time-header { border-bottom: 1px solid rgba(255,255,255,0.06); }
          .rbc-timeslot-group { border-bottom: 1px solid rgba(255,255,255,0.04); }
          .rbc-time-slot { color: #7a8896; font-size: 11px; }
          .rbc-current-time-indicator { background: #36f57c; }
        `}</style>

        <Calendar
          culture="pt-BR"
          date={date}
          defaultView="month"
          eventPropGetter={eventStyleGetter}
          events={activities}
          localizer={localizer}
          messages={messages}
          selectable
          style={{ height: 580 }}
          titleAccessor="title"
          view={view}
          onNavigate={setDate}
          onSelectEvent={(event) => setSelectedEvent(event as CommercialActivity)}
          onSelectSlot={handleSelectSlot}
          onView={setView}
        />
      </div>

      {/* Event detail popup */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedEvent(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="imperial-card relative w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-start justify-between rounded-t-[inherit] border-b border-[rgba(255,255,255,0.06)] p-5"
              style={{ background: ACTIVITY_COLORS[selectedEvent.type].bg }}
            >
              <div>
                <span
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: ACTIVITY_COLORS[selectedEvent.type].text }}
                >
                  {ACTIVITY_LABELS[selectedEvent.type]}
                </span>
                <h3 className="mt-1 text-base font-semibold text-white">{selectedEvent.title}</h3>
              </div>
              <button
                className="flex size-7 items-center justify-center rounded-[10px] border border-[rgba(255,255,255,0.1)] text-[var(--text-soft)] hover:text-white"
                onClick={() => setSelectedEvent(null)}
                type="button"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="space-y-3 p-5">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-soft)]">Início</span>
                <span className="text-white">
                  {format(selectedEvent.start, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-soft)]">Fim</span>
                <span className="text-white">
                  {format(selectedEvent.end, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
              {selectedEvent.impactoEsperado !== undefined && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-soft)]">Impacto esperado</span>
                  <span className="font-semibold text-[#36f57c]">+{selectedEvent.impactoEsperado}%</span>
                </div>
              )}
              {selectedEvent.descricao && (
                <p className="text-sm text-[var(--text-soft)]">{selectedEvent.descricao}</p>
              )}
            </div>

            <div className="border-t border-[rgba(255,255,255,0.06)] p-5">
              <button
                className="w-full rounded-[12px] border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] py-2.5 text-sm font-semibold text-[#fca5a5] hover:bg-[rgba(239,68,68,0.14)]"
                type="button"
                onClick={() => handleDeleteEvent(selectedEvent.id)}
              >
                Excluir atividade
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <NewActivityModal
          initialStart={selectedSlotStart}
          onClose={() => { setShowModal(false); setSelectedSlotStart(undefined) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
