'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BrainCircuit,
  ArrowLeft,
  RefreshCcw,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ChevronRight,
  Activity,
  Target,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { ApiError, fetchMarketInsight } from '@/lib/api'
import { Button } from '@/components/shared/button'
import { cn } from '@/lib/utils'

const quickFocuses = [
  { id: 'overview', label: 'Visão executiva geral', icon: Activity },
  { id: 'margin', label: 'Aumentar margem nos próximos 30 dias', icon: TrendingUp },
  { id: 'channels', label: 'Canais que merecem mais investimento', icon: Target },
  { id: 'risk', label: 'Maior risco operacional agora', icon: AlertTriangle },
  { id: 'categories', label: 'Performance por categoria de produto', icon: Zap },
  { id: 'forecast', label: 'Previsão de demanda — 3 meses', icon: TrendingUp },
  { id: 'pricing', label: 'Otimização de preços por concorrência', icon: Lightbulb },
  { id: 'cross', label: 'Oportunidades de cross-selling', icon: Sparkles },
]

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-4 px-2 py-6">
      <div className="ai-glyph-pulse flex size-10 items-center justify-center rounded-2xl border border-[rgba(195,164,111,0.25)] bg-[rgba(195,164,111,0.1)]">
        <BrainCircuit className="size-5 text-[var(--accent)]" />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-white">Processando análise...</p>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="ai-dot size-2 rounded-full bg-[var(--accent)]"
            />
          ))}
        </div>
      </div>
    </div>
  )
}

type AnalysisSectionProps = {
  title: string
  color: string
  icon: React.ElementType
  delay?: number
  children: React.ReactNode
}

function AnalysisSection({ title, color, icon: Icon, delay = 0, children }: AnalysisSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2.5">
        <span
          className="flex size-7 items-center justify-center rounded-[9px] border"
          style={{
            background: `${color}18`,
            borderColor: `${color}30`,
            color,
          }}
        >
          <Icon className="size-3.5" />
        </span>
        <h4
          className="ai-section-label"
          style={{ color }}
        >
          {title}
        </h4>
      </div>
      <div className="pl-[2.25rem]">{children}</div>
      <div className="ai-divider ml-[2.25rem]" />
    </motion.div>
  )
}

type FocusButtonProps = {
  label: string
  icon: React.ElementType
  active: boolean
  onClick: () => void
}

function FocusButton({ label, icon: Icon, active, onClick }: FocusButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-[14px] border px-3.5 py-2.5 text-left text-sm transition-all duration-200',
        active
          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)] shadow-[0_6px_20px_rgba(195,164,111,0.15)]'
          : 'border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-soft)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]',
      )}
    >
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-[7px] border transition-colors',
          active
            ? 'border-[rgba(195,164,111,0.35)] bg-[rgba(195,164,111,0.15)] text-[var(--accent)]'
            : 'border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] text-[var(--text-soft)] group-hover:text-[var(--text-muted)]',
        )}
      >
        <Icon className="size-3" />
      </span>
      <span className="flex-1 text-xs font-medium leading-snug">{label}</span>
      {active && <ChevronRight className="size-3 shrink-0 text-[var(--accent)]" />}
    </button>
  )
}

