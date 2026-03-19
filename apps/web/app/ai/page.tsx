'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BrainCircuit, Bot, RefreshCcw, Sparkles, TrendingUp, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ApiError, fetchMarketInsight } from '@/lib/api'
import { Button } from '@/components/shared/button'
import { cn } from '@/lib/utils'

const quickFocuses = [
  'Visão executiva geral',
  'Como aumentar a margem nos próximos 30 dias?',
  'Quais canais merecem mais investimento comercial?',
  'Onde está o maior risco operacional agora?',
  'Análise de performance por categoria de produto',
  'Previsão de demanda para os próximos 3 meses',
  'Otimização de preços baseada em concorrência',
  'Identificação de oportunidades de cross-selling',
]

export default function AIConsultantPage() {
  const [draftFocus, setDraftFocus] = useState('')
  const [activeFocus, setActiveFocus] = useState<string>(quickFocuses[0])
  const insightQuery = useQuery({
    queryKey: ['market-intelligence', activeFocus],
    queryFn: () => fetchMarketInsight(activeFocus),
    staleTime: 10 * 60 * 1000,
  })

  const errorMessage =
    insightQuery.error instanceof ApiError
      ? insightQuery.error.message
      : 'A leitura executiva da IA ainda não conseguiu responder à consulta.'

  const handleApplyFocus = () => {
    if (!draftFocus.trim()) {
      return
    }

    setActiveFocus(draftFocus.trim())
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="size-4 mr-2" />
                  Voltar ao Dashboard
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-[rgba(212,177,106,0.1)] border border-[rgba(212,177,106,0.2)]">
                  <BrainCircuit className="size-5 text-[var(--accent)]" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-white">Consultor IA</h1>
                  <p className="text-sm text-[var(--text-soft)]">Análise inteligente do seu negócio</p>
                </div>
              </div>
            </div>

            <Button
              loading={insightQuery.isFetching}
              size="lg"
              type="button"
              variant="secondary"
              onClick={() => insightQuery.refetch()}
            >
              <RefreshCcw className="size-4" />
              Atualizar análise
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Main Analysis Area */}
          <div className="space-y-6">
            {/* Description */}
            <div className="imperial-card p-8">
              <div className="flex items-center gap-3 mb-4">
                <Bot className="size-6 text-[var(--accent)]" />
                <h2 className="text-2xl font-semibold text-white">Gemini Flash como copiloto</h2>
              </div>
              <p className="text-lg leading-8 text-[var(--text-soft)]">
                O motor de IA consulta o panorama financeiro atual, cruza canais, clientes, equipe e regiões,
                e devolve uma leitura executiva com previsão de curto prazo e próximos passos estratégicos.
              </p>
            </div>

            {/* Custom Query */}
            <div className="imperial-card p-8">
              <h3 className="text-xl font-semibold text-white mb-4">Consulta personalizada</h3>
              <div className="space-y-4">
                <textarea
                  className="min-h-32 w-full rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] px-6 py-4 text-sm leading-7 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-soft)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
                  maxLength={500}
                  placeholder="Ex.: Avalie se devemos concentrar vendas no Centro de Araruama ou expandir para outras regiões. Considere sazonalidade e concorrência local."
                  value={draftFocus}
                  onChange={(event) => setDraftFocus(event.currentTarget.value)}
                />
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[var(--text-soft)]">
                    {draftFocus.length}/500 caracteres
                  </p>
                  <Button size="lg" type="button" onClick={handleApplyFocus}>
                    <Sparkles className="size-4 mr-2" />
                    Gerar consultoria
                  </Button>
                </div>
              </div>
            </div>

            {/* Analysis Result */}
            <div className="imperial-card p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Análise executiva</h3>
                {insightQuery.data && (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <TrendingUp className="size-3" />
                    {insightQuery.data.generatedAt ? new Date(insightQuery.data.generatedAt).toLocaleString('pt-BR') : 'Análise atual'}
                  </div>
                )}
              </div>

              {insightQuery.isLoading && (
                <div className="space-y-4">
                  <div className="h-4 bg-[rgba(255,255,255,0.06)] rounded animate-pulse" />
                  <div className="h-4 bg-[rgba(255,255,255,0.06)] rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-[rgba(255,255,255,0.06)] rounded animate-pulse w-1/2" />
                  <div className="h-4 bg-[rgba(255,255,255,0.06)] rounded animate-pulse w-5/6" />
                </div>
              )}

              {insightQuery.error && (
                <div className="rounded-lg border border-[var(--danger)] bg-[rgba(255,107,107,0.1)] p-4">
                  <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
                </div>
              )}

              {insightQuery.data && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">Resumo Executivo</h4>
                    <p className="text-[var(--text-primary)] leading-7">{insightQuery.data.summary}</p>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">Previsão</h4>
                    <p className="text-[var(--text-primary)] leading-7">{insightQuery.data.forecast}</p>
                  </div>

                  {insightQuery.data.opportunities.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-3">Oportunidades</h4>
                      <ul className="space-y-2">
                        {insightQuery.data.opportunities.map((opportunity, index) => (
                          <li key={index} className="flex items-start gap-2 text-[var(--text-primary)]">
                            <span className="text-[var(--accent)] mt-1">•</span>
                            {opportunity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {insightQuery.data.risks.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-3">Riscos</h4>
                      <ul className="space-y-2">
                        {insightQuery.data.risks.map((risk, index) => (
                          <li key={index} className="flex items-start gap-2 text-[var(--text-primary)]">
                            <span className="text-red-400 mt-1">•</span>
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {insightQuery.data.nextActions.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-3">Próximos Passos</h4>
                      <ul className="space-y-2">
                        {insightQuery.data.nextActions.map((action, index) => (
                          <li key={index} className="flex items-start gap-2 text-[var(--text-primary)]">
                            <span className="text-blue-400 mt-1">{index + 1}.</span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar with Quick Focuses */}
          <div className="space-y-6">
            <div className="imperial-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Focos estratégicos</h3>
              <div className="space-y-3">
                {quickFocuses.map((focus) => (
                  <button
                    className={cn(
                      'w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all duration-200',
                      activeFocus === focus
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)] shadow-[0_8px_24px_rgba(212,177,106,0.2)]'
                        : 'border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-soft)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]',
                    )}
                    key={focus}
                    type="button"
                    onClick={() => setActiveFocus(focus)}
                  >
                    {focus}
                  </button>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="imperial-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">💡 Dicas para melhores resultados</h3>
              <ul className="space-y-3 text-sm text-[var(--text-soft)]">
                <li>• Seja específico sobre períodos e regiões</li>
                <li>• Mencione métricas que considera importantes</li>
                <li>• Inclua contexto sobre concorrência ou mercado</li>
                <li>• Pergunte sobre tendências ou previsões</li>
                <li>• Considere fatores sazonais ou externos</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}