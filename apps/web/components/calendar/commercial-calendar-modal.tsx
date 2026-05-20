import { useState } from 'react'
import { Button } from '@/components/shared/button'
import { LabModal } from '@/components/design-lab/lab-primitives'
import {
  ACTIVITY_LABELS,
  ACTIVITY_STYLES,
  type ActivityType,
  type CommercialActivity,
  fieldClassName,
  FOOTBALL_COMPETITION_LABELS,
  FOOTBALL_COMPETITIONS,
  type FootballCompetition,
} from './commercial-calendar.model'

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
      open
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
      size="md"
      title={isEditing ? 'Editar atividade' : 'Nova atividade comercial'}
      onClose={onClose}
    >
      <div className="space-y-5">
        <div>
          <label
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]"
            htmlFor={titleInputId}
          >
            Nome
          </label>
          <input
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
                      borderColor: isActive ? 'color-mix(in srgb, var(--warning) 22%, var(--border))' : 'var(--border)',
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
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]"
              htmlFor={startInputId}
            >
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
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]"
              htmlFor={endInputId}
            >
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
          <label
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]"
            htmlFor={descriptionInputId}
          >
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
          <label
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]"
            htmlFor={impactInputId}
          >
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
