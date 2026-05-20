import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

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
  primaryClub?: 'vasco' | 'botafogo' | 'fluminense' | 'flamengo' | 'outro'
  visitorTeam?: string
}

export type ActivityFilter = 'all' | ActivityType

const locales = { 'pt-BR': ptBR }

export const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: ptBR }),
  getDay,
  locales,
})

export const DnDCalendar = withDragAndDrop<CommercialActivity>(Calendar)

export const ACTIVITY_STYLES: Record<
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
    bg: 'color-mix(in srgb, var(--accent) 10%, var(--surface))',
    border: 'color-mix(in srgb, var(--accent) 24%, var(--border))',
    text: 'var(--text-primary)',
    dot: 'var(--accent)',
    tone: 'info',
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

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  evento: 'Evento',
  jogo: 'Jogo',
  promocao: 'Promocao',
  reuniao: 'Reuniao',
  outro: 'Outro',
}

export const FOOTBALL_COMPETITION_LABELS: Record<FootballCompetition, string> = {
  serie_a: 'Serie A',
  copa_do_brasil: 'Copa do Brasil',
  libertadores: 'Libertadores',
  sulamericana: 'Sul-Americana',
}

export const FOOTBALL_COMPETITIONS = Object.keys(FOOTBALL_COMPETITION_LABELS) as FootballCompetition[]

export const VIEW_LABELS: Record<View, string> = {
  month: 'Mes',
  week: 'Semana',
  work_week: 'Semana',
  day: 'Dia',
  agenda: 'Agenda',
}

const FOOTBALL_GAME_ACTIVITIES: CommercialActivity[] = [
  {
    id: 'football-vasco-1',
    title: 'Vasco x Gremio',
    type: 'jogo',
    footballCompetition: 'serie_a',
    homeTeam: 'Vasco',
    visitorTeam: 'Gremio',
    primaryClub: 'vasco',
    start: new Date(2026, 3, 25, 11, 0),
    end: new Date(2026, 3, 25, 13, 0),
    descricao: 'Abrir almoço reforçado, combo de cerveja e time extra no salão.',
    impactoEsperado: 88,
    isAutoManaged: true,
    operationalHint: 'Prioridade máxima: reforçar bar, salão e combos frios.',
  },
  {
    id: 'football-botafogo-1',
    title: 'Botafogo x Palmeiras',
    type: 'jogo',
    footballCompetition: 'serie_a',
    homeTeam: 'Botafogo',
    visitorTeam: 'Palmeiras',
    primaryClub: 'botafogo',
    start: new Date(2026, 3, 25, 16, 0),
    end: new Date(2026, 3, 25, 18, 0),
    descricao: 'Segundo pico do dia. Segurar delivery, chope e giro de petisco.',
    impactoEsperado: 74,
    isAutoManaged: true,
    operationalHint: 'Mesmo dia do Vasco: operar como grade dupla de jogo.',
  },
  {
    id: 'football-flamengo-1',
    title: 'Flamengo x Racing',
    type: 'jogo',
    footballCompetition: 'libertadores',
    homeTeam: 'Flamengo',
    visitorTeam: 'Racing',
    primaryClub: 'flamengo',
    start: new Date(2026, 3, 27, 21, 30),
    end: new Date(2026, 3, 27, 23, 30),
    descricao: 'Noite continental com pico de consumo e permanência alta.',
    impactoEsperado: 84,
    isAutoManaged: true,
    operationalHint: 'Operar com cozinha reforçada e estoque de longa permanência.',
  },
  {
    id: 'football-fluminense-1',
    title: 'Fluminense x Lanus',
    type: 'jogo',
    footballCompetition: 'sulamericana',
    homeTeam: 'Fluminense',
    visitorTeam: 'Lanus',
    primaryClub: 'fluminense',
    start: new Date(2026, 3, 27, 19, 0),
    end: new Date(2026, 3, 27, 21, 0),
    descricao: 'Transmissão de início de noite para puxar salão e rodada dupla.',
    impactoEsperado: 68,
    isAutoManaged: true,
    operationalHint: 'Empilhar atendimento cedo e preparar virada para o segundo jogo.',
  },
  {
    id: 'football-vasco-2',
    title: 'Vasco x Bahia',
    type: 'jogo',
    footballCompetition: 'copa_do_brasil',
    homeTeam: 'Vasco',
    visitorTeam: 'Bahia',
    primaryClub: 'vasco',
    start: new Date(2026, 3, 30, 20, 0),
    end: new Date(2026, 3, 30, 22, 0),
    descricao: 'Mata-mata com leitura forte para salão e pós-jogo.',
    impactoEsperado: 82,
    isAutoManaged: true,
    operationalHint: 'Virada de caixa e cozinha com fila de pico.',
  },
]

