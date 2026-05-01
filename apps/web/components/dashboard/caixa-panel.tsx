'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Lock, Unlock, X } from 'lucide-react'
import type { OperationsLiveResponse } from '@contracts/contracts'
import { ApiError, closeCashClosure, openCashSession } from '@/lib/api'
import { buildOperationsExecutiveKpis } from '@/lib/operations'
import { formatBRL } from '@/lib/currency'
import { LabModal, LabPanel, LabStatusPill, type LabStatusTone } from '@/components/design-lab/lab-primitives'
import { cn } from '@/lib/utils'

const fmtBRL = formatBRL

function parseAmount(raw: string): number {
  const normalized = raw.replace(/\./g, '').replace(',', '.')
  const n = Number.parseFloat(normalized)
  return Number.isNaN(n) ? 0 : n
}

function getToneClasses(tone: LabStatusTone) {
  switch (tone) {
    case 'success':
      return {
        icon: 'text-[var(--success)]',
        panel: {
          borderColor: 'color-mix(in srgb, var(--success) 20%, var(--border))',
          backgroundColor: 'color-mix(in srgb, var(--success) 8%, var(--surface))',
        },
      }
    case 'danger':
      return {
        icon: 'text-[var(--danger)]',
        panel: {
          borderColor: 'color-mix(in srgb, var(--danger) 20%, var(--border))',
          backgroundColor: 'color-mix(in srgb, var(--danger) 8%, var(--surface))',
        },
      }
    case 'warning':
      return {
        icon: 'text-[var(--warning)]',
        panel: {
          borderColor: 'color-mix(in srgb, var(--warning) 22%, var(--border))',
          backgroundColor: 'color-mix(in srgb, var(--warning) 8%, var(--surface))',
        },
      }
    case 'info':
      return {
        icon: 'text-[var(--accent)]',
        panel: {
          borderColor: 'color-mix(in srgb, var(--accent) 22%, var(--border))',
          backgroundColor: 'color-mix(in srgb, var(--accent) 8%, var(--surface))',
        },
      }
    default:
      return {
        icon: 'text-[var(--text-soft)]',
        panel: {
          borderColor: 'var(--border)',
          backgroundColor: 'color-mix(in srgb, var(--surface-muted) 34%, var(--surface))',
        },
      }
  }
}

function SurfaceButton({ children, className, ...props }: Readonly<React.ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text-soft)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function PrimaryButton({ children, className, ...props }: Readonly<React.ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[12px] bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--on-accent)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function DangerButton({ children, className, ...props }: Readonly<React.ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[12px] px-4 py-2.5 text-sm font-semibold text-[var(--danger)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      style={{
        border: '1px solid color-mix(in srgb, var(--danger) 28%, var(--border))',
        backgroundColor: 'color-mix(in srgb, var(--danger) 10%, var(--surface))',
      }}
      {...props}
    >
      {children}
    </button>
  )
}

function FieldLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
      {children}
    </label>
  )
}

function FieldInput(props: Readonly<React.InputHTMLAttributes<HTMLInputElement>>) {
  return (
    <input
      className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
      {...props}
    />
  )
}

function FieldTextarea(props: Readonly<React.TextareaHTMLAttributes<HTMLTextAreaElement>>) {
  return (
    <textarea
      className="w-full resize-none rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
      {...props}
    />
  )
}

