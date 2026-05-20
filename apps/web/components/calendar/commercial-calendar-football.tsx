import { format, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { LabStatusPill } from '@/components/design-lab/lab-primitives'
import {
  type CommercialActivity,
  compareActivities,
  footballClubBadge,
  resolveFootballClubAccent,
} from './commercial-calendar.model'

export function ActivityEventContent({ event }: Readonly<{ event: CommercialActivity }>) {
  const label =
    event.type === 'jogo'
      ? [footballClubBadge(event), event.homeTeam, event.visitorTeam].filter(Boolean).join(' ')
      : event.title

  return (
    <div className="flex min-w-0 items-center gap-2">
      {event.type === 'jogo' ? (
        <span
          className="inline-flex shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-[0.12em]"
          style={{
            background: 'color-mix(in srgb, var(--surface) 82%, transparent)',
            color: resolveFootballClubAccent(event),
          }}
        >
          {footballClubBadge(event)}
        </span>
      ) : null}
      <span className="truncate">{label}</span>
    </div>
  )
}

export type FootballGameDayGroup = {
  date: Date
  games: CommercialActivity[]
}

export function groupFootballGameDays(activities: CommercialActivity[]) {
  const grouped = new Map<string, FootballGameDayGroup>()

  for (const activity of activities) {
    if (activity.type !== 'jogo') {
      continue
    }

    const dateKey = format(activity.start, 'yyyy-MM-dd')
    const currentGroup = grouped.get(dateKey)

    if (!currentGroup) {
      grouped.set(dateKey, {
        date: startOfDay(activity.start),
        games: [activity],
      })
      continue
    }

    currentGroup.games.push(activity)
    currentGroup.games.sort(compareActivities)
  }

  return Array.from(grouped.values()).sort((left, right) => left.date.getTime() - right.date.getTime())
}

export function FootballGameRail({
  gameDays,
  onOpenGame,
}: Readonly<{
  gameDays: FootballGameDayGroup[]
  onOpenGame: (activity: CommercialActivity) => void
}>) {
  if (gameDays.length === 0) {
    return null
  }

  return (
    <div className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-muted)_72%,transparent)] px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
            Rodada carioca do recorte
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
            O mesmo dia pode concentrar mais de um jogo e abrir duas ondas comerciais.
          </p>
        </div>
        <LabStatusPill tone="info">
          {gameDays.length} dia{gameDays.length === 1 ? '' : 's'} com jogo
        </LabStatusPill>
      </div>

      <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
        {gameDays.map((gameDay) => (
          <div
            className="min-w-[280px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3"
            key={format(gameDay.date, 'yyyy-MM-dd')}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                  {format(gameDay.date, 'EEE dd/MM', { locale: ptBR })}
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {gameDay.games.length === 1 ? 'Jogo do dia' : 'Jogos empilhados'}
                </p>
              </div>
              <LabStatusPill tone="neutral">
                {gameDay.games.length} jogo{gameDay.games.length === 1 ? '' : 's'}
              </LabStatusPill>
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {gameDay.games.map((game) => (
                <button
                  className="min-w-[184px] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-left transition hover:border-[var(--border-strong)]"
                  key={game.id}
                  type="button"
                  onClick={() => onOpenGame(game)}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold tracking-[0.12em]"
                      style={{
                        background: 'color-mix(in srgb, var(--surface) 84%, transparent)',
                        color: resolveFootballClubAccent(game),
                      }}
                    >
                      {footballClubBadge(game)}
                    </span>
                    <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {game.homeTeam} x {game.visitorTeam}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[var(--text-soft)]">
                    <span>{format(game.start, 'HH:mm')}</span>
                    {game.impactoEsperado ? (
                      <LabStatusPill tone="success">+{game.impactoEsperado}%</LabStatusPill>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
