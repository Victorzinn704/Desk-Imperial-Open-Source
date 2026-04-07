'use client'

import { useState, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar'
import withDragAndDrop, { type withDragAndDropProps } from 'react-big-calendar/lib/addons/dragAndDrop'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays, Plus, Radio, Trophy, X } from 'lucide-react'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityType = 'evento' | 'jogo' | 'promocao' | 'reuniao' | 'outro'
export type FootballCompetition = 'serie_a' | 'copa_do_brasil' | 'libertadores' | 'sulamericana'

export type CommercialActivity = {
  id: string
  title: string
  type: ActivityType
  start: Date
  end: Date
  descricao?: string
  footballCompetition?: FootballCompetition
  homeTeam?: string
  impactoEsperado?: number
  isAutoManaged?: boolean
  operationalHint?: string
  visitorTeam?: string
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
  jogo: {
    bg: 'color-mix(in srgb, var(--warning) 16%, transparent)',
    border: 'rgba(234,179,8,0.4)',
    text: '#fde047',
    dot: 'var(--warning)',
  },
  promocao: {
    bg: 'color-mix(in srgb, var(--success) 14%, transparent)',
    border: 'rgba(54,245,124,0.38)',
    text: 'color-mix(in srgb, var(--success) 60%, white)',
    dot: 'var(--success)',
  },
  reuniao: {
    bg: 'rgba(96,165,250,0.14)',
    border: 'rgba(96,165,250,0.38)',
    text: 'var(--accent-strong)',
    dot: 'var(--accent)',
  },
  outro: { bg: 'rgba(168,85,247,0.14)', border: 'rgba(168,85,247,0.38)', text: '#c4b5fd', dot: '#a855f7' },
}

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  evento: 'Evento',
  jogo: 'Jogo',
  promocao: 'Promoção',
  reuniao: 'Reunião',
  outro: 'Outro',
}

const FOOTBALL_COMPETITION_LABELS: Record<FootballCompetition, string> = {
  serie_a: 'Série A',
  copa_do_brasil: 'Copa do Brasil',
  libertadores: 'Libertadores',
  sulamericana: 'Sul-Americana',
}

const FOOTBALL_COMPETITION_SHORT_LABELS: Record<FootballCompetition, string> = {
  serie_a: 'A',
  copa_do_brasil: 'CB',
  libertadores: 'LIB',
  sulamericana: 'SUL',
}

const FOOTBALL_COMPETITIONS = Object.keys(FOOTBALL_COMPETITION_LABELS) as FootballCompetition[]

