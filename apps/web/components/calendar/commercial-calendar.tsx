'use client'

import { useCallback, useMemo, useState } from 'react'
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar'
import withDragAndDrop, { type withDragAndDropProps } from 'react-big-calendar/lib/addons/dragAndDrop'
import { addDays, endOfDay, endOfMonth, endOfWeek, format, getDay, isWithinInterval, parse, startOfDay, startOfMonth, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays, Plus, Trophy } from 'lucide-react'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import { Button } from '@/components/shared/button'
import {
  LabEmptyState,
  LabFilterChip,
  LabMetricStrip,
  LabMetricStripItem,
  LabModal,
  LabPanel,
  LabSignalRow,
  LabStatusPill,
} from '@/components/design-lab/lab-primitives'

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

type ActivityFilter = 'all' | ActivityType

const locales = { 'pt-BR': ptBR }

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: ptBR }),
  getDay,
  locales,
})

const DnDCalendar = withDragAndDrop<CommercialActivity>(Calendar)

const ACTIVITY_STYLES: Record<
  ActivityType,
  { bg: string; border: string; text: string; dot: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' }
> = {
  evento: {
    bg: 'color-mix(in srgb, var(--danger) 10%, var(--surface))',
    border: 'color-mix(in srgb, var(--danger) 22%, var(--border))',
    text: 'var(--danger)',
    dot: 'var(--danger)',
    tone: 'danger',
  },
  jogo: {
    bg: 'color-mix(in srgb, var(--warning) 10%, var(--surface))',
    border: 'color-mix(in srgb, var(--warning) 22%, var(--border))',
    text: 'var(--warning)',
    dot: 'var(--warning)',
    tone: 'warning',
  },
  promocao: {
    bg: 'color-mix(in srgb, var(--success) 10%, var(--surface))',
    border: 'color-mix(in srgb, var(--success) 22%, var(--border))',
    text: 'var(--success)',
    dot: 'var(--success)',
    tone: 'success',
  },
  reuniao: {
    bg: 'color-mix(in srgb, var(--accent) 10%, var(--surface))',
    border: 'color-mix(in srgb, var(--accent) 22%, var(--border))',
    text: 'var(--accent)',
    dot: 'var(--accent)',
    tone: 'info',
  },
  outro: {
    bg: 'color-mix(in srgb, var(--text-soft) 7%, var(--surface))',
    border: 'var(--border)',
    text: 'var(--text-primary)',
    dot: 'var(--text-soft)',
    tone: 'neutral',
  },
}

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  evento: 'Evento',
  jogo: 'Jogo',
  promocao: 'Promocao',
  reuniao: 'Reuniao',
  outro: 'Outro',
}

