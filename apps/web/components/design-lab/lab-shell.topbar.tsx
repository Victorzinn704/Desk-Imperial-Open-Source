'use client'

import Link from 'next/link'
import { Menu, Moon, Sun } from 'lucide-react'
import { LabShellAccountChip, LabShellLogoutButton } from './lab-shell.account-chip'

type LabShellTopbarProps = Readonly<{
  accountInitials: string
  accountLabel: string
  accountMeta: string
  activeGroupLabel: string
  activeItemLabel: string
  configHref: string
  currentUser: { fullName?: string | null } | null
  isConfigRoute: boolean
  isDark: boolean
  isLoggingOut: boolean
  logout: () => void
  setTheme: (theme: string) => void
  toggleNavigation: () => void
}>

// eslint-disable-next-line max-lines-per-function
export function LabShellTopbar({
  accountInitials,
  accountLabel,
  accountMeta,
  activeGroupLabel,
  activeItemLabel,
  configHref,
  currentUser,
  isConfigRoute,
  isDark,
  isLoggingOut,
  logout,
  setTheme,
  toggleNavigation,
}: LabShellTopbarProps) {
  return (
    <header className="lab-topbar">
      <div className="lab-topbar__left">
        <button aria-label="Alternar menu" className="lab-icon-btn" type="button" onClick={toggleNavigation}>
          <Menu className="size-5" />
        </button>
        <div className="lab-topbar__context">
          <span className="lab-topbar__eyebrow">{activeGroupLabel}</span>
          <span className="lab-topbar__title">{activeItemLabel}</span>
        </div>
      </div>

      <div className="lab-topbar__right">
        <button
          className="lab-icon-btn"
          title={isDark ? 'Modo claro' : 'Modo escuro'}
          type="button"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        {currentUser ? (
          <>
            <LabShellAccountChip
              accountInitials={accountInitials}
              accountLabel={accountLabel}
              accountMeta={accountMeta}
              configHref={configHref}
              isActive={isConfigRoute}
            />
            <LabShellLogoutButton disabled={isLoggingOut} onClick={logout} />
          </>
        ) : (
          <Link className="lab-account-chip" href="/login">
            <span className="lab-account-chip__avatar">DI</span>
            <span className="lab-account-chip__text">
              <span className="lab-account-chip__name">Entrar</span>
              <span className="lab-account-chip__meta">Autenticar</span>
            </span>
          </Link>
        )}
      </div>
    </header>
  )
}
