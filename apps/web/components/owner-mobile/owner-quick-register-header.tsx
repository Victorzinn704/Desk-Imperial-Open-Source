import { ArrowLeft } from 'lucide-react'

export function OwnerQuickRegisterHeader({
  companyName,
  onBack,
}: Readonly<{
  companyName: string
  onBack: () => void
}>) {
  return (
    <header
      className="sticky top-0 z-40 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg)]/95 px-3 py-3 backdrop-blur"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      <button
        aria-label="Voltar para o app do proprietário"
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
        type="button"
        onClick={onBack}
      >
        <ArrowLeft className="size-4" />
      </button>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent,#008cff)]">
          {companyName}
        </p>
        <h1 className="truncate text-base font-semibold text-[var(--text-primary)]">Cadastro rápido</h1>
      </div>
    </header>
  )
}
