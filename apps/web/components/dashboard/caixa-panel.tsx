'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Lock,
  TrendingUp,
  Unlock,
  X,
} from 'lucide-react'
import type { OperationsLiveResponse } from '@contracts/contracts'
import { ApiError, closeCashClosure, openCashSession } from '@/lib/api'
import { buildOperationsExecutiveKpis } from '@/lib/operations'
import { formatBRL } from '@/lib/currency'

// ── helpers ──────────────────────────────────────────────────────────────────

const fmtBRL = formatBRL

function parseAmount(raw: string): number {
  // aceita "1.500,50" (pt-BR) ou "1500.50" (en)
  const normalized = raw.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(normalized)
  return isNaN(n) ? 0 : n
}

// ── sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  highlight = 'neutral',
}: {
  icon: React.ElementType
  label: string
  value: string
  hint?: string
  highlight?: 'neutral' | 'positive' | 'negative' | 'accent'
}) {
  const borderClassMap: Record<string, string> = {
    positive: 'border-[rgba(52,242,127,0.18)] bg-[rgba(52,242,127,0.05)]',
    negative: 'border-[rgba(248,113,113,0.18)] bg-[rgba(248,113,113,0.05)]',
    accent: 'border-[rgba(155,132,96,0.35)] bg-[rgba(155,132,96,0.07)]',
    neutral: 'border-white/6 bg-[rgba(255,255,255,0.02)]',
  }

  const iconClassMap: Record<string, string> = {
    positive: 'text-[#34f27f]',
    negative: 'text-[#f87171]',
    accent: 'text-[#c9a96e]',
    neutral: 'text-[var(--text-soft)]',
  }

  const borderClass = borderClassMap[highlight] ?? borderClassMap.neutral
  const iconClass = iconClassMap[highlight] ?? iconClassMap.neutral

  return (
    <div className={`rounded-[22px] border px-4 py-4 ${borderClass}`}>
      <Icon className={`size-4 ${iconClass}`} />
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-1.5 text-lg font-semibold text-[var(--text-primary)]">{value}</p>
      {hint ? <p className="mt-1.5 text-[11px] leading-5 text-[var(--text-soft)]">{hint}</p> : null}
    </div>
  )
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Fechar modal do caixa"
        className="absolute inset-0 border-0 bg-black/70 p-0 backdrop-blur-sm"
        type="button"
        onClick={onClose}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// ── modal: abrir caixa ────────────────────────────────────────────────────────

function AbrirCaixaModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () =>
      openCashSession({
        openingCashAmount: parseAmount(amount),
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'live'] })
      onSuccess()
      onClose()
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Erro ao abrir o caixa. Tente novamente.')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseAmount(amount)
    if (parsed < 0) {
      setError('O valor inicial não pode ser negativo.')
      return
    }
    setError(null)
    mutation.mutate()
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0d1117] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Operação financeira
            </p>
            <h2 className="mt-1.5 text-xl font-semibold text-[var(--text-primary)]">Abrir caixa</h2>
          </div>
          <button
            className="mt-0.5 rounded-full p-1.5 text-[var(--text-soft)] hover:text-[var(--text-primary)] transition-colors"
            type="button"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)] mb-2">
              Valor inicial no caixa (R$)
            </label>
            <input
              autoFocus
              className="w-full rounded-[14px] border border-white/10 bg-white/4 px-4 py-3 text-lg font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/25 focus:border-[var(--accent)]/50 focus:outline-none transition-colors"
              inputMode="decimal"
              placeholder="0,00"
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="mt-1.5 text-[11px] text-[var(--text-soft)]">
              Dinheiro físico presente no caixa ao iniciar o turno. Pode ser R$ 0,00.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)] mb-2">
              Observações (opcional)
            </label>
            <textarea
              className="w-full resize-none rounded-[14px] border border-white/10 bg-white/4 px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/25 focus:border-[var(--accent)]/50 focus:outline-none transition-colors"
              placeholder="Troco separado, conferência inicial…"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error ? (
            <div className="rounded-[12px] border border-[rgba(248,113,113,0.25)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-sm text-[#f87171]">
              {error}
            </div>
          ) : null}

          <div className="flex gap-3 pt-1">
            <button
              className="flex-1 rounded-[14px] border border-white/10 px-4 py-3 text-sm font-semibold text-[var(--text-soft)] hover:text-[var(--text-primary)] hover:border-white/20 transition-colors"
              type="button"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              className="flex-1 rounded-[14px] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] hover:opacity-90 disabled:opacity-50 transition-opacity"
              disabled={mutation.isPending}
              type="submit"
            >
              {mutation.isPending ? 'Abrindo…' : 'Abrir caixa'}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  )
}