function MessageBox({
  children,
  tone,
}: Readonly<{
  children: React.ReactNode
  tone: Exclude<LabStatusTone, 'neutral'>
}>) {
  const toneClasses = getToneClasses(tone)
  return (
    <div className="rounded-[12px] border px-4 py-3 text-sm" style={toneClasses.panel}>
      <span className={cn('font-medium', toneClasses.icon)}>{children}</span>
    </div>
  )
}

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
    <LabModal
      description="Defina o valor inicial disponivel no caixa para iniciar o turno."
      closeLabel="Fechar modal do caixa"
      onClose={onClose}
      open
      title="Abrir caixa"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <FieldLabel>Valor inicial no caixa (R$)</FieldLabel>
          <FieldInput
            inputMode="decimal"
            placeholder="0,00"
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <p className="mt-1.5 text-[11px] text-[var(--text-soft)]">
            Dinheiro fisico presente no caixa ao iniciar o turno. Pode ser R$ 0,00.
          </p>
        </div>

        <div>
          <FieldLabel>Observacoes (opcional)</FieldLabel>
          <FieldTextarea
            placeholder="Troco separado, conferencia inicial..."
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error ? <MessageBox tone="danger">{error}</MessageBox> : null}

        <div className="flex gap-3 pt-1">
          <SurfaceButton className="flex-1" type="button" onClick={onClose}>
            Cancelar
          </SurfaceButton>
          <PrimaryButton className="flex-1" disabled={mutation.isPending} type="submit">
            {mutation.isPending ? 'Abrindo...' : 'Abrir caixa'}
          </PrimaryButton>
        </div>
      </form>
    </LabModal>
  )
}

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
  const delta = parseAmount(amount) - expectedCashAmount
  const showDelta = amount.trim() !== ''

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

  return (
    <LabModal
      description="Confirme o valor contado para encerrar a sessao do caixa."
      closeLabel="Fechar modal do caixa"
      onClose={onClose}
      open
      title="Fechar caixa"
    >
      {hasOpenComandas ? (
        <div
          className="mb-5 rounded-[14px] border px-4 py-4"
          style={{
            borderColor: 'color-mix(in srgb, var(--warning) 22%, var(--border))',
            backgroundColor: 'color-mix(in srgb, var(--warning) 8%, var(--surface))',
          }}
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-4 shrink-0 text-[var(--warning)]" />
            <p className="text-sm font-semibold text-[var(--warning)]">
              {openComandasCount} comanda{openComandasCount > 1 ? 's' : ''} ainda aberta
              {openComandasCount > 1 ? 's' : ''}
            </p>
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--text-soft)]">
            O caixa so pode ser fechado apos todas as comandas serem pagas. Ative o fechamento forcado apenas em caso de
            emergencia.
          </p>
          <label className="mt-3 flex cursor-pointer items-center gap-2.5">
            <input
              checked={forceClose}
              className="size-4 accent-[var(--accent)]"
              type="checkbox"
              onChange={(e) => setForceClose(e.target.checked)}
            />
            <span className="text-xs font-semibold text-[var(--warning)]">Fechar mesmo com comandas abertas</span>
          </label>
        </div>
      ) : (
        <div
          className="mb-5 flex items-center gap-2.5 rounded-[14px] border px-4 py-3"
          style={{
            borderColor: 'color-mix(in srgb, var(--success) 20%, var(--border))',
            backgroundColor: 'color-mix(in srgb, var(--success) 8%, var(--surface))',
          }}
        >
          <CheckCircle2 className="size-4 shrink-0 text-[var(--success)]" />
          <p className="text-sm font-medium text-[var(--success)]">Todas as comandas estao fechadas.</p>
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <FieldLabel>Valor contado no caixa (R$)</FieldLabel>
          <FieldInput
            inputMode="decimal"
            placeholder="0,00"
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--text-soft)]">
            <span>Esperado: {fmtBRL(expectedCashAmount)}</span>
            {showDelta ? (
              <span className={cn('font-semibold', delta >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]')}>
                {delta >= 0 ? '+' : ''}
                {fmtBRL(delta)}
              </span>
            ) : null}
          </div>
        </div>

        <div>
          <FieldLabel>Observacoes (opcional)</FieldLabel>
          <FieldTextarea
            placeholder="Quebra de caixa, sangria, ajuste..."
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error ? <MessageBox tone="danger">{error}</MessageBox> : null}

        <div className="flex gap-3 pt-1">
          <SurfaceButton className="flex-1" type="button" onClick={onClose}>
            Cancelar
          </SurfaceButton>
          <DangerButton className="flex-1" disabled={mutation.isPending || !canSubmit} type="submit">
            {mutation.isPending ? 'Fechando...' : 'Fechar caixa'}
          </DangerButton>
        </div>
      </form>
    </LabModal>
  )
}

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
      <div className="flex flex-wrap items-center gap-2">
        <LabStatusPill icon={<span className="size-1.5 rounded-full bg-[var(--success)]" />} tone="success">
          Aberto
        </LabStatusPill>
        <DangerButton type="button" onClick={onCloseModal}>
          <Lock className="size-3.5" />
          Fechar caixa
        </DangerButton>
      </div>
    )
  }

  return (
    <PrimaryButton type="button" onClick={onOpenModal}>
      <Unlock className="size-3.5" />
      Abrir caixa
    </PrimaryButton>
  )
}