const FOOTBALL_GAME_ACTIVITIES: CommercialActivity[] = [
  {
    id: 'football-serie-a-1',
    title: 'Série A · jogo com telão',
    type: 'jogo',
    footballCompetition: 'serie_a',
    homeTeam: 'Time da casa',
    visitorTeam: 'Rival nacional',
    start: new Date(2026, 3, 11, 19, 0),
    end: new Date(2026, 3, 11, 21, 0),
    descricao: 'Preparar telão, balcão e combo de bebidas.',
    impactoEsperado: 42,
    isAutoManaged: true,
    operationalHint: 'Reforçar bebidas e salão 60 min antes',
  },
  {
    id: 'football-copa-brasil-1',
    title: 'Copa do Brasil · mata-mata',
    type: 'jogo',
    footballCompetition: 'copa_do_brasil',
    homeTeam: 'Clube brasileiro',
    visitorTeam: 'Adversário nacional',
    start: new Date(2026, 3, 15, 21, 30),
    end: new Date(2026, 3, 15, 23, 30),
    descricao: 'Noite de decisão: preparar cozinha, combos e reforço no caixa.',
    impactoEsperado: 58,
    isAutoManaged: true,
    operationalHint: 'Tratar como pico noturno',
  },
  {
    id: 'football-libertadores-1',
    title: 'Libertadores · clube brasileiro',
    type: 'jogo',
    footballCompetition: 'libertadores',
    homeTeam: 'Brasileiro na Libertadores',
    visitorTeam: 'Adversário continental',
    start: new Date(2026, 3, 21, 21, 30),
    end: new Date(2026, 3, 21, 23, 30),
    descricao: 'Jogo de alto impacto para bar/restaurante com transmissão.',
    impactoEsperado: 64,
    isAutoManaged: true,
    operationalHint: 'Reservar mesas e preparar estoque de maior giro',
  },
  {
    id: 'football-sulamericana-1',
    title: 'Sul-Americana · clube brasileiro',
    type: 'jogo',
    footballCompetition: 'sulamericana',
    homeTeam: 'Brasileiro na Sul-Americana',
    visitorTeam: 'Adversário continental',
    start: new Date(2026, 3, 23, 19, 0),
    end: new Date(2026, 3, 23, 21, 0),
    descricao: 'Transmissão com impacto moderado no movimento.',
    impactoEsperado: 36,
    isAutoManaged: true,
    operationalHint: 'Oferta leve para balcão e delivery',
  },
]

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
    footballCompetition: 'serie_a',
    start: new Date(2026, 2, 23, 16, 0),
    end: new Date(2026, 2, 23, 18, 0),
    descricao: 'Transmissão no telão',
    impactoEsperado: 60,
  },
  ...FOOTBALL_GAME_ACTIVITIES,
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
  const [footballCompetition, setFootballCompetition] = useState<FootballCompetition>(
    activity?.footballCompetition ?? 'serie_a',
  )
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
      footballCompetition: type === 'jogo' ? footballCompetition : undefined,
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
            <p className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">Tipo</p>
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
                    <span
                      className="size-2 rounded-full"
                      style={{ background: isActive ? c.dot : 'var(--text-muted)' }}
                    />
                    {ACTIVITY_LABELS[t]}
                  </button>
                )
              })}
            </div>
          </div>

          {type === 'jogo' && (
            <div>
              <p className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                Campeonato monitorado
              </p>
              <div className="grid grid-cols-2 gap-2">
                {FOOTBALL_COMPETITIONS.map((competition) => {
                  const isActive = footballCompetition === competition
                  return (
                    <button
                      key={competition}
                      className="rounded-[12px] border px-3 py-2 text-left text-xs font-semibold transition-all"
                      style={{
                        background: isActive ? 'rgba(234,179,8,0.12)' : 'rgba(255,255,255,0.03)',
                        borderColor: isActive ? 'rgba(234,179,8,0.45)' : 'rgba(255,255,255,0.08)',
                        color: isActive ? '#fde047' : 'var(--text-soft)',
                      }}
                      type="button"
                      onClick={() => setFootballCompetition(competition)}
                    >
                      {FOOTBALL_COMPETITION_LABELS[competition]}
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-[11px] leading-5 text-[var(--text-muted)]">
                O widget considera apenas jogos do Brasil nesses quatro campeonatos.
              </p>
            </div>
          )}

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
                <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,_var(--success)_10%,_transparent)] px-2 py-0.5 text-[10px] font-bold text-[var(--success)]">
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

function FootballGamesWidget({ activities }: { activities: CommercialActivity[] }) {
  const footballGames = activities
    .filter((activity) => activity.type === 'jogo' && activity.footballCompetition)
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  const upcomingGames = footballGames.filter((activity) => activity.start >= new Date()).slice(0, 5)

  if (footballGames.length === 0) return null

  return (
    <div className="imperial-card-soft rounded-[20px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(234,179,8,0.28)] bg-[rgba(234,179,8,0.08)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#fde047]">
            <Trophy className="size-3" />
            Jogos do Brasil
          </div>
          <p className="mt-3 text-sm font-semibold text-white">Agenda esportiva do comércio</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">
            Série A, Copa do Brasil, Libertadores e Sul-Americana entram como sinal de movimento.
          </p>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[rgba(234,179,8,0.10)] text-[#fde047]">
          <Radio className="size-4" />
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {FOOTBALL_COMPETITIONS.map((competition) => {
          const count = footballGames.filter((activity) => activity.footballCompetition === competition).length
          return (
            <div
              key={competition}
              className="rounded-[14px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#fde047]">
                  {FOOTBALL_COMPETITION_SHORT_LABELS[competition]}
                </span>
                <span className="rounded-full bg-[rgba(234,179,8,0.10)] px-1.5 py-0.5 text-[10px] font-bold text-[#fde047]">
                  {count}
                </span>
              </div>
              <p className="mt-1 truncate text-[11px] font-medium text-[var(--text-soft)]">
                {FOOTBALL_COMPETITION_LABELS[competition]}
              </p>
            </div>
          )
        })}
      </div>

      <div className="mt-4 space-y-2 border-t border-[rgba(255,255,255,0.06)] pt-4">
        {upcomingGames.map((game) => (
          <div key={game.id} className="rounded-[14px] bg-[rgba(255,255,255,0.03)] px-3 py-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{game.title}</p>
                <p className="mt-1 truncate text-xs text-[var(--text-soft)]">
                  {[game.homeTeam, game.visitorTeam].filter(Boolean).join(' x ') || game.descricao}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-bold text-[#fde047]">{format(game.start, 'dd/MM', { locale: ptBR })}</p>
                <p className="text-[11px] text-[var(--text-soft)]">{format(game.start, 'HH:mm', { locale: ptBR })}</p>
              </div>
            </div>
            {game.operationalHint && (
              <p className="mt-2 rounded-lg bg-[rgba(234,179,8,0.08)] px-2 py-1 text-[11px] leading-4 text-[#fde68a]">
                {game.operationalHint}
              </p>
            )}
          </div>
        ))}
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
            className="flex items-center gap-2 rounded-[14px] border border-[color-mix(in_srgb,_var(--success)_40%,_transparent)] bg-[color-mix(in_srgb,_var(--success)_10%,_transparent)] px-4 py-2.5 text-sm font-semibold text-[var(--success)] transition-all hover:bg-[color-mix(in_srgb,_var(--success)_18%,_transparent)]"
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
            .imperial-cal .rbc-toolbar button.rbc-active { color: var(--success); border-color: rgba(52,242,127,0.4); background: rgba(52,242,127,0.1); }
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
            .imperial-cal .rbc-date-cell.rbc-now a { color: var(--success); }

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
            .imperial-cal .rbc-current-time-indicator { background: var(--success) !important; height: 2px; box-shadow: 0 0 6px rgba(52,242,127,0.5); }
            .imperial-cal .rbc-slot-selection { background: rgba(52,242,127,0.1) !important; border: 1px solid rgba(52,242,127,0.3) !important; }

            .imperial-cal .rbc-event { outline: none !important; }
            .imperial-cal .rbc-event:focus { outline: 2px solid rgba(52,242,127,0.4) !important; }
            .imperial-cal .rbc-event-label { font-size: 11px; }
            .imperial-cal .rbc-show-more { color: var(--success); font-size: 11px; font-weight: 600; background: transparent; }

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
          <FootballGamesWidget activities={activities} />
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
                  {impact > 0 && <span className="text-xs font-semibold text-[var(--success)]">+{impact}%</span>}
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
