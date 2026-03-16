'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BrainCircuit, Bot, RefreshCcw, Sparkles, TrendingUp } from 'lucide-react'
import { ApiError, fetchMarketInsight } from '@/lib/api'
import { Button } from '@/components/shared/button'
import { cn } from '@/lib/utils'

const quickFocuses = [
  'Visao executiva geral',
  'Como aumentar a margem nos proximos 30 dias?',
  'Quais canais merecem mais investimento comercial?',
  'Onde esta o maior risco operacional agora?',
]

export function MarketIntelligenceCard() {
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
      : 'A leitura executiva da IA ainda nao conseguiu responder a consulta.'

  const handleApplyFocus = () => {
    if (!draftFocus.trim()) {
      return
    }

    setActiveFocus(draftFocus.trim())
  }

  return (
    <section className="rounded-[36px] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(20,26,34,0.96),rgba(11,14,18,0.98))] p-8 shadow-[var(--shadow-panel)]">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Consultor com IA
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-white">
            Gemini Flash como copiloto de previsao e gestao comercial.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
            O motor consulta o panorama financeiro atual, cruza canais, clientes, equipe e regioes,
            e devolve uma leitura executiva com previsao de curto prazo e proximos passos.
          </p>
        </div>

        <Button
          loading={insightQuery.isFetching}
          size="lg"
          type="button"
          variant="secondary"
          onClick={() => insightQuery.refetch()}
        >
          <RefreshCcw className="size-4" />
          Atualizar leitura
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {quickFocuses.map((focus) => (
          <button
            className={cn(
              'rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all duration-200',
              activeFocus === focus
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)] shadow-[0_12px_28px_rgba(212,177,106,0.16)]'
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

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
        <textarea
          className="min-h-28 rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-4 text-sm leading-7 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-soft)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
          maxLength={280}
          placeholder="Ex.: Avalie se devo concentrar vendas no Centro de Araruama ou expandir para outras regioes."
          value={draftFocus}
          onChange={(event) => setDraftFocus(event.currentTarget.value)}
        />

        <div className="flex flex-col gap-3">
          <Button size="lg" type="button" onClick={handleApplyFocus}>
            <Sparkles className="size-4" />
            Gerar consultoria
          </Button>
          <p className="max-w-xs text-xs leading-6 text-[var(--text-soft)]">
            O backend usa cache e rate limit para evitar excesso de chamadas e proteger a chave da
            IA.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(143,183,255,0.2)] bg-[rgba(143,183,255,0.08)] text-[var(--info)]">
              <BrainCircuit className="size-5" />
            </span>
            <div>
              <p className="text-sm text-[var(--text-soft)]">Consulta ativa</p>
              <h3 className="text-lg font-semibold text-white">{activeFocus}</h3>
            </div>
          </div>

          {insightQuery.data ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                {insightQuery.data.model}
                {insightQuery.data.cached ? ' • cache' : ' • tempo real'}
              </p>
              <p className="mt-2 text-sm text-white">
                {new Date(insightQuery.data.generatedAt).toLocaleString('pt-BR')}
              </p>
            </div>
          ) : null}
        </div>

        {insightQuery.isLoading ? (
          <div className="mt-6 rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] px-5 py-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              Processando leitura
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
              O consultor esta montando a previsao executiva com base na operacao atual.
            </p>
          </div>
        ) : insightQuery.error ? (
          <div className="mt-6 rounded-[24px] border border-[rgba(245,132,132,0.24)] bg-[rgba(245,132,132,0.06)] px-5 py-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--danger)]">
              IA indisponivel
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{errorMessage}</p>
          </div>
        ) : insightQuery.data ? (
          <div className="mt-6 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl border border-[rgba(212,177,106,0.2)] bg-[rgba(212,177,106,0.08)] text-[var(--accent)]">
                  <Bot className="size-4" />
                </span>
                <div>
                  <p className="text-sm text-[var(--text-soft)]">Resumo executivo</p>
                  <h3 className="text-lg font-semibold text-white">Leitura consolidada</h3>
                </div>
              </div>

              <p className="mt-4 text-sm leading-8 text-[var(--text-soft)]">
                {insightQuery.data.summary}
              </p>

              <div className="mt-6 rounded-[22px] border border-[rgba(143,183,255,0.2)] bg-[rgba(143,183,255,0.08)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--info)]">
                  Previsao de curto prazo
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                  {insightQuery.data.forecast}
                </p>
              </div>
            </article>

            <div className="grid gap-4">
              <InsightListCard
                icon={TrendingUp}
                items={insightQuery.data.opportunities}
                title="Oportunidades"
              />
              <InsightListCard
                icon={Sparkles}
                items={insightQuery.data.nextActions}
                title="Proximos passos"
              />
            </div>
          </div>
        ) : null}

        {insightQuery.data ? (
          <div className="mt-4">
            <InsightListCard
              icon={RefreshCcw}
              items={insightQuery.data.risks}
              title="Riscos a monitorar"
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}

function InsightListCard({
  icon: Icon,
  items,
  title,
}: Readonly<{
  icon: typeof BrainCircuit
  items: string[]
  title: string
}>) {
  return (
    <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,255,255,0.04)] text-[var(--text-primary)]">
          <Icon className="size-4" />
        </span>
        <div>
          <p className="text-sm text-[var(--text-soft)]">Leitura assistida</p>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div className="rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-3" key={item}>
            <p className="text-sm leading-7 text-[var(--text-soft)]">{item}</p>
          </div>
        ))}
      </div>
    </article>
  )
}
