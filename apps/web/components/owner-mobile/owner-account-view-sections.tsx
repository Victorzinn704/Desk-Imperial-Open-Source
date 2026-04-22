'use client'

import {
  buildOwnerAccountGroups,
  buildOwnerAccountTags,
  type OwnerAccountAction,
  type OwnerAccountViewProps,
} from './owner-account-view-model'

export function OwnerAccountProfile({
  companyName,
  displayName,
}: Pick<OwnerAccountViewProps, 'companyName' | 'displayName'>) {
  const tags = buildOwnerAccountTags()

  return (
    <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">Conta</p>
      <h1 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{displayName}</h1>
      <p className="mt-1 text-sm leading-6 text-[var(--text-soft,#7a8896)]">{companyName}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {tags.map((label) => (
          <span
            className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-primary)]"
            key={label}
          >
            {label}
          </span>
        ))}
      </div>
    </section>
  )
}

export function OwnerAccountGroups({
  onOpenDashboard,
  onOpenQuickRegister,
  onOpenSecurity,
  onOpenSettings,
}: Pick<OwnerAccountViewProps, 'onOpenDashboard' | 'onOpenQuickRegister' | 'onOpenSecurity' | 'onOpenSettings'>) {
  const groups = buildOwnerAccountGroups({
    onOpenDashboard,
    onOpenQuickRegister,
    onOpenSecurity,
    onOpenSettings,
  })

  return (
    <>
      {groups.map((group) => (
        <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)]" key={group.label}>
          <div className="border-b border-[var(--border)] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
              {group.label}
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">{group.description}</p>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {group.actions.map((action) => (
              <OwnerAccountActionRow action={action} key={action.label} />
            ))}
          </div>
        </section>
      ))}
    </>
  )
}

function OwnerAccountActionRow({ action }: { action: OwnerAccountAction }) {
  const { Icon } = action

  return (
    <button
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-[var(--surface-muted)]"
      type="button"
      onClick={action.onClick}
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-xl border"
        style={{
          background: `${action.accent}14`,
          borderColor: `${action.accent}33`,
          color: action.accent,
        }}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[var(--text-primary)]">{action.label}</span>
        <span className="mt-1 block text-[11px] leading-5 text-[var(--text-soft,#7a8896)]">{action.description}</span>
      </span>
      <span className="text-xs font-semibold text-[var(--text-soft)]">Abrir</span>
    </button>
  )
}
