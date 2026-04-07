'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ProfileFormValues } from '@/lib/validation'
import { fetchActivityFeed, type AuthUser, type CookiePreferencePayload, type CookiePreferences } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  dashboardSettingsNav,
  type DashboardSectionId,
  type DashboardSettingsSectionId,
} from '@/components/dashboard/dashboard-navigation'

// Imports from extracted settings module
import { useWorkspacePreferences } from './settings/hooks/use-workspace-preferences'
import { SettingsMetric } from './settings/components/settings-metric'
import { SettingsInfoCard } from './settings/components/settings-info-card'
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
    <section className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="imperial-card flex flex-col gap-6 p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-soft)]">
                Configurações & Perfil
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">
                Centralize conta, segurança e preferências
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
                Essa camada reúne identidade, segurança e rotinas de leitura do workspace para manter o fluxo operacional sempre alinhado à governança.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:bg-[var(--surface)]"
              >
                Exportar configurações
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--accent)] bg-[var(--accent)]/10 px-4 py-2 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)]/20"
              >
                Ver agenda da conta
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SettingsMetric
              accent="#008cff"
              helper={user.email}
              label="Conta jurídica"
              value={user.companyName || user.fullName}
              caption="Sincronizada com os registros do workspace."
              trend="verificado"
            />
            <SettingsMetric
              accent="#36f57c"
              helper={user.role === 'OWNER' ? 'Controle completo' : 'Acesso operacional auditado'}
              label="Perfil de uso"
              value={user.role === 'OWNER' ? 'Administrador' : 'Operacional'}
              status={user.role === 'OWNER' ? 'Master' : 'Operação'}
            />
          </div>
        </article>

        <article className="imperial-card p-6 md:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-[var(--text-soft)]">Governança executiva</p>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Painel composto</h2>
          <p className="mt-3 text-sm text-[var(--text-soft)]">
            Monitoramos conformidade, localização e aceites para garantir que a conta esteja pronta para qualquer operação crítica.
          </p>
          <div className="mt-6 space-y-4">
            <SettingsInfoCard badge="Localização" caption={companyLocation.helper} hint="Geo e CEP verificados" label="Sede do workspace" value={companyLocation.label} />
            <SettingsInfoCard
              badge="Conformidade"
              caption="Todas as versões legais registradas."
              hint="Aceites registrados"
              label="Documentos"
              value={`${acceptedCount} registros`}
            />
          </div>
        </article>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SettingsMetric
          accent="#fbbf24"
          helper="Mapa e operação local"
          label="Local"
          value={companyLocation.label}
          caption="Atualize para ativar alertas geográficos"
        />
        <SettingsMetric accent="#f87171" helper="aceites oficiais" label="Conformidade" value={String(acceptedCount)} trend="auditado" />
        <SettingsMetric accent="#22d3ee" helper="Componentes ativos" label="Workspaces" value="1" status="Sincronizado" />
        <SettingsMetric accent="#38bdf8" helper="Última atividade" label="Sessões" value="Agora" caption="Atividade real-time proveniente do feed" />
      </div>

      <div className="rounded-3xl border border-white/[0.06] bg-white/5 p-4">
        <nav className="flex flex-wrap gap-2">
          {dashboardSettingsNav.map((tab) => {
            const isActive = tab.id === activeTab
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'rounded-2xl px-5 py-3 text-xs font-semibold uppercase tracking-[0.3em] transition-colors duration-150',
                  isActive
                    ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'text-[var(--text-soft)] hover:text-[var(--text-primary)] hover:bg-white/5',
                )}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

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
      : 'Complete a localização para alimentar mapa e operação',
    label: addressParts.length ? addressParts.join(', ') : 'Endereço não informado',
  }
}
