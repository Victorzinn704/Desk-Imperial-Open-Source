'use client'

import { type ElementType, type ReactNode, useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LazyAnimatePresence as AnimatePresence,
  LazyMotionDiv as MotionDiv,
  LazyMotionLi as MotionLi,
} from '@/components/shared/lazy-components'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BrainCircuit,
  ChevronRight,
  Lightbulb,
  RefreshCcw,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { ApiError, fetchMarketInsight } from '@/lib/api'
import { APP_SCOPED_AI_MESSAGE, isAppScopedAiFocus } from '@/lib/ai-app-scope'
import { Button } from '@/components/shared/button'
import { LabEmptyState, LabPanel, LabStatusPill } from '@/components/design-lab/lab-primitives'
import { cn } from '@/lib/utils'

const quickFocuses = [
  { id: 'overview', label: 'Visao executiva geral', icon: Activity },
  { id: 'margin', label: 'Aumentar margem nos proximos 30 dias', icon: TrendingUp },
  { id: 'channels', label: 'Canais que merecem mais investimento', icon: Target },
  { id: 'risk', label: 'Maior risco operacional agora', icon: AlertTriangle },
  { id: 'categories', label: 'Performance por categoria de produto', icon: Zap },
  { id: 'forecast', label: 'Previsao de demanda - 3 meses', icon: TrendingUp },
  { id: 'pricing', label: 'Otimizacao de precos por concorrencia', icon: Lightbulb },
  { id: 'cross', label: 'Oportunidades de cross-selling', icon: Sparkles },
] as const

const analysisPalette = {
  executive: 'var(--accent)',
  forecast: 'color-mix(in srgb, var(--accent) 78%, var(--text-primary) 22%)',
  opportunities: 'var(--success)',
  risks: 'var(--danger)',
  actions: 'color-mix(in srgb, var(--accent) 64%, var(--text-primary) 36%)',
} as const

function toneSurface(accent: string) {
  return {
    backgroundColor: `color-mix(in srgb, ${accent} 10%, var(--surface))`,
    borderColor: `color-mix(in srgb, ${accent} 22%, var(--border))`,
    color: accent,
  }
}

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-5">
      <div
        className="ai-glyph-pulse flex size-10 items-center justify-center rounded-2xl border"
        style={toneSurface('var(--accent)')}
      >
        <BrainCircuit className="size-5" />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-[var(--text-primary)]">Processando analise...</p>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span className="ai-dot size-2 rounded-full bg-[var(--accent)]" key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

type AnalysisSectionProps = {
  title: string
  accent: string
  icon: ElementType
  delay?: number
  children: ReactNode
}

function AnalysisSection({ title, accent, icon: Icon, delay = 0, children }: AnalysisSectionProps) {
  return (
    <MotionDiv
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
      initial={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.38, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-xl border" style={toneSurface(accent)}>
          <Icon className="size-4" />
        </span>
        <h4 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">{title}</h4>
      </div>
      <div
        className="space-y-3 border-l pl-5"
        style={{ borderColor: `color-mix(in srgb, ${accent} 20%, var(--border))` }}
      >
        {children}
      </div>
    </MotionDiv>
  )
}

type FocusButtonProps = {
  label: string
  icon: ElementType
  active: boolean
  onClick: () => void
}

function FocusButton({ label, icon: Icon, active, onClick }: FocusButtonProps) {
  return (
    <button
      className={cn(
        'group flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left text-sm transition-colors duration-200',
        active
          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-soft)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]',
      )}
      type="button"
      onClick={onClick}
    >
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-xl border transition-colors',
          active
            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
            : 'border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-soft)] group-hover:border-[var(--border-strong)] group-hover:text-[var(--text-primary)]',
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="flex-1 text-xs font-medium leading-snug">{label}</span>
      {active ? <ChevronRight className="size-3.5 shrink-0 text-[var(--accent)]" /> : null}
    </button>
  )
}

