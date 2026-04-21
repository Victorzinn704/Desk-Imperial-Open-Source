'use client'

import type { OwnerPdvView } from './owner-mobile-shell-types'

export function OwnerPdvBanner({
  errorMessage,
  isOffline,
}: Readonly<{ errorMessage: string | null; isOffline: boolean }>) {
  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-xs text-[#fca5a5]">
        {errorMessage}
      </div>
    )
  }

  if (isOffline) {
    return (
      <div className="rounded-2xl border border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.08)] px-4 py-3 text-xs text-[#fcd34d]">
        O PDV pode estar desatualizado até a reconexão.
      </div>
    )
  }

  return null
}

export function OwnerPdvSummary({
  kitchenQueue,
  mesasEmAtendimento,
  mesasLivres,
}: Readonly<{ kitchenQueue: number; mesasEmAtendimento: number; mesasLivres: number }>) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-[18px] bg-[var(--border)]">
      {[
        { label: 'Livres', value: mesasLivres, color: '#36f57c' },
        { label: 'Em uso', value: mesasEmAtendimento, color: '#f87171' },
        { label: 'Na fila', value: kitchenQueue, color: '#eab308' },
      ].map(({ label, value, color }) => (
        <div className="bg-[var(--surface-muted)] px-3 py-3" key={label}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft,#7a8896)]">
            {label}
          </p>
          <p className="mt-1 text-xl font-bold" style={{ color }}>
            {value}
          </p>
        </div>
      ))}
    </div>
  )
}

export function OwnerPdvViewTabs({
  onSetPdvView,
  pdvView,
}: Readonly<{ onSetPdvView: (view: OwnerPdvView) => void; pdvView: OwnerPdvView }>) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[16px] bg-[var(--border)]">
      {(
        [
          { id: 'mesas', label: 'Mesas' },
          { id: 'cozinha', label: 'Cozinha' },
        ] as const
      ).map(({ id, label }) => {
        const isActive = pdvView === id
        return (
          <button
            className="bg-[var(--surface-muted)] px-3 py-3 text-sm font-semibold transition active:scale-[0.98]"
            data-testid={`owner-pdv-${id}`}
            key={id}
            style={{
              background: isActive ? 'rgba(0,140,255,0.12)' : 'var(--surface-muted)',
              color: isActive ? 'var(--accent,#008cff)' : 'var(--text-primary)',
            }}
            type="button"
            onClick={() => onSetPdvView(id)}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export function OwnerPdvOverviewHeader({ onOpenQuickRegister }: Readonly<{ onOpenQuickRegister: () => void }>) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">PDV</p>
        <h1 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Pedido e cozinha</h1>
        <p className="mt-1 text-sm leading-6 text-[var(--text-soft,#7a8896)]">
          Mesas, nova comanda e fila de cozinha em uma única superfície.
        </p>
      </div>
      <button
        className="shrink-0 rounded-xl border border-[rgba(0,140,255,0.3)] bg-[rgba(0,140,255,0.08)] px-3 py-2 text-xs font-semibold text-[var(--accent,#008cff)]"
        type="button"
        onClick={onOpenQuickRegister}
      >
        Cadastro rápido
      </button>
    </div>
  )
}
