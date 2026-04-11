'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ProfileFormValues } from '@/lib/validation'
import { type AuthUser, type CookiePreferencePayload, type CookiePreferences, fetchActivityFeed } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  type DashboardSectionId,
  dashboardSettingsNav,
  type DashboardSettingsSectionId,
} from '@/components/dashboard/dashboard-navigation'

// Imports from extracted settings module
import { useWorkspacePreferences } from './settings/hooks/use-workspace-preferences'
import { SettingsMetric } from './settings/components/settings-metric'
import { AccountTab } from './settings/tabs/account-tab'
import { SecurityTab } from './settings/tabs/security-tab'
import { PreferencesTab } from './settings/tabs/preferences-tab'
import { ComplianceTab } from './settings/tabs/compliance-tab'
import { SessionTab } from './settings/tabs/session-tab'

type DashboardSettingsPanelProps = {
  activeTab: DashboardSettingsSectionId
  consentQueryIsLoading: boolean
  cookiePreferences: CookiePreferences
  documentTitles: Map<string, string>
  legalAcceptances: Array<{
    key: string
    acceptedAt: string
  }>
  logoutBusy: boolean
  onLogout: () => void
  onNavigateSection: (sectionId: DashboardSectionId) => void
  onProfileSubmit: (values: ProfileFormValues) => void
  onTabChange: (tab: DashboardSettingsSectionId) => void
  preferenceMutation: {
    error: unknown
    isPending: boolean
    mutate: (payload: CookiePreferencePayload) => void
  }
  profileError?: string | null
  profileLoading?: boolean
  user: AuthUser
}

export function DashboardSettingsPanel({
  activeTab,
  consentQueryIsLoading,
  cookiePreferences,
  documentTitles,
  legalAcceptances,
  logoutBusy,
  onLogout,
  onNavigateSection,
  onProfileSubmit,
  onTabChange,
  preferenceMutation,
  profileError,
  profileLoading,
  user,
}: Readonly<DashboardSettingsPanelProps>) {
  const activityQuery = useQuery({
    queryKey: ['auth', 'activity-feed'],
    queryFn: fetchActivityFeed,
    staleTime: 30_000,
  })

  const [workspacePreferences, setWorkspacePreferences] = useWorkspacePreferences()

  const acceptedCount = legalAcceptances.length
  const companyLocation = useMemo(() => formatCompanyLocation(user), [user])

  return (
    <section className="space-y-6">
      {/* Métricas de contexto */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SettingsMetric helper={user.email} label="Conta" value={user.companyName || user.fullName} />
        <SettingsMetric
          helper={user.role === 'OWNER' ? 'Controle administrativo completo' : 'Acesso operacional com auditoria'}
          label="Perfil"
          value={user.role === 'OWNER' ? 'Administrador' : 'Operacional'}
        />
        <SettingsMetric helper="aceites registrados" label="Conformidade" value={String(acceptedCount)} />
        <SettingsMetric helper={companyLocation.helper} label="Local" value={companyLocation.label} />
      </div>

      {/* Tab bar horizontal — sem sidebar interna */}
      <div className="border-b border-[var(--border)]">
        <nav className="-mb-px flex gap-0 overflow-x-auto">
          {dashboardSettingsNav.map((tab) => {
            const isActive = tab.id === activeTab
            return (
              <button
                className={cn(
                  'relative shrink-0 px-5 py-3.5 text-sm font-semibold transition-colors duration-150',
                  isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-soft)] hover:text-[var(--text-primary)]',
                )}
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full bg-[var(--accent)]" />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Conteúdo em largura total */}
      <div className="space-y-6">
        {activeTab === 'account' ? (
          <AccountTab
            profileError={profileError}
            profileLoading={profileLoading}
            user={user}
            onProfileSubmit={onProfileSubmit}
          />
        ) : null}

        {activeTab === 'security' ? (
          <SecurityTab
            activity={activityQuery.data ?? []}
            activityError={activityQuery.error instanceof Error ? activityQuery.error.message : null}
            activityLoading={activityQuery.isLoading}
          />
        ) : null}

        {activeTab === 'preferences' ? (
          <PreferencesTab
            preferences={workspacePreferences}
            onNavigateSection={onNavigateSection}
            onPreferencesChange={setWorkspacePreferences}
          />
        ) : null}

        {activeTab === 'compliance' ? (
          <ComplianceTab
            consentQueryIsLoading={consentQueryIsLoading}
            cookiePreferences={cookiePreferences}
            documentTitles={documentTitles}
            legalAcceptances={legalAcceptances}
            preferenceMutation={preferenceMutation}
          />
        ) : null}

        {activeTab === 'session' ? (
          <SessionTab
            activity={activityQuery.data ?? []}
            activityError={activityQuery.error instanceof Error ? activityQuery.error.message : null}
            activityLoading={activityQuery.isLoading}
            logoutBusy={logoutBusy}
            user={user}
            onLogout={onLogout}
          />
        ) : null}
      </div>
    </section>
  )
}

// ── Internal helpers (not extracted — specific to this component) ────────────

function formatCompanyLocation(user: AuthUser) {
  const addressParts = [
    user.companyLocation.streetLine1,
    user.companyLocation.streetNumber,
    user.companyLocation.city,
    user.companyLocation.state,
  ].filter(Boolean)

  return {
    helper: user.companyLocation.postalCode
      ? `CEP ${user.companyLocation.postalCode}`
      : 'Complete a localização para manter cadastro e atendimento consistentes',
    label: addressParts.length ? addressParts.join(', ') : 'Endereço não informado',
  }
}
