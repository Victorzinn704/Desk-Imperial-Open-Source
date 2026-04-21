'use client'

import { BarChart3, ChefHat, ClipboardList, Crown, Package, ShoppingCart, TrendingUp, Users } from 'lucide-react'
import { formatBRL as formatCurrency } from '@/lib/currency'
import { useMemo, useState } from 'react'

type Performer = { nome: string; valor: number; comandas: number }
type PerformerSnapshot = Performer & { abertasAgora: number }
type TopProduct = { nome: string; qtd: number; valor: number }

export function OwnerTodayView({
  activeComandas,
  errorMessage,
  garconRanking,
  garconSnapshots,
  isLoading,
  isOffline,
  kitchenBadge,
  mesasLivres,
  mesasOcupadas,
  onOpenComandas,
  onOpenFullDashboard,
  onOpenKitchen,
  onOpenPdv,
  onOpenQuickRegister,
  ticketMedio,
  todayOrderCount,
  todayRevenue,
  topProdutos,
}: Readonly<{
  activeComandas: number
  errorMessage: string | null
  garconRanking: Performer[]
  garconSnapshots: PerformerSnapshot[]
  isLoading: boolean
  isOffline: boolean
  kitchenBadge: number
  mesasLivres: number
  mesasOcupadas: number
  onOpenComandas: () => void
  onOpenFullDashboard: () => void
  onOpenKitchen: () => void
  onOpenPdv: () => void
  onOpenQuickRegister: () => void
  ticketMedio: number
  todayOrderCount: number
  todayRevenue: number
  topProdutos: TopProduct[]
}>) {
  const priority = buildTurnPriority({ activeComandas, kitchenBadge, mesasLivres, mesasOcupadas, todayOrderCount })
  const topProductLeader = topProdutos[0] ?? null
  const [selectedPerformer, setSelectedPerformer] = useState<string>('all')
  const selectedPerformerSnapshot = useMemo(
    () => garconSnapshots.find((performer) => performer.nome === selectedPerformer) ?? null,
    [garconSnapshots, selectedPerformer],
  )

  return (
    <div className="space-y-4 p-3 pb-6">
      {errorMessage ? (
        <div className="rounded-2xl border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-xs text-[#fca5a5]">
          {errorMessage}
        </div>
      ) : isOffline ? (
        <div className="rounded-2xl border border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.08)] px-4 py-3 text-xs text-[#fcd34d]">
          Você está offline. O resumo pode estar desatualizado até a reconexão.
        </div>
      ) : null}

      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">Hoje</p>
            <h1 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Operação do turno</h1>
            <p className="mt-1 text-sm leading-6 text-[var(--text-soft,#7a8896)]">{priority.headline}</p>
          </div>
          <span
            className="shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{
              color: priority.color,
              borderColor: priority.border,
              background: priority.background,
            }}
          >
            {priority.label}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            `${todayOrderCount} pedidos no turno`,
            `${activeComandas} comandas abertas`,
            kitchenBadge > 0 ? `${kitchenBadge} na cozinha` : 'cozinha sem fila crítica',
          ].map((label) => (
            <span
              className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-primary)]"
              key={label}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[18px] bg-[var(--border)]">
          {[
            { label: 'Receita', value: formatCurrency(todayRevenue), sub: 'faturado no turno', color: '#36f57c', Icon: TrendingUp },
            { label: 'Ticket médio', value: formatCurrency(ticketMedio), sub: 'média por atendimento', color: '#fb923c', Icon: BarChart3 },
            { label: 'Pedidos', value: String(todayOrderCount), sub: 'encerrados até agora', color: '#60a5fa', Icon: ClipboardList },
            { label: 'Comandas', value: String(activeComandas), sub: 'em aberto agora', color: '#a78bfa', Icon: ShoppingCart },
          ].map(({ label, value, sub, color, Icon }) => (
            <div
              className="bg-[var(--surface-muted)] px-3 py-3"
              data-testid={`owner-kpi-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              key={label}
            >
              <div className="mb-1 flex items-center gap-1.5">
                <Icon className="size-3.5" style={{ color }} />
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">{label}</p>
              </div>
              {isLoading ? (
                <div className="h-6 w-20 animate-pulse rounded bg-[var(--surface-soft)]" />
              ) : (
                <p className="text-lg font-bold text-[var(--text-primary)]">{value}</p>
              )}
              <p className="mt-1 text-[10px] text-[var(--text-soft)]">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">Ações do turno</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">Primeiro operação, depois consulta completa.</p>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {[
            { label: 'Abrir PDV', sub: 'mesas, pedido e fluxo de venda', onClick: onOpenPdv, Icon: ShoppingCart, accent: '#008cff' },
            { label: 'Comandas', sub: 'acompanhar ao vivo e fechar atendimentos', onClick: onOpenComandas, Icon: ClipboardList, accent: '#a78bfa' },
            { label: 'Ver cozinha', sub: 'fila e pressão do preparo', onClick: onOpenKitchen, Icon: ChefHat, accent: '#eab308' },
            { label: 'Cadastro rápido', sub: 'scan de EAN e inclusão no catálogo', onClick: onOpenQuickRegister, Icon: Package, accent: '#36f57c' },
          ].map(({ label, sub, onClick, Icon, accent }) => (
            <button
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-[var(--surface-muted)]"
              key={label}
              type="button"
              onClick={onClick}
            >
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border"
                style={{
                  color: accent,
                  borderColor: `${accent}33`,
                  background: `${accent}14`,
                }}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[var(--text-primary)]">{label}</span>
                <span className="mt-1 block text-[11px] leading-5 text-[var(--text-soft,#7a8896)]">{sub}</span>
              </span>
              <span className="text-xs font-semibold text-[var(--text-soft)]">Abrir</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">Ao vivo</p>
            <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">Mapa rápido do turno</p>
          </div>
          <span className="text-[10px] text-[var(--text-soft)]">
            {mesasOcupadas > 0 ? `${mesasOcupadas} mesas em uso` : 'salão sem pressão'}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-[18px] bg-[var(--border)]">
          {[
            { label: 'Livres', value: mesasLivres, tone: '#34d399' },
            { label: 'Ocupadas', value: mesasOcupadas, tone: '#f87171' },
            { label: 'Cozinha', value: kitchenBadge, tone: '#eab308' },
          ].map(({ label, value, tone }) => (
            <div className="bg-[var(--surface-muted)] px-3 py-3 text-center" key={label}>
              <p className="text-2xl font-bold" style={{ color: tone }}>
                {value}
              </p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">Radar do turno</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">
            Equipe e mix comercial na mesma leitura curta.
          </p>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="size-3.5 text-[var(--text-soft)]" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Ranking garçons</p>
          </div>

          {garconSnapshots.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all active:scale-95"
                data-testid="owner-today-performer-all"
                style={{
                  background: selectedPerformer === 'all' ? 'rgba(167,139,250,0.18)' : 'var(--surface-muted)',
                  color: selectedPerformer === 'all' ? '#c4b5fd' : 'var(--text-soft)',
                  border: `1px solid ${selectedPerformer === 'all' ? 'rgba(167,139,250,0.36)' : 'var(--border)'}`,
                }}
                type="button"
                onClick={() => setSelectedPerformer('all')}
              >
                Equipe inteira
              </button>
              {garconSnapshots.map((performer) => {
                const isActive = selectedPerformer === performer.nome
                return (
                  <button
                    className="rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all active:scale-95"
                    data-testid={`owner-today-performer-${slugify(performer.nome)}`}
                    key={performer.nome}
                    style={{
                      background: isActive ? 'rgba(167,139,250,0.18)' : 'var(--surface-muted)',
                      color: isActive ? '#c4b5fd' : 'var(--text-soft)',
                      border: `1px solid ${isActive ? 'rgba(167,139,250,0.36)' : 'var(--border)'}`,
                    }}
                    type="button"
                    onClick={() => setSelectedPerformer(performer.nome)}
                  >
                    {performer.nome}
                  </button>
                )
              })}
            </div>
          ) : null}

          {selectedPerformerSnapshot ? (
            <div className="mt-3 overflow-hidden rounded-[18px] bg-[var(--border)]">
              <div className="grid grid-cols-2 gap-px sm:grid-cols-4">
                {[
                  { label: 'Receita', value: formatCurrency(selectedPerformerSnapshot.valor), tone: '#36f57c' },
                  { label: 'Comandas', value: String(selectedPerformerSnapshot.comandas), tone: '#60a5fa' },
                  { label: 'Abertas agora', value: String(selectedPerformerSnapshot.abertasAgora), tone: '#fb923c' },
                  {
                    label: 'Ticket',
                    value:
                      selectedPerformerSnapshot.comandas > 0
                        ? formatCurrency(selectedPerformerSnapshot.valor / selectedPerformerSnapshot.comandas)
                        : '—',
                    tone: '#c4b5fd',
                  },
                ].map((item) => (
                  <div className="bg-[var(--surface-muted)] px-3 py-3" key={item.label}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">{item.label}</p>
                    <p className="mt-1 text-base font-bold leading-tight" style={{ color: item.tone }}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {garconRanking.length === 0 ? (
            <p className="py-3 text-xs text-[var(--text-soft)]">Nenhum garçom com vendas hoje.</p>
          ) : (
            <ul className="mt-2 divide-y divide-[var(--border)]">
              {garconRanking.map((g, i) => (
                <li className="flex items-center justify-between gap-3 py-3" key={g.nome}>
                  <div className="min-w-0 flex items-center gap-2.5">
                    <span className="flex size-6 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[10px] font-bold">
                      {i === 0 ? <Crown className="size-3 text-[#eab308]" /> : `#${i + 1}`}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{g.nome}</p>
                      <p className="text-[11px] text-[var(--text-soft)]">{g.comandas} comandas no turno</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-[#36f57c]">{formatCurrency(g.valor)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-[var(--border)] px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Package className="size-3.5 text-[var(--text-soft)]" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Top produtos</p>
            </div>
            {topProductLeader ? (
              <span className="text-[10px] text-[var(--text-soft)]">{topProductLeader.nome}</span>
            ) : null}
          </div>

          {topProdutos.length === 0 ? (
            <p className="py-3 text-xs text-[var(--text-soft)]">Nenhum produto vendido hoje ainda.</p>
          ) : (
            <ul className="mt-2 divide-y divide-[var(--border)]">
              {topProdutos.map((p, i) => {
                const maxValor = topProdutos[0]?.valor ?? 1
                const pct = maxValor > 0 ? Math.max(8, Math.round((p.valor / maxValor) * 100)) : 8
                return (
                  <li className="py-3" key={p.nome}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{p.nome}</p>
                        <p className="mt-1 text-[11px] text-[var(--text-soft)]">{p.qtd} unidades no turno</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-[#60a5fa]">{formatCurrency(p.valor)}</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--surface-muted)]">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%`, background: i === 0 ? '#36f57c' : 'rgba(96,165,250,0.6)' }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      <button
        className="w-full rounded-2xl border border-[rgba(0,140,255,0.3)] bg-[rgba(0,140,255,0.08)] px-4 py-3 text-sm font-semibold text-[var(--accent,#008cff)] transition-opacity active:opacity-70"
        type="button"
        onClick={onOpenFullDashboard}
      >
        Painel completo →
      </button>
    </div>
  )
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
}

function buildTurnPriority({
  activeComandas,
  kitchenBadge,
  mesasLivres,
  mesasOcupadas,
  todayOrderCount,
}: {
  activeComandas: number
  kitchenBadge: number
  mesasLivres: number
  mesasOcupadas: number
  todayOrderCount: number
}) {
  if (kitchenBadge > 0) {
    return {
      label: 'atenção',
      headline:
        kitchenBadge === 1
          ? 'Existe 1 item pressionando a cozinha agora. Vale abrir o fluxo de preparo antes de seguir no salão.'
          : `Existem ${kitchenBadge} itens pressionando a cozinha agora. Vale abrir o fluxo de preparo antes de seguir no salão.`,
      color: '#fbbf24',
      border: 'rgba(251,191,36,0.22)',
      background: 'rgba(251,191,36,0.1)',
    }
  }

  if (activeComandas > 0) {
    return {
      label: 'ao vivo',
      headline:
        activeComandas === 1
          ? 'Há 1 comanda aberta no turno. PDV e comandas seguem como o foco operacional desta leitura.'
          : `Há ${activeComandas} comandas abertas no turno. PDV e comandas seguem como o foco operacional desta leitura.`,
      color: '#60a5fa',
      border: 'rgba(96,165,250,0.22)',
      background: 'rgba(96,165,250,0.1)',
    }
  }

  if (mesasOcupadas > 0) {
    return {
      label: 'salão',
      headline:
        mesasLivres > 0
          ? `Salão sem fila crítica: ${mesasOcupadas} ocupadas e ${mesasLivres} livres para giro do próximo atendimento.`
          : `Salão cheio agora: ${mesasOcupadas} mesas ocupadas e nenhuma livre para giro imediato.`,
      color: '#a78bfa',
      border: 'rgba(167,139,250,0.22)',
      background: 'rgba(167,139,250,0.1)',
    }
  }

  return {
    label: 'estável',
    headline:
      todayOrderCount > 0
        ? `Turno estável até aqui, com ${todayOrderCount} pedidos já convertidos. A leitura agora pode migrar para conferência e próximos passos.`
        : 'Turno ainda sem pressão operacional. Use o app para abrir caixa, iniciar venda ou preparar o catálogo do dia.',
    color: '#36f57c',
    border: 'rgba(54,245,124,0.22)',
    background: 'rgba(54,245,124,0.1)',
  }
}