const FOOTBALL_COMPETITION_LABELS: Record<FootballCompetition, string> = {
  serie_a: 'Serie A',
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

const VIEW_LABELS: Record<View, string> = {
  month: 'Mes',
  week: 'Semana',
  work_week: 'Semana',
  day: 'Dia',
  agenda: 'Agenda',
}

const FOOTBALL_GAME_ACTIVITIES: CommercialActivity[] = [
  {
    id: 'football-serie-a-1',
    title: 'Serie A · jogo com telao',
    type: 'jogo',
    footballCompetition: 'serie_a',
    homeTeam: 'Time da casa',
    visitorTeam: 'Rival nacional',
    start: new Date(2026, 3, 11, 19, 0),
    end: new Date(2026, 3, 11, 21, 0),
    descricao: 'Preparar telao, balcao e combo de bebidas.',
    impactoEsperado: 42,
    isAutoManaged: true,
    operationalHint: 'Reforcar bebidas e salao 60 min antes',
  },
  {
    id: 'football-copa-brasil-1',
    title: 'Copa do Brasil · mata-mata',
    type: 'jogo',
    footballCompetition: 'copa_do_brasil',
    homeTeam: 'Clube brasileiro',
    visitorTeam: 'Adversario nacional',
    start: new Date(2026, 3, 15, 21, 30),
    end: new Date(2026, 3, 15, 23, 30),
    descricao: 'Noite de decisao: preparar cozinha, combos e reforco no caixa.',
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
    visitorTeam: 'Adversario continental',
    start: new Date(2026, 3, 21, 21, 30),
    end: new Date(2026, 3, 21, 23, 30),
    descricao: 'Jogo de alto impacto para bar ou restaurante com transmissao.',
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
    visitorTeam: 'Adversario continental',
    start: new Date(2026, 3, 23, 19, 0),
    end: new Date(2026, 3, 23, 21, 0),
    descricao: 'Transmissao com impacto moderado no movimento.',
    impactoEsperado: 36,
    isAutoManaged: true,
    operationalHint: 'Oferta leve para balcao e delivery',
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
    title: 'Jogo do Brasileirao',
    type: 'jogo',
    footballCompetition: 'serie_a',
    start: new Date(2026, 2, 23, 16, 0),
    end: new Date(2026, 2, 23, 18, 0),
    descricao: 'Transmissao no telao',
    impactoEsperado: 60,
  },
  ...FOOTBALL_GAME_ACTIVITIES,
  {
    id: '3',
    title: 'Lancamento Cardapio Verao',
    type: 'evento',
    start: new Date(2026, 2, 28, 19, 0),
    end: new Date(2026, 2, 28, 23, 0),
    descricao: 'Novos pratos e bebidas sazonais',
    impactoEsperado: 45,
  },
]

const CALENDAR_THEME = `
  .imperial-cal .rbc-calendar {
    background: transparent !important;
    color: var(--text-primary) !important;
    font-family: inherit;
  }

  .imperial-cal .rbc-toolbar {
    gap: 12px;
    padding: 16px;
    border-bottom: 1px solid var(--border) !important;
    background: transparent !important;
  }

  .imperial-cal .rbc-toolbar button {
    color: var(--text-soft);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }

  .imperial-cal .rbc-toolbar button:hover {
    color: var(--text-primary);
    border-color: var(--border-strong);
    background: var(--surface-soft);
  }

  .imperial-cal .rbc-toolbar button.rbc-active {
    color: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 24%, var(--border));
    background: color-mix(in srgb, var(--accent) 10%, var(--surface));
  }

  .imperial-cal .rbc-toolbar-label {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .imperial-cal .rbc-header {
    padding: 10px 0;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border) !important;
    background: transparent !important;
  }

  .imperial-cal .rbc-header + .rbc-header,
  .imperial-cal .rbc-day-bg + .rbc-day-bg,
  .imperial-cal .rbc-time-header-content,
  .imperial-cal .rbc-time-content > * + * > * ,
  .imperial-cal .rbc-agenda-view tbody > tr > td + td {
    border-left: 1px solid var(--border) !important;
  }

  .imperial-cal .rbc-header a,
  .imperial-cal .rbc-header a:visited,
  .imperial-cal .rbc-date-cell {
    color: var(--text-soft);
    text-decoration: none;
  }

  .imperial-cal .rbc-month-view,
  .imperial-cal .rbc-time-view,
  .imperial-cal .rbc-time-view .rbc-row,
  .imperial-cal .rbc-time-header,
  .imperial-cal .rbc-time-header-gutter,
  .imperial-cal .rbc-time-column,
  .imperial-cal .rbc-time-content,
  .imperial-cal .rbc-allday-cell,
  .imperial-cal .rbc-day-slot,
  .imperial-cal .rbc-agenda-view {
    border: none !important;
    background: transparent !important;
  }

  .imperial-cal .rbc-month-row + .rbc-month-row,
  .imperial-cal .rbc-time-content,
  .imperial-cal .rbc-time-header,
  .imperial-cal .rbc-agenda-view table thead th,
  .imperial-cal .rbc-agenda-view tbody > tr > td,
  .imperial-cal .rbc-timeslot-group {
    border-bottom: 1px solid var(--border) !important;
  }

  .imperial-cal .rbc-off-range-bg {
    background: color-mix(in srgb, var(--surface-muted) 72%, var(--bg)) !important;
  }

  .imperial-cal .rbc-today {
    background: color-mix(in srgb, var(--accent) 6%, transparent) !important;
  }

  .imperial-cal .rbc-date-cell {
    padding: 6px 8px;
    font-size: 12px;
    font-weight: 600;
  }

  .imperial-cal .rbc-date-cell.rbc-now a {
    color: var(--accent);
  }

  .imperial-cal .rbc-time-slot,
  .imperial-cal .rbc-label,
  .imperial-cal .rbc-agenda-date-cell,
  .imperial-cal .rbc-agenda-time-cell {
    color: var(--text-muted);
    font-size: 11px;
    background: transparent !important;
  }

  .imperial-cal .rbc-day-slot .rbc-time-slot {
    border-top: 1px solid color-mix(in srgb, var(--border) 72%, transparent) !important;
  }

  .imperial-cal .rbc-current-time-indicator {
    background: var(--accent) !important;
    height: 2px;
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 14%, transparent);
  }

  .imperial-cal .rbc-slot-selection {
    background: color-mix(in srgb, var(--accent) 10%, transparent) !important;
    border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--border)) !important;
  }

  .imperial-cal .rbc-event {
    outline: none !important;
  }

  .imperial-cal .rbc-event:focus {
    outline: 2px solid color-mix(in srgb, var(--accent) 24%, transparent) !important;
  }

  .imperial-cal .rbc-show-more {
    color: var(--accent);
    font-size: 11px;
    font-weight: 600;
    background: transparent;
  }

  .imperial-cal .rbc-agenda-view table {
    color: var(--text-primary);
    border-color: var(--border) !important;
    width: 100%;
    background: transparent !important;
  }

  .imperial-cal .rbc-agenda-view table thead {
    background: var(--surface-soft) !important;
  }

  .imperial-cal .rbc-agenda-view table thead th {
    color: var(--text-muted);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 8px 12px;
  }

  .imperial-cal .rbc-agenda-view tbody > tr > td {
    padding: 8px 12px;
    background: transparent !important;
  }

  .imperial-cal .rbc-agenda-event-cell {
    color: var(--text-primary);
  }

  .imperial-cal .rbc-addons-dnd .rbc-addons-dnd-drag-preview {
    opacity: 0.82;
  }

  .imperial-cal .rbc-addons-dnd-resizable {
    cursor: grab;
  }

  .imperial-cal .rbc-addons-dnd-resize-ns-anchor,
  .imperial-cal .rbc-addons-dnd-resize-ew-anchor {
    background: color-mix(in srgb, var(--accent) 40%, transparent);
  }
`

const fieldClassName =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-soft)] focus:border-[var(--accent)]'

function isSameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
  )
}

function formatDateTime(date: Date) {
  return format(date, 'dd/MM HH:mm', { locale: ptBR })
}

function getPeriodRange(view: View, date: Date) {
  if (view === 'week' || view === 'work_week') {
    const start = startOfWeek(date, { locale: ptBR })
    const end = endOfWeek(date, { locale: ptBR })

    return {
      start,
      end,
      label: `${format(start, 'dd/MM', { locale: ptBR })} - ${format(end, 'dd/MM', { locale: ptBR })}`,
    }
  }

  if (view === 'day') {
    return {
      start: startOfDay(date),
      end: endOfDay(date),
      label: format(date, "dd 'de' MMM", { locale: ptBR }),
    }
  }

  if (view === 'agenda') {
    return {
      start: startOfDay(date),
      end: endOfDay(addDays(date, 30)),
      label: `30 dias a partir de ${format(date, 'dd/MM', { locale: ptBR })}`,
    }
  }

  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
    label: format(date, "MMMM 'de' yyyy", { locale: ptBR }),
  }
}

function eventStyleGetter(event: CommercialActivity) {
  const colors = ACTIVITY_STYLES[event.type]

  return {
    style: {
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      color: colors.text,
      borderRadius: '10px',
      fontSize: '12px',
      fontWeight: 600,
      padding: '2px 6px',
      cursor: 'grab',
    },
  }
}

