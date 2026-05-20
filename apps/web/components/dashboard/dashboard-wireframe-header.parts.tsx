'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { BrandMark } from '@/components/shared/brand-mark'
import {
  buildDashboardHref,
  type DashboardNavigationGroup,
  type DashboardProductSectionId,
  type DashboardSectionId,
  type DashboardSectionTab,
  type DashboardSettingsSectionId,
  type DashboardTabId,
} from '@/components/dashboard/dashboard-navigation'
import type { DashboardWireframeHeaderProps } from './dashboard-wireframe-header'
import { type MouseEvent as ReactMouseEvent, useCallback } from 'react'

export function WireframeBrandLink({
  activeSettingsSection,
  basePath,
  onNavigate,
}: Readonly<{
  activeSettingsSection: DashboardSettingsSectionId
  basePath: string
  onNavigate: (sectionId: DashboardSectionId, tabId?: DashboardTabId | null) => void
}>) {
  const handleBrandClick = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>) => {
      if (!shouldHandleDashboardNav(event)) {
        return
      }
      event.preventDefault()
      onNavigate('overview', 'principal')
    },
    [onNavigate],
  )

  return (
    <BrandMark
      href={buildDashboardHref('overview', activeSettingsSection, 'principal', basePath)}
      presentation="wireframe"
      wordmark="always"
      onClick={handleBrandClick}
    />
  )
}

export function WireframeHeaderActions({
  basePath,
  initials,
  onNavigateSettings,
  onSignOut,
  user,
}: Readonly<{
  basePath: string
  initials: string
  onNavigateSettings: DashboardWireframeHeaderProps['onNavigateSettings']
  onSignOut: DashboardWireframeHeaderProps['onSignOut']
  user: DashboardWireframeHeaderProps['user']
}>) {
  const handleAccountClick = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>) => {
      if (!shouldHandleDashboardNav(event)) {
        return
      }
      event.preventDefault()
      onNavigateSettings('account')
    },
    [onNavigateSettings],
  )

  return (
    <div className="wireframe-header__actions">
      <WireframeThemeButton />
      <Link
        aria-label="Conta e configurações"
        className="wireframe-account-button"
        href={buildDashboardHref('settings', 'account', undefined, basePath)}
        title={`${user.fullName} · ${user.email}`}
        onClick={handleAccountClick}
      >
        <span className="wireframe-account-button__avatar">{initials}</span>
        <span>conta</span>
      </Link>
      <button className="wireframe-text-button" title="Sair" type="button" onClick={onSignOut}>
        sair
      </button>
    </div>
  )
}

export function WireframePrimaryNav({
  activePrimaryId,
  activeSettingsSection,
  basePath,
  navigationGroups,
  onNavigate,
}: Readonly<{
  activePrimaryId: DashboardProductSectionId | null
  activeSettingsSection: DashboardSettingsSectionId
  basePath: string
  navigationGroups: DashboardNavigationGroup[]
  onNavigate: DashboardWireframeHeaderProps['onNavigate']
}>) {
  const primaryItems = navigationGroups.flatMap((group) => group.items)

  return (
    <nav aria-label="Seções principais" className="wireframe-primary-nav">
      {primaryItems.map((item) => (
        <WireframePrimaryNavItem
          active={activePrimaryId === item.id}
          activeSettingsSection={activeSettingsSection}
          basePath={basePath}
          item={item}
          key={item.id}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  )
}

function WireframePrimaryNavItem({
  active,
  activeSettingsSection,
  basePath,
  item,
  onNavigate,
}: Readonly<{
  active: boolean
  activeSettingsSection: DashboardSettingsSectionId
  basePath: string
  item: DashboardNavigationGroup['items'][number]
  onNavigate: DashboardWireframeHeaderProps['onNavigate']
}>) {
  const handlePrimaryClick = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>) => {
      if (!shouldHandleDashboardNav(event)) {
        return
      }
      event.preventDefault()
      onNavigate(item.id)
    },
    [item.id, onNavigate],
  )

  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={
        active ? 'wireframe-primary-nav__item wireframe-primary-nav__item--active' : 'wireframe-primary-nav__item'
      }
      href={buildDashboardHref(item.id, activeSettingsSection, undefined, basePath)}
      onClick={handlePrimaryClick}
    >
      <span className="wireframe-primary-nav__dot" />
      <span>{item.label}</span>
    </Link>
  )
}