// ── modal: fechar caixa ───────────────────────────────────────────────────────

function FecharCaixaModal({
  openComandasCount,
  expectedCashAmount,
  onClose,
  onSuccess,
}: {
  openComandasCount: number
  expectedCashAmount: number
  onClose: () => void
  onSuccess: () => void
}) {
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [forceClose, setForceClose] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () =>
      closeCashClosure({
        countedCashAmount: parseAmount(amount),
        forceClose,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'live'] })
      onSuccess()
      onClose()
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Erro ao fechar o caixa. Tente novamente.')
    },
  })

  const hasOpenComandas = openComandasCount > 0
  const canSubmit = !hasOpenComandas || forceClose

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseAmount(amount)
    if (parsed < 0) {
      setError('O valor contado não pode ser negativo.')
      return
    }
    setError(null)
    mutation.mutate()
  }

  const delta = parseAmount(amount) - expectedCashAmount
  const showDelta = amount.trim() !== '' && parseAmount(amount) > 0

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0d1117] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Encerramento do dia
            </p>
            <h2 className="mt-1.5 text-xl font-semibold text-[var(--text-primary)]">Fechar caixa</h2>
          </div>
          <button
            className="mt-0.5 rounded-full p-1.5 text-[var(--text-soft)] hover:text-[var(--text-primary)] transition-colors"
            type="button"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>

        {hasOpenComandas ? (
          <div className="mt-5 rounded-[16px] border border-[rgba(251,191,36,0.25)] bg-[rgba(251,191,36,0.07)] px-4 py-4">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="size-4 shrink-0 text-[#fbbf24]" />
              <p className="text-sm font-semibold text-[#fbbf24]">
                {openComandasCount} comanda{openComandasCount > 1 ? 's' : ''} ainda aberta
                {openComandasCount > 1 ? 's' : ''}
              </p>
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--text-soft)]">
              O caixa só pode ser fechado após todas as comandas serem pagas. Ative o fechamento forçado apenas em caso
              de emergência.
            </p>
            <label className="mt-3 flex items-center gap-2.5 cursor-pointer">
              <input
                checked={forceClose}
                className="size-4 accent-[var(--accent)]"
                type="checkbox"
                onChange={(e) => setForceClose(e.target.checked)}
              />
              <span className="text-xs font-semibold text-[#fbbf24]">Fechar mesmo com comandas abertas</span>
            </label>
          </div>
        ) : (
          <div className="mt-5 rounded-[16px] border border-[rgba(52,242,127,0.18)] bg-[rgba(52,242,127,0.05)] px-4 py-3 flex items-center gap-2.5">
            <CheckCircle2 className="size-4 shrink-0 text-[#34f27f]" />
            <p className="text-sm text-[#34f27f] font-medium">Todas as comandas estão fechadas.</p>
          </div>
        )}

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)] mb-2">
              Valor contado no caixa (R$)
            </label>
            <input
              autoFocus
              className="w-full rounded-[14px] border border-white/10 bg-white/4 px-4 py-3 text-lg font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/25 focus:border-[var(--accent)]/50 focus:outline-none transition-colors"
              inputMode="decimal"
              placeholder="0,00"
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--text-soft)]">
              <span>Esperado: {fmtBRL(expectedCashAmount)}</span>
              {showDelta ? (
                <span className={delta >= 0 ? 'text-[#34f27f] font-semibold' : 'text-[#f87171] font-semibold'}>
                  {delta >= 0 ? '+' : ''}
                  {fmtBRL(delta)}
                </span>
              ) : null}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)] mb-2">
              Observações (opcional)
            </label>
            <textarea
              className="w-full resize-none rounded-[14px] border border-white/10 bg-white/4 px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/25 focus:border-[var(--accent)]/50 focus:outline-none transition-colors"
              placeholder="Quebra de caixa, sangria, ajuste…"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error ? (
            <div className="rounded-[12px] border border-[rgba(248,113,113,0.25)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-sm text-[#f87171]">
              {error}
            </div>
          ) : null}

          <div className="flex gap-3 pt-1">
            <button
              className="flex-1 rounded-[14px] border border-white/10 px-4 py-3 text-sm font-semibold text-[var(--text-soft)] hover:text-[var(--text-primary)] hover:border-white/20 transition-colors"
              type="button"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              className="flex-1 rounded-[14px] bg-[#f87171]/90 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] hover:opacity-90 disabled:opacity-40 transition-opacity"
              disabled={mutation.isPending || !canSubmit}
              type="submit"
            >
              {mutation.isPending ? 'Fechando…' : 'Fechar caixa'}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  )
}

