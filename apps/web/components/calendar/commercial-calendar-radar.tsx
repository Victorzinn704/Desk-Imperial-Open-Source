import { CalendarDays } from 'lucide-react'
import { LabEmptyState, LabPanel, LabSignalRow, LabStatusPill } from '@/components/design-lab/lab-primitives'
import {
  ACTIVITY_LABELS,
  ACTIVITY_STYLES,
  type ActivityType,
  type CommercialActivity,
  formatDateTime,
} from './commercial-calendar.model'

export function PlanningRadar({
  nextActivity,
  nextSevenDaysActivities,
  periodActivities,
  leadingType,
  summaryRows,
  filteredActivitiesCount,
}: Readonly<{
  nextActivity?: CommercialActivity
  nextSevenDaysActivities: CommercialActivity[]
  periodActivities: CommercialActivity[]
  leadingType?: ActivityType
  summaryRows: Array<{
    type: ActivityType
    style: (typeof ACTIVITY_STYLES)[ActivityType]
    count: number
    impact: number
  }>
  filteredActivitiesCount: number
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
      subtitle="Proxima janela, mix de atividade e intensidade da agenda aberta."
      title="Radar do recorte"
    >
      <div className="space-y-5">
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

        <div className="space-y-3 border-t border-[var(--border)] pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
              Resumo do recorte
            </p>
            <LabStatusPill tone="neutral">{filteredActivitiesCount} atividades</LabStatusPill>
          </div>

          {summaryRows.length === 0 ? (
            <LabEmptyState
              compact
              className="border-0 bg-[var(--surface)]"
              description="Abra outro recorte ou adicione atividades para montar a leitura lateral."
              icon={CalendarDays}
              title="Sem resumo disponivel"
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
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-[var(--border)] pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
              Proxima fila
            </p>
            {nextSevenDaysActivities.length > 0 ? (
              <LabStatusPill tone="info">{nextSevenDaysActivities.length} itens</LabStatusPill>
            ) : null}
          </div>

          {nextSevenDaysActivities.length === 0 ? (
            <LabEmptyState
              compact
              className="border-0 bg-[var(--surface)]"
              description="Assim que surgirem novas atividades, a fila curta aparece aqui."
              icon={CalendarDays}
              title="Sem agenda na proxima semana"
            />
          ) : (
            <div className="space-y-2">
              {nextSevenDaysActivities.slice(0, 4).map((activity) => {
                const style = ACTIVITY_STYLES[activity.type]
                return (
                  <div className="flex items-start gap-3" key={activity.id}>
                    <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: style.dot }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">{activity.title}</p>
                      <p className="mt-1 text-xs text-[var(--text-soft)]">{formatDateTime(activity.start)}</p>
                    </div>
                    {activity.impactoEsperado ? (
                      <LabStatusPill tone="success">+{activity.impactoEsperado}%</LabStatusPill>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </LabPanel>
  )
}