export function WireframePeriod({
  compact,
  initials,
  role,
}: Readonly<{ compact: boolean; initials: string; role: string }>) {
  return (
    <div className="wireframe-period">
      <span>ter · 07 abr · 14:32</span>
      <span>{compact ? role.slice(0, 1) : initials}</span>
    </div>
  )
}

export function WireframeSubnav({
  activeDisplaySection,
  activeSettingsSection,
  activeTab,
  basePath,
  onNavigateTab,
  sectionTabs,
}: Readonly<{
  activeDisplaySection: DashboardProductSectionId | 'settings'
  activeSettingsSection: DashboardSettingsSectionId
  activeTab: DashboardTabId | null
  basePath: string
  onNavigateTab: DashboardWireframeHeaderProps['onNavigateTab']
  sectionTabs: DashboardSectionTab[]
}>) {
  if (sectionTabs.length === 0) {
    return null
  }

  return (
    <div aria-label="Subseções" className="wireframe-subnav">
      {sectionTabs.map((tab) => (
        <WireframeSubnavItem
          active={activeTab === tab.id}
          activeDisplaySection={activeDisplaySection}
          activeSettingsSection={activeSettingsSection}
          basePath={basePath}
          key={tab.id}
          tab={tab}
          onNavigateTab={onNavigateTab}
        />
      ))}
    </div>
  )
}

function WireframeSubnavItem({
  active,
  activeDisplaySection,
  activeSettingsSection,
  basePath,
  onNavigateTab,
  tab,
}: Readonly<{
  active: boolean
  activeDisplaySection: DashboardProductSectionId | 'settings'
  activeSettingsSection: DashboardSettingsSectionId
  basePath: string
  onNavigateTab: DashboardWireframeHeaderProps['onNavigateTab']
  tab: DashboardSectionTab
}>) {
  const handleSubnavClick = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>) => {
      if (!shouldHandleDashboardNav(event)) {
        return
      }
      event.preventDefault()
      onNavigateTab(tab.id)
    },
    [onNavigateTab, tab.id],
  )

  return (
    <Link
      aria-current={active ? 'true' : undefined}
      className={active ? 'wireframe-subnav__item wireframe-subnav__item--active' : 'wireframe-subnav__item'}
      href={buildDashboardHref(activeDisplaySection, activeSettingsSection, tab.id, basePath)}
      title={tab.description}
      onClick={handleSubnavClick}
    >
      <span>{tab.code}</span>
      {tab.emoji ? <strong className="wireframe-subnav__emoji">{tab.emoji}</strong> : null}
      {tab.label}
    </Link>
  )
}

function shouldHandleDashboardNav(event: ReactMouseEvent<HTMLAnchorElement>) {
  if (event.defaultPrevented) {
    return false
  }
  if (event.button !== 0) {
    return false
  }
  if (hasNavigationModifier(event)) {
    return false
  }

  const target = event.currentTarget.getAttribute('target')
  return !target || target === '_self'
}

function hasNavigationModifier(event: ReactMouseEvent<HTMLAnchorElement>) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

function WireframeThemeButton() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const handleToggleTheme = useCallback(() => {
    setTheme(isDark ? 'light' : 'dark')
  }, [isDark, setTheme])

  if (!resolvedTheme) {
    return <span aria-hidden="true" className="wireframe-theme-button" />
  }

  return (
    <button
      aria-label={isDark ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
      className="wireframe-theme-button"
      title={isDark ? 'Tema escuro ativo' : 'Tema claro ativo'}
      type="button"
      onClick={handleToggleTheme}
    >
      {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  )
}