export const INITIAL_ACTIVITIES: CommercialActivity[] = [
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
    title: 'Lancamento Cardapio Verao',
    type: 'evento',
    start: new Date(2026, 2, 28, 19, 0),
    end: new Date(2026, 2, 28, 23, 0),
    descricao: 'Novos pratos e bebidas sazonais',
    impactoEsperado: 45,
  },
  ...FOOTBALL_GAME_ACTIVITIES,
]

export const fieldClassName =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-soft)] focus:border-[var(--accent)]'

export function isSameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

export function formatDateTime(date: Date) {
  return format(date, 'dd/MM HH:mm', { locale: ptBR })
}

export function getPeriodRange(view: View, date: Date) {
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

export function eventStyleGetter(event: CommercialActivity) {
  const colors = ACTIVITY_STYLES[event.type]
  const clubAccent = resolveFootballClubAccent(event)

  return {
    style: {
      background: event.type === 'jogo' ? 'color-mix(in srgb, var(--surface-soft) 82%, transparent)' : colors.bg,
      border: `1px solid ${colors.border}`,
      borderLeft: event.type === 'jogo' ? `3px solid ${clubAccent}` : `1px solid ${colors.border}`,
      color: event.type === 'jogo' ? 'var(--text-primary)' : colors.text,
      borderRadius: '10px',
      fontSize: '11px',
      fontWeight: 600,
      padding: '2px 8px',
      cursor: 'grab',
    },
  }
}

export function resolveFootballClubAccent(activity: CommercialActivity) {
  switch (activity.primaryClub) {
    case 'vasco':
      return '#8ea4c4'
    case 'botafogo':
      return '#94a3b8'
    case 'fluminense':
      return '#3aa364'
    case 'flamengo':
      return '#d65b52'
    default:
      return 'var(--accent)'
  }
}

export function footballClubBadge(activity: CommercialActivity) {
  switch (activity.primaryClub) {
    case 'vasco':
      return 'VAS'
    case 'botafogo':
      return 'BOT'
    case 'fluminense':
      return 'FLU'
    case 'flamengo':
      return 'FLA'
    default:
      return 'JG'
  }
}

function footballPriority(activity: CommercialActivity) {
  const priority = {
    vasco: 0,
    botafogo: 1,
    fluminense: 2,
    flamengo: 3,
    outro: 10,
  } as const

  return priority[activity.primaryClub ?? 'outro'] ?? 10
}

export function compareActivities(left: CommercialActivity, right: CommercialActivity) {
  const timeDelta = left.start.getTime() - right.start.getTime()
  if (timeDelta !== 0) {
    return timeDelta
  }

  const typeDelta = Number(left.type !== 'jogo') - Number(right.type !== 'jogo')
  if (typeDelta !== 0) {
    return typeDelta
  }

  const footballDelta = footballPriority(left) - footballPriority(right)
  if (footballDelta !== 0) {
    return footballDelta
  }

  return (right.impactoEsperado ?? 0) - (left.impactoEsperado ?? 0)
}
