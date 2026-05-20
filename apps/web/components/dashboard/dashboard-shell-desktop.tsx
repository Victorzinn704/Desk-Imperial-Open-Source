'use client'

import type { ReactNode, RefObject, UIEventHandler } from 'react'
import type { AuthUser } from '@/lib/api'
import { type EnvironmentRenderProps, renderActiveEnvironment } from '@/components/dashboard/dashboard-environments'
import type {
  DashboardNavigationGroup,
  DashboardProductSectionId,
  DashboardSectionId,
  DashboardSectionTab,
  DashboardSettingsSectionId,
  DashboardTabId,
} from '@/components/dashboard/dashboard-navigation'
import { buildWireframeIntroFacts, sectionLabels } from '@/components/dashboard/dashboard-shell.helpers'
import { DashboardWireframeHeader } from '@/components/dashboard/dashboard-wireframe-header'
import type { PdvMesaIntent } from '@/components/pdv/pdv-navigation-intent'

export type DashboardShellDesktopProps = {
  activeDisplaySection: DashboardProductSectionId | 'settings'
  activeSection: DashboardSectionId
  activeSettingsSection: DashboardSettingsSectionId
  activeTab: DashboardTabId | null
  basePath: string
  compact: boolean
  employees: EnvironmentRenderProps['employees']
  finance: EnvironmentRenderProps['finance']
  navigationGroups: DashboardNavigationGroup[]
  onConsumePdvMesaIntent: () => void
  onNavigateSection: (sectionId: DashboardSectionId, tabId?: DashboardTabId | null) => void
  onNavigateSettings: (sectionId: DashboardSettingsSectionId) => void
  onNavigateTab: (tabId: DashboardTabId) => void
  onOpenPdvFromMesa: (intent: Omit<PdvMesaIntent, 'requestId'>) => void
  onScroll: UIEventHandler<HTMLDivElement>
  onSignOut: () => void
  pdvMesaIntent: PdvMesaIntent | null
  scrollRef: RefObject<HTMLDivElement | null>
  sectionTabs: DashboardSectionTab[]
  user: AuthUser
}

export function DashboardShellDesktop(props: Readonly<DashboardShellDesktopProps>) {
  return (
    <DashboardDesktopFrame scrollRef={props.scrollRef} onScroll={props.onScroll}>
      <DashboardWireframeHeader {...createWireframeHeaderProps(props)} />
      <DashboardDesktopContent {...props} />
    </DashboardDesktopFrame>
  )
}

function createWireframeHeaderProps(props: Readonly<DashboardShellDesktopProps>) {
  return {
    activeDisplaySection: props.activeDisplaySection,
    activeSettingsSection: props.activeSettingsSection,
    activeTab: props.activeTab,
    basePath: props.basePath,
    compact: props.compact,
    navigationGroups: props.navigationGroups,
    onNavigate: props.onNavigateSection,
    onNavigateSettings: props.onNavigateSettings,
    onNavigateTab: props.onNavigateTab,
    onSignOut: props.onSignOut,
    sectionTabs: props.sectionTabs,
    user: props.user,
  }
}

function DashboardDesktopFrame({
  children,
  onScroll,
  scrollRef,
}: Readonly<{
  children: ReactNode
  onScroll: UIEventHandler<HTMLDivElement>
  scrollRef: RefObject<HTMLDivElement | null>
}>) {
  return (
    <main className="wireframe-dashboard min-h-screen bg-[var(--bg)] text-[var(--text-primary)] lg:h-[100svh] lg:overflow-hidden">
      <div
        className="workspace-shell__main relative flex min-w-0 flex-col lg:h-[100svh] lg:min-h-0 lg:overflow-y-auto"
        ref={scrollRef}
        onScroll={onScroll}
      >
        {children}
      </div>
    </main>
  )
}

function DashboardDesktopContent({
  activeDisplaySection,
  activeSection,
  activeSettingsSection,
  activeTab,
  compact,
  employees,
  finance,
  onConsumePdvMesaIntent,
  onNavigateSection,
  onNavigateSettings,
  onOpenPdvFromMesa,
  pdvMesaIntent,
  sectionTabs,
  user,
}: Readonly<DashboardDesktopContentProps>) {
  return (
    <div
      className={`mx-auto flex w-full max-w-[1880px] flex-col ${compact ? 'gap-4 px-3 py-4 sm:px-4 lg:px-4 lg:py-4 xl:px-5 xl:py-5' : 'gap-5 px-3 py-4 sm:px-4 lg:px-4 lg:py-5 xl:px-5 xl:py-6'}`}
    >
      <DashboardPageIntro
        activeDisplaySection={activeDisplaySection}
        activeTab={activeTab}
        employeesCount={employees.length}
        finance={finance}
        sectionTabs={sectionTabs}
      />

      {renderActiveEnvironment({
        activeSection,
        activeSettingsSection,
        activeTab,
        employees,
        finance,
        onConsumePdvMesaIntent,
        onNavigateSection,
        onOpenPdvFromMesa,
        onSettingsSectionChange: onNavigateSettings,
        pdvMesaIntent,
        user,
      })}
    </div>
  )
}

type DashboardDesktopContentProps = Omit<
  DashboardShellDesktopProps,
  'basePath' | 'navigationGroups' | 'onNavigateTab' | 'onScroll' | 'onSignOut' | 'scrollRef'
>

function DashboardPageIntro({
  activeDisplaySection,
  activeTab,
  employeesCount,
  finance,
  sectionTabs,
}: Readonly<{
  activeDisplaySection: DashboardProductSectionId | 'settings'
  activeTab: DashboardTabId | null
  employeesCount: number
  finance: EnvironmentRenderProps['finance']
  sectionTabs: DashboardSectionTab[]
}>) {
  const activeLabel = sectionLabels[activeDisplaySection]
  const activeTabSummary = sectionTabs.find((tab) => tab.id === activeTab) ?? sectionTabs[0]
  const activeTabVersion = resolveActiveTabVersion(sectionTabs, activeTabSummary?.id ?? null)
  const introFacts = buildWireframeIntroFacts({ activeDisplaySection, employeesCount, finance })

  return (
    <div className="wireframe-page-intro" id="workspace-header">
      <div className="wireframe-page-copy min-w-0">
        <h1 className="wireframe-title">{activeLabel.title}</h1>
        <p className="wireframe-page-lead">{activeTabSummary?.label ?? activeLabel.description}</p>
        <p className="wireframe-page-note">{activeTabSummary?.description ?? activeLabel.description}</p>
      </div>
      {introFacts.length > 0 ? (
        <div aria-label="Resumo da seção" className="wireframe-intro-rail">
          {introFacts.map((fact) => (
            <div className="wireframe-intro-fact" key={fact.label}>
              <span className="wireframe-intro-fact__label">{fact.label}</span>
              <span className={`wireframe-intro-fact__value wireframe-intro-fact__value--${fact.tone}`}>
                {fact.value}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="wireframe-intro-meta">
        <span>{activeLabel.meta}</span>
        {activeTabVersion ? <span>{activeTabVersion}</span> : null}
      </div>
    </div>
  )
}

function resolveActiveTabVersion(sectionTabs: DashboardSectionTab[], activeTabId: DashboardTabId | null) {
  if (sectionTabs.length === 0 || !activeTabId) {
    return null
  }

  const activeTabIndex = Math.max(
    sectionTabs.findIndex((tab) => tab.id === activeTabId),
    0,
  )
  return `versão ${String(activeTabIndex + 1).padStart(2, '0')} de ${String(sectionTabs.length).padStart(2, '0')}`
}