export default function AIConsultantPage() {
  const [draftFocus, setDraftFocus] = useState('')
  const [activeFocus, setActiveFocus] = useState<string>(quickFocuses[0].label)

  const insightQuery = useQuery({
    queryKey: ['market-intelligence', activeFocus],
    queryFn: () => fetchMarketInsight(activeFocus),
    staleTime: 10 * 60 * 1000,
  })

  const errorMessage =
    insightQuery.error instanceof ApiError
      ? insightQuery.error.message
      : 'A leitura executiva da IA ainda não conseguiu responder à consulta.'

  const handleApplyFocus = useCallback(() => {
    const trimmed = draftFocus.trim()
    if (!trimmed) return
    setActiveFocus(trimmed)
    setDraftFocus('')
  }, [draftFocus])

  const charPercent = Math.round((draftFocus.length / 500) * 100)

  return (
    <div className="min-h-screen bg-[var(--bg)]">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[rgba(8,11,14,0.82)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="size-4" />
                Dashboard
              </Button>
            </Link>

            <div className="h-5 w-px bg-[var(--border)]" />

            <div className="flex items-center gap-3">
              <div className="ai-glyph-pulse flex size-9 items-center justify-center rounded-xl border border-[rgba(195,164,111,0.3)] bg-[rgba(195,164,111,0.1)]">
                <BrainCircuit className="size-4.5 text-[var(--accent)]" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white">Consultor IA</h1>
                <p className="text-[11px] text-[var(--text-soft)]">
                  Gemini Flash · análise em tempo real
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-[rgba(195,164,111,0.18)] bg-[rgba(195,164,111,0.06)] px-3 py-1.5 sm:flex">
              <span className="size-1.5 rounded-full bg-[var(--accent)] opacity-80" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                Foco ativo
              </span>
              <span className="max-w-[160px] truncate text-[11px] text-[var(--text-muted)]">
                {activeFocus}
              </span>
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

      {/* ── Body ── */}
      <div className="mx-auto grid max-w-[1400px] gap-0 px-0 xl:grid-cols-[280px_minmax(0,1fr)]">

        {/* ── Left sidebar ── */}
        <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] overflow-y-auto border-r border-[var(--border)] xl:block">
          <div className="space-y-6 p-5">
            {/* Quick focuses */}
            <div>
              <p className="ai-section-label mb-3 text-[var(--text-soft)]">Focos estratégicos</p>
              <div className="space-y-1.5">
                {quickFocuses.map((focus) => (
                  <FocusButton
                    key={focus.id}
                    label={focus.label}
                    icon={focus.icon}
                    active={activeFocus === focus.label}
                    onClick={() => setActiveFocus(focus.label)}
                  />
                ))}
              </div>
            </div>

            <div className="ai-divider" />

            {/* Tips */}
            <div className="imperial-card-soft rounded-2xl p-4">
              <p className="ai-section-label mb-3 text-[var(--text-soft)]">Melhores resultados</p>
              <ul className="space-y-2.5">
                {[
                  'Mencione períodos e regiões específicos',
                  'Inclua métricas que considera importantes',
                  'Adicione contexto de concorrência',
                  'Pergunte sobre tendências ou previsões',
                  'Considere fatores sazonais externos',
                ].map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-xs leading-5 text-[var(--text-soft)]">
                    <span className="mt-1 size-1 shrink-0 rounded-full bg-[var(--accent)] opacity-60" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="min-h-[calc(100vh-57px)] space-y-5 p-5 sm:p-6">

          {/* Input card */}
          <div className="imperial-card p-6 sm:p-8">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[rgba(195,164,111,0.2)] bg-[rgba(195,164,111,0.08)] text-[var(--accent)]">
                <Sparkles className="size-4" />
              </span>
              <div>
                <h2 className="font-semibold text-white">Consulta personalizada</h2>
                <p className="mt-0.5 text-xs text-[var(--text-soft)]">
                  Descreva o cenário ou pergunta estratégica que deseja analisar.
                </p>
              </div>
            </div>

            <div className="relative">
              <textarea
                className="min-h-28 w-full resize-none rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] px-5 py-4 text-sm leading-7 text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[var(--text-soft)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(195,164,111,0.14)]"
                maxLength={500}
                placeholder="Ex.: Avalie se devemos concentrar vendas no Centro de Araruama ou expandir para outras regiões. Considere sazonalidade e concorrência local."
                value={draftFocus}
                onChange={(e) => setDraftFocus(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleApplyFocus()
                }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {/* Character ring */}
                <svg className="size-5 -rotate-90" viewBox="0 0 20 20" aria-hidden>
                  <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2.5" />
                  <circle
                    cx="10" cy="10" r="8" fill="none"
                    stroke={charPercent > 80 ? 'var(--danger)' : 'var(--accent)'}
                    strokeWidth="2.5"
                    strokeDasharray={`${50.27 * charPercent / 100} 50.27`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.2s ease' }}
                  />
                </svg>
                <span className={cn('text-xs', charPercent > 80 ? 'text-[var(--danger)]' : 'text-[var(--text-soft)]')}>
                  {draftFocus.length}/500
                </span>
                <span className="hidden text-xs text-[var(--text-soft)] opacity-50 sm:block">
                  · Ctrl+Enter para gerar
                </span>
              </div>

              <Button
                size="md"
                type="button"
                disabled={!draftFocus.trim()}
                onClick={handleApplyFocus}
              >
                <Sparkles className="size-4" />
                Gerar consultoria
              </Button>
            </div>
          </div>

          {/* Analysis output */}
          <div className="imperial-card overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 sm:px-8">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-xl border border-[rgba(195,164,111,0.2)] bg-[rgba(195,164,111,0.08)] text-[var(--accent)]">
                  <Activity className="size-3.5" />
                </span>
                <h3 className="font-semibold text-white">Análise executiva</h3>
              </div>

              {insightQuery.data?.generatedAt && (
                <span className="flex items-center gap-1.5 text-xs text-[var(--text-soft)]">
                  <TrendingUp className="size-3 text-[var(--success)]" />
                  {new Date(insightQuery.data.generatedAt).toLocaleString('pt-BR', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              )}
            </div>

            <div className="p-6 sm:p-8">
              {/* Thinking state */}
              {insightQuery.isLoading && <ThinkingIndicator />}

              {/* Error state */}
              {insightQuery.error && !insightQuery.isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 rounded-2xl border border-[rgba(212,115,115,0.25)] bg-[rgba(212,115,115,0.08)] p-5"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--danger)]" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--danger)]">Falha na análise</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">{errorMessage}</p>
                  </div>
                </motion.div>
              )}

              {/* Empty state */}
              {!insightQuery.data && !insightQuery.isLoading && !insightQuery.error && (
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="ai-glyph-pulse flex size-16 items-center justify-center rounded-3xl border border-[rgba(195,164,111,0.2)] bg-[rgba(195,164,111,0.07)]">
                    <BrainCircuit className="size-7 text-[var(--accent)]" />
                  </div>
                  <p className="mt-5 text-base font-semibold text-white">Pronto para analisar</p>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--text-soft)]">
                    Selecione um foco estratégico na barra lateral ou escreva uma consulta personalizada acima.
                  </p>
                </div>
              )}

              {/* Analysis result */}
              <AnimatePresence mode="wait">
                {insightQuery.data && !insightQuery.isLoading && (
                  <motion.div
                    key={activeFocus}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-7"
                  >
                    {/* Summary */}
                    <AnalysisSection title="Resumo Executivo" color="#c3a46f" icon={Activity} delay={0}>
                      <p className="text-sm leading-7 text-[var(--text-primary)]">
                        {insightQuery.data.summary}
                      </p>
                    </AnalysisSection>

                    {/* Forecast */}
                    <AnalysisSection title="Previsão" color="#5a95c4" icon={TrendingUp} delay={0.06}>
                      <p className="text-sm leading-7 text-[var(--text-primary)]">
                        {insightQuery.data.forecast}
                      </p>
                    </AnalysisSection>

                    {/* Opportunities */}
                    {insightQuery.data.opportunities.length > 0 && (
                      <AnalysisSection title="Oportunidades" color="#639371" icon={Lightbulb} delay={0.12}>
                        <ul className="space-y-2.5">
                          {insightQuery.data.opportunities.map((item, i) => (
                            <motion.li
                              key={i}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.12 + i * 0.05 }}
                              className="flex items-start gap-2.5 text-sm leading-6 text-[var(--text-primary)]"
                            >
                              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#639371]" />
                              {item}
                            </motion.li>
                          ))}
                        </ul>
                      </AnalysisSection>
                    )}

                    {/* Risks */}
                    {insightQuery.data.risks.length > 0 && (
                      <AnalysisSection title="Riscos" color="#d47373" icon={AlertTriangle} delay={0.18}>
                        <ul className="space-y-2.5">
                          {insightQuery.data.risks.map((item, i) => (
                            <motion.li
                              key={i}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.18 + i * 0.05 }}
                              className="flex items-start gap-2.5 text-sm leading-6 text-[var(--text-primary)]"
                            >
                              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#d47373]" />
                              {item}
                            </motion.li>
                          ))}
                        </ul>
                      </AnalysisSection>
                    )}

                    {/* Next actions */}
                    {insightQuery.data.nextActions.length > 0 && (
                      <AnalysisSection title="Próximos Passos" color="#8fb7ff" icon={Target} delay={0.24}>
                        <ol className="space-y-2.5">
                          {insightQuery.data.nextActions.map((item, i) => (
                            <motion.li
                              key={i}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.24 + i * 0.05 }}
                              className="flex items-start gap-2.5 text-sm leading-6 text-[var(--text-primary)]"
                            >
                              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-[rgba(143,183,255,0.25)] bg-[rgba(143,183,255,0.1)] text-[10px] font-bold text-[#8fb7ff]">
                                {i + 1}
                              </span>
                              {item}
                            </motion.li>
                          ))}
                        </ol>
                      </AnalysisSection>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile quick focuses */}
          <div className="imperial-card-soft rounded-2xl p-5 xl:hidden">
            <p className="ai-section-label mb-3 text-[var(--text-soft)]">Focos estratégicos</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {quickFocuses.map((focus) => (
                <FocusButton
                  key={focus.id}
                  label={focus.label}
                  icon={focus.icon}
                  active={activeFocus === focus.label}
                  onClick={() => setActiveFocus(focus.label)}
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
