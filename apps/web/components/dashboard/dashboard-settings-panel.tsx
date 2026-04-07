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
import { AccountTab } from './settings/tabs/account-tab'
import { SecurityTab } from './settings/tabs/security-tab'
import { PreferencesTab } from './settings/tabs/preferences-tab'
import { ComplianceTab } from './settings/tabs/compliance-tab'
import { SessionTab } from './settings/tabs/session-tab'

const settingsTabCopy: Record<
  DashboardSettingsSectionId,
  {
    eyebrow: string
    title: string
    description: string
  }
> = {
  account: {
    eyebrow: 'Conta e identidade',
    title: 'Perfil, empresa e leitura principal do workspace.',
    description:
      'Nome, moeda, responsável e localização passam a viver em um painel administrativo contínuo, sem quebrar a leitura do dashboard.',
  },
  security: {
    eyebrow: 'Segurança operacional',
    title: 'Confirmações críticas e trilha recente em uma única camada.',
    description:
      'O bloco de segurança concentra PIN administrativo, histórico curto e leitura das ações sensíveis do workspace.',
  },
  preferences: {
    eyebrow: 'Preferências locais',
    title: 'Prioridades de leitura, módulos e rotina desta estação.',
    description:
      'As escolhas daqui organizam o dashboard deste dispositivo sem interferir no núcleo transacional da operação.',
  },
  compliance: {
    eyebrow: 'Conformidade',
    title: 'Consentimento, aceites e preferências opcionais reunidos.',
    description:
      'A governança documental e os controles de consentimento ficam no mesmo fluxo da conta para reduzir atrito e ruído.',
  },
  session: {
    eyebrow: 'Sessão ativa',
    title: 'Acessos recentes e encerramento seguro da conta.',
    description:
      'Rastreabilidade, atividade recente e logout manual ficam agrupados para leitura clara do estado atual da sessão.',
  },
}

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
  const activeTabCopy = settingsTabCopy[activeTab]

  return (
    <section className="space-y-6">
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

      <div className="overflow-hidden rounded-[28px] border border-white/[0.06] bg-[var(--surface)]/90">
        <div className="flex flex-col gap-5 border-b border-white/[0.06] px-5 py-5 lg:flex-row lg:items-end lg:justify-between lg:px-6">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
              {activeTabCopy.eyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{activeTabCopy.title}</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{activeTabCopy.description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
              Painéis compostos
            </span>
            <span className="inline-flex items-center rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
              {dashboardSettingsNav.find((tab) => tab.id === activeTab)?.label}
            </span>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2 p-3 lg:px-4">
          {dashboardSettingsNav.map((tab) => {
            const isActive = tab.id === activeTab
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'relative shrink-0 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors duration-150',
                  isActive
                    ? 'border-[var(--accent)]/22 bg-[var(--accent)]/10 text-[var(--text-primary)]'
                    : 'border-white/6 bg-white/[0.02] text-[var(--text-soft)] hover:text-[var(--text-primary)]',
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
