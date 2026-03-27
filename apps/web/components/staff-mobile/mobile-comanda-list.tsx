'use client'

import { useEffect, useRef, useState } from 'react'
import type { Comanda, ComandaStatus } from '@/components/pdv/pdv-types'
import { calcTotal, formatElapsed } from '@/components/pdv/pdv-types'
import { Plus, X, Trash2, Edit2, ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react'

interface MobileComandaListProps {
  comandas: Comanda[]
  onUpdateStatus: (id: string, status: ComandaStatus) => Promise<void> | void
  onAddItems?: (comanda: Comanda) => void
  onNewComanda?: () => void
  onCancelComanda?: (id: string) => Promise<void> | void
  onCloseComanda?: (id: string, discountPercent: number, surchargePercent: number) => Promise<void> | void
  focusedId?: string | null
  onFocus?: (id: string | null) => void
}

type StatusConfig = {
  label: string
  chipColor: string
  chipBg: string
  nextStatus: ComandaStatus | null
  nextLabel: string | null
  nextBg: string
}

const STATUS_CONFIG: Record<Exclude<ComandaStatus, 'fechada'>, StatusConfig> = {
  aberta: {
    label: 'Aberta',
    chipColor: '#60a5fa',
    chipBg: 'rgba(96, 165, 250, 0.12)',
    nextStatus: 'em_preparo',
    nextLabel: 'Iniciar preparo',
    nextBg: 'rgba(251, 146, 60, 0.15)',
  },
  em_preparo: {
    label: 'Em Preparo',
    chipColor: '#fb923c',
    chipBg: 'rgba(251, 146, 60, 0.12)',
    nextStatus: 'pronta',
    nextLabel: 'Marcar pronta',
    nextBg: 'rgba(54, 245, 124, 0.12)',
  },
  pronta: {
    label: 'Pronta',
    chipColor: '#36f57c',
    chipBg: 'rgba(54, 245, 124, 0.12)',
    nextStatus: 'fechada',
    nextLabel: 'Fechar comanda',
    nextBg: 'rgba(122, 136, 150, 0.12)',
  },
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function MobileComandaList({
  comandas,
  onUpdateStatus,
  onAddItems,
  onNewComanda,
  onCancelComanda,
  onCloseComanda,
  focusedId,
  onFocus,
}: MobileComandaListProps) {
  const active = comandas.filter((c) => c.status !== 'fechada')
  const focusedRef = useRef<HTMLLIElement | null>(null)
  const [discountMap, setDiscountMap] = useState<Record<string, number>>({})
  const [surchargeMap, setSurchargeMap] = useState<Record<string, number>>({})

  // scroll focused comanda into view when it changes
  useEffect(() => {
    if (focusedId && focusedRef.current) {
      focusedRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [focusedId])

  // sort: focused first, then by openedAt desc
  const sorted = focusedId
    ? [...active].sort((a, b) => {
        if (a.id === focusedId) return -1
        if (b.id === focusedId) return 1
        return b.abertaEm.getTime() - a.abertaEm.getTime()
      })
    : active

  const fechadas = comandas.filter((c) => c.status === 'fechada')

  if (active.length === 0 && fechadas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)]">
          <span className="text-3xl">🍽️</span>
        </div>
        <p className="text-sm font-medium text-white">Nenhuma comanda ativa</p>
        <p className="mt-1 text-xs text-[var(--text-soft,#7a8896)]">
          Crie um pedido em uma mesa para começar
        </p>
        {onNewComanda && (
          <button
            type="button"
            onClick={onNewComanda}
            className="mt-5 flex items-center gap-2 rounded-xl bg-[rgba(155,132,96,0.15)] px-5 py-2.5 text-sm font-semibold text-[var(--accent,#9b8460)] transition-opacity active:opacity-70"
          >
            <Plus className="size-4" />
            Nova comanda
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
          Comandas ativas — {active.length}
        </p>
        {onNewComanda && (
          <button
            type="button"
            onClick={onNewComanda}
            className="flex items-center gap-1.5 rounded-xl border border-[rgba(155,132,96,0.3)] bg-[rgba(155,132,96,0.1)] px-3 py-1.5 text-xs font-semibold text-[var(--accent,#9b8460)] transition-colors active:bg-[rgba(155,132,96,0.2)]"
          >
            <Plus className="size-3.5" />
            Nova
          </button>
        )}
      </div>

      <ul className="space-y-4">
        {sorted.map((comanda) => {
          const isFocused = comanda.id === focusedId
          const config = STATUS_CONFIG[comanda.status as Exclude<ComandaStatus, 'fechada'>]
          const total = calcTotal(comanda)
          const elapsed = formatElapsed(comanda.abertaEm)
          const itemCount = comanda.itens.reduce((sum, i) => sum + i.quantidade, 0)
          const canAddItems = comanda.status === 'aberta' || comanda.status === 'em_preparo'
          const showDirectClose = comanda.status === 'aberta' || comanda.status === 'em_preparo'

          return (
            <li
              key={comanda.id}
              ref={isFocused ? focusedRef : null}
              className="group relative overflow-hidden rounded-[20px] transition-all duration-300"
              style={{
                background: isFocused ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isFocused ? `${config.chipColor}55` : 'rgba(255,255,255,0.06)'}`,
                boxShadow: isFocused ? `0 0 24px ${config.chipColor}15` : undefined,
                backdropFilter: isFocused ? 'blur(16px)' : 'blur(8px)',
              }}
            >
              {/* Clicável para focar se não estiver focado */}
              {!isFocused && onFocus && (
                <div 
                  className="absolute inset-0 z-10 cursor-pointer" 
                  onClick={() => onFocus(comanda.id)} 
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                />
              )}

              {/* Gradient de fundo sutil no card focado */}
              {isFocused && (
                <div 
                  className="pointer-events-none absolute -right-[20%] -top-[50%] size-[150%] rounded-full opacity-[0.08] blur-3xl transition-opacity"
                  style={{ background: `radial-gradient(circle, ${config.chipColor} 0%, transparent 70%)` }}
                />
              )}

              <div className="relative z-20 p-5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl font-bold text-white tracking-tight">
                        {comanda.mesa ?? 'Comanda'}
                      </span>
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] border"
                        style={{ color: config.chipColor, backgroundColor: config.chipBg, borderColor: `${config.chipColor}33` }}
                      >
                        {config.label}
                      </span>
                    </div>
                    {comanda.clienteNome && (
                      <p className="text-sm font-medium text-white mb-0.5 truncate">{comanda.clienteNome}</p>
                    )}
                    <p className="text-xs text-[var(--text-soft,#7a8896)] flex items-center gap-1.5 opacity-80">
                      <span>{itemCount} {itemCount === 1 ? 'item' : 'itens'}</span>
                      <span className="text-[10px] opacity-40">•</span>
                      <span>há {elapsed}</span>
                    </p>
                  </div>

                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-lg font-bold text-white tracking-tight">{formatCurrency(total)}</span>
                    {isFocused && (
                      <button type="button" onClick={() => onFocus?.(null)} className="mt-2 text-[10px] text-[var(--text-soft)] underline underline-offset-2">
                        Recolher
                      </button>
                    )}
                  </div>
                </div>

                {/* Exibição Completa (Focado) */}
                {isFocused && (
                  <div className="mt-5 animate-in fade-in slide-in-from-top-2 duration-300 fill-mode-forwards">
                    
                    {/* Botões de Ação Dinâmicos */}
                    <div className="flex gap-2 mb-5">
                      {onAddItems && canAddItems && (
                        <button
                          type="button"
                          onClick={() => onAddItems(comanda)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[rgba(155,132,96,0.4)] bg-[rgba(155,132,96,0.12)] py-2.5 text-sm font-semibold text-[var(--accent,#9b8460)] transition-all active:scale-95"
                          style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                          <Edit2 className="size-4" />
                          Editar / Itens
                        </button>
                      )}
                      
                      {onCancelComanda && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Tem certeza que deseja cancelar esta comanda inteira?')) {
                              onCancelComanda(comanda.id)
                            }
                          }}
                          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)] text-[#f87171] transition-all active:scale-95"
                          aria-label="Cancelar comanda"
                          style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                          <Trash2 className="size-4.5" />
                        </button>
                      )}
                    </div>

                    {/* Resumo de itens mais detalhado */}
                    {comanda.itens.length > 0 && (
                      <div className="mb-5 rounded-[14px] bg-[rgba(0,0,0,0.3)] p-3 border border-[rgba(255,255,255,0.04)]">
                        <ul className="space-y-2.5">
                          {comanda.itens.map((item, idx) => (
                            <li
                              key={`${item.produtoId}-${idx}`}
                              className="flex items-center justify-between text-[13px]"
                            >
                              <div className="flex gap-2.5 items-start">
                                <span className="font-bold text-[var(--accent,#9b8460)] w-4 text-center">{item.quantidade}x</span>
                                <div className="flex flex-col">
                                  <span className="font-medium text-white/90">{item.nome}</span>
                                  {item.observacao && <span className="text-[10px] text-white/40 italic">"{item.observacao}"</span>}
                                </div>
                              </div>
                              <span className="shrink-0 font-medium text-[var(--text-soft,#7a8896)] ml-3">
                                {formatCurrency(item.quantidade * item.precoUnitario)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Desconto e Acréscimo */}
                    <div className="mb-4 grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-soft,#7a8896)]">
                          Desconto %
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={discountMap[comanda.id] ?? 0}
                          onChange={(e) => setDiscountMap(prev => ({ ...prev, [comanda.id]: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                          className="w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(0,0,0,0.4)] px-3 py-2 text-sm text-white outline-none focus:border-[rgba(155,132,96,0.4)]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-soft,#7a8896)]">
                          Acréscimo %
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={surchargeMap[comanda.id] ?? 0}
                          onChange={(e) => setSurchargeMap(prev => ({ ...prev, [comanda.id]: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                          className="w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(0,0,0,0.4)] px-3 py-2 text-sm text-white outline-none focus:border-[rgba(155,132,96,0.4)]"
                        />
                      </div>
                    </div>

                    {/* Total Final */}
                    {(() => {
                      const disc = discountMap[comanda.id] ?? 0
                      const surcharge = surchargeMap[comanda.id] ?? 0
                      const adjusted = total * (1 - disc / 100) * (1 + surcharge / 100)
                      return (disc > 0 || surcharge > 0) ? (
                        <div className="mb-4 flex items-center justify-between rounded-xl border border-[rgba(155,132,96,0.2)] bg-[rgba(155,132,96,0.06)] px-4 py-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-soft,#7a8896)]">Total Final</p>
                            <p className="text-xs text-[var(--text-soft,#7a8896)] line-through">{formatCurrency(total)}</p>
                          </div>
                          <span className="text-xl font-bold text-[var(--accent,#9b8460)]">{formatCurrency(adjusted)}</span>
                        </div>
                      ) : null
                    })()}

                    {/* Botões de Fechamento / Fluxo */}
                    <div className="flex flex-col gap-2.5">
                      {config.nextStatus && (
                        <button
                          type="button"
                          onClick={() => void onUpdateStatus(comanda.id, config.nextStatus!)}
                          className="w-full flex items-center justify-center gap-2 rounded-[14px] py-3.5 text-sm font-bold text-white transition-all active:scale-[0.98] shadow-lg"
                          style={{ backgroundColor: config.nextBg, border: `1px solid ${config.chipColor}44`, WebkitTapHighlightColor: 'transparent' }}
                        >
                          {config.nextLabel}
                          <ChevronRight className="size-4 opacity-70" />
                        </button>
                      )}

                      {showDirectClose && onCloseComanda && (
                        <button
                          type="button"
                          onClick={() => void onCloseComanda(comanda.id, discountMap[comanda.id] ?? 0, surchargeMap[comanda.id] ?? 0)}
                          className="w-full flex items-center justify-center gap-2 rounded-[14px] py-3 text-xs font-bold text-[#94a3b8] transition-all active:bg-[rgba(255,255,255,0.06)]"
                          style={{ border: '1px solid rgba(148,163,184,0.15)', background: 'rgba(148,163,184,0.05)', WebkitTapHighlightColor: 'transparent' }}
                        >
                          Fechar Comanda (com desconto/juros)
                        </button>
                      )}

                      {showDirectClose && !onCloseComanda && (
                        <button
                          type="button"
                          onClick={() => void onUpdateStatus(comanda.id, 'fechada')}
                          className="w-full flex items-center justify-center gap-2 rounded-[14px] py-3 text-xs font-bold text-[#94a3b8] transition-all active:bg-[rgba(255,255,255,0.06)]"
                          style={{ border: '1px solid rgba(148,163,184,0.15)', background: 'rgba(148,163,184,0.05)', WebkitTapHighlightColor: 'transparent' }}
                        >
                          Efetuar Pagamento (Caixa)
                        </button>
                      )}
                    </div>
                    
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {/* Comprovantes — tocáveis para ver extrato */}
      {fechadas.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
            Comprovantes — {fechadas.length}
          </p>
          <ul className="space-y-2">
            {fechadas.map((comanda) => (
              <ExtratoCard key={comanda.id} comanda={comanda} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ── Extrato expandível ────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  aberta:     { label: 'Aberta',     color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  em_preparo: { label: 'Em preparo', color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  pronta:     { label: 'Pronta',     color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  fechada:    { label: 'Paga',       color: '#7a8896', bg: 'rgba(122,136,150,0.12)' },
}

function ExtratoCard({ comanda }: { comanda: Comanda }) {
  const [open, setOpen] = useState(false)
  const total = calcTotal(comanda)
  const subtotal = comanda.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0)
  const descontoVal = subtotal * (comanda.desconto / 100)
  const acrescimoVal = subtotal * (comanda.acrescimo / 100)
  const badge = STATUS_BADGE[comanda.status] ?? STATUS_BADGE.aberta

  return (
    <li className="overflow-hidden rounded-[14px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)]">
      {/* Header — clicável */}
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 transition-colors active:bg-[rgba(255,255,255,0.04)]"
        style={{ WebkitTapHighlightColor: 'transparent' }}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="text-left">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-white">Mesa {comanda.mesa ?? '—'}</p>
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
              style={{ color: badge.color, background: badge.bg }}
            >
              {badge.label}
            </span>
          </div>
          <p className="text-xs text-[var(--text-soft,#7a8896)]">
            {comanda.itens.reduce((s, i) => s + i.quantidade, 0)} itens · {formatElapsed(comanda.abertaEm)} atrás
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#36f57c]">{formatCurrency(total)}</span>
          {open
            ? <ChevronDown className="size-4 text-[var(--text-soft,#7a8896)]" />
            : <ChevronRight className="size-4 text-[var(--text-soft,#7a8896)]" />
          }
        </div>
      </button>

      {/* Extrato expandido */}
      {open && (
        <div className="border-t border-[rgba(255,255,255,0.06)] px-4 pb-4 pt-3">
          {/* Itens */}
          <ul className="space-y-2 mb-4">
            {comanda.itens.map((item, idx) => (
              <li key={idx} className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">
                    {item.quantidade}× {item.nome}
                  </p>
                  {item.observacao && (
                    <p className="text-[10px] italic text-[var(--text-soft,#7a8896)]">
                      {item.observacao}
                    </p>
                  )}
                </div>
                <span className="text-xs font-semibold text-white shrink-0">
                  {formatCurrency(item.quantidade * item.precoUnitario)}
                </span>
              </li>
            ))}
          </ul>

          {/* Totais */}
          <div className="space-y-1 border-t border-[rgba(255,255,255,0.06)] pt-3 text-xs">
            <div className="flex justify-between text-[var(--text-soft,#7a8896)]">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {comanda.desconto > 0 && (
              <div className="flex justify-between text-[#f87171]">
                <span>Desconto ({comanda.desconto}%)</span>
                <span>– {formatCurrency(descontoVal)}</span>
              </div>
            )}
            {comanda.acrescimo > 0 && (
              <div className="flex justify-between text-[#fb923c]">
                <span>Serviço ({comanda.acrescimo}%)</span>
                <span>+ {formatCurrency(acrescimoVal)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 font-semibold text-white">
              <span>Total</span>
              <span className="text-[#36f57c]">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      )}
    </li>
  )
}