function FocusRail({
  activeFocus,
  setActiveFocus,
  setScopeError,
}: Readonly<{
  activeFocus: string
  setActiveFocus: (value: string) => void
  setScopeError: (value: string | null) => void
}>) {
  return (
    <aside className="space-y-4 xl:sticky xl:top-6 xl:h-fit">
      <LabPanel
        padding="sm"
        title="Focos estrategicos"
        subtitle="A consulta precisa ficar orientada ao app, nao a uma pesquisa generica."
      >
        <div className="space-y-2">
          {quickFocuses.map((focus) => (
            <FocusButton
              active={activeFocus === focus.label}
              icon={focus.icon}
              key={focus.id}
              label={focus.label}
              onClick={() => {
                setScopeError(null)
                setActiveFocus(focus.label)
              }}
            />
          ))}
        </div>
      </LabPanel>

      <LabPanel
        padding="sm"
        title="Como extrair mais valor"
        subtitle="Contexto, periodo e recorte deixam a resposta mais util."
      >
        <ul className="space-y-2.5">
          {[
            'Mencione periodos e regioes especificos.',
            'Inclua metricas que considera importantes.',
            'Adicione contexto de concorrencia ou operacao.',
            'Pergunte sobre tendencia, risco ou previsao.',
            'Traga sazonalidade ou eventos externos quando importar.',
          ].map((tip) => (
            <li className="flex items-start gap-2 text-xs leading-5 text-[var(--text-soft)]" key={tip}>
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </LabPanel>
    </aside>
  )
}

export function AIConsultantWorkspace({
  backHref = '/design-lab/overview',
  backLabel = 'Lab',
  embedded = false,
}: Readonly<{
  backHref?: string
  backLabel?: string
  embedded?: boolean
}>) {
  const [draftFocus, setDraftFocus] = useState('')
  const [activeFocus, setActiveFocus] = useState<string>(quickFocuses[0].label)
  const [scopeError, setScopeError] = useState<string | null>(null)

  const insightQuery = useQuery({
    queryKey: ['market-intelligence', activeFocus],
    queryFn: () => fetchMarketInsight(activeFocus),
    enabled: isAppScopedAiFocus(activeFocus),
    staleTime: 10 * 60 * 1000,
  })

  const errorMessage =
    insightQuery.error instanceof ApiError
      ? insightQuery.error.message
      : 'A leitura executiva da IA ainda nao conseguiu responder a consulta.'

  const handleApplyFocus = useCallback(() => {
    const trimmed = draftFocus.trim()
    if (!trimmed) {
      return
    }
    if (!isAppScopedAiFocus(trimmed)) {
      setScopeError(APP_SCOPED_AI_MESSAGE)
      return
    }

    setScopeError(null)
    setActiveFocus(trimmed)
    setDraftFocus('')
  }, [draftFocus])

  const charPercent = Math.round((draftFocus.length / 500) * 100)

  const analysisHeaderAction = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {insightQuery.data?.generatedAt ? (
        <span className="flex items-center gap-1.5 text-xs text-[var(--text-soft)]">
          <TrendingUp className="size-3 text-[var(--success)]" />
          {new Date(insightQuery.data.generatedAt).toLocaleString('pt-BR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ) : null}
      <Button
        loading={insightQuery.isFetching}
        size="sm"
        type="button"
        variant="secondary"
        onClick={() => insightQuery.refetch()}
      >
        <RefreshCcw className="size-3.5" />
        Atualizar
      </Button>
    </div>
  )

  const content = (
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      <FocusRail activeFocus={activeFocus} setActiveFocus={setActiveFocus} setScopeError={setScopeError} />

      <main className="space-y-5">
        <LabPanel
          elevated
          title="Consulta personalizada"
          subtitle="Pergunte sobre caixa, vendas, estoque, PDV, salao, agenda, equipe ou perfil."
          action={
            <LabStatusPill tone="info" icon={<Sparkles className="size-3" />}>
              contexto do app
            </LabStatusPill>
          }
          footer={
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <svg aria-hidden className="size-5 -rotate-90" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" fill="none" r="8" stroke="var(--border)" strokeWidth="2.5" />
                  <circle
                    cx="10"
                    cy="10"
                    fill="none"
                    r="8"
                    stroke={charPercent > 80 ? 'var(--danger)' : 'var(--accent)'}
                    strokeDasharray={`${(50.27 * charPercent) / 100} 50.27`}
                    strokeLinecap="round"
                    strokeWidth="2.5"
                    style={{ transition: 'stroke-dasharray 0.2s ease' }}
                  />
                </svg>
                <span className={cn('text-xs', charPercent > 80 ? 'text-[var(--danger)]' : 'text-[var(--text-soft)]')}>
                  {draftFocus.length}/500
                </span>
                <span className="hidden text-xs text-[var(--text-soft)] opacity-70 sm:block">
                  Ctrl+Enter para gerar
                </span>
              </div>

              <Button disabled={!draftFocus.trim()} size="md" type="button" onClick={handleApplyFocus}>
                <Sparkles className="size-4" />
                Gerar consultoria
              </Button>
            </div>
          }
        >
          <textarea
            className="min-h-28 w-full resize-none rounded-[18px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-sm leading-7 text-[var(--text-primary)] outline-none transition-[border-color,background-color] duration-200 placeholder:text-[var(--text-soft)] focus:border-[var(--accent)]"
            maxLength={500}
            placeholder="Ex.: Avalie o caixa e o estoque critico antes do proximo turno."
            value={draftFocus}
            onChange={(e) => setDraftFocus(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleApplyFocus()
              }
            }}
          />

          {scopeError ? (
            <div
              className="mt-4 rounded-2xl border px-4 py-3 text-sm text-[var(--danger)]"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--danger) 8%, var(--surface))',
                borderColor: 'color-mix(in srgb, var(--danger) 20%, var(--border))',
              }}
            >
              {scopeError}
            </div>
          ) : null}
        </LabPanel>

        <LabPanel
          title="Analise executiva"
          subtitle="Leitura textual orientada a decisao, sem competir com o operacional."
          action={analysisHeaderAction}
        >
          {insightQuery.isLoading ? <ThinkingIndicator /> : null}

          {insightQuery.error && !insightQuery.isLoading ? (
            <MotionDiv
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 rounded-2xl border p-5"
              initial={{ opacity: 0, y: 8 }}
              style={{
                backgroundColor: 'color-mix(in srgb, var(--danger) 8%, var(--surface))',
                borderColor: 'color-mix(in srgb, var(--danger) 20%, var(--border))',
              }}
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--danger)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--danger)]">Falha na analise</p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">{errorMessage}</p>
              </div>
            </MotionDiv>
          ) : null}

          {!(insightQuery.data || insightQuery.isLoading || insightQuery.error) ? (
            <LabEmptyState
              compact
              icon={BrainCircuit}
              title="Pronto para analisar"
              description="Selecione um foco estrategico na lateral ou escreva uma consulta personalizada acima."
            />
          ) : null}

          <AnimatePresence mode="wait">
            {insightQuery.data && !insightQuery.isLoading ? (
              <MotionDiv
                animate={{ opacity: 1 }}
                className="space-y-7"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key={activeFocus}
                transition={{ duration: 0.25 }}
              >
                <AnalysisSection accent={analysisPalette.executive} delay={0} icon={Activity} title="Resumo executivo">
                  <p className="text-sm leading-7 text-[var(--text-primary)]">{insightQuery.data.summary}</p>
                </AnalysisSection>

                <AnalysisSection accent={analysisPalette.forecast} delay={0.06} icon={TrendingUp} title="Previsao">
                  <p className="text-sm leading-7 text-[var(--text-primary)]">{insightQuery.data.forecast}</p>
                </AnalysisSection>

                {insightQuery.data.opportunities.length > 0 ? (
                  <AnalysisSection
                    accent={analysisPalette.opportunities}
                    delay={0.12}
                    icon={Lightbulb}
                    title="Oportunidades"
                  >
                    <ul className="space-y-2.5">
                      {insightQuery.data.opportunities.map((item, i) => (
                        <MotionLi
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-start gap-2.5 text-sm leading-6 text-[var(--text-primary)]"
                          initial={{ opacity: 0, x: -8 }}
                          key={i}
                          transition={{ delay: 0.12 + i * 0.05 }}
                        >
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--success)]" />
                          {item}
                        </MotionLi>
                      ))}
                    </ul>
                  </AnalysisSection>
                ) : null}

                {insightQuery.data.risks.length > 0 ? (
                  <AnalysisSection accent={analysisPalette.risks} delay={0.18} icon={AlertTriangle} title="Riscos">
                    <ul className="space-y-2.5">
                      {insightQuery.data.risks.map((item, i) => (
                        <MotionLi
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-start gap-2.5 text-sm leading-6 text-[var(--text-primary)]"
                          initial={{ opacity: 0, x: -8 }}
                          key={i}
                          transition={{ delay: 0.18 + i * 0.05 }}
                        >
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--danger)]" />
                          {item}
                        </MotionLi>
                      ))}
                    </ul>
                  </AnalysisSection>
                ) : null}

                {insightQuery.data.nextActions.length > 0 ? (
                  <AnalysisSection accent={analysisPalette.actions} delay={0.24} icon={Target} title="Proximos passos">
                    <ol className="space-y-2.5">
                      {insightQuery.data.nextActions.map((item, i) => (
                        <MotionLi
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-start gap-2.5 text-sm leading-6 text-[var(--text-primary)]"
                          initial={{ opacity: 0, x: -8 }}
                          key={i}
                          transition={{ delay: 0.24 + i * 0.05 }}
                        >
                          <span
                            className="flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold"
                            style={toneSurface('var(--accent)')}
                          >
                            {i + 1}
                          </span>
                          {item}
                        </MotionLi>
                      ))}
                    </ol>
                  </AnalysisSection>
                ) : null}
              </MotionDiv>
            ) : null}
          </AnimatePresence>
        </LabPanel>
      </main>
    </div>
  )

  if (embedded) {
    return content
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header
        className="sticky top-0 z-20 border-b border-[var(--border)] backdrop-blur-xl"
        style={{ backgroundColor: 'color-mix(in srgb, var(--bg) 88%, transparent)' }}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-4">
            <Link href={backHref}>
              <Button size="sm" variant="ghost">
                <ArrowLeft className="size-4" />
                {backLabel}
              </Button>
            </Link>

            <div className="h-5 w-px bg-[var(--border)]" />

            <div className="flex items-center gap-3">
              <div
                className="ai-glyph-pulse flex size-9 items-center justify-center rounded-xl border"
                style={toneSurface('var(--accent)')}
              >
                <BrainCircuit className="size-4.5" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-[var(--text-primary)]">Consultor IA</h1>
                <p className="text-[11px] text-[var(--text-soft)]">Perguntas do app e analise operacional</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <LabStatusPill tone="info" icon={<Sparkles className="size-3" />}>
                foco ativo
              </LabStatusPill>
              <span className="max-w-[220px] truncate text-xs text-[var(--text-soft)]">{activeFocus}</span>
            </div>

            <Button
              loading={insightQuery.isFetching}
              size="sm"
              type="button"
              variant="secondary"
              onClick={() => insightQuery.refetch()}
            >
              <RefreshCcw className="size-3.5" />
              Atualizar
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] p-5 sm:p-6">{content}</div>
    </div>
  )
}