function formatCaixaSubtitle(caixaAberto: boolean, openSessionsCount: number, openComandasCount: number): string {
  if (!caixaAberto) {
    return 'Nenhuma sessao de caixa ativa no momento.'
  }
  const comandaLabel = openComandasCount === 1 ? '' : 's'
  return `Caixa aberto · ${openSessionsCount} sessao ativa · ${openComandasCount} comanda${comandaLabel} em aberto`
}

function resolveNextCashAction(openComandasCount: number, caixaAberto: boolean) {
  if (openComandasCount > 0) {
    return { label: 'fechar comandas', tone: 'warning' as const }
  }

  if (caixaAberto) {
    return { label: 'conferir e encerrar', tone: 'success' as const }
  }

  return { label: 'abrir caixa', tone: 'info' as const }
}

function CaixaHeadlineMetric({
  label,
  value,
  hint,
}: Readonly<{
  label: string
  value: string
  hint: string
}>) {
  return (
    <div className="bg-[var(--surface)] px-5 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-2 text-[clamp(1.6rem,2vw,2.1rem)] font-semibold leading-none tracking-[-0.04em] text-[var(--text-primary)] tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-[var(--text-soft)]">{hint}</p>
    </div>
  )
}

function CaixaCompactSignalRow({
  label,
  note,
  tone,
  value,
}: Readonly<{
  label: string
  note: string
  tone: LabStatusTone
  value: string
}>) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--border)] py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">{label}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">{note}</p>
      </div>
      <LabStatusPill tone={tone}>{value}</LabStatusPill>
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
  const nextAction = resolveNextCashAction(openComandasCount, caixaAberto)

  return (
    <>
      <LabPanel
        action={
          <CaixaHeaderActions
            caixaAberto={caixaAberto}
            onCloseModal={() => setShowFecharModal(true)}
            onOpenModal={() => setShowAbrirModal(true)}
          />
        }
        padding="md"
        subtitle={formatCaixaSubtitle(caixaAberto, openSessionsCount, openComandasCount)}
        title="Caixa do dia"
      >
        {successMsg ? (
          <div
            className="mb-4 flex items-center justify-between gap-3 rounded-[14px] border px-4 py-3"
            style={{
              borderColor: 'color-mix(in srgb, var(--success) 20%, var(--border))',
              backgroundColor: 'color-mix(in srgb, var(--success) 8%, var(--surface))',
            }}
          >
            <div className="flex items-center gap-2.5 text-sm font-medium text-[var(--success)]">
              <CheckCircle2 className="size-4 shrink-0" />
              {successMsg}
            </div>
            <button type="button" onClick={() => setSuccessMsg(null)}>
              <X className="size-3.5 text-[var(--text-soft)]" />
            </button>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface-muted)]">
          <div className="grid gap-px bg-[var(--border)] sm:grid-cols-2 xl:grid-cols-5">
            <CaixaHeadlineMetric
              hint="Comandas fechadas hoje"
              label="Receita realizada"
              value={fmtBRL(receitaRealizada)}
            />
            <CaixaHeadlineMetric
              hint="Resultado líquido já capturado"
              label="Lucro realizado"
              value={fmtBRL(lucroRealizado)}
            />
            <CaixaHeadlineMetric
              hint={`${openComandasCount} comanda${openComandasCount !== 1 ? 's' : ''} pendente${openComandasCount !== 1 ? 's' : ''}`}
              label="Em aberto"
              value={fmtBRL(faturamentoAberto)}
            />
            <CaixaHeadlineMetric hint="Realizado + em aberto" label="Projeção total" value={fmtBRL(projecaoTotal)} />
            <CaixaHeadlineMetric
              hint="Leitura provisória do fechamento"
              label="Lucro esperado"
              value={fmtBRL(lucroEsperado)}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <div className="rounded-[18px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-muted)_34%,var(--surface))] px-5 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Fechamento do turno
            </p>
            <p className="mt-2 text-[clamp(1.7rem,2.2vw,2.3rem)] font-semibold leading-none tracking-[-0.04em] text-[var(--text-primary)] tabular-nums">
              {fmtBRL(caixaEsperado)}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
              {caixaAberto
                ? 'Referência viva do caixa para conferir o turno antes do encerramento.'
                : 'Abra o caixa para iniciar o turno e liberar o PDV dos funcionários.'}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {caixaAberto ? (
                openComandasCount > 0 ? (
                  <div
                    className="inline-flex items-center gap-2 rounded-[12px] border px-3.5 py-2.5 text-xs"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--warning) 20%, var(--border))',
                      backgroundColor: 'color-mix(in srgb, var(--warning) 8%, var(--surface))',
                    }}
                  >
                    <AlertTriangle className="size-3.5 shrink-0 text-[var(--warning)]" />
                    <span className="font-semibold text-[var(--warning)]">
                      {openComandasCount} comanda{openComandasCount !== 1 ? 's' : ''} ainda aberta
                      {openComandasCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                ) : (
                  <div
                    className="inline-flex items-center gap-2 rounded-[12px] border px-3.5 py-2.5 text-xs"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--success) 20%, var(--border))',
                      backgroundColor: 'color-mix(in srgb, var(--success) 8%, var(--surface))',
                    }}
                  >
                    <CheckCircle2 className="size-3.5 shrink-0 text-[var(--success)]" />
                    <span className="font-semibold text-[var(--success)]">Tudo pronto para conferência final</span>
                  </div>
                )
              ) : (
                <PrimaryButton type="button" onClick={() => setShowAbrirModal(true)}>
                  <Unlock className="size-3.5" />
                  Abrir caixa agora
                </PrimaryButton>
              )}
            </div>
          </div>

          <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <CaixaCompactSignalRow
              label="status"
              note="o turno só fecha depois da conferência do caixa"
              tone={caixaAberto ? 'success' : 'neutral'}
              value={caixaAberto ? 'aberto' : 'fechado'}
            />
            <CaixaCompactSignalRow
              label="comandas abertas"
              note="pendências que ainda travam o encerramento"
              tone={openComandasCount > 0 ? 'warning' : 'success'}
              value={String(openComandasCount)}
            />
            <CaixaCompactSignalRow
              label="próxima ação"
              note="o passo operacional mais importante agora"
              tone={nextAction.tone}
              value={nextAction.label}
            />
          </div>
        </div>
      </LabPanel>

      {showAbrirModal ? (
        <AbrirCaixaModal
          onClose={() => setShowAbrirModal(false)}
          onSuccess={() => setSuccessMsg('Caixa aberto com sucesso. O PDV ja esta disponivel para os funcionarios.')}
        />
      ) : null}

      {showFecharModal ? (
        <FecharCaixaModal
          expectedCashAmount={caixaEsperado}
          openComandasCount={openComandasCount}
          onClose={() => setShowFecharModal(false)}
          onSuccess={() => setSuccessMsg('Caixa fechado. Bom trabalho hoje.')}
        />
      ) : null}
    </>
  )
}
