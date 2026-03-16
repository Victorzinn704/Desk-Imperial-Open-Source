'use client'

import { Search, Sparkles, X } from 'lucide-react'

export function ProductSearchField({
  value,
  onChange,
  onClear,
}: Readonly<{
  value: string
  onChange: (value: string) => void
  onClear: () => void
}>) {
  return (
    <div className="relative w-full overflow-hidden rounded-[26px] border border-[rgba(255,255,255,0.12)] bg-[linear-gradient(135deg,rgba(10,13,18,0.96),rgba(18,24,34,0.94))] p-[1px] shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(52,242,127,0.18),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(143,183,255,0.16),transparent_38%)]" />
      <div className="relative flex items-center gap-3 rounded-[25px] bg-[rgba(7,10,14,0.92)] px-3 py-3">
        <div className="flex size-12 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text-soft)]">
          <Search className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <label className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]" htmlFor="portfolio-search">
            Buscar produto
          </label>
          <input
            className="mt-1 h-9 w-full border-none bg-transparent text-sm text-white outline-none placeholder:text-[rgba(255,255,255,0.38)]"
            id="portfolio-search"
            onChange={(event) => onChange(event.currentTarget.value)}
            placeholder="Digite nome, inicial, marca ou classe"
            type="search"
            value={value}
          />
        </div>

        {value ? (
          <button
            className="inline-flex size-11 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[var(--text-soft)] transition hover:border-[rgba(52,242,127,0.28)] hover:text-white"
            onClick={onClear}
            type="button"
          >
            <X className="size-4" />
            <span className="sr-only">Limpar busca</span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-2xl border border-[rgba(52,242,127,0.18)] bg-[rgba(52,242,127,0.08)] px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#8fffb9]">
            <Sparkles className="size-4" />
            Busca imediata
          </div>
        )}
      </div>
    </div>
  )
}