// ── main component ────────────────────────────────────────────────────────────

function CaixaHeaderActions({
  caixaAberto,
  onOpenModal,
  onCloseModal,
}: Readonly<{
  caixaAberto: boolean
  onOpenModal: () => void
  onCloseModal: () => void
}>) {
  if (caixaAberto) {
    return (
      <>
        <span className="flex items-center gap-1.5 rounded-full border border-[rgba(52,242,127,0.25)] bg-[rgba(52,242,127,0.08)] px-3 py-1.5 text-xs font-semibold text-[#34f27f]">
          <span className="size-1.5 rounded-full bg-[#34f27f] animate-pulse" />
          Aberto
        </span>
        <button
          className="flex items-center gap-2 rounded-[14px] border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)] px-4 py-2.5 text-sm font-semibold text-[#f87171] hover:bg-[rgba(248,113,113,0.14)] transition-colors"
          type="button"
          onClick={onCloseModal}
        >
          <Lock className="size-3.5" />
          Fechar caixa
        </button>
      </>
    )
  }

  return (
    <button
      className="flex items-center gap-2 rounded-[14px] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:opacity-90 transition-opacity"
      type="button"
      onClick={onOpenModal}
    >
      <Unlock className="size-3.5" />
      Abrir caixa
    </button>
  )
}

function formatCaixaSubtitle(caixaAberto: boolean, openSessionsCount: number, openComandasCount: number): string {
  if (!caixaAberto) {return 'Nenhuma sessão de caixa ativa no momento.'}
  const comandaLabel = openComandasCount === 1 ? '' : 's'
  return `Caixa aberto · ${openSessionsCount} sessão ativa · ${openComandasCount} comanda${comandaLabel} em aberto`
}

function positiveOrNeutral(value: number): 'positive' | 'neutral' {
  return value > 0 ? 'positive' : 'neutral'
}

function CaixaEsperadoRow({ caixaEsperado, openComandasCount }: { caixaEsperado: number; openComandasCount: number }) {
  return (
    <div className="mt-3 rounded-[18px] border border-white/6 bg-[rgba(255,255,255,0.02)] px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Caixa esperado</p>
        <p className="mt-1.5 text-2xl font-semibold text-[var(--text-primary)]">{fmtBRL(caixaEsperado)}</p>
        <p className="mt-1 text-xs text-[var(--text-soft)]">Abertura + movimentos + vendas fechadas</p>
      </div>
      {openComandasCount > 0 ? (
        <div className="flex items-center gap-2 rounded-[12px] border border-[rgba(251,191,36,0.2)] bg-[rgba(251,191,36,0.06)] px-3.5 py-2.5 text-xs text-[#fbbf24]">
          <AlertTriangle className="size-3.5 shrink-0" />
          <span className="font-semibold">
            {openComandasCount} comanda{openComandasCount !== 1 ? 's' : ''} ainda aberta
            {openComandasCount !== 1 ? 's' : ''} — feche-as para encerrar o caixa
          </span>
        </div>
      ) : null}
    </div>
  )
}

function CaixaEmptyState({ onOpenModal }: { onOpenModal: () => void }) {
  return (
    <div className="mt-5 rounded-[22px] border border-dashed border-white/8 px-6 py-10 text-center">
      <Banknote className="mx-auto size-9 text-[var(--text-soft)]/50" />
      <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">Caixa ainda não foi aberto hoje</p>
      <p className="mt-1.5 text-xs text-[var(--text-soft)]">
        Clique em &ldquo;Abrir caixa&rdquo; para iniciar o turno e liberar o PDV para os funcionários.
      </p>
      <button
        className="mt-5 inline-flex items-center gap-2 rounded-[14px] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:opacity-90 transition-opacity"
        type="button"
        onClick={onOpenModal}
      >
        <Unlock className="size-3.5" />
        Abrir caixa agora
      </button>
    </div>
  )
}

