type EquipeViewSummaryProps = {
  allowRosterEditing: boolean
  garconsCount: number
  onOpenAdd: () => void
  semGarcomCount: number
}

export function EquipeViewSummary({
  allowRosterEditing,
  garconsCount,
  onOpenAdd,
  semGarcomCount,
}: Readonly<EquipeViewSummaryProps>) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-[var(--text-soft)]">
        {garconsCount} {garconsCount === 1 ? 'garçom' : 'garçons'} em turno
        {semGarcomCount > 0 ? (
          <span className="ml-2 text-[#fbbf24]">
            · {semGarcomCount} mesa{semGarcomCount > 1 ? 's' : ''} sem responsável
          </span>
        ) : null}
      </p>
      {allowRosterEditing ? (
        <button
          className="flex items-center gap-1.5 rounded-[12px] border border-[rgba(0,140,255,0.35)] bg-[rgba(0,140,255,0.08)] px-3 py-2 text-xs font-semibold text-[var(--accent)] transition-colors hover:bg-[rgba(0,140,255,0.16)]"
          type="button"
          onClick={onOpenAdd}
        >
          + Garçom
        </button>
      ) : null}
    </div>
  )
}
