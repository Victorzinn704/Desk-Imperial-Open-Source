'use client'

import Link from 'next/link'
import { LogOut, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LabShellAccountChip({
  accountInitials,
  accountLabel,
  accountMeta,
  compact = false,
  configHref,
  isActive = false,
}: Readonly<{
  accountInitials: string
  accountLabel: string
  accountMeta: string
  compact?: boolean
  configHref: string
  isActive?: boolean
}>) {
  return (
    <Link
      aria-label="Abrir configurações"
      className={cn(
        compact ? 'lab-user' : 'lab-account-chip',
        compact && isActive && 'lab-user--active',
        compact && 'lab-user',
        compact && 'lab-user--compact',
        !compact && isActive && 'lab-account-chip--active',
      )}
      href={configHref}
      title="Abrir configurações"
    >
      <span className={compact ? 'lab-user__avatar' : 'lab-account-chip__avatar'}>{accountInitials}</span>
      {compact ? (
        <div className="lab-user__info">
          <span className="lab-user__name">{accountLabel}</span>
          <span className="lab-user__role">{accountMeta}</span>
          <span className="lab-user__config">
            <Settings className="size-3.5" />
            Configurações
          </span>
        </div>
      ) : (
        <span className="lab-account-chip__text">
          <span className="lab-account-chip__name">{accountLabel}</span>
          <span className="lab-account-chip__meta">{accountMeta}</span>
        </span>
      )}
    </Link>
  )
}

export function LabShellLogoutButton({
  disabled,
  onClick,
}: Readonly<{
  disabled: boolean
  onClick: () => void
}>) {
  return (
    <button
      aria-label="Encerrar sessão"
      className="lab-icon-btn"
      disabled={disabled}
      title="Sair"
      type="button"
      onClick={onClick}
    >
      <LogOut className="size-4" />
    </button>
  )
}