export function CaixaPanel({ operations }: { operations: OperationsLiveResponse | undefined }) {
  const [showAbrirModal, setShowAbrirModal] = useState(false)
  const [showFecharModal, setShowFecharModal] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const {
    receitaRealizada,
    faturamentoAberto,
    projecaoTotal,
    lucroRealizado,
    lucroEsperado,
    caixaEsperado,
    openComandasCount,
    openSessionsCount,
  } = buildOperationsExecutiveKpis(operations)
  const caixaAberto = openSessionsCount > 0

  return (
    <>
      <section className="imperial-card p-6 md:p-7">
        <header className="flex flex-col gap-4 border-b border-white/6 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Financeiro operacional
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Caixa do dia</h2>
            <p className="mt-1.5 text-sm leading-6 text-[var(--text-soft)]">
              {formatCaixaSubtitle(caixaAberto, openSessionsCount, openComandasCount)}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <CaixaHeaderActions
              caixaAberto={caixaAberto}
              onCloseModal={() => setShowFecharModal(true)}
              onOpenModal={() => setShowAbrirModal(true)}
            />
          </div>
        </header>

        {/* success toast */}
        {successMsg ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-[14px] border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.06)] px-4 py-3">
            <div className="flex items-center gap-2.5 text-sm text-[#34f27f] font-medium">
              <CheckCircle2 className="size-4 shrink-0" />
              {successMsg}
            </div>
            <button type="button" onClick={() => setSuccessMsg(null)}>
              <X className="size-3.5 text-[var(--text-soft)]" />
            </button>
          </div>
        ) : null}

        {/* KPIs */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard
            highlight={positiveOrNeutral(receitaRealizada)}
            hint="Comandas fechadas hoje"
            icon={CircleDollarSign}
            label="Receita realizada"
            value={fmtBRL(receitaRealizada)}
          />
          <KpiCard
            highlight={positiveOrNeutral(lucroRealizado)}
            hint="Resultado líquido estimado"
            icon={TrendingUp}
            label="Lucro realizado"
            value={fmtBRL(lucroRealizado)}
          />
          <KpiCard
            highlight={faturamentoAberto > 0 ? 'accent' : 'neutral'}
            hint={`${openComandasCount} comanda${openComandasCount !== 1 ? 's' : ''} pendente${openComandasCount !== 1 ? 's' : ''}`}
            icon={ChevronDown}
            label="Em aberto"
            value={fmtBRL(faturamentoAberto)}
          />
          <KpiCard
            highlight={projecaoTotal > 0 ? 'accent' : 'neutral'}
            hint="Realizado + em aberto"
            icon={Banknote}
            label="Projeção total"
            value={fmtBRL(projecaoTotal)}
          />
        </div>

        <div className="mt-3 rounded-[18px] border border-white/6 bg-[rgba(255,255,255,0.02)] px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
            Lucro esperado
          </p>
          <p className="mt-1.5 text-2xl font-semibold text-[var(--text-primary)]">{fmtBRL(lucroEsperado)}</p>
          <p className="mt-1 text-xs text-[var(--text-soft)]">
            Leitura provisória: lucro realizado + faturamento em aberto
          </p>
        </div>

        {caixaAberto ? <CaixaEsperadoRow caixaEsperado={caixaEsperado} openComandasCount={openComandasCount} /> : null}

        {!caixaAberto && receitaRealizada === 0 ? (
          <CaixaEmptyState onOpenModal={() => setShowAbrirModal(true)} />
        ) : null}
      </section>

      {showAbrirModal ? (
        <AbrirCaixaModal
          onClose={() => setShowAbrirModal(false)}
          onSuccess={() => setSuccessMsg('Caixa aberto com sucesso. O PDV já está disponível para os funcionários.')}
        />
      ) : null}

      {showFecharModal ? (
        <FecharCaixaModal
          expectedCashAmount={caixaEsperado}
          openComandasCount={openComandasCount}
          onClose={() => setShowFecharModal(false)}
          onSuccess={() => setSuccessMsg('Caixa fechado. Bom trabalho hoje!')}
        />
      ) : null}
    </>
  )
}