type ActivityModalProps = Readonly<{
  activity?: CommercialActivity | null
  initialStart?: Date
  onSave: (data: Omit<CommercialActivity, 'id'>) => void
  onDelete?: (id: string) => void
  onClose: () => void
}>

export function ActivityModal({ activity, initialStart, onSave, onDelete, onClose }: ActivityModalProps) {
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
    if (!title.trim()) {
      return
    }

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

  const colors = ACTIVITY_STYLES[type]

  return (
    <LabModal
      actions={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {isEditing && onDelete && activity ? (
              <button
                className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--danger) 8%, var(--surface))',
                  borderColor: 'color-mix(in srgb, var(--danger) 20%, var(--border))',
                  color: 'var(--danger)',
                }}
                type="button"
                onClick={() => {
                  onDelete(activity.id)
                  onClose()
                }}
              >
                Excluir atividade
              </button>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button size="md" type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button size="md" type="button" onClick={handleSave}>
              {isEditing ? 'Salvar alteracoes' : 'Criar atividade'}
            </Button>
          </div>
        </div>
      }
      closeLabel="Fechar atividade comercial"
      description="Use a agenda para organizar promocoes, transmissao de jogos e leituras de impacto do comercio."
      open
      size="md"
      title={isEditing ? 'Editar atividade' : 'Nova atividade comercial'}
      onClose={onClose}
    >
      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]" htmlFor={titleInputId}>
            Nome
          </label>
          <input
            autoFocus
            className={fieldClassName}
            id={titleInputId}
            placeholder="Ex: Happy Hour, jogo do Flamengo..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <p className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">Tipo</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ACTIVITY_LABELS) as ActivityType[]).map((candidate) => {
              const style = ACTIVITY_STYLES[candidate]
              const isActive = type === candidate
              return (
                <button
                  className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
                  key={candidate}
                  style={{
                    background: isActive ? style.bg : 'var(--surface)',
                    borderColor: isActive ? style.border : 'var(--border)',
                    color: isActive ? style.text : 'var(--text-soft)',
                  }}
                  type="button"
                  onClick={() => setType(candidate)}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ background: isActive ? style.dot : 'var(--text-muted)' }}
                  />
                  {ACTIVITY_LABELS[candidate]}
                </button>
              )
            })}
          </div>
        </div>

        {type === 'jogo' ? (
          <div>
            <p className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
              Campeonato monitorado
            </p>
            <div className="grid grid-cols-2 gap-2">
              {FOOTBALL_COMPETITIONS.map((competition) => {
                const isActive = footballCompetition === competition
                return (
                  <button
                    className="rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors"
                    key={competition}
                    style={{
                      background: isActive
                        ? 'color-mix(in srgb, var(--warning) 10%, var(--surface))'
                        : 'var(--surface)',
                      borderColor: isActive
                        ? 'color-mix(in srgb, var(--warning) 22%, var(--border))'
                        : 'var(--border)',
                      color: isActive ? 'var(--warning)' : 'var(--text-soft)',
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
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]" htmlFor={startInputId}>
              Início
            </label>
            <input
              className={fieldClassName}
              id={startInputId}
              style={{ colorScheme: 'light dark' }}
              type="datetime-local"
              value={startStr}
              onChange={(e) => setStartStr(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]" htmlFor={endInputId}>
              Fim
            </label>
            <input
              className={fieldClassName}
              id={endInputId}
              style={{ colorScheme: 'light dark' }}
              type="datetime-local"
              value={endStr}
              onChange={(e) => setEndStr(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]" htmlFor={descriptionInputId}>
            Descrição opcional
          </label>
          <textarea
            className={fieldClassName}
            id={descriptionInputId}
            placeholder="Detalhes da atividade..."
            rows={3}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]" htmlFor={impactInputId}>
            Impacto esperado em vendas %
          </label>
          <input
            className={fieldClassName}
            id={impactInputId}
            max="200"
            min="0"
            placeholder="Ex: 30"
            type="number"
            value={impacto}
            onChange={(e) => setImpacto(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>

        <div
          className="rounded-2xl border px-4 py-3"
          style={{
            background: colors.bg,
            borderColor: colors.border,
            color: colors.text,
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">Leitura visual</p>
          <p className="mt-2 text-sm leading-6">
            Esta atividade vai aparecer na agenda com o mesmo estado cromatico usado no resumo lateral.
          </p>
        </div>
      </div>
    </LabModal>
  )
}

function FootballGamesWidget({ activities }: Readonly<{ activities: CommercialActivity[] }>) {
  const footballGames = activities
    .filter((activity) => activity.type === 'jogo' && activity.footballCompetition)
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  const upcomingGames = footballGames.filter((activity) => activity.start >= new Date()).slice(0, 5)

  return (
    <LabPanel
      padding="sm"
      title="Agenda esportiva"
      subtitle="Serie A, Copa do Brasil, Libertadores e Sul-Americana como sinal de movimento."
      action={<LabStatusPill icon={<Trophy className="size-3" />} tone="warning">4 campeonatos</LabStatusPill>}
    >
      {footballGames.length === 0 ? (
        <LabEmptyState
          compact
          icon={Trophy}
          title="Sem jogos monitorados"
          description="Quando houver novos confrontos no calendario, eles passam a compor este radar."
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {FOOTBALL_COMPETITIONS.map((competition) => {
              const count = footballGames.filter((activity) => activity.footballCompetition === competition).length

              return (
                <div
                  className="rounded-xl border bg-[var(--surface)] px-3 py-2"
                  key={competition}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--warning)]">
                      {FOOTBALL_COMPETITION_SHORT_LABELS[competition]}
                    </span>
                    <LabStatusPill tone="warning">{count}</LabStatusPill>
                  </div>
                  <p className="mt-1 truncate text-[11px] font-medium text-[var(--text-soft)]">
                    {FOOTBALL_COMPETITION_LABELS[competition]}
                  </p>
                </div>
              )
            })}
          </div>

          <div className="space-y-2 border-t border-[var(--border)] pt-4">
            {upcomingGames.map((game) => (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5" key={game.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{game.title}</p>
                    <p className="mt-1 truncate text-xs text-[var(--text-soft)]">
                      {[game.homeTeam, game.visitorTeam].filter(Boolean).join(' x ') || game.descricao}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-bold text-[var(--warning)]">{format(game.start, 'dd/MM', { locale: ptBR })}</p>
                    <p className="text-[11px] text-[var(--text-soft)]">{format(game.start, 'HH:mm', { locale: ptBR })}</p>
                  </div>
                </div>
                {game.operationalHint ? (
                  <p
                    className="mt-2 rounded-lg px-2 py-1 text-[11px] leading-4"
                    style={{
                      background: 'color-mix(in srgb, var(--warning) 10%, var(--surface))',
                      color: 'var(--warning)',
                    }}
                  >
                    {game.operationalHint}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </LabPanel>
  )
}

function PlanningRadar({
  nextActivity,
  nextSevenDaysActivities,
  periodActivities,
  leadingType,
}: Readonly<{
  nextActivity?: CommercialActivity
  nextSevenDaysActivities: CommercialActivity[]
  periodActivities: CommercialActivity[]
  leadingType?: ActivityType
}>) {
  const nextPeak = nextSevenDaysActivities.reduce<CommercialActivity | undefined>((peak, activity) => {
    if (!activity.impactoEsperado) {
      return peak
    }

    if (!peak || (activity.impactoEsperado ?? 0) > (peak.impactoEsperado ?? 0)) {
      return activity
    }

    return peak
  }, undefined)

  return (
    <LabPanel
      padding="sm"
      title="Radar da proxima janela"
      subtitle="Leitura curta para decidir escala, compra e promocao antes do pico."
    >
      <div className="space-y-4">
        <div className="space-y-0">
          <LabSignalRow
            label="Proxima atividade"
            note={nextActivity ? nextActivity.title : 'Nenhuma atividade futura no recorte atual.'}
            tone={nextActivity ? ACTIVITY_STYLES[nextActivity.type].tone : 'neutral'}
            value={nextActivity ? formatDateTime(nextActivity.start) : 'Sem agenda'}
          />
          <LabSignalRow
            label="7 dias"
            note={`${nextSevenDaysActivities.length} atividades na proxima janela comercial.`}
            tone={nextSevenDaysActivities.length > 0 ? 'info' : 'neutral'}
            value={String(nextSevenDaysActivities.length)}
          />
          <LabSignalRow
            label="Maior pico"
            note={nextPeak ? nextPeak.title : 'Sem impacto previsto nessa janela.'}
            tone={nextPeak ? 'success' : 'neutral'}
            value={nextPeak?.impactoEsperado ? `+${nextPeak.impactoEsperado}%` : 'Sem pico'}
          />
          <LabSignalRow
            label="Tipo lider"
            note={`${periodActivities.length} atividades no recorte atual.`}
            tone={leadingType ? ACTIVITY_STYLES[leadingType].tone : 'neutral'}
            value={leadingType ? ACTIVITY_LABELS[leadingType] : 'Sem leitura'}
          />
        </div>

        {nextSevenDaysActivities.length === 0 ? (
          <LabEmptyState
            compact
            className="border-0 bg-[var(--surface)]"
            icon={CalendarDays}
            title="Sem agenda na proxima semana"
            description="Assim que surgirem novas atividades, a fila curta aparece aqui."
          />
        ) : (
          <div className="space-y-2 border-t border-[var(--border)] pt-4">
            {nextSevenDaysActivities.slice(0, 4).map((activity) => {
              const style = ACTIVITY_STYLES[activity.type]
              return (
                <div className="flex items-start gap-3" key={activity.id}>
                  <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: style.dot }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">{activity.title}</p>
                    <p className="mt-1 text-xs text-[var(--text-soft)]">{formatDateTime(activity.start)}</p>
                  </div>
                  {activity.impactoEsperado ? <LabStatusPill tone="success">+{activity.impactoEsperado}%</LabStatusPill> : null}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </LabPanel>
  )
}

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
        prev.map((activity) => (
          activity.id === event.id
            ? { ...activity, start: new Date(start), end: new Date(end) }
            : activity
        )),
      )
    },
    [],
  )

  const onEventResize = useCallback<NonNullable<withDragAndDropProps<CommercialActivity>['onEventResize']>>(
    ({ event, start, end }) => {
      setActivities((prev) =>
        prev.map((activity) => (
          activity.id === event.id
            ? { ...activity, start: new Date(start), end: new Date(end) }
            : activity
        )),
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
      setActivities((prev) => prev.map((activity) => (
        activity.id === editingActivity.id ? { ...activity, ...data } : activity
      )))
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

  const filteredActivities = useMemo(
    () => (filter === 'all' ? activities : activities.filter((activity) => activity.type === filter)),
    [activities, filter],
  )

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
  const periodImpacto = periodActivities.reduce((sum, activity) => sum + (activity.impactoEsperado ?? 0), 0)
  const nextSevenDaysImpact = nextSevenDaysActivities.reduce((sum, activity) => sum + (activity.impactoEsperado ?? 0), 0)

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

  const leadingType = (Object.keys(ACTIVITY_LABELS) as ActivityType[]).reduce<ActivityType | undefined>((leader, type) => {
    const leaderCount = leader ? periodActivities.filter((activity) => activity.type === leader).length : -1
    const typeCount = periodActivities.filter((activity) => activity.type === type).length

    return typeCount > leaderCount ? type : leader
  }, undefined)

  return (
    <div className="space-y-5">
      <LabMetricStrip columnsClassName="lg:grid-cols-2 2xl:grid-cols-4">
        <LabMetricStripItem
          label="Hoje"
          value={
            todayActivities.length > 0
              ? String(todayActivities.length)
              : <span className="text-[var(--lab-fg-muted)]">0</span>
          }
          description={
            todayActivities.length > 0
              ? `${todayActivities.length} atividade${todayActivities.length > 1 ? 's' : ''} no dia.`
              : 'Sem atividade agendada hoje.'
          }
        />
        <LabMetricStripItem
          label="Proxima atividade"
          value={nextActivity ? formatDateTime(nextActivity.start) : 'Sem agenda'}
          description={nextActivity ? nextActivity.title : 'Nao ha novo gatilho comercial programado.'}
        />
        <LabMetricStripItem
          label="7 dias"
          value={
            nextSevenDaysActivities.length > 0
              ? String(nextSevenDaysActivities.length)
              : <span className="text-[var(--lab-fg-muted)]">0</span>
          }
          description={
            nextSevenDaysActivities.length > 0
              ? `Impacto somado de +${nextSevenDaysImpact}%.`
              : 'Nenhuma atividade na proxima janela.'
          }
        />
        <LabMetricStripItem
          label="Recorte atual"
          value={
            periodActivities.length > 0
              ? String(periodActivities.length)
              : <span className="text-[var(--lab-fg-muted)]">0</span>
          }
          description={`${VIEW_LABELS[view]} aberta em ${periodRange.label}.`}
        />
      </LabMetricStrip>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <LabFilterChip active={filter === 'all'} count={activities.length} label="Todas" onClick={() => setFilter('all')} />
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
          {filter !== 'all' ? <LabStatusPill tone={ACTIVITY_STYLES[filter].tone}>Filtro: {ACTIVITY_LABELS[filter]}</LabStatusPill> : null}
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
          className="overflow-hidden"
          contentClassName="p-0"
          padding="none"
          title="Agenda do periodo"
          subtitle={`${periodActivities.length} atividade${periodActivities.length === 1 ? '' : 's'} no recorte aberto em ${periodRange.label}.`}
          action={<LabStatusPill tone="info">{VIEW_LABELS[view]}</LabStatusPill>}
        >
          <div className="imperial-cal overflow-hidden">
            <style>{CALENDAR_THEME}</style>
            <DnDCalendar
              resizable
              selectable
              culture="pt-BR"
              date={date}
              defaultView="month"
              eventPropGetter={eventStyleGetter}
              events={filteredActivities}
              localizer={localizer}
              messages={messages}
              style={{ height: 640 }}
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
            leadingType={leadingType}
            nextActivity={nextActivity}
            nextSevenDaysActivities={nextSevenDaysActivities}
            periodActivities={periodActivities}
          />

          {filter === 'all' || filter === 'jogo' ? <FootballGamesWidget activities={filteredActivities} /> : null}

          <LabPanel
            padding="sm"
            title="Resumo do recorte"
            subtitle="Contagem e impacto esperado por tipo de atividade no calendario aberto."
          >
            {summaryRows.length === 0 ? (
              <LabEmptyState
                compact
                icon={CalendarDays}
                title="Sem resumo disponivel"
                description="Abra outro recorte ou adicione atividades para montar a leitura lateral."
              />
            ) : (
              <div className="space-y-3">
                {summaryRows.map(({ type, style, count, impact }) => (
                  <div className="flex items-center justify-between gap-3" key={type}>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: style.dot }} />
                      <span className="text-sm text-[var(--text-primary)]">{ACTIVITY_LABELS[type]}</span>
                      <span className="text-xs text-[var(--text-soft)]">({count})</span>
                    </div>
                    {impact > 0 ? <LabStatusPill tone={style.tone}>+{impact}%</LabStatusPill> : null}
                  </div>
                ))}

                <div className="flex items-center gap-2 border-t border-[var(--border)] pt-3 text-xs text-[var(--text-soft)]">
                  <CalendarDays className="size-3.5 text-[var(--accent)]" />
                  {filteredActivities.length} atividades em monitoramento
                </div>
              </div>
            )}
          </LabPanel>
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
